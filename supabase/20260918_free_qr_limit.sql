-- Apply the Free plan's one-active-QR limit to databases where the original
-- plan-entitlements migration has already been applied.

create or replace function public.workspace_plan_limits(target_workspace_id uuid default public.current_workspace_id())
returns table(plan text, poll_limit integer, campaign_limit integer, seat_limit integer)
language sql security definer set search_path = public stable as $$
  select public.workspace_plan(target_workspace_id),
    case public.workspace_plan(target_workspace_id) when 'starter' then 25 when 'growth' then 250 else 3 end,
    case public.workspace_plan(target_workspace_id) when 'starter' then 10 when 'growth' then 100 else 1 end,
    case public.workspace_plan(target_workspace_id) when 'starter' then 3 when 'growth' then 10 else 1 end;
$$;
