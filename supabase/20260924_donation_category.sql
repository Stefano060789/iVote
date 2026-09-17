-- Lets each venue choose accurate payment wording without Godwit deciding the legal
-- classification. Existing venues default to a voluntary contribution.
alter table public.donation_settings
  add column if not exists category text not null default 'contribution';

alter table public.donation_settings
  drop constraint if exists donation_settings_category_check;

alter table public.donation_settings
  add constraint donation_settings_category_check
  check (category in ('tip', 'contribution', 'donation'));

-- Refresh the public QR menu projection so the chosen category reaches DonationCard.
drop function if exists public.get_public_qr_campaign_items(text);

create or replace function public.get_public_qr_campaign_items(target_token text)
returns table (
  item_id bigint,
  campaign_id bigint,
  portal_title text,
  portal_message text,
  item_type text,
  sort_order integer,
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
  image_url text,
  accessibility_tags text[],
  reward_code text,
  donation_category text,
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
    i.image_url,
    i.accessibility_tags,
    i.reward_code,
    case when i.item_type = 'donation' then d.category else null end,
    case when i.item_type = 'donation' then d.currency else null end,
    case when i.item_type = 'donation' then d.suggested_amount else null end,
    case when i.item_type = 'donation' then coalesce(i.body, d.message) else null end
  from public.qr_campaign_items i
  join public.qr_campaigns c on c.id = i.campaign_id
  left join public.polls p on p.id = i.poll_id
  left join public.donation_settings d
    on d.workspace_id = c.workspace_id and d.is_enabled and d.stripe_charges_enabled
  where c.token = target_token and c.is_active
  order by i.sort_order asc nulls last, i.id asc;
$$;

grant execute on function public.get_public_qr_campaign_items(text) to anon, authenticated;

drop function if exists public.get_donation_checkout_target(text, bigint);

create or replace function public.get_donation_checkout_target(target_token text, target_item_id bigint)
returns table(
  workspace_id uuid,
  campaign_id bigint,
  stripe_account_id text,
  currency text,
  category text
)
language sql
security definer
set search_path = public
stable
as $$
  select c.workspace_id, c.id, d.stripe_account_id, d.currency, d.category
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

revoke all on function public.get_donation_checkout_target(text, bigint) from public, anon, authenticated;
grant execute on function public.get_donation_checkout_target(text, bigint) to service_role;
