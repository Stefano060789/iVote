-- Aggregate analytics queries so dashboards and public result pages do not
-- download complete vote, scan, or lead tables.

create index if not exists idx_votes_poll_created
  on public.votes (poll_id, created_at desc);

create index if not exists idx_user_answers_poll_hidden
  on public.user_answers (poll_id, is_hidden);

create index if not exists idx_qr_scan_events_campaign_created
  on public.qr_scan_events (campaign_id, created_at desc);

create index if not exists idx_voter_leads_campaign
  on public.voter_leads (campaign_id);

create or replace function public.get_public_poll_vote_summary(target_poll_id bigint)
returns table(
  answer text,
  vote_count bigint,
  total_votes bigint,
  votes_today bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with scoped_votes as (
    select vote.answer, vote.created_at
    from public.votes vote
    where vote.poll_id = target_poll_id
  ),
  totals as (
    select
      count(*)::bigint as total_votes,
      count(*) filter (
        where created_at >= date_trunc('day', now())
      )::bigint as votes_today
    from scoped_votes
  )
  select
    scoped_votes.answer,
    count(*)::bigint as vote_count,
    totals.total_votes,
    totals.votes_today
  from scoped_votes
  cross join totals
  group by scoped_votes.answer, totals.total_votes, totals.votes_today;
$$;

create or replace function public.get_public_poll_vote_timeline(target_poll_id bigint)
returns table(minute timestamptz, vote_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    date_trunc('minute', vote.created_at) as minute,
    count(*)::bigint as vote_count
  from public.votes vote
  where vote.poll_id = target_poll_id
  group by date_trunc('minute', vote.created_at)
  order by minute asc;
$$;

grant execute on function public.get_public_poll_vote_summary(bigint) to anon, authenticated;
grant execute on function public.get_public_poll_vote_timeline(bigint) to anon, authenticated;

create or replace function public.get_workspace_vote_counts()
returns table(poll_id bigint, campaign_id bigint, vote_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    vote.poll_id,
    vote.campaign_id,
    count(*)::bigint as vote_count
  from public.votes vote
  where vote.workspace_id = public.current_workspace_id()
  group by vote.poll_id, vote.campaign_id;
$$;

create or replace function public.get_workspace_vote_timeline()
returns table(hour timestamptz, vote_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    date_trunc('hour', vote.created_at) as hour,
    count(*)::bigint as vote_count
  from public.votes vote
  where vote.workspace_id = public.current_workspace_id()
  group by date_trunc('hour', vote.created_at)
  order by hour asc;
$$;

create or replace function public.get_workspace_campaign_metrics()
returns table(
  campaign_id bigint,
  scan_count bigint,
  response_count bigint,
  lead_count bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with campaigns as (
    select campaign.id
    from public.qr_campaigns campaign
    where campaign.workspace_id = public.current_workspace_id()
  ),
  scans as (
    select event.campaign_id, count(*)::bigint as scan_count
    from public.qr_scan_events event
    join campaigns on campaigns.id = event.campaign_id
    group by event.campaign_id
  ),
  responses as (
    select vote.campaign_id, count(*)::bigint as response_count
    from public.votes vote
    join campaigns on campaigns.id = vote.campaign_id
    group by vote.campaign_id
  ),
  leads as (
    select lead.campaign_id, count(*)::bigint as lead_count
    from public.voter_leads lead
    join campaigns on campaigns.id = lead.campaign_id
    group by lead.campaign_id
  )
  select
    campaigns.id as campaign_id,
    coalesce(scans.scan_count, 0)::bigint,
    coalesce(responses.response_count, 0)::bigint,
    coalesce(leads.lead_count, 0)::bigint
  from campaigns
  left join scans on scans.campaign_id = campaigns.id
  left join responses on responses.campaign_id = campaigns.id
  left join leads on leads.campaign_id = campaigns.id;
$$;

grant execute on function public.get_workspace_vote_counts() to authenticated;
grant execute on function public.get_workspace_vote_timeline() to authenticated;
grant execute on function public.get_workspace_campaign_metrics() to authenticated;
