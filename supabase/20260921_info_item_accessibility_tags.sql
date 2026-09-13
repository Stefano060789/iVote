-- Structured accessibility tagging for "info" QR-menu items (museum/city/hotel wayfinding and
-- exhibit cards), per Robin's guide backlog: previously this was just free-text body copy,
-- which works but isn't structured - a voter can't filter/scan for "is this wheelchair
-- accessible?" the way a small set of checkbox-style tags lets them. Kept to a fixed, small
-- vocabulary on purpose (structured beats another free-text field here).

alter table public.qr_campaign_items
  add column if not exists accessibility_tags text[] not null default '{}';

alter table public.qr_campaign_items drop constraint if exists qr_campaign_items_accessibility_tags_check;
alter table public.qr_campaign_items add constraint qr_campaign_items_accessibility_tags_check
  check (
    accessibility_tags = '{}'
    or (
      item_type = 'info'
      and accessibility_tags <@ array[
        'wheelchair_accessible',
        'audio_description',
        'sign_language',
        'large_print',
        'hearing_loop',
        'service_animals_welcome'
      ]::text[]
    )
  );

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
  image_url text,
  accessibility_tags text[],
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
