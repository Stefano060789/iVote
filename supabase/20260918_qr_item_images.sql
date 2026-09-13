-- Adds an optional image to "info" QR-menu items (title/body/link cards). Identified as a gap
-- while building Robin's persona guide: artists showcasing work and museums/venues describing
-- an exhibit or landmark both want to show a photo, not just text and a link. Kept as a plain
-- image URL field (paste a link to an already-hosted image), matching the existing pattern used
-- for the workspace logo (workspaces.logo_url) - there is no file-upload infrastructure in this
-- project, so this stays consistent with how every other "add an image" field already works.

alter table public.qr_campaign_items
  add column if not exists image_url text check (image_url is null or char_length(image_url) <= 2048);

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
