-- Creator-only operational overview and explicit free pilot settings.

create table if not exists public.creator_access (
  email text primary key check (email = lower(trim(email)))
);

insert into public.creator_access (email)
values ('bonomistefano@outlook.it')
on conflict (email) do nothing;

create table if not exists public.creator_settings (
  id boolean primary key default true check (id),
  pilot_end_date date not null default date '2026-10-01',
  updated_at timestamptz not null default now()
);

insert into public.creator_settings (id)
values (true)
on conflict (id) do nothing;

alter table public.creator_access enable row level security;
alter table public.creator_settings enable row level security;

create or replace function public.is_creator()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.creator_access
    where email = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

create or replace function public.creator_pilot_end_date()
returns date
language sql
security definer
set search_path = public
stable
as $$
  select pilot_end_date
  from public.creator_settings
  where public.is_creator()
  limit 1;
$$;

create or replace function public.pilot_end_date()
returns date
language sql
security definer
set search_path = public
stable
as $$
  select pilot_end_date from public.creator_settings where id;
$$;

create or replace function public.creator_update_pilot_end_date(target_end_date date)
returns date
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_creator() then
    raise exception 'Creator access is required.';
  end if;
  if target_end_date is null then
    raise exception 'A pilot end date is required.';
  end if;

  update public.creator_settings
  set pilot_end_date = target_end_date, updated_at = now()
  where id;
  return target_end_date;
end;
$$;

create or replace function public.creator_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  result jsonb;
begin
  if not public.is_creator() then
    raise exception 'Creator access is required.';
  end if;

  select jsonb_build_object(
    'users', (select count(*) from auth.users),
    'venues', (select count(*) from public.workspaces),
    'members', (select count(*) from public.workspace_members where user_id is not null),
    'polls', (select count(*) from public.polls),
    'active_polls', (select count(*) from public.polls
      where closed_at is null
        and (starts_at is null or starts_at <= now())
        and (ends_at is null or ends_at > now())),
    'qr_codes', (select count(*) from public.qr_campaigns),
    'active_qr_codes', (select count(*) from public.qr_campaigns where is_active),
    'actions', (select count(*) from public.woodpecker_tasks),
    'open_actions', (select count(*) from public.woodpecker_tasks where status = 'open'),
    'pilot_end_date', (select pilot_end_date from public.creator_settings where id),
    'venue_rows', coalesce((
      select jsonb_agg(row_to_json(venue_row) order by venue_row.created_at desc)
      from (
        select
          w.id,
          w.name,
          w.created_at,
          coalesce(owner_member.email, owner_user.email) as owner_email,
          (select count(*) from public.workspace_members m where m.workspace_id = w.id and m.user_id is not null) as member_count,
          (select count(*) from public.polls p where p.workspace_id = w.id) as poll_count,
          (select count(*) from public.polls p where p.workspace_id = w.id
            and p.closed_at is null
            and (p.starts_at is null or p.starts_at <= now())
            and (p.ends_at is null or p.ends_at > now())) as active_poll_count,
          (select count(*) from public.qr_campaigns c where c.workspace_id = w.id) as qr_count,
          (select count(*) from public.qr_campaigns c where c.workspace_id = w.id and c.is_active) as active_qr_count,
          (select count(*) from public.woodpecker_tasks a where a.workspace_id = w.id) as action_count,
          (select count(*) from public.woodpecker_tasks a where a.workspace_id = w.id and a.status = 'open') as open_action_count
        from public.workspaces w
        left join public.workspace_members owner_member
          on owner_member.workspace_id = w.id and owner_member.user_id = w.owner_id
        left join auth.users owner_user on owner_user.id = w.owner_id
      ) venue_row
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

grant execute on function public.is_creator() to authenticated;
grant execute on function public.creator_pilot_end_date() to authenticated;
grant execute on function public.pilot_end_date() to authenticated;
grant execute on function public.creator_update_pilot_end_date(date) to authenticated;
grant execute on function public.creator_overview() to authenticated;
