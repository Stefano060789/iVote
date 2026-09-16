-- The plan-limit triggers from 20260907_launch_foundation.sql counted every poll/QR
-- campaign a workspace had ever created (count(*), no status filter) against the plan's
-- poll_limit/campaign_limit. That means closing an old poll, or pausing an old QR code,
-- never freed up quota - a Free-plan workspace that created 3 polls and later closed all of
-- them still couldn't create a 4th, forever. Change both triggers to only count currently
-- active items instead, matching the same "active" definition the dashboard itself uses
-- (Admin.jsx's getPollStatusInfo): not closed, not scheduled for the future, not expired.
-- For QR campaigns, "active" is simply the existing is_active flag (the same Active/Paused
-- toggle already shown on every QR campaign row).

create or replace function public.enforce_workspace_poll_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare allowed_polls integer;
begin
  select poll_limit into allowed_polls from public.workspace_plan_limits(new.workspace_id);
  if (
    select count(*) from public.polls
    where workspace_id = new.workspace_id
      and coalesce(status, 'active') <> 'closed'
      and closed_at is null
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at > now())
  ) >= allowed_polls then
    raise exception 'Your workspace has reached its active poll limit. Close an old poll or choose a higher plan to create more.';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_workspace_campaign_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare allowed_campaigns integer;
begin
  select campaign_limit into allowed_campaigns from public.workspace_plan_limits(new.workspace_id);
  if (
    select count(*) from public.qr_campaigns
    where workspace_id = new.workspace_id and is_active
  ) >= allowed_campaigns then
    raise exception 'Your workspace has reached its active QR code limit. Pause an old QR code or choose a higher plan to create more.';
  end if;
  return new;
end;
$$;
