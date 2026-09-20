-- Make private organizer messages an explicit creator opt-in for polls created
-- before the setting was introduced as well as new polls.
alter table public.polls
  alter column allow_organizer_messages set default false;

update public.polls
set allow_organizer_messages = false
where allow_organizer_messages is distinct from false;
