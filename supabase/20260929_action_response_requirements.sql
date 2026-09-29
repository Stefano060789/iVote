-- Adds the response requirement selected when creating an Action.
alter table public.woodpecker_tasks
  add column if not exists response_mode text not null default 'scan'
  check (response_mode in ('scan', 'text', 'photo'));

alter table public.woodpecker_tasks alter column campaign_id drop not null;

drop policy if exists "workspace managers create woodpecker tasks" on public.woodpecker_tasks;
create policy "workspace managers create woodpecker tasks"
on public.woodpecker_tasks for insert to authenticated
with check (
  public.is_workspace_manager(workspace_id)
  and (
    campaign_id is null
    or exists (
      select 1 from public.qr_campaigns c
      where c.id=campaign_id and c.workspace_id=workspace_id
    )
  )
);

create table if not exists public.woodpecker_task_campaigns (
  task_id bigint not null references public.woodpecker_tasks(id) on delete cascade,
  campaign_id bigint not null references public.qr_campaigns(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, campaign_id)
);

insert into public.woodpecker_task_campaigns (task_id, campaign_id)
select id, campaign_id
from public.woodpecker_tasks
where campaign_id is not null
on conflict do nothing;

create or replace function public.sync_woodpecker_task_campaign()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.campaign_id is not null then
    insert into public.woodpecker_task_campaigns (task_id, campaign_id)
    values (new.id, new.campaign_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_woodpecker_task_campaign on public.woodpecker_tasks;
create trigger sync_woodpecker_task_campaign
after insert or update of campaign_id on public.woodpecker_tasks
for each row execute function public.sync_woodpecker_task_campaign();

alter table public.woodpecker_task_campaigns enable row level security;
drop policy if exists "Workspace members read Action QR links" on public.woodpecker_task_campaigns;
drop policy if exists "Workspace managers manage Action QR links" on public.woodpecker_task_campaigns;
drop policy if exists "Public reads active Action QR links" on public.woodpecker_task_campaigns;
create policy "Workspace members read Action QR links"
on public.woodpecker_task_campaigns for select to authenticated
using (exists (select 1 from public.woodpecker_tasks t where t.id=task_id and public.is_workspace_member(t.workspace_id)));
create policy "Workspace managers manage Action QR links"
on public.woodpecker_task_campaigns for all to authenticated
using (exists (select 1 from public.woodpecker_tasks t where t.id=task_id and public.is_workspace_manager(t.workspace_id)))
with check (exists (
  select 1 from public.woodpecker_tasks t
  join public.qr_campaigns c on c.id=campaign_id
  where t.id=task_id and public.is_workspace_manager(t.workspace_id) and c.workspace_id=t.workspace_id
));
create policy "Public reads active Action QR links"
on public.woodpecker_task_campaigns for select to anon
using (exists (select 1 from public.qr_campaigns c where c.id=campaign_id and c.is_active));

drop function if exists public.get_public_woodpecker_portal(text);
create or replace function public.get_public_woodpecker_portal(target_token text)
returns table(
  id bigint,
  title text,
  description text,
  status text,
  completion_mode text,
  response_mode text,
  campaign_id bigint,
  history jsonb
)
language sql stable security definer set search_path=public
as $$
  select t.id, t.title, t.description, t.status, t.completion_mode, t.response_mode, t.campaign_id,
    coalesce((select jsonb_agg(h order by h.created_at) from (
      select id, event_type, message, actor_name, created_at
      from public.woodpecker_task_history
      where task_id=t.id
    ) h), '[]'::jsonb)
  from public.woodpecker_tasks t
  join public.woodpecker_task_campaigns tc on tc.task_id=t.id
  join public.qr_campaigns c on c.id=tc.campaign_id
  where c.token=target_token and c.is_active
  order by t.created_at desc;
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
      update public.woodpecker_tasks t
      set status = 'completed', completed_at = now()
      where exists (
        select 1 from public.woodpecker_task_campaigns tc
        where tc.task_id=t.id and tc.campaign_id=target_campaign_id
      )
        and t.completion_mode = 'scan'
        and t.status <> 'completed'
      returning t.id
    )
    insert into public.woodpecker_task_history (task_id, event_type, message)
    select id, 'completed', 'Task completed by QR scan'
    from completed_tasks;
  end if;
end;
$$;

grant execute on function public.record_qr_scan(bigint) to anon, authenticated;

create or replace function public.add_woodpecker_message(
  target_task_id bigint,
  message_text text,
  actor_name text default 'QR visitor'
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if length(trim(message_text)) = 0 or length(message_text) > 2000 then
    raise exception 'Message must be between 1 and 2000 characters';
  end if;
  if not exists (
    select 1
    from public.woodpecker_task_campaigns tc
    join public.qr_campaigns c on c.id=tc.campaign_id
    where tc.task_id=target_task_id and c.is_active
  ) then
    raise exception 'Task not found';
  end if;
  insert into public.woodpecker_task_history(task_id,event_type,message,actor_name)
  values(target_task_id,'message',trim(message_text),left(trim(actor_name),100));
end;
$$;

create or replace function public.complete_woodpecker_task(target_task_id bigint)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not exists (
    select 1
    from public.woodpecker_task_campaigns tc
    join public.qr_campaigns c on c.id=tc.campaign_id
    where tc.task_id=target_task_id and c.is_active
  ) then
    raise exception 'Task not found';
  end if;
  update public.woodpecker_tasks
  set status='completed', completed_at=now()
  where id=target_task_id and status <> 'completed';
  if found then
    insert into public.woodpecker_task_history(task_id,event_type,message,actor_id)
    values(target_task_id,'completed','Task marked complete',auth.uid());
  end if;
end;
$$;

grant execute on function public.add_woodpecker_message(bigint,text,text) to anon, authenticated;
grant execute on function public.complete_woodpecker_task(bigint) to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('action-evidence', 'action-evidence', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read action evidence" on storage.objects;
create policy "Public can read action evidence"
on storage.objects for select
to public
using (bucket_id = 'action-evidence');

drop policy if exists "Public can upload action evidence" on storage.objects;
create policy "Public can upload action evidence"
on storage.objects for insert
to public
with check (bucket_id = 'action-evidence');
