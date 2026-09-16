# ROI Roadmap Setup

## Database

Run `supabase/20260907_secure_workspaces.sql` first, then run `supabase/20260907_roi_roadmap.sql` in the Supabase SQL Editor. The second migration is additive: it creates durable QR campaigns, scan events, consented leads, and vote-to-campaign attribution. It keeps public anonymous vote submission available through the existing vote trigger and public RPC functions.

Campaign tracking applies only to links created under **Admin > QR campaigns**. Existing poll links and QR links continue to open the public voter flow without tracking attribution.

## Stripe checkout

Configure these Vercel server environment variables for the `api/create-checkout-session` endpoint:

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret API key. Never prefix it with `VITE_`. |
| `STRIPE_PRICE_STARTER` | Recurring Stripe Price ID for the Starter plan. |
| `STRIPE_PRICE_GROWTH` | Recurring Stripe Price ID for the Growth plan. |
| `APP_URL` | Canonical deployed app origin, such as `https://example.com`. |
| `SUPABASE_URL` | Server-side Supabase project URL used to verify the caller. |
| `SUPABASE_ANON_KEY` | Server-side Supabase anon key used for verification. |

The browser only sends a fixed plan key and the authenticated Supabase access token. The endpoint chooses the Price ID server-side and creates the Stripe Checkout session. `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` remain required client variables; do not create any `VITE_` Stripe variable.

## Follow-up consent

The vote page includes an unchecked, optional email field. A lead is stored only after the voter explicitly checks the consent box and submits a successful vote. Leads are visible only to workspace managers through RLS. This MVP records consent time and email; configure an appropriate privacy notice and downstream contact process before production use.