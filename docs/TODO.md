# Godwit — open items to come back to

Things that are known gaps or still need a human action, not forgotten. Fully-resolved work
is not listed here anymore - check git history / commit messages for the full story on
anything that used to be tracked here and is now done. Check this file periodically and clear
items as you address them.

## Payment wording and legal classification

- [x] Let each venue choose **Tip**, **Voluntary contribution**, or **Charitable donation**
  for QR payments.
- [x] Show the selected category and a responsibility disclaimer on the public payment card.
- [x] Carry the category into the Stripe Checkout product name and metadata.
- [ ] Confirm the category, receipts, refunds, tax treatment, and charitable eligibility with a
  qualified adviser before launch. Godwit provides the technology platform; the venue remains
  responsible for the classification.

## Open action items (needs you, not code)

- [ ] **Register an Austrian business (Gewerbeanmeldung + Finanzamt Steuernummer) - the real
  prerequisite before invoicing anyone. Final staged plan as of 2026-09-15 - do NOT rush full
  registration; gather answers first, mostly for free.**

  **Context that shapes this:** not launched yet, no venue confirmed (still in discussions),
  employed elsewhere (ASVG-insured), traveling abroad for 9 months starting 2026-09-22 but
  have ID Austria so most steps can be done remotely. Revenue model is (1) subscription fees
  and (2) a 9% platform commission on donations via Stripe Connect's application-fee
  mechanism - only these two count as Godwit's actual turnover, not the other 91% of each
  donation that passes through to the venue. Already confirmed: taking a commission via Stripe
  Connect's application-fee mechanism does **not** require Godwit to hold its own
  payment-institution license - Stripe is the licensed processor, a standard SaaS/platform
  pattern.

  **Contact 1 - WKO Gründerservice (free, do this first).** Covers most questions below at no
  cost - this is literally their job for new founders, not a sales pitch.
  1. Which trade category fits a QR-feedback SaaS product with a donation commission?
  2. Would this qualify as **"Neue Selbständige"** instead of a full Gewerbeschein? (Recurring
     subscriptions + a transaction commission lean toward classic "Gewerbe," not the
     freelance/liberal-profession "Neue Selbständige" category, but confirm - don't assume.)
  3. If a Gewerbeschein is required: exact fees, and NeuFöG first-founder relief?
  4. Does the Kleinunternehmerregelung basics/threshold apply the way I think (only
     subscription + 9% commission count, not full donation pass-through)?
  5. Can you recommend a Steuerberater used to solo software/SaaS businesses?

  **Contact 2 - Magistrat der Stadt Villach (Gewerbereferat/Gewerbebehörde), in person or
  phone.**
  1. Given the trade category confirmed with WKO, can registration itself happen later, fully
     remotely, via usp.gv.at with ID Austria, once a venue is ready - or does anything need to
     happen in person now?
  2. Can my home address in Villach serve as the Gewerbestandort for an online-only business?
  3. Can all further correspondence (Magistrat/Finanzamt/SVS) be delivered digitally instead of
     physical mail, given the 9-month trip?

  **Contact 3 - SVS (free - it's their own program, ask them directly).**
  1. Minimum contribution if registering now (pre-revenue) vs. once a venue is confirmed?
  2. Does the small-income opting-out exemption, or Differenzvorschreibung (reduced health
     contribution), apply given I'm already ASVG-insured through employment?
  3. Can a SEPA direct debit be set up so payments run automatically while abroad, and can
     correspondence be digital?

  **Contact 4 - Steuerberater (paid - only for what WKO/SVS can't answer for free).** Video
  call is fine.
  1. Is the 9% platform commission on donations treated as its own service fee for VAT/
     invoicing purposes, separate from subscription revenue?

  **Already resolved 2026-09-15, no longer open questions:**
  - Tax residency while abroad 9 months: discussed with employer, structured as a business
    trip - Austrian tax residency isn't in question.
  - Remote handling once a venue is ready: have a partner in Austria who can help with
    registration/filings while traveling - no Vollmacht/mail-forwarding safety net needed.

  **Decide, based on all of the above:**
  - If "Neue Selbständige" applies: no mandatory WKO membership/Kammerumlage, likely minimal
    SVS cost pre-revenue - registering earlier becomes low-risk.
  - If a full Gewerbeschein is required: since no venue is confirmed yet, **wait to actually
    register until a venue is genuinely close to signing** - don't run ongoing costs against
    zero revenue. Can be done remotely from abroad (usp.gv.at + ID Austria + FinanzOnline +
    phone/video calls) once that trigger point arrives, with the partner's help - does not
    require being physically in Austria.

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

- [ ] **Auto-renewal / free-trial disclosure wording - quick read-through, not urgent for a
  small first pilot.** Starter and Growth plans auto-convert from a 90-day free trial into a
  paid recurring subscription unless cancelled. Flagged in `Godwit-Feature-Overview.md` -
  nobody has actually reviewed whether the current checkout/billing-UI disclosures (price,
  renewal date, cancellation method) are clear enough under EU Consumer Rights Directive /
  auto-renewal rules. Worth a look before scaling past a small pilot, not before the first
  customer.

- [ ] **Geo-gating prize draws / donations by jurisdiction.** Voters already see a full
  eligibility disclaimer and must give explicit consent per entry (`vote.prizeDrawDisclaimer`
  / `vote.prizeDrawConsent`), and an admin must explicitly acknowledge they've checked local
  sweepstakes rules before a prize draw can be turned on at all (DB constraint
  `polls_raffle_requires_ack`) - but nothing blocks the feature by country. Doing that properly
  needs a legally-vetted country list, which isn't something to guess at in code.
  Decision 2026-09-14: keep prize draws and donations enabled for now with the existing
  disclaimers and consent; obtain Austrian legal advice before relying on them commercially.
  Confirmed 2026-09-15: plan to actually offer prize draws to real venues soon. The German
  disclaimer (`de.json`) already says "Kein Kauf erforderlich" (no purchase necessary) - this
  is the key phrase that keeps a prize draw out of Austria's regulated-gambling category
  (Glücksspielgesetz only applies when entry requires a stake/payment). Before the first real
  one: (1) get a quick, specific opinion from WKO's free member Rechtsservice or a lawyer -
  "is a free-to-enter prize draw via a QR-feedback tool compliant?" - not a full audit, just
  that one question; (2) confirm the Pilot Venue Agreement / Terms make the venue responsible
  for sourcing/delivering the prize and its tax treatment, with Godwit only as the technology
  provider; (3) start with a low-value prize (a free coffee, small venue voucher), not cash.

- [x] **Nightly Stripe reconciliation job** (compare `donations`/`workspace_subscriptions`
  against the Stripe API for drift). It runs through the consolidated `/api/cron` function at
  03:00 UTC, stores each result in `stripe_reconciliation_runs`, and can email mismatches to
  `RECONCILIATION_ALERT_EMAIL`.

- [x] **Automated DSAR export/delete.** The consolidated `/api/cron` function processes up to 25
  requested privacy actions nightly at 03:30 UTC. Exports are emailed as JSON attachments;
  deletion removes the owned workspace data, account memberships, opted-in voter records,
  donor email addresses, and the Supabase Auth account. Failed requests are marked rejected
  with an error for follow-up.

- [ ] GitHub repo settings: turn on **Dependabot alerts** and **Dependabot security updates**
  under Settings -> Security. `.github/dependabot.yml` is already configured for npm and GitHub
  Actions updates; these two security toggles are repository settings and cannot be enabled by a
  repository file alone.

- [x] **Custom domain configured.** `hellogodwit.com` is configured in Vercel and is now the
  production domain.
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
  - Decision completed 2026-09-17: use `hellogodwit.com`.
  - Verify `APP_URL` and any hardcoded links (emails, Stripe Checkout success/cancel URLs, QR
    short-link generation) remain aligned with the Vercel domain after deployment.

- [x] **Vercel function budget respected.** The repository still has exactly 12 files directly
  under `api/`. Stripe reconciliation and DSAR processing were added under `lib/cron/` and
  routed through the existing `/api/cron` function, so no new Vercel function was created.

## Recently completed product-quality checks

- [x] **Customer Connection and Feedback workflow smoke-tested (2026-09-17).** Confirmed that
  the deployed Admin sections open correctly, show the Flamingo and Redshank guidance, explain
  consent-based email follow-up, keep public reviews optional and honest, and expose moderation,
  recovery, sentiment, and “We heard you” tools. The phone-sized browser check showed a clear,
  readable layout with useful visual hierarchy.
- [x] **OpenAI sentiment classification verified (2026-09-17).** The deployed
  `/api/classify-sentiment` endpoint correctly rejects unsupported methods and malformed input,
  returns a safe unclassified result for an unknown answer, and the actual OpenAI branch was
  exercised locally with mocked external services. Positive sentiment parsing and the Supabase
  update path both behaved as expected. No fake production feedback was created.
- [x] **Light/dark palette and flock character system refined (2026-09-17).** Added the
  Sunlit Meadow light direction, Evening Marsh dark direction, atmospheric flock backgrounds,
  and distinct emotional accent colors for Robin, Tern, Flamingo, Magpie, Redshank, Owl, and
  Waxwing. The choices are documented in `docs/BRAND_STYLE.md`.

## Resolved legal-review items (2026-09-14)

- [x] **Signed DPAs with each subprocessor.** Stripe, Supabase, Vercel, and Resend DPAs
  downloaded and saved to the local `dpa/` folder (gitignored - operator recordkeeping, not a
  product asset) for GDPR Art. 30 records. **OpenAI's DPA still needs to be saved** now that
  the sentiment-classification API key is active; keep it as an operator record, not a product
  asset.
- [x] **Data residency confirmed.** Supabase project runs in AWS `eu-west-2` (London, UK) - not
  technically EU/EEA post-Brexit, but the UK has a standing EU adequacy decision (data flows
  from the EU to the UK are treated the same as intra-EU transfers, no extra Standard
  Contractual Clauses needed). `Legal.jsx`'s existing transfer-safeguards clause already covers
  this in general terms; revisit only if that adequacy decision is ever withdrawn.
- [x] **Free Supabase backup/restore drill working end-to-end (2026-09-15).**
  `.github/workflows/supabase-backup.yml` runs daily (and on-demand) - dumps `public`, `auth`,
  and `storage` schemas via `pg_dump`, encrypts the result with `openssl`, uploads it as a
  private GitHub Actions artifact (30-day retention), and proves it's restorable by loading it
  into a disposable `postgres:17` service container every run. `SUPABASE_DB_URL` (Session
  pooler URI - the Direct connection host is IPv6-only and unreachable from GitHub runners) and
  `BACKUP_ENCRYPTION_KEY` secrets are set; the restore step also had to pre-create Supabase's
  reserved roles (`anon`, `authenticated`, `service_role`, etc.) since a vanilla Postgres
  container doesn't have them and the dump's RLS policies reference them. First fully green
  run: https://github.com/Stefano060789/iVote/actions/runs/34939001269. This is logical
  backup/restore, not Supabase's managed point-in-time recovery - still worth an independent
  off-GitHub copy before a larger launch, but no longer "no way to recover the database at all."
- [x] **Admin account MFA/2FA (TOTP) shipped and tested end-to-end (2026-09-15).**
  `Account.jsx` has a "Two-factor authentication" section to enroll/remove a TOTP
  authenticator app (Supabase Auth's `auth.mfa` API - no new backend endpoint needed), and
  `Login.jsx` prompts for the 6-digit code after password sign-in if the account has a
  verified factor. Enrollment is opt-in per admin, not enforced for everyone. Confirmed
  end-to-end on production: enrolled with Authy, logged out, signed back in with password,
  got prompted for the code, verified, reached `/admin`. Supabase's Enrollment/Challenge/Verify
  APIs were already enabled by default - no dashboard setting needed. Separate from the Stripe
  account 2FA item below (that one is about Godwit's own platform Stripe account; this one is
  about admins logging into Godwit itself).
- [x] **Stripe platform account 2FA upgraded beyond SMS (2026-09-15).** Added an authenticator
  app as a second factor in Stripe Dashboard -> Settings -> Security, reducing the risk of the
  account being taken over via SIM-swap or phone number compromise. This is about Godwit's own
  Stripe account login, separate from the admin MFA item above (which is about Godwit users
  logging into Godwit itself).

## Internationalization

- [x] **Remaining hardcoded English in `CreatePoll.jsx` and `EditPoll.jsx` removed.** Reused
  existing `admin.pollForm` keys and added the missing locked-feature and save labels to the
  English translations; other locales safely fall back to English until their corresponding
  copy is translated.
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

- [x] **Translation moved to the official Google Cloud Translation API.** `Vote.jsx` now calls
  the server-side `/api/notify` translation branch, which uses the official Cloud Translation
  Basic v2 API and keeps `GOOGLE_TRANSLATE_API_KEY` out of the browser bundle. The existing
  kill switch, timeout, and fallback message remain in place. Configure the API key in Vercel
  and enable the Cloud Translation API in Google Cloud before using it in production.
- [ ] **Vercel's own real-time anomaly alerting ("Observability Plus")** remains gated behind a
  Vercel Pro upgrade - unrelated to Sentry (already fully wired up), a separate paid-plan
  decision.
- [x] **WCAG 2.2 AA engineering audit completed (2026-09-17).** Added visible keyboard focus,
  QR wizard dialog semantics, reduced-motion support, and fixed the QR wizard contrast issue.
  The scope and remaining specialist/manual checks are documented in
  `docs/ACCESSIBILITY_AUDIT.md`; this is not a legal certification.
