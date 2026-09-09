# iVote launch setup

## Database requirement

Run these files in the Supabase SQL Editor, in this exact order, against the production project:

1. `supabase/20260907_secure_workspaces.sql`
2. `supabase/20260907_roi_roadmap.sql`
3. `supabase/20260907_launch_foundation.sql`
4. `supabase/20260908_retention_benchmark_api.sql`
5. `supabase/20260908_feedback_reports_qr_experiments.sql` if feedback reports and weekly reports are enabled
6. `supabase/20260909_feedback_benefits.sql` for answer-triggered email and external-review benefits

The final migration is additive. It creates workspace subscription records, secure plan-limit RPCs, privacy request records, and user-answer content reports. Do not run ad hoc deletes for account deletion requests; review `privacy_requests` and follow the documented retention process approved by counsel.

## Vercel environment variables

Set these in Vercel for the Production environment. Do not put service-role, Stripe secret, or webhook values in `VITE_` variables.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Browser Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Browser public anon key |
| `SUPABASE_URL` | Yes | Server Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Server-side user-token validation |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Webhook-only subscription update authority |
| `APP_URL` | Yes | Canonical deployed application URL, no trailing slash |
| `STRIPE_SECRET_KEY` | For paid plans | Stripe secret API key |
| `STRIPE_PRICE_STARTER` | For Starter | Stripe recurring EUR 29 price ID |
| `STRIPE_PRICE_GROWTH` | For Growth | Stripe recurring EUR 79 price ID |
| `STRIPE_WEBHOOK_SECRET` | For webhook | Signing secret for the Stripe webhook endpoint |
| `VITE_SENTRY_DSN` | Optional | Browser error reporting; no events are sent when absent |
| `VITE_SUPPORT_EMAIL` | Before launch | Support mailbox displayed to customers |
| `OPENAI_API_KEY` | Optional | Existing QR poster image generation endpoint only |

Create a Stripe webhook for `https://YOUR_DOMAIN/api/stripe-webhook` and subscribe to `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`. Stripe must send the raw request body unchanged; the endpoint validates the `Stripe-Signature` header using Node's built-in crypto API.

## Payments and limits

The UI proposes Free at EUR 0, Starter at EUR 29/month, and Growth at EUR 79/month. Change displayed pricing and matching Stripe Price IDs together before launch. Free is the default plan. Database enforcement allows Free: 3 polls/0 tracked campaigns, Starter: 25/10, Growth: 250/100. Poll and campaign creation are enforced by database triggers.

## Security and abuse controls

Enable Supabase email confirmation, MFA for workspace owners, a strong password policy, and configured redirect URLs for `/account`. Apply Vercel Firewall and rate-limit `/api/create-checkout-session`, `/api/stripe-webhook`, and poster generation. Without an Upstash or equivalent shared store, do not ship a process-local rate limiter: Vercel serverless instances do not share state. Use Vercel WAF rate limiting first, then add Upstash Redis if product-level per-user quotas are required.

Keep RLS enabled, never expose `SUPABASE_SERVICE_ROLE_KEY`, rotate Stripe and Supabase secrets on personnel changes, and test that an editor cannot access another workspace. Confirm Content Security Policy, HTTPS redirects, and Vercel deployment protection match the chosen public-launch posture.

## Privacy, moderation, email, and operations

The Privacy and Terms pages now contain real, product-accurate content instead of a placeholder, but still have two bracketed fields (`OPERATOR_NAME`, `OPERATOR_ADDRESS` in `src/pages/Legal.jsx`) that only you can fill in - your legal business name and registered address. Fill those in, then have a lawyer review before scaling meaningfully past a small local pilot. The Account page makes revocation, export, and account-deletion requests reviewable rather than irreversibly removing production data. Configure a private operational process for reviewing and resolving those requests.

Configure transactional mail through Supabase Auth SMTP using a verified sender domain and a provider such as Postmark, Resend, or Amazon SES. Test sign-up confirmation, password recovery, and changed-email messages in production with SPF, DKIM, and DMARC in place. Do not use a personal mailbox as the sender.

Create daily Supabase backups/PITR appropriate to the plan, perform a restoration exercise before launch, and document retention and restore ownership. Configure Sentry alert rules for new frontend errors and Vercel alerts for function failures and elevated 4xx/5xx rates. Send alerts to the configured on-call/support channel only after it exists.

## Launch checks

1. Run `npm run build` and `node --check api/create-checkout-session.js` plus `node --check api/stripe-webhook.js`.
2. Test anonymous voting, an opted-in lead, a reported custom answer, and moderator hide/dismiss actions.
3. Test Free poll-limit rejection and a paid Stripe test-mode checkout followed by webhook delivery.
4. Test password recovery, consent withdrawal, export request, and deletion request.
5. Replace legal draft content, support contact, Stripe test keys, and placeholder operational ownership before public launch.