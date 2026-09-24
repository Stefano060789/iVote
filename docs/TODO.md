# Godwit - technical development backlog

Business registration, financial, commercial, and legal items are tracked in
the external [`SaaS` folder](../../SaaS/). This file is limited to engineering
and product-development work.

## Engineering operations

- [x] Nightly Stripe reconciliation runs through `/api/cron` at 03:00 UTC,
  compares `donations` and `workspace_subscriptions` against Stripe, stores
  results in `stripe_reconciliation_runs`, and emails mismatches to
  `RECONCILIATION_ALERT_EMAIL`.
- [x] Automated DSAR export/delete runs through `/api/cron` at 03:30 UTC.
- [ ] Turn on Dependabot alerts and security updates in GitHub repository
  settings; `.github/dependabot.yml` is already configured.
- [x] Keep the Vercel function budget at 12 files directly under `api/`.
- [ ] Keep `APP_URL`, email links, Stripe Checkout URLs, and QR short links
  aligned with the production deployment.
- [ ] Decide whether to upgrade Vercel for real-time anomaly alerting;
  Sentry is already wired.

## Product quality

- [x] Customer Connection and Feedback workflow smoke-tested.
- [x] OpenAI sentiment classification verified with mocked external services.
- [x] Light/dark palette and flock character system refined; see
  [`BRAND_STYLE.md`](BRAND_STYLE.md).
- [x] Translation moved to the server-side Google Cloud Translation API.
- [x] WCAG 2.2 AA engineering audit completed; see
  [`ACCESSIBILITY_AUDIT.md`](ACCESSIBILITY_AUDIT.md).

## Internationalization

- [x] Remove remaining hardcoded English from `CreatePoll.jsx` and
  `EditPoll.jsx`.
- [ ] Add Russian and Ukrainian locales, wire them into the language/resource
  maps, translate the existing English keys, and add Cyrillic restricted-topic
  keyword coverage.

## QR codes with multiple linked items

- [ ] Add a dedicated gallery/portfolio item type for multiple images in one
  QR information card if an artist user requests it.

## Pilot engineering validation

- [ ] Test production QR voting, dashboard access, mobile layout, RLS,
  backups, monitoring, and Stripe webhooks.
- [ ] Keep unsupported capabilities out of product surfaces until implemented:
  chain dashboards, agency white-label, custom domains, SMS feedback, and
  native mobile apps.
- [ ] Define the technical pilot metrics and the dashboard/reporting needed to
  collect scans, responses, response rate, low scores, and venue actions.
