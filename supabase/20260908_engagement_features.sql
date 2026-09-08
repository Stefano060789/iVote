-- AI sentiment tagging on free-text answers
alter table public.user_answers
  add column if not exists sentiment text check (sentiment in ('positive', 'neutral', 'negative'));

-- Admin-configurable prize draw per poll
alter table public.polls
  add column if not exists raffle_enabled boolean not null default false,
  add column if not exists raffle_prize text,
  add column if not exists raffle_winner_email text,
  add column if not exists raffle_winner_picked_at timestamptz;

-- Track whether a nurture email was already sent for a captured lead
alter table public.voter_leads
  add column if not exists nurture_sent_at timestamptz;

-- Admin-configurable nurture email sent when a voter opts in to follow-up
create table if not exists public.lead_nurture_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  is_enabled boolean not null default false,
  subject text,
  message text,
  updated_at timestamptz not null default now()
);

alter table public.lead_nurture_settings enable row level security;

drop policy if exists "managers can view their lead nurture settings" on public.lead_nurture_settings;
drop policy if exists "managers can manage their lead nurture settings" on public.lead_nurture_settings;

create policy "managers can view their lead nurture settings" on public.lead_nurture_settings
for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "managers can manage their lead nurture settings" on public.lead_nurture_settings
for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_manager(workspace_id));

-- Return the new lead's id so the client can dispatch a webhook or nurture email for it.
drop function if exists public.capture_voter_lead(bigint, bigint, text, boolean);

create or replace function public.capture_voter_lead(
  target_poll_id bigint,
  target_campaign_id bigint,
  contact_email text,
  has_consented boolean
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  target_workspace_id uuid;
  normalized_email text := lower(trim(contact_email));
  new_lead_id bigint;
begin
  if not has_consented or normalized_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Explicit consent and a valid email are required.';
  end if;
  select workspace_id into target_workspace_id from public.polls where id = target_poll_id;
  if target_workspace_id is null then raise exception 'The poll does not exist.'; end if;
  if target_campaign_id is not null and not exists (
    select 1 from public.qr_campaigns where id = target_campaign_id and poll_id = target_poll_id and is_active
  ) then raise exception 'The QR campaign is not active for this poll.'; end if;
  insert into public.voter_leads (workspace_id, poll_id, campaign_id, email)
  values (target_workspace_id, target_poll_id, target_campaign_id, normalized_email)
  on conflict (poll_id, email) do update set email = excluded.email
  returning id into new_lead_id;
  return new_lead_id;
end;
$$;

grant execute on function public.capture_voter_lead(bigint, bigint, text, boolean) to anon, authenticated;

-- Lets a workspace manager pick a random entrant among voter_leads captured while a poll's raffle was enabled.
create or replace function public.pick_raffle_winner(target_poll_id bigint)
returns table(email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_workspace_id uuid;
  winner_email text;
begin
  select workspace_id into target_workspace_id from public.polls where id = target_poll_id;
  if target_workspace_id is null then raise exception 'The poll does not exist.'; end if;
  if not public.is_workspace_manager(target_workspace_id) then
    raise exception 'You do not have access to manage this poll.';
  end if;

  select voter_leads.email into winner_email
  from public.voter_leads
  where voter_leads.poll_id = target_poll_id
  order by random()
  limit 1;

  if winner_email is null then
    raise exception 'No prize draw entries yet for this poll.';
  end if;

  update public.polls
  set raffle_winner_email = winner_email, raffle_winner_picked_at = now()
  where id = target_poll_id;

  return query select winner_email;
end;
$$;

grant execute on function public.pick_raffle_winner(bigint) to authenticated;
