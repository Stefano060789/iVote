# iVote — open items to come back to

Things that are known gaps but intentionally deferred, not forgotten. Check this file
periodically and clear items as you address them.

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

## Branding (once a name is chosen)

- [ ] Full rename pass once you pick a new product name: `public/manifest.webmanifest`
  (`name`/`short_name`), `index.html` `<title>`, `NavBar.jsx` default `companyName`
  fallback ("iVote"), default workspace profile in `workspaceProfile.js`, and any
  remaining "iVote" copy in `Landing.jsx`/`Legal.jsx`/`marketing/*.md`. `package.json`
  `name` was already changed to the neutral `"ivote"` as a stopgap.
