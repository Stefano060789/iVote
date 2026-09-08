-- Tracks how many times a poll's shared reward code has been redeemed by staff.
alter table public.polls
  add column if not exists reward_redeemed_count integer not null default 0;

create or replace function public.redeem_reward_code(target_code text)
returns table(poll_id bigint, question text, reward_redeemed_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_poll_id bigint;
begin
  select id into matched_poll_id
  from public.polls
  where reward_code = target_code and workspace_id = public.current_workspace_id();

  if matched_poll_id is null then
    raise exception 'No poll in your workspace has that reward code.';
  end if;

  update public.polls set reward_redeemed_count = reward_redeemed_count + 1
  where id = matched_poll_id;

  return query select id, polls.question, polls.reward_redeemed_count from public.polls where id = matched_poll_id;
end;
$$;

grant execute on function public.redeem_reward_code(text) to authenticated;
