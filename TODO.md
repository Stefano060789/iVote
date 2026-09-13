# Godwit — open items to come back to

Things that are known gaps but intentionally deferred, not forgotten. Check this file
periodically and clear items as you address them.

## QR code donations

- [x] **Voters can now donate directly to the organizer's bank account from the QR menu.**
  New migration `supabase/20260916_donations.sql` (**run this migration** - see
  `LAUNCH_SETUP.md`'s migration list) adds:
  - `donation_settings`: one row per workspace (IBAN, account holder name, optional BIC,
    optional suggested amount, optional thank-you message, an `is_enabled` toggle). Set up
    once in Admin -> Engagement -> Donations, reused by every QR code.
  - `public.is_valid_iban(text)`: a real ISO 7064 MOD 97-10 IBAN checksum function (not
    just a shape check), enforced as a DB constraint - mirrored in
    `src/lib/validators.js` (`isValidIban`) so the admin form validates instantly without
    a round trip, and the two never disagree about what counts as a valid IBAN.
  - `qr_campaign_items` gained a third `item_type`: `'donation'`, alongside the existing
    `'poll'` and `'info'` types added in the previous QR-menu migration. A donation item
    can only be added while `donation_settings.is_enabled` is true with a valid IBAN
    (enforced by the same `qr_campaign_items_before_write` trigger the other item types
    already use).
  - `get_public_qr_campaign_items` now also returns the workspace's donation details
    (only for `item_type = 'donation'`, and only while `is_enabled` stays true - so
    disabling donations later doesn't leave old printed QR codes showing stale bank
    details).
  - Voter-facing display: `src/components/DonationCard.jsx`, rendered from
    `QrRedirect.jsx`'s menu view. Shows the IBAN (with a copy button), account holder
    name, optional suggested amount, and a scannable **EPC069-12 "SEPA Credit Transfer"
    QR code** (also called a "GiroCode" in Germany/Austria/Netherlands) built by
    `src/lib/sepaQr.js` using the `qrcode` package already installed for poll QR codes -
    most European banking apps can scan this to prefill the transfer automatically.
  - **Godwit never touches the money.** This is purely a display of the organizer's own
    bank details plus a standard, publicly documented QR text format; there is no payment
    processing, custody, or fee anywhere in this feature. Documented for users in
    `Legal.jsx` under a new "Donations" section, and in the Admin UI copy itself.
  - Not plan-gated - available on every tier, same as QR campaigns and QR items
    themselves, since it costs Godwit nothing to offer (no payment infrastructure
    involved).
  - **Worth being aware of** (not a blocker, just context): publishing an IBAN is normal
    practice (it's on every invoice), but if you ever want to reduce even the theoretical
    SEPA-direct-debit-mandate-fraud surface further, consider periodically reviewing who
    has your IBAN on file, same as you would for any published business bank account.

- [ ] **ON HOLD: monetizing donations (Godwit earning something from the donation feature).**
  User asked whether Godwit taking a cut of each donation is legally OK. Short answer: it
  depends entirely on *how* - the current feature (static IBAN + SEPA QR, Godwit never
  touches the money) is deliberately outside PSD2's scope because it's pure information
  display, like an IBAN on an invoice. That safety disappears the moment Godwit tries to
  earn money *from the transaction itself*. Options discussed, from simplest/no legal risk
  to biggest project/needs real legal review:
  1. **Gate the donation feature behind a paid plan** (e.g. Growth-only, or a paid add-on).
     Zero new regulatory surface - this is just SaaS billing via the Stripe integration
     already built. No code changes needed beyond adding an entitlements gate.
  2. **Add a separate, independent "tip Godwit" option** via the existing Stripe checkout -
     a voter pays Godwit directly and separately from the organizer's IBAN donation.
     Godwit is a party to that transaction (selling its own "support us" product), so this
     is normal e-commerce, not intermediation of someone else's money. No license needed.
  3. **Take an actual percentage cut of each donation** - requires abandoning the current
     manual-bank-transfer/static-QR architecture entirely and moving to a hosted-checkout
     "platform payments" product (Stripe Connect, Mollie for Platforms, or Adyen for
     Platforms are the standard choices - this is how Kickstarter/GoFundMe/Buy Me a Coffee
     monetize). The PSP holds the actual payment-institution license; Godwit operates as
     the "platform" collecting an application fee. Each venue would need to complete KYC
     onboarding with the PSP. This is a genuinely bigger project (new payment architecture,
     not just a fee field) and should not be built without a lawyer reviewing the
     marketplace/facilitator terms and the chosen provider's platform agreement first.
     Note also: having the *app itself* initiate a transfer (rather than a voter's own
     banking app scanning a static QR) would separately require PISP (Payment Initiation
     Service Provider) registration under PSD2, even without ever holding funds.
  **Decision**: paused for now at the user's request - no code changes made. Revisit by
  picking one of the three options above when ready to proceed.

## Hosting / deployment

- [x] **Fixed a Vercel deploy failure**: "No more than 12 Serverless Functions can be
  added to a Deployment on the Hobby plan." Vercel Hobby caps a deployment at 12
  functions, and every `.js` file directly under `api/` counts as one - this project had
  grown to 15. Consolidated the 4 cron-only endpoints (`weekly-report`, `check-anomalies`,
  `purge-old-votes`, `send-winback-emails` - none of these are ever called by name from
  the browser, only by Vercel's own scheduler) into a single `api/cron.js`, dispatched by
  a `?job=` query param set per-schedule in `vercel.json`. The actual job logic moved to
  `lib/cron/` at the repo root - outside `api/` entirely, so Vercel bundles it as a plain
  dependency instead of counting it as its own function. This brought the count from 15
  down to exactly 12.
  - **This is now sitting right at the Hobby limit, with zero headroom.** The next time a
    new `api/*.js` file is genuinely needed, either consolidate another existing endpoint
    the same way first, or upgrade to a paid Vercel plan (Pro removes the 12-function cap).
    Good candidates to merge next if you need to add something without upgrading:
    `notify-content-report.js` and `dispatch-webhook.js` are both "fire a workspace
    notification" concerns and could plausibly become one function with an action param,
    similar to how the cron jobs were merged.

## Billing

- [x] **30-day free trial** on Starter and Growth. `api/create-checkout-session.js` adds
  `subscription_data[trial_period_days]=30` to the Stripe Checkout session, but only the
  *first* time a workspace ever subscribes - it checks whether a `workspace_subscriptions`
  row already exists for that workspace (a row is only ever created after a first
  completed checkout, so its absence reliably means "never subscribed before") and skips
  the trial otherwise, so cancel-and-resubscribe can't be used to keep getting free months.
  `payment_method_collection: always` is set so a card is still required up front (the
  trial ends by cancelling, per `trial_settings.end_behavior.missing_payment_method`, if
  the card is ever removed - this is a Stripe safety net, not the primary abuse guard).
  `Billing.jsx` shows a "30-day free trial" badge and a "Start free trial" button label
  when the signed-in workspace hasn't subscribed before, and a confirmation banner on
  return from Stripe (`?checkout=success&trial=1`).
  - No new SQL migration was needed - `workspace_subscriptions.status` already accepted
    `'trialing'` and `workspace_plan()` already granted full plan entitlements while
    `status in ('active', 'trialing')` (this was already built when Stripe billing was
    first wired up, just never exposed in the UI or actually requested from Stripe).

- [ ] **Check the Stripe Dashboard for the `STRIPE_PRICE_STARTER` and `STRIPE_PRICE_GROWTH`
  Price/Product objects and confirm neither one *also* has a trial period configured
  directly on it.** The 30-day trial above is now requested per-Checkout-Session from
  `api/create-checkout-session.js`, which is meant to be the single source of truth. If a
  trial is also set on the Price/Product itself, Stripe would apply both and the actual
  trial length/behavior a customer gets becomes unpredictable. This is a one-time manual
  check in Stripe, not a code change.

## Product

- [ ] **No churn/usage instrumentation.** The dashboard shows raw vote counts, but
  nothing tracks whether a venue owner is actually *using* the product - e.g. logging
  into `/admin`, opening the results tab, printing a new QR code. Vote count tells you
  about the venue's customers; it doesn't tell you whether the venue itself is engaged
  enough to keep paying. Before pricing/retention decisions, add at minimum:
  - Last admin login timestamp per workspace (`workspaces.last_active_at` or similar,
    updated on `/admin` load)
  - A simple weekly "did this workspace open the dashboard" flag, joinable with the
    existing weekly report / anomaly-detection cron jobs
  - Ideally: which admin tabs/features get opened at all, so the ~40 features in the
    marketing overview can be trimmed based on real usage instead of guesswork

## Branding

- [x] Name chosen: **Godwit**. Full rename pass complete: `public/manifest.webmanifest`,
  `index.html` `<title>`, `NavBar.jsx` (brand text + new `godwit-mark.svg` icon),
  `workspaceProfile.js` default `companyName`, `Landing.jsx` (new hero visual, navy/gold
  theme, "flock of features" section), `Legal.jsx`, `Support.jsx`, `Essentials.jsx`,
  `ProductFeedback.jsx`, `QrRedirect.jsx`, `ThankYou.jsx`, `Unsubscribe.jsx`,
  `CreatePoll.jsx` version footer, `public/trust-badge.js`, `api/weekly-report.js`, and
  `marketing/*.md`. Logo redrawn a second time to closer match the approved reference
  artwork (layered wing feathers, long thin beak, single continuous gold gradient) in
  `src/assets/godwit-mark.svg` and `src/assets/godwit-logo-lockup.svg`;
  `public/favicon.svg` matches. `package.json` `name` is still the neutral `"ivote"` npm
  package slug — cosmetic only, rename whenever convenient (no user-facing impact).

## Internationalization

- [x] i18n infrastructure added (`i18next` + `react-i18next` + `i18next-browser-languagedetector`,
  see `src/i18n/`). A `<LanguageSwitcher>` component in `NavBar.jsx` lists every registered
  language and lets a visitor switch instantly; their choice is remembered in `localStorage`.
- [x] **10 languages wired up**: English, Chinese (Simplified), Spanish, French, Arabic,
  Portuguese, German, Italian, Dutch, Polish - chosen as a mix of the most globally spoken
  languages plus the languages most relevant to European hospitality/tourism traffic. Arabic
  correctly flips the page to `dir="rtl"`. Swap any of these for a different language anytime:
  edit `src/i18n/languages.js` and add/replace a `src/i18n/locales/<code>.json` file. The
  "Godwit" flock feature names (Redshank, Magpie, Flamingo, Tern, Waxwing) are deliberately
  left untranslated in every language, the same way the "Godwit" brand name itself is - they
  read as proper nouns/feature names, not descriptive text.
- [ ] **Only wired into `NavBar.jsx` and `Landing.jsx`** (the two most public-facing surfaces).
  To extend translations to another page, follow the same `useTranslation()` + `t("key")`
  pattern and add the new keys to *all ten* `src/i18n/locales/*.json` files (not just `en.json`)
  so no language is left with an English string with no translation to fall back to.
- [ ] **Most of the app is still hardcoded English strings** - `Admin.jsx`, `CreatePoll.jsx`,
  `EditPoll.jsx`, `Vote.jsx` (the actual voter-facing poll page - arguably the highest-value
  page to localize next, since real guests scanning a QR code may not read English),
  `ThankYou.jsx`, `Legal.jsx`, `Billing.jsx`, etc. Extend the `t()` pattern incrementally; no
  need to do it all at once. Note `Vote.jsx` already has an unrelated, separate feature that
  translates poll *content* (the question/answers an admin wrote) via Google Translate - don't
  confuse the two; that one stays as-is.
- No database changes were needed for this - the selected language is stored in the
  visitor's own browser (`localStorage`, key `godwit_lang`), not per-workspace server-side.
  If you later want a workspace's *default* voter-facing language to be configurable by
  the venue owner (e.g. a German venue always showing the Vote page in German by default
  regardless of visitor browser language), that would need a new `workspaces.default_locale`
  column and a small SQL migration - flag if you want that and it can be added.

## QR codes with multiple linked items

- [x] **One QR code can now show several things at once.** New table `qr_campaign_items`
  (migration `supabase/20260915_qr_campaign_items.sql` - **run this migration**, see below)
  lets an admin attach any mix of extra polls and "info cards" (a title, body text, and an
  optional link button - e.g. today's specials, WiFi password, house rules) to one QR
  campaign. Fully backward compatible: a QR code with zero items behaves exactly as before
  (goes straight to its single assigned poll). As soon as it has one or more items, scanning
  it shows a menu of everything listed instead.
  - Admin UI: `Admin.jsx` → Engagement tab → "QR campaigns" → each campaign has an
    "Items on this QR code" expandable section to add/remove/reorder polls and info cards,
    plus a one-click "Add the current default poll as an item too" shortcut.
  - Voter UI: `QrRedirect.jsx` renders a card-list menu; tapping a poll card goes to `/vote`,
    info cards just display their text and optional link inline.
  - New RPC `get_public_qr_campaign_items(token)` is the public, anonymous-safe read path
    (mirrors the existing `get_public_qr_campaign` pattern); a `before insert/update` trigger
    derives `workspace_id` from the parent campaign, checks a poll item belongs to the same
    workspace, auto-appends new items to the end of the list, and caps a campaign at 20 items.
  - Not plan-gated - available on every tier, same as QR campaigns themselves.

## Email validation

- [x] The voter's optional follow-up/prize-draw email and the optional organizer-reply email
  on `/vote/:pollId` are now validated client-side (`src/lib/validators.js`, `isValidEmail`)
  *before* the vote is submitted, with an inline error message if it's not a valid address.
  Previously an invalid email failed silently server-side (the vote still went through, but
  the email was quietly dropped) - now the voter gets a chance to fix it. The regex mirrors
  the one already enforced in the `capture_voter_lead`/`send_organizer_message` Postgres
  functions, so client and server never disagree about what counts as "valid".


## Pilot readiness — needs an account/dashboard action, not just code

These came out of a pre-pilot review. The code-level mitigations for each are already in
place (see below); the items here need a human to configure an external account or make a
judgment call before the pilot scales past a handful of venues.

- [ ] **Migrate translation off the unofficial Google endpoint.** `Vote.jsx` calls
  `translate.googleapis.com/translate_a/single?client=gtx...` - the free, unsupported
  endpoint the Google Translate *webpage* uses internally, not the paid Cloud Translation
  API. It has no SLA and can be rate-limited or blocked without notice. A kill switch
  (`VITE_ENABLE_TRANSLATION=false`), a request timeout, and a clear fallback message are
  now in place so a failure degrades gracefully instead of breaking the page - but the
  real fix is to move to the official, paid Google Cloud Translation API (needs a GCP
  billing account + API key).
- [ ] **Configure real rate limiting at the infrastructure level.** A honeypot field and a
  minimum-dwell-time check were added to `Vote.jsx` to stop the most naive scripted vote
  submissions, but that's a deterrent, not real rate limiting - a QR code is a public URL
  anyone can script against. Follow the "Security and abuse controls" section above:
  Vercel Firewall/WAF rate limiting first, Upstash Redis if you need product-level
  per-user quotas. Do this before a pilot QR code is posted somewhere with real foot
  traffic.
- [ ] **Run a Supabase backup/restore drill.** Confirm daily backups/PITR are enabled for
  the plan you're on, and actually perform one test restore before the pilot, not just
  after something goes wrong.
- [ ] **Wire up monitoring/alert routing.** Sentry is integrated (and now consent-gated,
  see `CookieConsent.jsx`) but alert rules for new error types, and Vercel alerts for
  function failures / elevated 4xx-5xx rates, still need to be configured and pointed at
  a channel someone actually watches.
- [ ] **Accessibility pass.** A quick review found no ARIA landmarks/labels on the public
  voting flow (`Vote.jsx`). Worth a proper pass given the product is used by the general
  public, including at museums, which often carry their own accessibility obligations.
- [ ] **Improve multi-language moderation coverage.** `restrictedContent.js` is an
  English-only keyword list (recently fixed to stop flagging the word "vote" itself, and
  to use word-boundary + accent-insensitive matching - see `restrictedContent.test.js`).
  It's a reasonable free first line of defense, but a determined user can still bypass it
  in another language or with light obfuscation. A real classification API (similar to the
  existing sentiment classification endpoint) would cover this properly across all 9
  supported voting languages.
- [ ] **Use the new `api/system-status.js` endpoint before onboarding each pilot venue.**
  Call it with the `CRON_SECRET` bearer token to confirm which optional integrations
  (Stripe, Resend email, Google Places, Sentry) are actually configured in that
  environment, so you don't promise a Growth-tier feature that silently no-ops.

