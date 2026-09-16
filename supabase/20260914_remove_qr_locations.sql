-- Remove the legacy "Simple QR codes (older, single-poll)" system entirely, per explicit
-- operator request (simplification pass following a feature-gap audit - see docs/TODO.md).
-- qr_campaigns fully supersedes it (same single-poll capability, plus multi-item menus,
-- placement/variant tracking, and a welcome portal). The admin UI for creating/managing
-- qr_locations, and the poll-card cross-link display's location branch, were already removed
-- from Admin.jsx; this finishes the job on the database side.
--
-- Safety guard: only actually drops the table if it's empty. If it isn't (unexpected, but this
-- table predates the current QR system and wasn't possible to fully audit across every
-- workspace from this session), the migration raises a notice and leaves the table alone
-- rather than silently discarding real data - rerun once you've confirmed / exported any
-- remaining rows.
do $$
declare
  row_count bigint;
begin
  select count(*) into row_count from public.qr_locations;
  if row_count = 0 then
    drop table public.qr_locations;
  else
    raise notice 'qr_locations still has % row(s) - table left in place. Review it, then drop manually: drop table public.qr_locations;', row_count;
  end if;
end;
$$;
