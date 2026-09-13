# Godwit — open items to come back to

Things that are known gaps or still need a human action, not forgotten. Fully-resolved work
is summarized in one line rather than kept as a long changelog - check git history for the
full story on anything marked done. Check this file periodically and clear items as you
address them.

## Open action items (needs you, not code)

- [x] **Stripe Connect enabled** (test mode) - business model "You collect payments and pay
  recipients" (marketplace/destination charges), matching `api/create-checkout-session.js`'s
  destination-charge implementation.
- [x] **Second webhook destination created for Connect events** - turns out a webhook
  destination's scope (Your account vs. Connected accounts) is fixed at creation and can't be
  added to an existing endpoint, so this needed its own destination: "Godwit Connect webhook",
  scoped to Connected accounts, event `account.updated`, same URL as the existing webhook. Its
  signing secret must be set as a new env var, `STRIPE_CONNECT_WEBHOOK_SECRET` (different from
  `STRIPE_WEBHOOK_SECRET`) - `api/stripe-webhook.js` now checks incoming signatures against
  both. **Still to do**: add `STRIPE_CONNECT_WEBHOOK_SECRET` to Vercel's environment variables
  (test mode value done in Stripe; still needs setting in Vercel, and repeating for live mode
  once you go live - live/test webhook destinations and secrets are separate). See
  `LAUNCH_SETUP.md`'s "Stripe Connect setup" section for the full walkthrough.
- [x] **Checked `STRIPE_PRICE_STARTER`/`STRIPE_PRICE_GROWTH` for a duplicate trial.** Growth is
  fully clean (no legacy trial field, no dashboard "Trials" entries). Starter's own price also
  has an empty legacy trial field, but the product has a dashboard-level "Trials" (Preview)
  entry - a paired €0 price transitioning to the real price after 1 month, created via the
  Stripe dashboard's newer trial UI (separate from `api/create-checkout-session.js`'s
  `subscription_data.trial_period_days=30`). Confirmed this only takes effect through a
  Payment Link/Pricing Table, and the account has zero Payment Links, so it's currently
  **inert** - it cannot double up with the app's own trial today. Attempted to remove it via
  the dashboard (archiving the paired price) but Stripe's UI for this Preview feature doesn't
  yet expose a delete action (400 error on archive attempt; the price's only row action is
  "Copy trial ID"). **Watch for later**: if a Payment Link or Pricing Table is ever created
  for the Starter plan, double-check it doesn't inherit this free-trial pairing unintentionally.
- [x] Ran the pending migrations: `supabase/20260917_donations_stripe_connect.sql` and
  `supabase/20260918_qr_item_images.sql`.

## Robin's persona guide

- [x] Robin's Overview-tab guide (artist/creator, cafe/restaurant/shop, museum/city/venue -
  each a tailored checklist of existing features) and optional images on QR "info" cards
  (`supabase/20260918_qr_item_images.sql`) shipped.
- [ ] **Ideas surfaced but not built** (lower priority, revisit if a real user asks):
  - A dedicated "gallery"/portfolio item type (multiple images in one card) for artists with
    a lot of work to show, rather than one image per info card.
  - Accessibility tagging (wheelchair access, audio description available, etc.) for museum/
    city info cards - currently just free-text body copy, which works but isn't structured.
  - Surfacing entitlement limits (e.g. Free plan's `campaignLimit: 0`) directly inside Robin's
    guide before a step, rather than relying on the destination tab's own upgrade prompt.

## QR code donations (Stripe Connect, 10% platform fee)

- [x] Donations were rebuilt from a free IBAN/SEPA-QR display into a real Stripe Connect
  payment flow: each workspace connects an Express account, a destination-charge Checkout
  Session splits every donation 90% workspace / 10% Godwit automatically, and the fee is
  disclosed on the donation card itself and in `Legal.jsx`. See
  `supabase/20260917_donations_stripe_connect.sql` and `api/create-checkout-session.js`'s
  `mode` dispatch for the implementation. The Stripe Dashboard setup this needs is tracked
  above under "Open action items".

## Hosting / deployment

- [x] Fixed a Vercel Hobby-plan deploy failure (12-serverless-function cap) by consolidating
  4 cron-only endpoints into `api/cron.js` and moving job logic to `lib/cron/` (outside
  `api/`, so it doesn't count toward the limit).
- **Still true and worth remembering**: the project sits at exactly 12/12 API functions with
  zero headroom. Before adding any new `api/*.js` file, consolidate an existing one first
  (e.g. `notify-content-report.js` + `dispatch-webhook.js` could merge into one
  action-dispatched function) or upgrade to Vercel Pro.

## Billing

- [x] 30-day free trial on Starter and Growth, gated to first-time subscribers only
  (`api/create-checkout-session.js`, `Billing.jsx`). See "Open action items" above for the
  one remaining manual Stripe Dashboard check.

## Product

- [ ] **No churn/usage instrumentation.** The dashboard shows raw vote counts, but nothing
  tracks whether a venue owner is actually *using* the product - logging into `/admin`,
  opening results, printing a new QR code. Before pricing/retention decisions, add at
  minimum:
  - Last admin login timestamp per workspace (`workspaces.last_active_at` or similar)
  - A simple weekly "did this workspace open the dashboard" flag
  - Ideally: which admin tabs/features get opened at all, to prioritize future work by real
    usage instead of guesswork

## Internationalization

- [x] i18n infrastructure (`i18next` + `react-i18next`), 10 languages wired up (English,
  Chinese, Spanish, French, Arabic, Portuguese, German, Italian, Dutch, Polish). The
  `LanguageSwitcher` lives in `NavBar.jsx`, which renders on every route (outside `<Routes>`
  in `main.jsx`), so it's already available everywhere - the gap was translated *content*,
  not the switcher's visibility.
- [x] `Vote.jsx` (the actual voter-facing poll page - the highest-value page to localize,
  since real guests scanning a QR code may not read English) and `ThankYou.jsx` are now fully
  wired with `useTranslation()` + `t("vote.*")`/`t("thankYou.*")` keys, translated in all ten
  locale files. Note `Vote.jsx` still has a separate, unrelated feature that translates poll
  *content* (the question/answers themselves) via Google Translate - that's independent of
  the UI-chrome translation added here.
- [ ] **Still hardcoded English**: `Admin.jsx`, `CreatePoll.jsx`, `EditPoll.jsx`, `Legal.jsx`,
  `Billing.jsx`, etc. Lower priority than Vote/ThankYou since these are used by the workspace
  owner/admin, not the general public - but follow the same pattern (`useTranslation()` +
  `t("key")`, new keys added to *all ten* `src/i18n/locales/*.json` files) to extend further.

## QR codes with multiple linked items

- [x] One QR code can show several polls and/or info cards at once (`qr_campaign_items`
  table, `supabase/20260915_qr_campaign_items.sql`). Not plan-gated.
- [x] Dashboard reorganized so this isn't buried: the "QR codes" tab (renamed from
  "Engagement & growth") now leads with an explainer banner and the Donations setup (a
  prerequisite), moved ahead of "QR campaigns", and the campaign item picker's copy calls out
  polls + info cards + donations explicitly. Lead nurture/win-back emails moved to the
  "Customer connection" tab, where they conceptually belong.

## Email validation

- [x] Voter follow-up/prize-draw email and organizer-reply email are validated client-side
  before submit, mirroring the server-side regex.

## Pilot readiness — needs an account/dashboard action, not just code

The code-level mitigations for each of these are already in place; each needs a human to
configure an external account or make a judgment call before the pilot scales past a
handful of venues.

- [ ] **Migrate translation off the unofficial Google endpoint.** `Vote.jsx` calls the free,
  unsupported `translate.googleapis.com/translate_a/single?client=gtx...` endpoint (no SLA,
  can be rate-limited/blocked without notice). A kill switch
  (`VITE_ENABLE_TRANSLATION=false`), timeout, and fallback message are in place, but the
  real fix is the official, paid Google Cloud Translation API.
- [ ] **Configure real rate limiting at the infrastructure level.** A honeypot field and
  minimum-dwell-time check deter naive scripted votes, but a QR code is a public URL anyone
  can script against - do Vercel Firewall/WAF rate limiting first, Upstash Redis if you need
  product-level per-user quotas, before a pilot QR code sees real foot traffic.
- [ ] **Run a Supabase backup/restore drill.** Confirm daily backups/PITR are enabled, and
  actually perform one test restore before the pilot.
- [ ] **Wire up monitoring/alert routing.** Sentry is integrated (consent-gated) but alert
  rules for new error types, and Vercel alerts for function failures/elevated error rates,
  still need to be configured and pointed at a channel someone actually watches.
- [ ] **Accessibility pass.** No ARIA landmarks/labels on the public voting flow
  (`Vote.jsx`) yet - worth a proper pass given the product is used by the general public,
  including at museums, which often carry their own accessibility obligations.
- [ ] **Improve multi-language moderation coverage.** `restrictedContent.js` is an
  English-only keyword list (word-boundary + accent-insensitive matching). A determined
  user can still bypass it in another language - a real classification API (similar to the
  existing sentiment classification endpoint) would cover this properly.
- [ ] **Use the `api/system-status.js` endpoint before onboarding each pilot venue.** Call
  it with the `CRON_SECRET` bearer token to confirm which optional integrations (Stripe,
  Resend email, Google Places, Sentry) are actually configured, so you don't promise a
  Growth-tier feature that silently no-ops.
