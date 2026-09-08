-- Adds post-vote reward/review fields and a workspace webhook URL.
alter table public.polls
  add column if not exists reward_message text,
  add column if not exists reward_code text,
  add column if not exists reward_url text,
  add column if not exists review_url text;

alter table public.workspaces
  add column if not exists webhook_url text;
