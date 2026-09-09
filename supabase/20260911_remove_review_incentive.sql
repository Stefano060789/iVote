-- Compliance fix: stop incentivizing/gating public reviews.
--
-- Most review platforms (Google, Tripadvisor, Yelp) prohibit rewarding a
-- customer for leaving a review, and prohibit asking for a review only from
-- customers who gave a positive answer ("review gating"). The application
-- code no longer offers or configures a review-linked benefit and no longer
-- gates the review link by answer sentiment. This migration removes the
-- server-side functions that created and approved review benefit claims, so
-- the incentive cannot be triggered even by calling the API directly.
--
-- The review_benefit_claims table and the review_benefit_* / review_trigger_answers
-- columns on public.polls are intentionally left in place for historical
-- record-keeping; they are simply no longer written to or read by the app.

drop function if exists public.create_review_benefit_claim(bigint, text[], text);
drop function if exists public.create_review_benefit_claim(bigint, text[]);
drop function if exists public.get_public_review_benefit_claim(uuid);
drop function if exists public.review_review_benefit_claim(bigint, text);
