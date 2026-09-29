-- Allow workspace managers to link any number of Tasks to any number of QR campaigns
-- within the same workspace.

drop policy if exists "Workspace members read Action QR links" on public.woodpecker_task_campaigns;
drop policy if exists "Workspace managers manage Action QR links" on public.woodpecker_task_campaigns;
drop policy if exists "Public reads active Action QR links" on public.woodpecker_task_campaigns;

create policy "Workspace members read Action QR links"
on public.woodpecker_task_campaigns
for select
to authenticated
using (
  exists (
    select 1
    from public.woodpecker_tasks as t
    where t.id = public.woodpecker_task_campaigns.task_id
      and public.is_workspace_member(t.workspace_id)
  )
);

create policy "Workspace managers insert Action QR links"
on public.woodpecker_task_campaigns
for insert
to authenticated
with check (
  exists (
    select 1
    from public.woodpecker_tasks as t
    join public.qr_campaigns as c
      on c.id = public.woodpecker_task_campaigns.campaign_id
    where t.id = public.woodpecker_task_campaigns.task_id
      and c.workspace_id = t.workspace_id
      and public.is_workspace_manager(t.workspace_id)
  )
);

create policy "Workspace managers update Action QR links"
on public.woodpecker_task_campaigns
for update
to authenticated
using (
  exists (
    select 1
    from public.woodpecker_tasks as t
    where t.id = public.woodpecker_task_campaigns.task_id
      and public.is_workspace_manager(t.workspace_id)
  )
)
with check (
  exists (
    select 1
    from public.woodpecker_tasks as t
    join public.qr_campaigns as c
      on c.id = public.woodpecker_task_campaigns.campaign_id
    where t.id = public.woodpecker_task_campaigns.task_id
      and c.workspace_id = t.workspace_id
      and public.is_workspace_manager(t.workspace_id)
  )
);

create policy "Workspace managers delete Action QR links"
on public.woodpecker_task_campaigns
for delete
to authenticated
using (
  exists (
    select 1
    from public.woodpecker_tasks as t
    where t.id = public.woodpecker_task_campaigns.task_id
      and public.is_workspace_manager(t.workspace_id)
  )
);

create policy "Public reads active Action QR links"
on public.woodpecker_task_campaigns
for select
to anon
using (
  exists (
    select 1
    from public.qr_campaigns as c
    where c.id = public.woodpecker_task_campaigns.campaign_id
      and c.is_active
  )
);
