-- Plan entitlement enforcement. Prerequisite: 20260907_launch_foundation.sql has been run.
-- This migration is additive and mirrors the existing poll/campaign limit pattern: the
-- database is the real gate, the UI (src/lib/entitlements.js) only mirrors it for display.

-- workspace_plan() already exists (20260907_launch_foundation.sql). Grant it directly so the
-- client can read a workspace's plan without going through workspace_plan_limits().
grant execute on function public.workspace_plan(uuid) to authenticated;

-- Add a seat limit alongside the existing poll/campaign limits. The return type is changing,
-- so the function must be dropped before it can be recreated.
drop function if exists public.workspace_plan_limits(uuid);

create or replace function public.workspace_plan_limits(target_workspace_id uuid default public.current_workspace_id())
returns table(plan text, poll_limit integer, campaign_limit integer, seat_limit integer)
language sql security definer set search_path = public stable as $$
  select public.workspace_plan(target_workspace_id),
    case public.workspace_plan(target_workspace_id) when 'starter' then 25 when 'growth' then 250 else 3 end,
    case public.workspace_plan(target_workspace_id) when 'starter' then 10 when 'growth' then 100 else 0 end,
    case public.workspace_plan(target_workspace_id) when 'starter' then 3 when 'growth' then 10 else 1 end;
$$;

grant execute on function public.workspace_plan_limits(uuid) to authenticated;

-- Seats: Free = 1, Starter = 3, Growth = 10.
create or replace function public.enforce_workspace_seat_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare allowed_seats integer;
begin
  select seat_limit into allowed_seats from public.workspace_plan_limits(new.workspace_id);
  if (select count(*) from public.workspace_members where workspace_id = new.workspace_id) >= allowed_seats then
    raise exception 'Your workspace has reached its team seat limit. Choose a higher plan to add more members.';
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_members_enforce_seat_limit on public.workspace_members;
create trigger workspace_members_enforce_seat_limit
before insert on public.workspace_members for each row execute procedure public.enforce_workspace_seat_limit();

-- Developer API keys: Growth only.
create or replace function public.enforce_api_key_plan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.workspace_plan(new.workspace_id) <> 'growth' then
    raise exception 'Developer API access is available on the Growth plan.';
  end if;
  return new;
end;
$$;

drop trigger if exists api_keys_enforce_plan on public.api_keys;
create trigger api_keys_enforce_plan
before insert on public.api_keys for each row execute procedure public.enforce_api_key_plan();

-- Poll rewards: the reward message/code/url are Starter+, prize draws are Growth only.
create or replace function public.enforce_poll_reward_plan()
returns trigger language plpgsql security definer set search_path = public as $$
declare current_plan text;
begin
  current_plan := public.workspace_plan(new.workspace_id);
  if current_plan = 'free' and (new.reward_message is not null or new.reward_code is not null or new.reward_url is not null) then
    raise exception 'Post-vote rewards are available on the Starter plan and above.';
  end if;
  if new.raffle_enabled and current_plan <> 'growth' then
    raise exception 'Prize draws are available on the Growth plan.';
  end if;
  return new;
end;
$$;

drop trigger if exists polls_enforce_reward_plan on public.polls;
create trigger polls_enforce_reward_plan
before insert or update on public.polls for each row execute procedure public.enforce_poll_reward_plan();

-- Workspace webhooks: Growth only.
create or replace function public.enforce_webhook_plan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.webhook_url is not null and public.workspace_plan(new.id) <> 'growth' then
    raise exception 'Webhooks are available on the Growth plan.';
  end if;
  return new;
end;
$$;

drop trigger if exists workspaces_enforce_webhook_plan on public.workspaces;
create trigger workspaces_enforce_webhook_plan
before insert or update on public.workspaces for each row execute procedure public.enforce_webhook_plan();

-- Automated lead nurture emails: Growth only.
create or replace function public.enforce_lead_nurture_plan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_enabled and public.workspace_plan(new.workspace_id) <> 'growth' then
    raise exception 'Automated lead nurture emails are available on the Growth plan.';
  end if;
  return new;
end;
$$;

drop trigger if exists lead_nurture_settings_enforce_plan on public.lead_nurture_settings;
create trigger lead_nurture_settings_enforce_plan
before insert or update on public.lead_nurture_settings for each row execute procedure public.enforce_lead_nurture_plan();

-- Automated win-back emails: Growth only (same rationale as lead nurture).
create or replace function public.enforce_winback_plan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_enabled and public.workspace_plan(new.workspace_id) <> 'growth' then
    raise exception 'Automated win-back emails are available on the Growth plan.';
  end if;
  return new;
end;
$$;

drop trigger if exists winback_settings_enforce_plan on public.winback_settings;
create trigger winback_settings_enforce_plan
before insert or update on public.winback_settings for each row execute procedure public.enforce_winback_plan();
