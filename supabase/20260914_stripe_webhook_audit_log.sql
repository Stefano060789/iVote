-- Stripe webhook audit trail + true idempotency, prompted by an external legal review (see
-- marketing/Godwit-Feature-Overview.md, Section 9 / Section 12). Before this migration, retries
-- from Stripe were only "accidentally" safe because every write in api/stripe-webhook.js used a
-- natural-key upsert (workspace_id, stripe_checkout_session_id, stripe_account_id) - replaying
-- the same event just re-wrote the same row. This table makes that explicit and auditable: every
-- verified webhook delivery is persisted with its raw payload (for after-the-fact investigation
-- of a payment/payout dispute), and event.id is now the actual idempotency key - a second
-- delivery of the same event is recognized and skipped before any side effects run.

create table if not exists public.stripe_webhook_events (
  id text primary key, -- Stripe's own event.id, e.g. "evt_...".
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  payload jsonb not null,
  error text
);

alter table public.stripe_webhook_events enable row level security;

-- Service-role only (the webhook handler uses the Supabase service key, which bypasses RLS
-- anyway) - no policies are added for authenticated/anon, so this table is not reachable from
-- the client at all, only from Supabase Studio or a future internal admin tool.
