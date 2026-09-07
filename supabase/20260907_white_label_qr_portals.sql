-- iVote white-label QR welcome portals.
-- Prerequisites: secure workspaces, ROI roadmap, launch foundation, and feedback reports migrations.

alter table public.qr_campaigns
  add column if not exists portal_title text,
  add column if not exists portal_message text,
  add column if not exists portal_button_label text;

alter table public.qr_campaigns
  add constraint qr_campaigns_portal_title_length
  check (portal_title is null or char_length(trim(portal_title)) between 1 and 120) not valid,
  add constraint qr_campaigns_portal_message_length
  check (portal_message is null or char_length(trim(portal_message)) between 1 and 280) not valid,
  add constraint qr_campaigns_portal_button_label_length
  check (portal_button_label is null or char_length(trim(portal_button_label)) between 1 and 60) not valid;

alter table public.qr_campaigns validate constraint qr_campaigns_portal_title_length;
alter table public.qr_campaigns validate constraint qr_campaigns_portal_message_length;
alter table public.qr_campaigns validate constraint qr_campaigns_portal_button_label_length;

drop function if exists public.get_public_qr_campaign(text);

create function public.get_public_qr_campaign(target_token text)
returns table(
  campaign_id bigint,
  poll_id bigint,
  portal_title text,
  portal_message text,
  portal_button_label text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    id,
    poll_id,
    portal_title,
    portal_message,
    portal_button_label
  from public.qr_campaigns
  where token = target_token and is_active and poll_id is not null
  limit 1;
$$;

grant execute on function public.get_public_qr_campaign(text) to anon, authenticated;