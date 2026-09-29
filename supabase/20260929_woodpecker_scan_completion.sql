-- Allow Woodpecker tasks to complete automatically when their QR campaign is scanned.
alter table public.woodpecker_tasks
  add column if not exists completion_mode text not null default 'manual'
  check (completion_mode in ('manual', 'scan'));

drop function if exists public.get_public_woodpecker_portal(text);
create function public.get_public_woodpecker_portal(target_token text)
returns table(id bigint, title text, description text, status text, completion_mode text, campaign_id bigint, history jsonb)
language sql stable security definer set search_path=public
as $$
  select t.id, t.title, t.description, t.status, t.completion_mode, t.campaign_id,
    coalesce((select jsonb_agg(h order by h.created_at) from (
      select id, event_type, message, actor_name, created_at from public.woodpecker_task_history where task_id=t.id
    ) h), '[]'::jsonb)
  from public.woodpecker_tasks t join public.qr_campaigns c on c.id=t.campaign_id
  where c.token=target_token and c.is_active order by t.created_at desc;
$$;
grant execute on function public.get_public_woodpecker_portal(text) to anon, authenticated;

create or replace function public.record_qr_scan(target_campaign_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.qr_campaigns where id = target_campaign_id and is_active) then
    insert into public.qr_scan_events (campaign_id) values (target_campaign_id);

    with completed_tasks as (
      update public.woodpecker_tasks
      set status = 'completed', completed_at = now()
      where campaign_id = target_campaign_id
        and completion_mode = 'scan'
        and status <> 'completed'
      returning id
    )
    insert into public.woodpecker_task_history (task_id, event_type, message)
    select id, 'completed', 'Task completed by QR scan'
    from completed_tasks;
  end if;
end;
$$;
