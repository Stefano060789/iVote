-- Let poll creators decide whether voters can send a private message from the
-- poll page or the QR portal menu. Existing polls keep the current behavior.
alter table public.polls
  add column if not exists allow_organizer_messages boolean not null default true;
