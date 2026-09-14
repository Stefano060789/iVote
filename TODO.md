# Godwit — open items to come back to

Things that are known gaps or still need a human action, not forgotten. Fully-resolved work
is summarized in one line rather than kept as a long changelog - check git history for the
full story on anything marked done. Check this file periodically and clear items as you
address them.

## Open action items (needs you, not code)

- [x] `STRIPE_CONNECT_WEBHOOK_SECRET` added to Vercel's Production environment variables
  (test mode value) and redeployed. **Still to do when going live**: repeat the whole
  two-destination webhook setup for live mode - live/test destinations and secrets are
  separate in Stripe. See `LAUNCH_SETUP.md`'s "Stripe Connect setup" section.
- [x] Stripe Connect enabled (test mode, "You collect payments and pay recipients"
  marketplace/destination-charge model) and a second webhook destination created for
  Connected-account events (`account.updated`), since a destination's event scope is fixed
  at creation and can't be added to the existing one.
- [x] Checked `STRIPE_PRICE_STARTER`/`STRIPE_PRICE_GROWTH` for a duplicate trial - Growth is
  fully clean; Starter has a currently-inert dashboard-level "Trials" pairing (only takes
  effect via a Payment Link, and the account has none). Watch for it if a Payment Link is
  ever created for that price.
- [x] Ran the pending migrations: `supabase/20260917_donations_stripe_connect.sql`,
  `supabase/20260918_qr_item_images.sql`, and `supabase/20260919_ai_content_moderation.sql`.
- [x] Ran `supabase/20260920_usage_instrumentation.sql` and
  `supabase/20260921_info_item_accessibility_tags.sql` directly in the Supabase SQL editor
  (2026-09-14) - verified `workspaces.last_active_at`, `workspace_admin_events`,
  `qr_campaign_items.accessibility_tags`, `log_workspace_admin_event()`, and
  `get_public_qr_campaign_items()` all exist in the live schema.

## Robin's persona guide

- [x] Robin's Overview-tab guide (artist/creator, cafe/restaurant/shop, museum/city/venue -
  each a tailored checklist of existing features) and optional images on QR "info" cards
  (`supabase/20260918_qr_item_images.sql`) shipped.
- [x] **Ideas surfaced but not built** - all three now done:
  - Accessibility tagging (wheelchair access, audio description, sign language, large print,
    hearing loop, service animals welcome) for info cards: checkboxes in the "Add info card"
    form (`Admin.jsx`), stored as `qr_campaign_items.accessibility_tags`
    (`supabase/20260921_info_item_accessibility_tags.sql` - **run 2026-09-14**), shown as
    small icon badges on the public QR menu (`QrRedirect.jsx`). Shared vocabulary lives in
    `src/lib/accessibilityTags.js`.
  - Entitlement limits are now surfaced directly inside Robin's guide: steps tied to a
    plan-gated feature (`src/lib/personas.js`'s new `feature` key) show a "🔒 Available on
    {plan} · Upgrade" note before the step's "Go" button when the workspace's current plan
    doesn't include it (`Admin.jsx`, reusing `minPlanLabelFor()` from `entitlements.js`).
  - Still open (genuinely lower priority, revisit if an artist user asks): a dedicated
    "gallery"/portfolio item type for multiple images in one card, instead of one image per
    info card.

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

- [x] **Churn/usage instrumentation** added: `workspaces.last_active_at` bumped on every
  dashboard load (`ensure_my_workspace()`), a new `workspace_admin_events` table +
  `log_workspace_admin_event()` RPC logs each admin tab opened (`Admin.jsx` calls it on every
  `activeTab` change), and a `workspace_engagement_summary` view (last-active + tab-open counts
  per workspace) for direct querying in the Supabase SQL editor - intentionally *not* exposed
  through the app UI yet, since there's no admin-facing analytics page for it.
  `supabase/20260920_usage_instrumentation.sql` - **run 2026-09-14**.

## Internationalization

- [x] i18n infrastructure (`i18next` + `react-i18next`), 8 languages wired up (English,
  Chinese, Spanish, French, Arabic, Portuguese, German, Italian). Dutch and Polish were removed
  (2026-09-13) at the operator's request - `src/i18n/languages.js`, `src/i18n/index.js`, and the
  `nl.json`/`pl.json` locale files were dropped; `LanguageSwitcher` reads the language list
  dynamically so no other change was needed. The
  `LanguageSwitcher` lives in `NavBar.jsx`, which renders on every route (outside `<Routes>`
  in `main.jsx`), so it's already available everywhere - the gap was translated *content*,
  not the switcher's visibility.
- [x] `Vote.jsx` (the actual voter-facing poll page - the highest-value page to localize,
  since real guests scanning a QR code may not read English) and `ThankYou.jsx` are now fully
  wired with `useTranslation()` + `t("vote.*")`/`t("thankYou.*")` keys, translated in all
  locale files. Note `Vote.jsx` still has a separate, unrelated feature that translates poll
  *content* (the question/answers themselves) via Google Translate - that's independent of
  the UI-chrome translation added here.
- [x] `Admin.jsx` (the main dashboard, 3000+ lines, all 6 tabs: Overview, Polls, QR codes/Engagement,
  Customer Connection, Feedback, Settings) is now fully localized in all supported languages - a large
  `admin.*` i18n namespace, key parity verified. Also translated: the accessibility-tag vocabulary
  (`src/lib/accessibilityTags.js`) and the print-QR popup window strings. **Not translated on purpose**:
  `alert()`/`confirm()` validation messages scattered through handler functions (~75 of them) - these are
  transient, low-visibility strings; worth a follow-up pass if it becomes a priority.
- [ ] **Still hardcoded English**: `CreatePoll.jsx`, `EditPoll.jsx`. Lower priority than Vote/ThankYou since
  these are used by the workspace owner/admin, not the general public - but follow the same pattern
  (`useTranslation()` + `t("key")`, new keys added to *every* `src/i18n/locales/*.json` file) to extend
  further.
- [x] `Billing.jsx` fully localized (plan names/descriptions, comparison table, trial/checkout messages, CTAs)
  in every supported language - `billing.*` namespace, key parity verified across every locale file.
- [x] `Legal.jsx` (Privacy notice / Terms of service) deliberately kept **English-only**, with a short notice
  added to the page explaining the English text is the sole official/governing version. Auto-translating legal
  text carries real liability risk (a mistranslated clause on refunds, data-processor terms, etc. could be read
  as legally binding in that language) - many companies handle it exactly this way rather than translating ToS
  literally.
- [ ] **Add Russian and Ukrainian.** Follow the existing pattern: new `src/i18n/locales/ru.json` /
  `uk.json` (Ukrainian uses `dir: "ltr"` like the rest, no RTL needed), add both to
  `SUPPORTED_LANGUAGES` in `src/i18n/languages.js` and to the `resources` map in `src/i18n/index.js`.
  Since `Vote.jsx`/`ThankYou.jsx`/`Billing.jsx`/`Admin.jsx` are already fully keyed with `t("...")`,
  this is "translate every key already in `en.json` into these two languages" rather than new
  wiring work. Also worth adding Cyrillic keyword coverage (`politicalTerms`/etc. in
  `restrictedContent.js`) for the same reason the other languages are covered there - a
  Russian/Ukrainian-speaking voter can submit restricted-topic free text regardless of which UI
  language they picked.

## QR codes with multiple linked items

- [x] One QR code can show several polls and/or info cards at once (`qr_campaign_items`
  table, `supabase/20260915_qr_campaign_items.sql`). Not plan-gated.
- [x] Dashboard reorganized so this isn't buried: the "QR codes" tab (renamed from
  "Engagement & growth") now leads with an explainer banner and the Donations setup (a
  prerequisite), moved ahead of "QR campaigns", and the campaign item picker's copy calls out
  polls + info cards + donations explicitly. Lead nurture/win-back emails moved to the
  "Customer connection" tab, where they conceptually belong.
- [x] Poll <-> QR code relationship is now visible in both directions: every poll card in the
  Polls tab shows a "Linked QR codes" panel (which locations/campaigns point to it, click to
  jump to the QR codes tab), and every poll reference inside the QR codes tab (location
  assignment, campaign's default poll, each poll inside "Items on this QR code") links back
  and highlights+scrolls to that exact poll. The "Scan a QR code" tool moved from Overview
  into the QR codes tab, and each poll's quick "Open QR tools" preview now explains it's an
  untracked, single-poll QR - distinct from the reusable/trackable QR codes tab.

## AI features

- [x] Fixed the AI poster-background generator (`api/generate-qr-poster.js`, used from a
  poll's "Open QR tools") returning a generic "Image generation failed" for every OpenAI-side
  rejection. It now passes through OpenAI's real error message, with friendly guidance for
  the most common cause: the OpenAI organization needing to complete verification for
  `gpt-image-1` access (separate from just having a valid API key). See `AI_IMAGE_SETUP.md`.

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
- [x] **Configured rate limiting at the infrastructure level** via Vercel Firewall: a custom
  rule rate-limits all `/api/*` requests to 30 per 60 seconds per IP address (Deny 403 when
  exceeded), confirmed live ("Custom Rules: 1 active"). The Hobby plan caps custom rate-limit
  rules at 1 (Pro allows up to 40), so this one rule was pointed at the highest-value target:
  the serverless functions that cost real money per call (Stripe, OpenAI, Resend), not the
  `/vote`/`/qr` page loads. **Important caveat**: votes are inserted directly from the browser
  to Supabase's REST API, not through a Vercel `/api/*` route, so this rule does not rate-limit
  vote submissions themselves - only page loads and the app's own serverless functions. A
  honeypot + minimum-dwell-time check (already in `Vote.jsx`) is still the only defense against
  scripted vote spam; a proper fix would be a Postgres-side rate limit (e.g. a trigger capping
  votes per IP/poll in a time window) or routing votes through a `/api/*` function instead.
- [ ] **Supabase backup/restore drill - blocked on a plan decision, not configuration.**
  Checked the actual dashboard: this project's organization ("bonomistefano@outlook.it's
  Org") is on the **Supabase Free plan**, which Supabase states explicitly **does not include
  project backups at all** - not "not yet turned on", structurally unavailable. There is
  currently no way to recover this production database if data is ever lost or corrupted.
  Fixing this requires upgrading the organization to **Supabase Pro ($25/month base, includes
  daily backups retained 7 days)** - a real recurring cost, so this needs your decision, not
  just configuration. Once upgraded, still do an actual test restore before the pilot, not
  just confirm the toggle is on.
- [ ] **Wire up monitoring/alert routing - partially done.** Checked Vercel's own notification
  settings: **Deployment Failure** emails are already on by default for the account owner
  (Team Settings -> My Notifications -> Deployments). Real-time runtime error-rate/anomaly
  alerting ("Observability Plus") is **gated behind Vercel Pro** on this project's current
  Hobby plan - not configurable without upgrading. Sentry alert rules (for new frontend error
  types) are still untouched - Sentry isn't connected as a Vercel integration, so it needs its
  own dashboard access to configure; ask whoever set up `VITE_SENTRY_DSN` for the org/project
  URL, or confirm whether a Sentry project was ever actually created (the env var could still
  be a placeholder).
- [x] **Accessibility pass on the public voting flow** (`Vote.jsx`, `ThankYou.jsx`,
  `QrRedirect.jsx`). Added `<main>` landmarks (Layout.jsx and ThankYou.jsx didn't have one);
  the answer list is a labelled `role="group"`; translated question/answers get a per-element
  `lang` attribute; loading/status/error states use `role="status"`/`role="alert"`
  appropriately; email/message fields now have real `aria-label`s (not just placeholder text)
  with `aria-describedby` wired to their validation errors; QR-menu images got real `alt`
  text instead of `alt=""`. Not a full WCAG audit - color contrast and keyboard-navigation
  order weren't reviewed, so revisit if that becomes a real requirement (e.g. a museum client
  asks for a conformance statement).
- [x] **Multi-language moderation coverage.** `restrictedContent.js` now covers all 10
  languages the app ships translations for (was English-only), with a Unicode-aware
  matcher (the old plain `\b` boundary silently never matched anything in Arabic/Chinese -
  a real bug fixed along the way). `api/classify-sentiment.js` also runs a real AI
  classification pass (any language) on voter-submitted custom answers after insertion and
  auto-hides anything flagged, logging an audit entry in `content_reports`
  (`reason="policy_violation"`) visible on the Moderation page. Admin-authored poll
  questions/answers still only get the synchronous keyword check, not the AI backstop -
  the highest real-world risk is anonymous public voters, not the workspace's own admin.
- [ ] **Use the `api/system-status.js` endpoint before onboarding each pilot venue.** Call
  it with the `CRON_SECRET` bearer token to confirm which optional integrations (Stripe,
  Resend email, Google Places, Sentry) are actually configured, so you don't promise a
  Growth-tier feature that silently no-ops.
