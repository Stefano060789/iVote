-- Remove the poll-rotation feature entirely, per explicit operator request (simplification
-- pass following a feature-gap audit - see TODO.md). The UI for creating/managing rotations
-- and assigning one to a QR code was already removed from Admin.jsx; this finishes the job on
-- the database side.

-- Restore get_public_qr_campaign to its pre-rotation form: resolve a campaign's poll directly,
-- with no rotation-schedule lookup. Must run before dropping poll_rotations, since the current
-- function body references get_rotation_current_poll(), which references poll_rotations.
drop function if exists public.get_public_qr_campaign(text);

create function public.get_public_qr_campaign(target_token text)
returns table(
  campaign_id bigint,
  poll_id bigint,
  portal_title text,
  portal_message text,
  portal_button_label text
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  campaign record;
begin
  select * into campaign from public.qr_campaigns where token = target_token and is_active limit 1;
  if campaign.id is null then return; end if;
  if campaign.poll_id is null then return; end if;

  return query select campaign.id, campaign.poll_id, campaign.portal_title, campaign.portal_message, campaign.portal_button_label;
end;
$$;

grant execute on function public.get_public_qr_campaign(text) to anon, authenticated;

drop function if exists public.get_rotation_current_poll(bigint);

alter table public.qr_campaigns drop column if exists rotation_id;

drop table if exists public.poll_rotations;
