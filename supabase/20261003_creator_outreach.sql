-- Creator-controlled outreach queue and delivery audit trail.
-- This stores drafts only; no real contacts are seeded by this migration.

create extension if not exists pgcrypto;

create table if not exists public.creator_outreach_contacts (
  id uuid primary key default gen_random_uuid(),
  company_name text,
  country text,
  city text,
  business_type text,
  website text,
  contact_name text,
  contact_role text,
  contact_email text,
  source_url text,
  personalization_note text,
  subject text,
  message text,
  business_review_status text not null default 'pending' check (business_review_status in ('pending', 'approved', 'rejected')),
  message_review_status text not null default 'pending' check (message_review_status in ('pending', 'approved', 'rejected')),
  status text not null default 'draft' check (status in ('draft', 'approved', 'sent', 'replied', 'opted_out', 'bounced')),
  approved_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.creator_outreach_contacts
  add column if not exists business_review_status text not null default 'pending',
  add column if not exists message_review_status text not null default 'pending';
alter table public.creator_outreach_contacts
  add column if not exists last_reply_at timestamptz,
  add column if not exists reply_needs_action boolean not null default false;

update public.creator_outreach_contacts
set business_review_status = case when status in ('approved', 'sent', 'replied') then 'approved' else 'pending' end,
    message_review_status = case when status in ('approved', 'sent', 'replied') then 'approved' else 'pending' end
where business_review_status = 'pending' and message_review_status = 'pending';

alter table public.creator_outreach_contacts
  drop constraint if exists creator_outreach_contacts_business_review_status_check;
alter table public.creator_outreach_contacts
  add constraint creator_outreach_contacts_business_review_status_check
  check (business_review_status in ('pending', 'approved', 'rejected'));
alter table public.creator_outreach_contacts
  drop constraint if exists creator_outreach_contacts_message_review_status_check;
alter table public.creator_outreach_contacts
  add constraint creator_outreach_contacts_message_review_status_check
  check (message_review_status in ('pending', 'approved', 'rejected'));

create table if not exists public.creator_outreach_delivery_log (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.creator_outreach_contacts(id) on delete set null,
  provider_message_id text,
  recipient text not null,
  subject text,
  status text not null check (status in ('attempted', 'sent', 'error')),
  error text,
  sent_at timestamptz not null default now()
);

create table if not exists public.creator_outreach_suppressions (
  email text primary key check (email = lower(trim(email))),
  reason text not null default 'manual',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_outreach_replies (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.creator_outreach_contacts(id) on delete cascade,
  gmail_message_id text not null unique,
  thread_id text,
  from_email text not null,
  subject text,
  text_body text,
  received_at timestamptz not null,
  needs_action boolean not null default true,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_creator_outreach_contacts_status
  on public.creator_outreach_contacts (status, approved_at, created_at);
create index if not exists idx_creator_outreach_delivery_log_sent_at
  on public.creator_outreach_delivery_log (sent_at desc);
create index if not exists idx_creator_outreach_delivery_log_contact
  on public.creator_outreach_delivery_log (contact_id, sent_at desc);

create or replace function public.set_creator_outreach_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists creator_outreach_contacts_set_updated_at on public.creator_outreach_contacts;
create trigger creator_outreach_contacts_set_updated_at
before update on public.creator_outreach_contacts
for each row execute procedure public.set_creator_outreach_updated_at();

alter table public.creator_outreach_contacts enable row level security;
alter table public.creator_outreach_delivery_log enable row level security;
alter table public.creator_outreach_suppressions enable row level security;
alter table public.creator_outreach_replies enable row level security;

drop policy if exists "creators can manage outreach contacts" on public.creator_outreach_contacts;
create policy "creators can manage outreach contacts" on public.creator_outreach_contacts
for all to authenticated using (public.is_creator()) with check (public.is_creator());

drop policy if exists "creators can manage outreach delivery logs" on public.creator_outreach_delivery_log;
create policy "creators can manage outreach delivery logs" on public.creator_outreach_delivery_log
for all to authenticated using (public.is_creator()) with check (public.is_creator());

drop policy if exists "creators can manage outreach suppressions" on public.creator_outreach_suppressions;
create policy "creators can manage outreach suppressions" on public.creator_outreach_suppressions
for all to authenticated using (public.is_creator()) with check (public.is_creator());
drop policy if exists "creators can manage outreach replies" on public.creator_outreach_replies;
create policy "creators can manage outreach replies" on public.creator_outreach_replies
for all to authenticated using (public.is_creator()) with check (public.is_creator());

create or replace function public.creator_review_outreach_reply(target_reply_id uuid)
returns setof public.creator_outreach_replies
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_creator() then
    raise exception 'Creator access is required.';
  end if;
  update public.creator_outreach_replies
  set needs_action = false, reviewed_at = now()
  where id = target_reply_id;
  update public.creator_outreach_contacts contact
  set reply_needs_action = exists (
    select 1 from public.creator_outreach_replies reply
    where reply.contact_id = contact.id and reply.needs_action
  )
  where contact.id = (select contact_id from public.creator_outreach_replies where id = target_reply_id);
  return query select * from public.creator_outreach_replies where id = target_reply_id;
end;
$$;

create or replace function public.creator_approve_outreach_contact(target_contact_id uuid)
returns setof public.creator_outreach_contacts
language plpgsql
security definer
set search_path = public
as $$
declare
  approved_contact public.creator_outreach_contacts%rowtype;
begin
  if not public.is_creator() then
    raise exception 'Creator access is required.';
  end if;

  update public.creator_outreach_contacts
  set status = 'approved',
      approved_at = coalesce(approved_at, now()),
      last_error = null
  where id = target_contact_id
    and status in ('draft', 'approved')
  returning * into approved_contact;

  if not found then
    raise exception 'Outreach contact cannot be approved.';
  end if;

  return next approved_contact;
end;
$$;

create or replace function public.creator_list_outreach_queue(result_limit int default 100)
returns setof public.creator_outreach_contacts
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_creator() then
    raise exception 'Creator access is required.';
  end if;

  return query
    select *
    from public.creator_outreach_contacts
    where status in ('draft', 'approved')
    order by
      case status when 'approved' then 0 else 1 end,
      approved_at nulls last,
      created_at
    limit greatest(1, least(coalesce(result_limit, 100), 500));
end;
$$;

create or replace function public.creator_list_outreach_logs(result_limit int default 100)
returns table(
  contact_id uuid,
  provider_message_id text,
  recipient text,
  subject text,
  status text,
  error text,
  sent_at timestamptz,
  company_name text,
  contact_email text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_creator() then
    raise exception 'Creator access is required.';
  end if;

  return query
    select
      log.contact_id,
      log.provider_message_id,
      log.recipient,
      log.subject,
      log.status,
      log.error,
      log.sent_at,
      contact.company_name,
      contact.contact_email
    from public.creator_outreach_delivery_log log
    left join public.creator_outreach_contacts contact on contact.id = log.contact_id
    order by log.sent_at desc
    limit greatest(1, least(coalesce(result_limit, 100), 500));
end;
$$;

grant execute on function public.creator_approve_outreach_contact(uuid) to authenticated;
grant execute on function public.creator_list_outreach_queue(int) to authenticated;
grant execute on function public.creator_list_outreach_logs(int) to authenticated;

create or replace function public.creator_review_outreach_contact(
  target_contact_id uuid,
  review_area text,
  decision text
)
returns setof public.creator_outreach_contacts
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_creator() then
    raise exception 'Creator access is required.';
  end if;
  if review_area not in ('business', 'message') then
    raise exception 'Review area must be business or message.';
  end if;
  if decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected.';
  end if;

  if review_area = 'business' then
    update public.creator_outreach_contacts
    set business_review_status = decision,
        status = case when decision = 'rejected' then 'draft' else status end,
        last_error = null
    where id = target_contact_id and status not in ('sent', 'replied');
  else
    update public.creator_outreach_contacts
    set message_review_status = decision,
        status = case when decision = 'rejected' then 'draft' else status end,
        last_error = null
    where id = target_contact_id and status not in ('sent', 'replied');
  end if;

  if not found then
    raise exception 'Outreach contact cannot be reviewed.';
  end if;

  return query select * from public.creator_outreach_contacts where id = target_contact_id;
end;
$$;

grant execute on function public.creator_review_outreach_contact(uuid, text, text) to authenticated;
grant execute on function public.creator_review_outreach_reply(uuid) to authenticated;
