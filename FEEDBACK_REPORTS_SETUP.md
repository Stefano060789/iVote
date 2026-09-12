# Feedback, Reports, and QR Experiments Setup

## Required SQL

Run these SQL files in this exact order in the Supabase SQL Editor:

1. `supabase/20260907_secure_workspaces.sql`
2. `supabase/20260907_roi_roadmap.sql`
3. `supabase/20260907_launch_foundation.sql`
4. `supabase/20260907_feedback_reports_qr_experiments.sql`
5. `supabase/20260909_feedback_benefits.sql`

The fourth migration adds strict manager-only RLS for alert rules, generated alerts, recovery tasks, and weekly report settings. It also adds QR placement and variant labels. The fifth migration adds answer-triggered email and external-review benefits, with manager approval for review claims. Public anonymous voting remains permitted by the existing narrowly scoped vote policy; the new alert trigger runs after a successful vote.

## Required Environment Variables

Configure these Vercel server variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | Yes | Supabase project URL for the scheduled report endpoint. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only key used by the scheduled report endpoint to aggregate enabled workspaces. Never expose it as `VITE_`. |
| `CRON_SECRET` | Yes | Long random value. Vercel calls the cron endpoint with this value in `Authorization: Bearer <CRON_SECRET>`. |
| `RESEND_API_KEY` | No | Enables delivery with Resend. Without it, the protected endpoint returns email-ready previews and sends nothing. |
| `REPORT_FROM_EMAIL` | Required with `RESEND_API_KEY` | Verified Resend sender, such as `reports@example.com`. |

Vercel invokes `/api/cron?job=weekly-report` every Monday at 13:00 UTC (this and the other cron-only jobs share one Serverless Function, `api/cron.js`, dispatched by the `job` query param - see `vercel.json`). The endpoint only accepts `GET` with the matching bearer secret. Configure at least one manager's recipient address and enable weekly reports under **Admin > Feedback recovery and weekly reports**. Before enabling delivery, verify the sender domain in Resend and add the variables in the Vercel project environment.