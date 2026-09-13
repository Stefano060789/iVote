-- Support automatic, AI-based content moderation of voter-submitted free-text answers
-- (api/classify-sentiment.js), distinct from a human voter reporting an answer via the
-- existing "Report" button. Widens the reason a content_reports row can carry so an admin
-- reviewing the moderation queue can tell "a person flagged this" apart from "our AI flagged
-- this automatically" at a glance.

alter table public.content_reports drop constraint if exists content_reports_reason_check;
alter table public.content_reports add constraint content_reports_reason_check
  check (reason in ('offensive', 'personal_data', 'spam', 'other', 'policy_violation'));
