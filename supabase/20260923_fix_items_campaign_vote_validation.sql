-- Fix: voting, lead capture, and organizer messages all reject any QR campaign that
-- links its poll through public.qr_campaign_items (the newer "menu" system added in
-- 20260915_qr_campaign_items.sql) instead of the older qr_campaigns.poll_id column.
--
-- Each of the three functions below only ever checked:
--   qr_campaigns.poll_id = the poll being voted on
-- which is only true for the legacy single-default-poll campaigns. Any campaign built
-- through the QR wizard's "Add a poll" step (qr_campaign_items, item_type = 'poll')
-- has poll_id = null, so this check always failed for those campaigns and raised
-- "The QR campaign is not active for this poll." on every vote/lead/message - this is
-- the "submit vote is not working" bug.
--
-- Fix: accept either linkage - the legacy direct poll_id, or a matching row in
-- qr_campaign_items.

create or replace function public.assign_vote_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select workspace_id into new.workspace_id from public.polls where id = new.poll_id;
  if new.workspace_id is null then
    raise exception 'The poll does not exist.';
  end if;
  if new.campaign_id is not null and not exists (
    select 1 from public.qr_campaigns
    where id = new.campaign_id and is_active and (
      poll_id = new.poll_id
      or exists (
        select 1 from public.qr_campaign_items
        where campaign_id = new.campaign_id and item_type = 'poll' and poll_id = new.poll_id
      )
    )
  ) then
    raise exception 'The QR campaign is not active for this poll.';
  end if;

  new.staff_name := null;
  if new.campaign_id is not null then
    select assigned_staff_name into new.staff_name
    from public.qr_campaigns
    where id = new.campaign_id;
  end if;

  return new;
end;
$$;

create or replace function public.capture_voter_lead(
  target_poll_id bigint,
  target_campaign_id bigint,
  contact_email text,
  has_consented boolean
)
returns table(id bigint, visit_count int)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_workspace_id uuid;
  normalized_email text := lower(trim(contact_email));
  new_lead_id bigint;
  next_visit_count int;
begin
  if not has_consented or normalized_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Explicit consent and a valid email are required.';
  end if;

  select workspace_id into target_workspace_id from public.polls where id = target_poll_id;
  if target_workspace_id is null then raise exception 'The poll does not exist.'; end if;

  if target_campaign_id is not null and not exists (
    select 1 from public.qr_campaigns
    where id = target_campaign_id and is_active and (
      poll_id = target_poll_id
      or exists (
        select 1 from public.qr_campaign_items
        where campaign_id = target_campaign_id and item_type = 'poll' and poll_id = target_poll_id
      )
    )
  ) then raise exception 'The QR campaign is not active for this poll.'; end if;

  insert into public.voter_leads (workspace_id, poll_id, campaign_id, email)
  values (target_workspace_id, target_poll_id, target_campaign_id, normalized_email)
  on conflict (poll_id, email) do update set email = excluded.email
  returning voter_leads.id into new_lead_id;

  insert into public.voter_profiles (workspace_id, email, visit_count, first_seen_at, last_seen_at)
  values (target_workspace_id, normalized_email, 1, now(), now())
  on conflict (workspace_id, email) do update
    set visit_count = voter_profiles.visit_count + 1,
        last_seen_at = now(),
        winback_sent_at = null
  returning voter_profiles.visit_count into next_visit_count;

  return query select new_lead_id, next_visit_count;
end;
$$;

grant execute on function public.capture_voter_lead(bigint, bigint, text, boolean) to anon, authenticated;

create or replace function public.send_organizer_message(
  target_poll_id bigint,
  target_campaign_id bigint,
  message_text text,
  contact_email text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_workspace_id uuid;
  normalized_message text := trim(message_text);
  normalized_email text := nullif(lower(trim(coalesce(contact_email, ''))), '');
begin
  if char_length(normalized_message) not between 1 and 2000 then
    raise exception 'A message between 1 and 2000 characters is required.';
  end if;
  if normalized_email is not null and normalized_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid reply email or leave it blank.';
  end if;

  select workspace_id into target_workspace_id from public.polls where id = target_poll_id;
  if target_workspace_id is null then raise exception 'The poll does not exist.'; end if;
  if target_campaign_id is not null and not exists (
    select 1 from public.qr_campaigns
    where id = target_campaign_id and is_active and (
      poll_id = target_poll_id
      or exists (
        select 1 from public.qr_campaign_items
        where campaign_id = target_campaign_id and item_type = 'poll' and poll_id = target_poll_id
      )
    )
  ) then
    raise exception 'The QR campaign is not active for this poll.';
  end if;

  insert into public.organizer_messages (workspace_id, poll_id, campaign_id, message, reply_email)
  values (target_workspace_id, target_poll_id, target_campaign_id, normalized_message, normalized_email);
end;
$$;

grant execute on function public.send_organizer_message(bigint, bigint, text, text) to anon, authenticated;
