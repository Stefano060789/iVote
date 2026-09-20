-- Let poll creators decide whether voters can send a private message from the
-- poll page or the QR portal menu. The creator must explicitly opt in.
alter table public.polls
  add column if not exists allow_organizer_messages boolean not null default false;
