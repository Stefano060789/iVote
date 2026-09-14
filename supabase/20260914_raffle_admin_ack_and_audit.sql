-- Prize draw admin-side safeguards, prompted by an external legal review (see
-- marketing/Godwit-Feature-Overview.md, Section 12, question 4). Voters already see a full
-- eligibility disclaimer and give explicit per-entry consent before their email is captured
-- (see vote.prizeDrawDisclaimer / vote.prizeDrawConsent in en.json) - but until now nothing
-- required the *admin* enabling the feature to confirm they had checked their own local
-- promotional/sweepstakes-law obligations, and no audit trail existed proving who was actually
-- in the running at the moment a winner was picked.

create extension if not exists pgcrypto;

alter table public.polls
  add column if not exists raffle_terms_acknowledged boolean not null default false,
  add column if not exists raffle_rules_url text;

comment on column public.polls.raffle_terms_acknowledged is
  'The admin confirmed, at the point they turned this on, that they had checked their own local promotional/sweepstakes-law obligations for this prize draw.';
comment on column public.polls.raffle_rules_url is
  'Optional link to the venue''s own full official rules, shown to voters alongside the built-in eligibility disclaimer.';

alter table public.polls drop constraint if exists polls_raffle_requires_ack;
alter table public.polls
  add constraint polls_raffle_requires_ack
  check (not raffle_enabled or raffle_terms_acknowledged);

-- Auditable record of every prize draw: who was in the running (as salted-by-nothing but
-- one-way sha256 hashes, not plain emails, so this audit log itself doesn't become another
-- place holding voter PII) and who won, so a disputed or investigated draw can be verified
-- after the fact without re-exposing the entrant list.
create table if not exists public.raffle_draw_audit (
  id bigint generated always as identity primary key,
  poll_id bigint not null references public.polls(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  drawn_by uuid references auth.users(id),
  drawn_at timestamptz not null default now(),
  entrant_count integer not null,
  entrant_email_hashes jsonb not null,
  winner_email_hash text not null
);

alter table public.raffle_draw_audit enable row level security;

drop policy if exists "managers can view their raffle draw audit" on public.raffle_draw_audit;
create policy "managers can view their raffle draw audit" on public.raffle_draw_audit
for select to authenticated using (public.is_workspace_member(workspace_id));

-- No insert/update/delete policy for regular authenticated users: rows are only ever written
-- by pick_raffle_winner() below, running as security definer.

create or replace function public.pick_raffle_winner(target_poll_id bigint)
returns table(email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_workspace_id uuid;
  winner_email text;
  acknowledged boolean;
  entrant_hashes jsonb;
  entrant_total integer;
begin
  select workspace_id, raffle_terms_acknowledged into target_workspace_id, acknowledged
  from public.polls where id = target_poll_id;
  if target_workspace_id is null then raise exception 'The poll does not exist.'; end if;
  if not public.is_workspace_manager(target_workspace_id) then
    raise exception 'You do not have access to manage this poll.';
  end if;
  if not coalesce(acknowledged, false) then
    raise exception 'Confirm this prize draw''s eligibility rules before picking a winner.';
  end if;

  select coalesce(jsonb_agg(encode(digest(lower(trim(voter_leads.email)), 'sha256'), 'hex')), '[]'::jsonb),
         count(*)
  into entrant_hashes, entrant_total
  from public.voter_leads
  where voter_leads.poll_id = target_poll_id;

  if entrant_total = 0 then
    raise exception 'No prize draw entries yet for this poll.';
  end if;

  select voter_leads.email into winner_email
  from public.voter_leads
  where voter_leads.poll_id = target_poll_id
  order by random()
  limit 1;

  update public.polls
  set raffle_winner_email = winner_email, raffle_winner_picked_at = now()
  where id = target_poll_id;

  insert into public.raffle_draw_audit
    (poll_id, workspace_id, drawn_by, entrant_count, entrant_email_hashes, winner_email_hash)
  values (
    target_poll_id,
    target_workspace_id,
    auth.uid(),
    entrant_total,
    entrant_hashes,
    encode(digest(lower(trim(winner_email)), 'sha256'), 'hex')
  );

  return query select winner_email;
end;
$$;

grant execute on function public.pick_raffle_winner(bigint) to authenticated;
