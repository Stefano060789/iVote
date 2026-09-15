# Godwit — open items to come back to

Things that are known gaps or still need a human action, not forgotten. Fully-resolved work
is not listed here anymore - check git history / commit messages for the full story on
anything that used to be tracked here and is now done. Check this file periodically and clear
items as you address them.

## Open action items (needs you, not code)

- [ ] **VAT (Austria / EU digital subscriptions).**
  Confirmed 2026-09-14: the **Kleinunternehmerregelung** (small-business VAT exemption)
  threshold is **EUR 55,000/year** revenue - if you're under that, you may not need to charge
  VAT at all yet. Decide (with your *Steuerberater* if unsure) whether it applies to you.

  If VAT does apply, or once you cross the threshold:
  1. In Stripe Dashboard -> **Settings -> Tax**, click "Get started," add Austria as your
     origin/tax registration.
  2. In Vercel -> your project -> **Settings -> Environment Variables**, add
     `STRIPE_TAX_ENABLED` = `1` (Production), then redeploy.
  3. That's it - the checkout code (`automatic_tax`, address collection, VAT-ID field for B2B
     reverse charge) is already wired behind that flag in `api/create-checkout-session.js`, so
     no further code change is needed.

- [ ] **Admin account 2FA/MFA** (Supabase Auth supports TOTP) - not built yet. Separate from
  the Stripe phone-only-2FA item below (that one is about Godwit's own platform Stripe
  account; this one is about admins logging into Godwit itself).

- [ ] **Geo-gating prize draws / donations by jurisdiction.** Voters already see a full
  eligibility disclaimer and must give explicit consent per entry (`vote.prizeDrawDisclaimer`
  / `vote.prizeDrawConsent`), and an admin must explicitly acknowledge they've checked local
  sweepstakes rules before a prize draw can be turned on at all (DB constraint
  `polls_raffle_requires_ack`) - but nothing blocks the feature by country. Doing that properly
  needs a legally-vetted country list, which isn't something to guess at in code.
  Decision 2026-09-14: keep prize draws and donations enabled for now with the existing
  disclaimers and consent; obtain Austrian legal advice before relying on them commercially.

- [ ] **Nightly Stripe reconciliation job** (compare `donations`/`workspace_subscriptions`
  against the Stripe API for drift) - a real, buildable feature, just not built yet. Worth
  doing before scaling donation volume.

- [ ] **Fully automated DSAR export/delete.** `Account.jsx`'s "Request data export" / "Request
  account deletion" buttons currently just log a request into `privacy_requests` for manual
  handling - there's no admin UI to view that queue yet, and no automated export across every
  table touching a given voter's data. Fine for a small team handling requests within the GDPR
  one-month window by hand today; revisit if request volume grows.

- [ ] GitHub repo settings: turn on **Dependabot alerts** and **Dependabot security updates**
  under Settings -> Security (`.github/dependabot.yml` only covers scheduled version-update
  PRs, which is a separate toggle).

- [ ] Stripe account verification currently relies on phone number only (SMS). Add a stronger
  second identification factor for the live account - e.g. government ID verification
  (Stripe Identity), authenticator-app 2FA instead of/in addition to SMS, and/or a recovery
  method - to reduce the risk of the account being taken over via SIM-swap or phone number
  compromise. Check Stripe Dashboard -> Settings -> Security for available options.

- [ ] **Buy a custom domain and point it at Vercel.** Production currently runs on Vercel's
  default `i-vote-one.vercel.app` subdomain - fine for testing, not for a real pilot venue
  (looks unfinished, and the legacy "i-vote" name doesn't match the "Godwit" brand everywhere
  else).
  **Availability checked 2026-09-14 (via RDAP - re-verify before buying, in case something
  changes):**
  - Taken: `godwit.com` (registered since 1999), `godwit.app` (registered **July 2026**,
    live Squarespace site), `godwit.io` (live, Cloudflare-hosted), `godwit.ai` (live,
    GoDaddy-hosted), `usegodwit.com` (registered **August 2026**), `flockfeedback.com`
    (registered July 2025, GoDaddy-hosted).
  - Available: `trygodwit.com` (top pick - clean, standard SaaS pattern), `hellogodwit.com`,
    `godwitapp.com`, `meetgodwit.com`. `godwit.co` couldn't be reliably checked from here -
    verify directly with a registrar.
  - **Worth a closer look before deciding**: `godwit.app` and `usegodwit.com` were both
    registered within the last two months and have *live* nameservers (not parked/squatted) -
    possibly another company or project actively building something under a similar "Godwit"
    name right now. Worth a quick trademark/name-collision gut-check before investing more
    marketing spend into the "Godwit" name, though nothing confirmed either way.
  - Decision paused 2026-09-14 pending the operator's input - not yet purchased.
  Once bought: add it in Vercel -> Settings -> Domains, update `APP_URL`, and update any
  hardcoded links (emails, Stripe Checkout success/cancel URLs, QR short-link generation).

- **Still true and worth remembering**: the project sits at exactly 12/12 Vercel serverless
  API functions with zero headroom (Hobby plan). Before adding any new `api/*.js` file,
  consolidate an existing one first (e.g. `notify-content-report.js` +
  `dispatch-webhook.js` could merge into one action-dispatched function) or upgrade to
  Vercel Pro.

## Resolved legal-review items (2026-09-14)

- [x] **Signed DPAs with each subprocessor.** Stripe, Supabase, Vercel, and Resend DPAs
  downloaded and saved to the local `dpa/` folder (gitignored - operator recordkeeping, not a
  product asset) for GDPR Art. 30 records. OpenAI's DPA still needs saving once its API key is
  activated (currently unused - see AI features below).
- [x] **Data residency confirmed.** Supabase project runs in AWS `eu-west-2` (London, UK) - not
  technically EU/EEA post-Brexit, but the UK has a standing EU adequacy decision (data flows
  from the EU to the UK are treated the same as intra-EU transfers, no extra Standard
  Contractual Clauses needed). `Legal.jsx`'s existing transfer-safeguards clause already covers
  this in general terms; revisit only if that adequacy decision is ever withdrawn.

## Internationalization

- [ ] **Still hardcoded English**: `CreatePoll.jsx`, `EditPoll.jsx`. Lower priority than
  Vote/ThankYou since these are used by the workspace owner/admin, not the general public -
  but follow the existing pattern (`useTranslation()` + `t("key")`, new keys added to *every*
  `src/i18n/locales/*.json` file) to extend further.
- [ ] **Add Russian and Ukrainian.** Follow the existing pattern: new
  `src/i18n/locales/ru.json` / `uk.json` (Ukrainian uses `dir: "ltr"` like the rest, no RTL
  needed), add both to `SUPPORTED_LANGUAGES` in `src/i18n/languages.js` and to the `resources`
  map in `src/i18n/index.js`. Since `Vote.jsx`/`ThankYou.jsx`/`Billing.jsx`/`Admin.jsx` are
  already fully keyed with `t("...")`, this is "translate every key already in `en.json` into
  these two languages" rather than new wiring work. Also worth adding Cyrillic keyword
  coverage (`politicalTerms`/etc. in `restrictedContent.js`) for the same reason the other
  languages are covered there - a Russian/Ukrainian-speaking voter can submit restricted-topic
  free text regardless of which UI language they picked.

## QR codes with multiple linked items

- [ ] Still open (genuinely lower priority, revisit if an artist user asks): a dedicated
  "gallery"/portfolio item type for multiple images in one QR info card, instead of one image
  per info card.

## Pilot readiness — needs an account/dashboard action, not just code

- [ ] **Migrate translation off the unofficial Google endpoint.** `Vote.jsx` calls the free,
  unsupported `translate.googleapis.com/translate_a/single?client=gtx...` endpoint (no SLA,
  can be rate-limited/blocked without notice). A kill switch
  (`VITE_ENABLE_TRANSLATION=false`), timeout, and fallback message are in place, but the
  real fix is the official, paid Google Cloud Translation API.
- [ ] **Configure the free Supabase backup workflow.** `.github/workflows/supabase-backup.yml`
  creates a daily encrypted PostgreSQL dump, uploads it as a private GitHub Actions artifact
  for 30 days, and restores it into a temporary PostgreSQL service on every run. Add the
  `SUPABASE_DB_URL` and `BACKUP_ENCRYPTION_KEY` GitHub Actions secrets (added 2026-09-15),
  run it manually once, and verify the restore test succeeds. This is logical
  backup/restore, not Supabase point-in-time recovery; retain an additional independent copy
  before a larger launch.
- [ ] **Vercel's own real-time anomaly alerting ("Observability Plus")** remains gated behind a
  Vercel Pro upgrade - unrelated to Sentry (already fully wired up), a separate paid-plan
  decision.
- [ ] Full WCAG audit not done - color contrast and keyboard-navigation order weren't
  reviewed on the public voting flow. Revisit if that becomes a real requirement (e.g. a
  museum client asks for a conformance statement).
