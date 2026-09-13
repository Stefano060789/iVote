-- Lets a venue accept direct bank-transfer donations from voters via the QR scan
-- flow, alongside polls and info cards. Godwit never touches the money itself:
-- this feature only displays the organizer's IBAN/account details (workspace-level
-- settings, reusable across every QR code) and renders a standard EPC069-12 "SEPA
-- Credit Transfer" QR payload (aka a "GiroCode") that most European banking apps
-- can scan to prefill a bank transfer. No payment processing, custody, or fee.

-- Standard ISO 7064 MOD 97-10 IBAN checksum, used as a DB-level guard so an
-- obviously-mistyped IBAN can never be saved as "valid" - mirrored in
-- src/lib/validators.js (isValidIban) so client and server never disagree.
create or replace function public.is_valid_iban(raw_iban text)
returns boolean
language plpgsql
immutable
as $$
declare
  cleaned text;
  rearranged text;
  numeric_str text := '';
  ch text;
  remainder int := 0;
  i int;
begin
  if raw_iban is null then
    return false;
  end if;

  cleaned := upper(regexp_replace(raw_iban, '\s+', '', 'g'));
  if cleaned !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$' then
    return false;
  end if;

  rearranged := substr(cleaned, 5) || substr(cleaned, 1, 4);

  for i in 1 .. length(rearranged) loop
    ch := substr(rearranged, i, 1);
    if ch ~ '[0-9]' then
      numeric_str := numeric_str || ch;
    else
      numeric_str := numeric_str || (ascii(ch) - ascii('A') + 10)::text;
    end if;
  end loop;

  for i in 1 .. length(numeric_str) loop
    remainder := (remainder * 10 + (substr(numeric_str, i, 1))::int) % 97;
  end loop;

  return remainder = 1;
end;
$$;

-- One donation configuration per workspace, reused by every QR code that
-- attaches a "donation" item - so an admin sets their IBAN once, not per QR code.
create table if not exists public.donation_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  is_enabled boolean not null default false,
  iban text,
  account_holder_name text check (account_holder_name is null or char_length(account_holder_name) <= 70),
  bic text check (bic is null or char_length(bic) <= 11),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  suggested_amount numeric(10,2) check (suggested_amount is null or suggested_amount > 0),
  message text check (message is null or char_length(message) <= 300),
  updated_at timestamptz not null default now(),
  constraint donation_settings_iban_format check (iban is null or public.is_valid_iban(iban)),
  constraint donation_settings_enabled_requires_details check (
    not is_enabled or (
      iban is not null and public.is_valid_iban(iban)
      and account_holder_name is not null and char_length(trim(account_holder_name)) > 0
    )
  )
);

alter table public.donation_settings enable row level security;

drop policy if exists "members can view their donation settings" on public.donation_settings;
drop policy if exists "managers can manage their donation settings" on public.donation_settings;
create policy "members can view their donation settings" on public.donation_settings
for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "managers can manage their donation settings" on public.donation_settings
for all to authenticated using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_manager(workspace_id));

-- Add "donation" as a third qr_campaign_items item_type, alongside the existing
-- "poll" and "info" types from the previous migration. The original CHECK
-- constraints didn't have explicit names for the item_type list, so find and
-- drop whatever Postgres auto-named it rather than guessing. This also matches
-- (and drops) the separately-named qr_campaign_items_shape constraint, since it
-- references item_type too - both are recreated immediately below, so dropping
-- both here first is harmless and avoids depending on exact constraint text.
do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'public.qr_campaign_items'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%item_type%'
  loop
    execute format('alter table public.qr_campaign_items drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.qr_campaign_items
  add constraint qr_campaign_items_item_type_check check (item_type in ('poll', 'info', 'donation'));

alter table public.qr_campaign_items add constraint qr_campaign_items_shape check (
  (item_type = 'poll' and poll_id is not null and title is null and body is null and link_url is null and link_label is null)
  or
  (item_type = 'info' and poll_id is null and title is not null and char_length(trim(title)) > 0)
  or
  (item_type = 'donation' and poll_id is null)
);

-- Extend the before-write trigger (created in the previous migration) to also
-- require a fully configured, enabled donation_settings row before a donation
-- item can be attached to a QR code - otherwise a voter could scan into an
-- empty/broken donation card.
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
    where workspace_id = campaign_workspace_id and is_enabled and iban is not null
  ) then
    raise exception 'Set up and enable donation settings (with a valid IBAN) before adding a donation item.';
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

-- Re-expose the public QR-item lookup with donation fields attached. Donation
-- details only come through for item_type = 'donation', and only while the
-- workspace's donation_settings row is still enabled (so disabling donations
-- later doesn't leave a stale donation card working for already-printed QR codes).
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
  donation_iban text,
  donation_account_holder_name text,
  donation_bic text,
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
    case when i.item_type = 'donation' then d.iban else null end,
    case when i.item_type = 'donation' then d.account_holder_name else null end,
    case when i.item_type = 'donation' then d.bic else null end,
    case when i.item_type = 'donation' then d.currency else null end,
    case when i.item_type = 'donation' then d.suggested_amount else null end,
    case when i.item_type = 'donation' then coalesce(i.body, d.message) else null end
  from public.qr_campaign_items i
  join public.qr_campaigns c on c.id = i.campaign_id
  left join public.polls p on p.id = i.poll_id
  left join public.donation_settings d on d.workspace_id = c.workspace_id and d.is_enabled
  where c.token = target_token and c.is_active
  order by i.sort_order asc nulls last, i.id asc;
$$;

grant execute on function public.get_public_qr_campaign_items(text) to anon, authenticated;
