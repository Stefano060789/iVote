-- Replaces the original bank-transfer/IBAN donation feature with Stripe Connect: voters now
-- pay by card/wallet through a hosted Stripe Checkout, Godwit takes a 10% platform fee via a
-- Stripe Connect "destination charge" (application_fee_amount + transfer_data.destination),
-- and the remaining 90% is transferred straight to the workspace's own connected Stripe
-- account. This supersedes supabase/20260916_donations.sql's IBAN/SEPA-QR design entirely -
-- that migration should still be applied first (it creates donation_settings and the
-- 'donation' qr_campaign_items item_type), this migration only alters what it created.
--
-- Stripe Dashboard setup required (see LAUNCH_SETUP.md):
--  1. Enable Connect (Express accounts) under Settings -> Connect.
--  2. On the existing webhook endpoint, also check "Listen to events on Connected accounts"
--     and add the `account.updated` event, alongside the existing subscription events.
--  3. No new API keys needed - the platform's own STRIPE_SECRET_KEY is used for Connect
--     account creation, Account Links, and destination-charge Checkout Sessions.

-- The is_valid_iban() checksum function from the prior migration is left in place (unused,
-- harmless) rather than dropped, in case IBAN validation is useful again for another feature.

alter table public.donation_settings drop constraint if exists donation_settings_iban_format;
alter table public.donation_settings drop constraint if exists donation_settings_enabled_requires_details;

alter table public.donation_settings drop column if exists iban;
alter table public.donation_settings drop column if exists account_holder_name;
alter table public.donation_settings drop column if exists bic;

alter table public.donation_settings
  add column if not exists stripe_account_id text,
  add column if not exists stripe_onboarding_complete boolean not null default false,
  add column if not exists stripe_charges_enabled boolean not null default false,
  add column if not exists stripe_payouts_enabled boolean not null default false;

alter table public.donation_settings
  add constraint donation_settings_enabled_requires_stripe check (
    not is_enabled or (stripe_account_id is not null and stripe_charges_enabled)
  );

comment on column public.donation_settings.stripe_account_id is
  'Stripe Connect Express account id (acct_...) created for this workspace.';
comment on column public.donation_settings.stripe_charges_enabled is
  'Mirrors the Stripe Account object''s charges_enabled flag, kept in sync by the account.updated webhook.';

-- A durable record of completed (and attempted) donations, so a workspace can see its own
-- donation history and Godwit can reconcile application fees. Rows are written only by the
-- Stripe webhook handler using the Supabase service role key, which bypasses RLS entirely -
-- no insert/update policy is defined for regular authenticated users on purpose.
create table if not exists public.donations (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id bigint references public.qr_campaigns(id) on delete set null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  amount_total numeric(10,2) not null check (amount_total > 0),
  application_fee_amount numeric(10,2) not null check (application_fee_amount >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  donor_email text,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);

alter table public.donations enable row level security;

drop policy if exists "members can view their donations" on public.donations;
create policy "members can view their donations" on public.donations
for select to authenticated using (public.is_workspace_member(workspace_id));

create index if not exists donations_workspace_id_idx on public.donations (workspace_id, created_at desc);

-- A donation item can only be attached to a QR code once the workspace has a connected
-- Stripe account that can actually accept charges (replaces the old "valid IBAN" check).
create or replace function public.qr_campaign_items_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  campaign_workspace_id uuid;
  poll_workspace_id uuid;
  existing_count int;
begin
  select workspace_id into campaign_workspace_id from public.qr_campaigns where id = new.campaign_id;
  if campaign_workspace_id is null then
    raise exception 'The QR campaign does not exist.';
  end if;
  new.workspace_id := campaign_workspace_id;

  if new.item_type = 'poll' then
    select workspace_id into poll_workspace_id from public.polls where id = new.poll_id;
    if poll_workspace_id is null or poll_workspace_id <> campaign_workspace_id then
      raise exception 'The poll must belong to the same workspace as the QR campaign.';
    end if;
  end if;

  if new.item_type = 'donation' and not exists (
    select 1 from public.donation_settings
    where workspace_id = campaign_workspace_id and is_enabled and stripe_charges_enabled
  ) then
    raise exception 'Connect Stripe and enable donations before adding a donation item.';
  end if;

  if tg_op = 'INSERT' then
    select count(*) into existing_count from public.qr_campaign_items where campaign_id = new.campaign_id;
    if existing_count >= 20 then
      raise exception 'A QR code can have at most 20 items. Remove one before adding another.';
    end if;
    if new.sort_order is null then
      select coalesce(max(sort_order), -1) + 1 into new.sort_order
      from public.qr_campaign_items where campaign_id = new.campaign_id;
    end if;
  end if;

  return new;
end;
$$;

-- Re-expose the public QR-item lookup without the retired IBAN/holder/BIC fields, and only
-- surface donation details while the workspace's Stripe account can actually accept charges.
-- The Stripe account id itself is intentionally NOT returned here - the voter's browser never
-- sees it; the donation checkout endpoint looks it up server-side from the campaign token.
drop function if exists public.get_public_qr_campaign_items(text);

create function public.get_public_qr_campaign_items(target_token text)
returns table(
  item_id bigint,
  campaign_id bigint,
  portal_title text,
  portal_message text,
  item_type text,
  sort_order int,
  poll_id bigint,
  poll_question text,
  poll_brand_name text,
  poll_brand_logo_url text,
  poll_brand_primary_color text,
  poll_brand_accent_color text,
  title text,
  body text,
  link_url text,
  link_label text,
  donation_currency text,
  donation_suggested_amount numeric,
  donation_message text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    i.id,
    c.id,
    c.portal_title,
    c.portal_message,
    i.item_type,
    i.sort_order,
    i.poll_id,
    p.question,
    p.brand_name,
    p.brand_logo_url,
    p.brand_primary_color,
    p.brand_accent_color,
    i.title,
    i.body,
    i.link_url,
    i.link_label,
    case when i.item_type = 'donation' then d.currency else null end,
    case when i.item_type = 'donation' then d.suggested_amount else null end,
    case when i.item_type = 'donation' then coalesce(i.body, d.message) else null end
  from public.qr_campaign_items i
  join public.qr_campaigns c on c.id = i.campaign_id
  left join public.polls p on p.id = i.poll_id
  left join public.donation_settings d on d.workspace_id = c.workspace_id and d.is_enabled and d.stripe_charges_enabled
  where c.token = target_token and c.is_active
  order by i.sort_order asc nulls last, i.id asc;
$$;

grant execute on function public.get_public_qr_campaign_items(text) to anon, authenticated;

-- Server-side lookup used by the donation checkout endpoint (service role only - not granted
-- to anon/authenticated) to resolve a campaign token + item id to the workspace's connected
-- Stripe account, without ever exposing that account id to the browser.
create or replace function public.get_donation_checkout_target(target_token text, target_item_id bigint)
returns table(
  workspace_id uuid,
  campaign_id bigint,
  stripe_account_id text,
  currency text
)
language sql
security definer
set search_path = public
stable
as $$
  select c.workspace_id, c.id, d.stripe_account_id, d.currency
  from public.qr_campaign_items i
  join public.qr_campaigns c on c.id = i.campaign_id
  join public.donation_settings d on d.workspace_id = c.workspace_id
  where c.token = target_token
    and c.is_active
    and i.id = target_item_id
    and i.item_type = 'donation'
    and d.is_enabled
    and d.stripe_charges_enabled
    and d.stripe_account_id is not null;
$$;

-- Service-role only: the donation checkout endpoint calls this with the service role key.
-- Explicitly revoke from anon/authenticated since it returns a Stripe account id, unlike
-- get_public_qr_campaign_items above which is intentionally public but never returns it.
revoke all on function public.get_donation_checkout_target(text, bigint) from public, anon, authenticated;
grant execute on function public.get_donation_checkout_target(text, bigint) to service_role;
