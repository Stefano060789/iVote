-- Adds the response requirement selected when creating an Action.
alter table public.woodpecker_tasks
  add column if not exists response_mode text not null default 'scan'
  check (response_mode in ('scan', 'text', 'photo'));

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
  join public.qr_campaigns c on c.id=t.campaign_id
  where c.token=target_token and c.is_active
  order by t.created_at desc;
$$;

grant execute on function public.get_public_woodpecker_portal(text) to anon, authenticated;

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
