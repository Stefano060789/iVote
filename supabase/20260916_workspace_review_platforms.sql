-- Reusable public review destinations configured once per workspace.
alter table public.workspaces
  add column if not exists review_platforms jsonb not null default '[]'::jsonb;
