-- Pilot-readiness fixes: notify workspaces immediately when a new content report is filed,
-- instead of relying on a manager remembering to check the moderation page.
-- Prerequisite: 20260907_launch_foundation.sql (defines report_public_user_answer).

drop function if exists public.report_public_user_answer(bigint, text, text);

create or replace function public.report_public_user_answer(target_poll_id bigint, target_answer text, report_reason text)
returns table(id bigint, workspace_id uuid)
language plpgsql security definer set search_path = public as $$
declare target_workspace_id uuid; new_report_id bigint;
begin
  if report_reason not in ('offensive', 'personal_data', 'spam', 'other') then raise exception 'Invalid report reason.'; end if;
  select p.workspace_id into target_workspace_id from public.polls p where p.id = target_poll_id;
  if target_workspace_id is null or not exists (
    select 1 from public.user_answers where poll_id = target_poll_id and answer = trim(target_answer) and not is_hidden
  ) then raise exception 'The answer cannot be reported.'; end if;

  insert into public.content_reports (workspace_id, poll_id, reported_answer, reason)
  values (target_workspace_id, target_poll_id, trim(target_answer), report_reason)
  returning content_reports.id into new_report_id;

  return query select new_report_id, target_workspace_id;
end;
$$;

grant execute on function public.report_public_user_answer(bigint, text, text) to anon, authenticated;
