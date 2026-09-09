-- Compliance fix: give every marketing email (lead nurture, win-back) a working
-- unsubscribe link, and honor it before sending. Required by CAN-SPAM, CASL,
-- and GDPR/PECR for any commercial/marketing email.
--
-- voter_profiles is already the one row per (workspace, email) that both the
-- nurture and win-back senders key off of, so a single suppression flag there
-- covers both email types.

alter table public.voter_profiles
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists idx_voter_profiles_unsubscribe_token
  on public.voter_profiles (unsubscribe_token);

-- Public, token-based unsubscribe: no login required, and the token is an
-- unguessable per-recipient value (not the raw email), so nobody can
-- unsubscribe an address they don't already have a link for.
create or replace function public.unsubscribe_voter_profile(target_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count int;
begin
  update public.voter_profiles
  set unsubscribed_at = coalesce(unsubscribed_at, now())
  where unsubscribe_token = target_token;

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

grant execute on function public.unsubscribe_voter_profile(uuid) to anon, authenticated;
