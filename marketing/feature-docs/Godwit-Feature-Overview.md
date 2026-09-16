# Godwit — Complete Feature Overview
### QR-Based Feedback, Engagement & Payments Platform for Physical Venues
*Prepared for marketing use and legal review — September 2026*

---

## 1. What Godwit Is

Godwit turns any physical location — a restaurant table, a gym, a salon chair, a hotel room, an event entrance, a hospital waiting room — into a measurable feedback channel. A guest scans a single QR code, taps one answer, and the venue instantly sees what's working and what isn't. No app download, no account, no friction for the guest.

Unlike a generic form builder or survey tool, Godwit was designed from the ground up around **physical spaces and printed materials**: QR codes that never need to be reprinted, feedback that's tied to a specific table or location, and a two-way loop that turns a simple scan into a reward, a public review, or a private conversation with the venue — not just a row in a spreadsheet.

**Core promise:** *Turn every physical location into a measurable feedback channel.*

This document walks through every feature currently built into the product, explains how it works, and why it matters commercially. It's intended as source material for website copy, sales one-pagers, pitch decks, and AI-assisted content generation.

---

## 2. Who It's For

- **Restaurants, cafés, and bars** — table-by-table feedback, service speed, meal satisfaction
- **Gyms and fitness studios** — class quality, facility cleanliness, member sentiment
- **Salons and spas** — visit satisfaction, stylist/therapist ratings
- **Hotels and hospitality venues** — room and stay experience, multi-touchpoint feedback
- **Event organizers and conference operators** — session ratings, return intent, training evaluation
- **Healthcare waiting rooms** — comfort and visit satisfaction without disrupting clinical workflows
- **Retail locations** — in-store experience and product feedback
- **Marketing/creative agencies** — as a white-label feedback product they can offer their own clients

Each of these segments has a purpose-built question template out of the box (see Section 4), so the product feels tailor-made rather than generic from the very first poll a venue creates.

---

## 3. The Core Feedback Loop, Explained

The fundamental interaction is intentionally simple, because every extra step loses respondents:

1. **A guest scans a QR code** placed at a table, counter, entrance, or printed on a receipt.
2. **They see one question with a handful of answers**, styled with the venue's own logo and colors.
3. **They tap an answer and submit** — typically in under five seconds, with no login, no app download, and no account required.
4. **The venue sees the result appear on their dashboard immediately**, broken down by location, campaign, and time.
5. **Optionally, the guest is invited to do one more thing** — leave an email for follow-up, enter a prize draw, redeem a reward, or leave a public review — depending on how the venue has configured that specific poll.

Every feature described below plugs into one of these five steps, either making the initial scan-to-vote moment more powerful, or extending what happens immediately after.

---

## 4. Core Feedback Experience

### One-tap QR voting
The entire respondent journey is a single scan and a single tap. There is no app to install and no account to create, which removes the single biggest source of drop-off in traditional feedback tools. This is the foundation the rest of the product is built on: because responding is nearly frictionless, response rates are dramatically higher than email surveys or comment cards.

### Industry-specific poll templates
Instead of starting from a blank question, a venue picks their industry — restaurant, gym, salon, healthcare, event, or general — and gets a ready-made question with sensible answer choices and a matching brand color already applied. A restaurant owner setting up their first poll sees "How was your meal today?" with options like Excellent/Good/Average/Poor, rather than having to invent a question from scratch. This dramatically shortens time-to-first-value for a new customer and makes the product feel purpose-built for their specific business, not a generic form tool repurposed for feedback.

### Custom branding per poll
Every poll can carry the venue's own logo, brand name, primary color, and accent color. The voter never has to wonder whose feedback form they're filling out — it looks and feels like it belongs to the venue, which increases trust and completion rates, and reinforces the venue's own brand rather than Godwit's.

### Multi-language voting
A voter can switch the poll's question and answers into any of nine languages (English, Italian, German, French, Spanish, Portuguese, Arabic, Simplified Chinese, or the original language) with one tap, translated instantly. This is particularly valuable for tourism-heavy venues, international hotels, and multicultural event audiences, where a language barrier would otherwise mean lost feedback entirely.

### Flexible question types
A poll can be single-choice, multiple-choice, or allow voters to type in their own free-text answer in addition to the preset options. This means the same underlying tool supports a simple satisfaction score, a "select all that apply" style question, or fully open-ended qualitative feedback — without needing three different products.

### Scheduled polls
A poll can be set to open and close automatically at specific dates and times. This is built for time-boxed use cases: a weekend pop-up event, a product launch week, or a promotional campaign that should stop collecting responses the moment it ends, without anyone needing to manually turn it off.

### Duplicate & reuse
An existing poll can be cloned in one click, and an existing printed QR code can be reassigned to a brand-new poll. In practice, this means a venue never has to throw away a printed QR poster just because they want to ask a different question — the physical material stays valid indefinitely.

---

## 5. QR & Campaign Tools

### One QR code, several purposes: Info, Polls, Donation, Reward & Prize
A single printed QR code is no longer tied to one poll — it's built as a small menu with up to four kinds of content, added in any combination: one or more **polls**, an **info card** (menu, hours, bio, exhibit notes — anything non-poll), a **donation** ask, and a **reward or prize** entry. A guest who scans the code sees everything the venue has attached to it at once. This is the main structure of the "Create QR code" workflow in the dashboard, and it means one physical sign at a table or entrance can simultaneously collect feedback, show information, invite a tip, and offer an incentive — instead of a venue needing four separate printed codes.

### Reusable, stable QR codes
Every QR code Godwit generates points to a stable link that can be reassigned or reconfigured at any time — which poll(s) it shows, what info card it carries, whether it has a donation ask, what reward it offers — all without ever reprinting the physical code. A venue can print one QR poster and change what's behind it weekly, monthly, or in response to a specific issue.

### Built-in donations (Stripe Connect)
Any QR code can include a donation option so a guest can tip or support the venue directly from their phone — card or digital wallet, no app required. The venue connects their own Stripe account once (via Stripe Connect's hosted onboarding, which handles that business's own identity verification), and from then on every donation is processed as a destination charge: **91% transfers directly to the venue's own connected Stripe account, and Godwit retains a 9% platform fee** on each transaction. Godwit's servers never see or store card details — Stripe handles the entire payment. This is presented to venues explicitly as "tips or donations for your venue" (i.e., discretionary support paid to the business itself), not a charitable-giving or nonprofit-fundraising product.

### Reward & Prize QR items
Separately from a poll's own optional post-vote reward (Section 7), a QR code can carry a standalone "Reward & Prize" item — a freebie, discount, or prize-draw entry shown to every guest who scans that code, independent of any specific poll or answer given (e.g. "Free coffee with any vote" or "Enter to win a gift card"), with an optional redemption code attached.

### Trackable campaigns with placement & variant labels
Each printed QR code can be registered as its own "campaign" with a placement label (lobby, receipt, table tent, restroom, etc.) and an optional variant label (for A/B testing different designs or wording). The dashboard then reports scans, completed votes, and the resulting conversion rate for every single placement separately — so a venue can see, for example, that the QR code by the register converts at 40% while the one on the receipt converts at 12%, and reallocate their printed materials accordingly.

### White-label welcome portals
Before a guest even sees the question, they can be shown a fully custom welcome screen — a headline, a short message, and a button label, all written and branded by the venue. This means the entire experience, start to finish, can carry the venue's own voice and identity, with no visible sign that a third-party tool is involved unless the venue chooses to say so.

### In-dashboard camera QR scanner
Rather than requiring an admin to leave the app and use their phone's separate camera app, Godwit includes a built-in camera scanner directly inside the admin dashboard. Point a phone or laptop camera at any printed QR code and the dashboard instantly shows which poll it's currently pointing to, how many entries it has, and lets the admin redirect it to a different poll on the spot — all without leaving the page.

### AI-generated poster background images *(feature complete, pending API key activation)*
An admin can describe a visual style in plain language — "modern blue city lights for an event poll" — and the system generates a polished, print-ready background image to sit behind the QR code on a printed poster. This removes the need for a venue to hire a designer just to make their QR poster look professional, and turns a plain black-and-white QR code into something that matches their brand aesthetic.

### Embeddable feedback widget for any website
A small snippet of code can be pasted into any website — not just a physical venue's own site, but any e-commerce store, SaaS product, or service business — to add a floating "Give Feedback" button. Clicking it opens the exact same voting experience in a slide-up panel, without the visitor ever leaving the page. This is a significant expansion of the addressable market: Godwit is no longer limited to businesses with a physical QR-scannable location.

### Public "Trust Score" badge
A second embeddable snippet renders a small, live badge — for example, "★ 92% Trust Score · Powered by Godwit" — that a venue can place anywhere on their own website. The score is calculated automatically from real voting data. Every time a visitor sees that badge, it's a small, ongoing marketing impression for Godwit itself, functioning as a built-in, self-perpetuating referral channel embedded in every customer's own web presence.

---

## 6. Feedback Intelligence & Recovery

### Automatic alert rules
An admin can define a rule such as "alert me whenever someone gives a score of 3 or below" or "alert me whenever someone selects the answer 'Dissatisfied.'" The moment a matching vote comes in, an alert is created automatically and surfaced on the dashboard — turning feedback monitoring from something a manager has to remember to check into something the system actively pushes in front of them.

### Automatic vote-volume anomaly detection
Beyond individual bad reviews, the system runs a daily background check comparing each poll's vote volume this week against the week before. If volume drops by 40% or more — which might indicate a broken QR code, a staff member forgetting to mention it, or a genuine drop in foot traffic — an alert is created automatically, without any rule having to be manually configured. This is an early-warning system for problems a manager might not otherwise notice until much later.

### AI sentiment tagging on open-text answers *(feature complete, pending API key activation)*
Whenever a voter types their own free-text answer, it is automatically classified as positive, neutral, or negative. Instead of an admin having to read through every individual comment to get a feel for overall mood, the dashboard shows an instant rollup like "70% positive, 20% neutral, 10% negative, based on 40 answers" for each poll — turning unstructured qualitative feedback into an at-a-glance metric.

### Benchmark reports
A venue's own average score on a given question template can be compared against an anonymized average calculated from other venues using that same template, provided enough other venues exist in the dataset to preserve anonymity. This lets a venue answer a question no competitor tool can: "is our 82% satisfaction score actually good, or is that just average for our industry?" — a uniquely defensible feature that depends entirely on the platform's own aggregated data.

### Feedback recovery workflow
Any alert can be converted into a named recovery task — for example, "Call the customer who complained about slow service" — and tracked through Open, In Progress, and Done states. This closes the gap between "we noticed a problem" and "we actually did something about it," and gives a manager a simple accountability trail for how negative feedback was handled.

### Weekly email reports
Every Monday, an automated summary email is generated and sent to the workspace's designated recipient, covering total polls, votes collected in the last seven days, open feedback alerts, and open recovery tasks. This means a busy owner or manager never has to log in to stay informed — the key numbers arrive in their inbox on a predictable schedule.

### "We heard you" closed-loop public updates
A venue can post a short, public update — for example, "We heard you and fixed the slow Wi-Fi in the lounge" — which then appears automatically on that poll's public results page for any guest to see. Publicly and visibly closing the loop on feedback is one of the most effective ways to build guest trust, because it proves feedback isn't just being collected, it's being acted on.

### Private voter messages to the organizer
While voting, a guest can optionally write a short private message directly to the venue, with an optional email address for a reply. This gives frustrated guests a low-friction, private channel to vent or ask for help before they ever consider posting a public complaint — often defusing a situation that would otherwise have become a public one-star review.

---

## 7. Engagement & Growth Tools

### Post-vote rewards
A venue can configure any individual poll to show a custom thank-you reward immediately after voting — a message, a discount code, and/or a link to redeem it. This is entirely optional and fully controlled by the admin, who decides both whether a reward exists at all and exactly what it is, per poll. It transforms the end of a feedback interaction from a dead end into a concrete incentive to come back. (This is distinct from the QR-level "Reward & Prize" item described in Section 5, which is shown to every scanner of a given QR code regardless of whether — or how — they vote; a venue can use either, both, or neither.)

### Reward redemption tracking
When a customer shows their reward code in person, staff can enter it into the dashboard to mark it redeemed, and the system keeps a running count of how many times each code has actually been used. This turns "we're offering a reward" into measurable proof that the reward is genuinely driving repeat visits, which is exactly the kind of evidence a venue owner needs to justify continuing — or expanding — the program.

### Prize draws / raffles
As an alternative or complement to a fixed reward, a venue can enable an opt-in prize draw on any poll, describe the prize, and let voters enter by leaving their email with consent. When ready, the admin clicks "Pick a winner" and the system randomly selects one verified entrant. Prize draws are a well-established tactic for meaningfully boosting response rates, because the incentive to participate is a chance at something bigger rather than a small guaranteed discount.

### Neutral public review invite + private recovery channel
Every guest who completes a poll sees the same optional "leave a public review" links to the venue's configured platforms (Google, Tripadvisor, etc.), regardless of which answer they chose — the invite is never gated by sentiment and no reward is ever tied to leaving a review, in line with Google/Tripadvisor review policies. Separately, and not instead, a guest whose answer indicates a less positive experience also sees a private acknowledgment so the venue can follow up directly, keeping constructive criticism in a channel where it can actually be acted on.

### Opt-in lead capture with explicit consent
At the point of voting, a guest can choose to leave their email address specifically to be contacted again, with an explicit consent checkbox built directly into the flow. Nothing is captured without deliberate, informed opt-in, which keeps the feature compliant with modern privacy expectations while still giving venues a legitimate way to build a contactable audience from real, engaged customers.

### Automated lead nurture emails
Once a guest opts in, the venue can configure a subject line and message that gets sent to them automatically and immediately — no manual follow-up required. A guest who just left positive feedback and their email can receive a personalized thank-you or offer within moments, while the experience is still fresh in their mind, without anyone at the venue having to lift a finger.

---

## 8. Business, Team & Monetization Features

### Multi-tenant secure workspaces
Every venue operates inside its own fully isolated workspace, with data access enforced at the database level rather than just in the application code. This means one customer's votes, polls, and settings are architecturally guaranteed to be invisible to every other customer — a foundational trust requirement for any business handling customer feedback data.

### Role-based team access
Within a workspace, team members can be assigned Owner, Editor, or Viewer roles, each with a different set of permissions — for example, only owners and editors can delete polls or manage billing, while viewers can see everything but change nothing. This lets a venue safely bring on staff or managers without giving everyone full control.

### Real email team invitations
Adding a colleague isn't just a note in a list — entering their email sends them an actual account invitation, so they get their own secure login rather than sharing a single password across a team. This is a real prerequisite for confidently selling multi-seat plans to a business.

### Three-tier subscription plans with a free trial
The product is structured around three tiers — **Free** (EUR 0), **Starter** (EUR 29/month), and **Growth** (EUR 79/month) — fully wired into Stripe for billing, with plan-based limits already enforced (poll count, QR/campaign count, team seats) both in the UI and at the database level. New subscribers to Starter or Growth automatically receive a **90-day free trial** (once per workspace) before the first charge, handled natively through Stripe's subscription trial mechanism. The monetization foundation is not a future project — it already works end-to-end, live, in production.

### Two independent Stripe money flows: subscriptions and donations
Godwit uses Stripe in two distinct ways, both already live: (1) **platform subscription billing** — the venue pays Godwit directly for its plan, via standard Stripe Checkout subscriptions; and (2) **guest-to-venue donations** — a guest pays the *venue*, not Godwit, via a Stripe Connect destination charge, with Godwit automatically retaining a 9% platform fee and passing the remaining 91% straight through to the venue's own connected Stripe account (see Section 5). These are legally and operationally distinct: in flow (1) Godwit is the merchant of record; in flow (2) the venue is the merchant of record for its own connected account and Godwit acts only as the facilitating platform collecting a fee, with Stripe performing the underlying identity verification (KYC) on each connected venue.

### Workspace webhooks
A venue can paste in a webhook URL, and every new vote is automatically forwarded there as structured data — enabling a one-time setup that connects Godwit to Slack, Zapier, Google Sheets, or virtually any other tool a business already uses, without Godwit having to build a dedicated integration for each one individually.

### Developer API with secure API keys
A workspace can generate its own API key and use it to pull a summary of their poll and vote data programmatically from a dedicated endpoint. This is a small but important checkbox feature for larger, more technical customers who want to build their own internal dashboards or connect Godwit to custom internal systems.

### CSV export
Full poll results can be exported to CSV at any time, giving venues complete ownership and portability of their own data — removing a common objection during sales conversations about vendor lock-in.

### Audit log
Every significant administrative action taken inside a workspace is recorded and viewable, giving teams a clear accountability trail of who changed what and when.

---

## 9. Trust, Compliance & Platform Quality

### Payment handling: no card data ever touches Godwit's servers
All payment processing — both platform subscriptions and guest donations — is handled entirely by Stripe (a PCI-DSS Level 1 certified processor). Godwit never receives, transmits, or stores raw card numbers, expiry dates, or CVCs; card entry happens on Stripe-hosted Checkout pages or Stripe's own embedded elements. Godwit's database stores only Stripe's own identifiers (customer ID, subscription ID, connected account ID) needed to look up and manage billing state.

### Connected-account identity verification (KYC) for donations — enforced at the database level
Before a venue can receive donations, Stripe Connect's own hosted onboarding flow collects and verifies that venue's business/individual identity (KYC/AML checks are performed by Stripe, not Godwit). Godwit only stores the resulting connected-account ID and its verification status; it does not collect or store the underlying identity documents itself. This isn't just a UI convention: the database itself enforces it via a check constraint (`donation_settings` cannot have donations turned on unless Stripe reports `charges_enabled`), and every donation-checkout lookup filters on that same flag — so there is no code path, intentional or accidental, that can accept a donation for an unverified connected account.

### Multi-tenant secure workspaces
Every venue operates inside its own fully isolated workspace, with data access enforced at the database level (Postgres row-level security) rather than just in the application code. This means one customer's votes, polls, and settings are architecturally guaranteed to be invisible to every other customer — a foundational trust requirement for any business handling customer feedback and payment-adjacent data.

### Role-based team access
Within a workspace, team members can be assigned Owner, Editor, or Viewer roles, each with a different set of permissions — for example, only owners and editors can delete polls or manage billing, while viewers can see everything but change nothing.

### Explicit, unbundled consent for every optional data-collection point
Nothing beyond an anonymous poll answer is collected without a deliberate, separate opt-in: a lead-capture email requires its own consent checkbox; a prize-draw entry requires its own consent checkbox; a private message to the organizer is voluntary free text the guest chooses to submit. None of these is a precondition for voting, and none is bundled into a single "accept everything" checkbox.

### Neutral, policy-compliant review invitations
Every guest who completes a poll sees the same "leave a public review" links regardless of which answer they gave — the invite is never gated by sentiment, and no reward or incentive is ever tied to leaving a (or a specific rating of) public review, consistent with Google's and Tripadvisor's review policies against incentivized or filtered reviews.

### Stripe webhook audit trail and idempotency
Every verified Stripe webhook delivery (subscription events and Connect account updates) is persisted with its raw payload and Stripe's own event ID, which now doubles as a real idempotency key — a duplicate delivery (Stripe retries on timeout, or a delivery can simply be duplicated) is recognized and skipped before any side effect runs, rather than relying only on the incidental safety of natural-key database upserts. This gives a concrete audit trail for investigating any disputed payment or payout after the fact.

### Prize-draw admin acknowledgment and audited winner selection
Voters already see a full eligibility disclaimer (no purchase necessary, 18+ and locally eligible, one entry per person, void where prohibited) and must give explicit, separate consent before their email is entered into any prize draw. As of this revision, the admin side is also enforced: a workspace cannot turn on a prize draw for a poll without first checking a box confirming they've reviewed the local promotional/sweepstakes-law obligations that apply to them — enforced by a database constraint, not just a client-side prompt. Every time a winner is picked, the system now logs an audit record (timestamp, admin who drew it, entrant count, and a one-way hash of each entrant's email — not the plaintext list) so a disputed draw can be verified after the fact without creating a second place that stores voter emails.

### Ongoing dependency vulnerability scanning
The codebase's npm dependencies are scanned weekly via Dependabot, which opens a pull request automatically when a package has a known vulnerability or an available update, rather than relying on an occasional manual audit.
Open-text answers are automatically screened for political, religious, or sexual content before they're accepted, and any guest can report an existing answer they find inappropriate for manual review.

### Optional automatic vote retention window
A workspace can set an optional number of days after which old votes are automatically and permanently deleted by a scheduled background job — a concrete data-minimization control relevant to GDPR's storage-limitation principle and to enterprise/EU procurement requirements. The default, if a workspace sets no window, is indefinite retention until the workspace itself exports or deletes data.

### Privacy, Terms, and Support pages
A privacy policy, terms of service, and a support page are already built and live at `/legal` and `/support` (see `src/pages/Legal.jsx`), rather than being an afterthought bolted on right before launch.

### Third-party subprocessors currently in use
For a data-processing/privacy-policy legal review, the concrete list of subprocessors that touch venue or voter data today is: **Stripe** (payments, subscriptions, Connect/KYC), **Supabase** (Postgres database, auth, hosting of all workspace/poll/vote data), **Vercel** (application hosting and serverless functions), **Resend** (transactional and weekly-report emails), and **OpenAI** (poster background image generation and open-text sentiment tagging — both currently feature-complete but pending API key activation, see Section 11). No other third parties currently receive venue or voter data.

### Installable app (PWA)
Godwit can be installed directly onto a phone or desktop home screen like a native app, with no app store submission required.

### Mobile-first, tab-organized admin dashboard
The admin experience is organized into clear tabs — Overview, Polls, QR codes/Engagement, Connection, Feedback, and Settings — so that as the feature set has grown substantially, day-to-day use has stayed simple rather than becoming an overwhelming wall of options.

### Live error monitoring
Application errors are tracked in real time through Sentry, covering both the frontend and the backend serverless functions (including Stripe webhook failures), so problems can be identified and fixed proactively rather than being discovered only when a customer complains.

### Known open items, tracked for follow-up
Beyond the platform-Stripe-2FA gap noted below, an external legal/security review (see Section 12) surfaced a further set of items that are genuine gaps, not yet built, and tracked in the project's internal TODO list rather than claimed as done: Stripe Tax (or equivalent) for VAT/SST on subscriptions and platform fees; signed Data Processing Agreements with each subprocessor; admin-account 2FA/MFA; geo-gating of prize draws by jurisdiction; a nightly Stripe reconciliation job comparing internal records against the Stripe API; and a fully automated data-export/deletion flow (today, data-subject requests are logged to an internal queue and handled manually, which is adequate at current volume but not automated).

### Known open item flagged for legal/security review
Stripe account-level verification for the platform's own live Stripe account currently relies on phone number (SMS) only. A stronger second identification factor (e.g. Stripe Identity document verification, authenticator-app 2FA, or a recovery contact) has been identified internally as needed and is tracked as an open action item, not yet resolved as of this document's date. This does not affect the KYC Stripe performs independently on each venue's own connected account for donations (see above) — it concerns only the security of Godwit's own platform-level Stripe account.

---

## 10. What Makes Godwit Different

1. **It's a two-way loop, not just a survey tool.** Rewards, prize draws, review routing, and public "we heard you" updates all close the loop back to the guest — most QR feedback tools stop at data collection and leave the venue to figure out what to do next on their own.
2. **It's built for physical locations first.** Reusable, multi-purpose QR codes (poll + info + donation + reward in one) and per-location analytics are designed around the reality of printed materials and real venues, not just repurposed from a generic online form builder.
3. **It gets smarter over time.** Anomaly detection, AI sentiment tagging, and benchmark reports turn raw feedback into proactive insight instead of a spreadsheet someone has to read and interpret manually every week.
4. **It's already enterprise-shaped.** Multi-tenant security, team roles, a developer API, webhooks, and compliance controls like data retention are in place from day one — the platform can grow from a single independent café to a multi-location chain without needing to be rebuilt from scratch.

---

## 11. Current Status (for internal marketing planning)

**Live and fully working today:** every feature described above, with two clearly marked exceptions.

**Built and code-complete, awaiting activation:**
- AI-generated QR poster background images (waiting on an OpenAI API key)
- AI sentiment tagging on open-text answers (same dependency)

**Not yet built (roadmap candidates for future messaging, not current claims):**
- A true multi-location "chain" roll-up dashboard for franchises managing many separate venues from one parent account
- An agency/white-label reseller program
- Custom domains per venue
- SMS-based feedback that doesn't require a QR scan
- Native mobile app packaging for the app stores
- Formal accessibility (WCAG) certification

---

## 12. Specific Questions for Legal Review

This section exists to focus a legal review, not to pre-judge the answers. Godwit's team believes the product is reasonably designed, but has **not** had these points confirmed by a lawyer, and none of the following should be read as a legal conclusion.

1. **"Donation" wording vs. charitable-solicitation law.** Guests are told they can "tip or donate" to a venue, and the money goes straight to that venue's own bank account via its own Stripe Connect account — it is not routed through, or given to, any registered charity or nonprofit, and Godwit is not a party to the underlying transaction beyond its 9% platform fee. Does calling this a "donation" (rather than, say, a "tip" or "support payment") create any charitable-solicitation registration/disclosure obligation in any jurisdiction where a venue operates, given it's actually a payment to a for-profit business?
2. **Platform-fee / payment-facilitator classification.** Godwit takes a 9% application fee on each donation passed through via Stripe Connect destination charges. Does this arrangement (with Stripe as the regulated payment processor and Stripe performing KYC on each connected venue) keep Godwit outside money-transmitter/payment-facilitator licensing requirements, or does the fee-taking role itself trigger any registration in the jurisdictions Godwit or its venues operate in?
3. **Consumer protection for subscriptions with a free trial.** Starter and Growth plans auto-convert from a 90-day free trial into a paid recurring subscription unless cancelled. Are the current disclosures (shown at checkout and in the billing UI) sufficient under applicable consumer-protection / distance-selling / auto-renewal laws (e.g. EU Consumer Rights Directive, US state auto-renewal statutes), including the required clarity on price, renewal date, and cancellation method?
4. **Prize draws / raffles.** The prize-draw feature (Section 7) lets a venue run a no-purchase-necessary style entry via email opt-in, with a manual "pick a winner" action. As of this revision, an admin cannot enable a prize draw without first acknowledging (a required, database-enforced checkbox) that they've checked their own local promotional/sweepstakes-law obligations, and every winner selection is now logged to an auditable record. Godwit still does **not** restrict this feature by jurisdiction, age, or local gambling/promotional-contest law beyond that acknowledgment and the voter-facing disclaimer. What baseline rules, disclosures, or eligibility restrictions (e.g. official rules, no-purchase-necessary language, minimum age, odds disclosure, or an outright block in specific jurisdictions) should be required of venues using this feature, and does Godwit need to add jurisdiction-level guardrails rather than a self-attestation?
5. **GDPR / cross-border data transfer.** Venue and voter data is hosted via Supabase and Vercel, with additional processing by Stripe, Resend, and (once activated) OpenAI. Confirm what data-processing agreements, subprocessor disclosures, and cross-border transfer mechanisms (e.g. SCCs) are needed given Godwit's and its customers' likely jurisdictions, and whether the current privacy policy (`/legal`) adequately names these subprocessors and describes the legal basis for each processing purpose (contract performance vs. legitimate interest vs. consent).
6. **Data retention defaults.** Retention is opt-in per workspace (Section 9) — a workspace that sets no retention window keeps votes indefinitely. Is an opt-in (rather than a default maximum) retention model defensible under GDPR's storage-limitation principle for personal data collected via lead-capture emails and prize-draw entries specifically (as opposed to anonymous poll answers)?
7. **Review-platform compliance.** The neutral, non-gated review-invite design (Section 9) is intended to comply with Google's and Tripadvisor's policies against incentivized/filtered reviews. Should this be reviewed against the current text of those platforms' policies, and does bundling a reward or prize-draw entry on the *same* QR code as a review link (even though not conditioned on leaving a review) need clearer separation or disclosure?
8. **Merchant-of-record status, tax reporting, and indirect tax on subscriptions.** For donations, the venue is the merchant of record on its own Stripe Connect account; confirm whether Godwit has any tax-information-reporting obligation of its own (e.g. EU DAC7-style platform reporting for facilitated payments, or equivalent rules elsewhere) given its role in facilitating and taking a fee from these transactions. Separately, Godwit *is* the merchant of record for Starter/Growth subscription revenue and the donation platform fee — confirm what VAT/GST/indirect-tax registration and invoicing obligations that creates in the jurisdictions its customers are based in, and whether Stripe Tax (or an equivalent service) should be enabled before scaling paid subscriptions further.
9. **Minors and age eligibility.** No feature technically verifies a voter's age — the prize-draw flow asks voters to self-attest ("I'm 18+...", Section 7) but doesn't check it. Is self-attestation sufficient here given the data collected is otherwise anonymous poll answers, or is stronger verification expected for the lead-capture, prize-draw, and donation flows specifically, all of which collect an email address or a payment from an unverified individual?
10. **Terms of Service coverage.** Confirm the current Terms of Service (`/legal`) adequately covers: the venue's own responsibility for content it posts (info cards, welcome messages, reward terms), the venue's own responsibility for running compliant prize draws/donations even where Godwit has added product-level safeguards (Section 9), Godwit's liability limitations as a platform (not a party to the venue-guest relationship), and the open items listed in Section 9's "Known open items" as disclosed operational risk rather than hidden ones.

A fuller, developer-facing action list from the most recent review pass (idempotent webhooks, KYC gating, consent/retention/DSAR, prize-draw gating, tax classification, PCI scope, subprocessor DPAs, monitoring, and geo-gating) is tracked in the project's internal `docs/TODO.md` under "External legal review (2026-09-14) - action tracker", including which items are now code-complete and which still need a business or legal decision rather than more code.

---

*This document was generated to support marketing content creation — website copy, sales one-pagers, social content, and pitch decks — and, as of this revision, to support an external legal review. Section 12 is written to flag open questions, not to assert conclusions. All feature descriptions reflect the current, working state of the product as of the date above.*
