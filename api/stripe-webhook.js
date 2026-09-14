import { createHmac, timingSafeEqual } from "node:crypto";
import { captureError } from "../lib/errorReporting.js";

function verifyStripeSignature(payload, signatureHeader, secret) {
  const timestamp = signatureHeader?.match(/(?:^|,)t=(\d+)/)?.[1];
  const signatures = [...(signatureHeader?.matchAll(/(?:^|,)v1=([^,]+)/g) ?? [])].map((match) => match[1]);
  if (!timestamp || signatures.length === 0) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return signatures.some((signature) => {
    const received = Buffer.from(signature, "hex");
    const calculated = Buffer.from(expected, "hex");
    return received.length === calculated.length && timingSafeEqual(received, calculated);
  });
}

async function readRawBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function upsertSubscription(subscription) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase webhook credentials are not configured.");

  const response = await fetch(`${supabaseUrl}/rest/v1/workspace_subscriptions?on_conflict=workspace_id`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(subscription)
  });
  if (!response.ok) throw new Error(`Supabase subscription update failed (${response.status}).`);
}

async function supabaseServiceRequest(path, { method = "GET", body, prefer } = {}) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase webhook credentials are not configured.");
  const response = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}).`);
  return response.status === 204 ? null : response.json();
}

// Insert a completed donation into the ledger. Called for checkout.session.completed events
// carrying metadata.kind === "donation" (set by api/create-checkout-session.js's donation mode).
async function recordDonation(object) {
  const workspaceId = object.metadata?.workspace_id;
  if (!workspaceId) return;
  await supabaseServiceRequest("/rest/v1/donations?on_conflict=stripe_checkout_session_id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      workspace_id: workspaceId,
      campaign_id: object.metadata?.campaign_id ? Number(object.metadata.campaign_id) : null,
      stripe_checkout_session_id: object.id,
      stripe_payment_intent_id: object.payment_intent || null,
      amount_total: (object.amount_total ?? 0) / 100,
      application_fee_amount: object.metadata?.application_fee_amount
        ? Number(object.metadata.application_fee_amount) / 100
        : 0,
      currency: (object.metadata?.currency || object.currency || "eur").toUpperCase(),
      donor_email: object.customer_details?.email || object.customer_email || null,
      status: "succeeded"
    }
  });
}

// Persist the verified raw event and, if it's the first time we've seen this event.id, return
// true so the caller proceeds with side effects. A second delivery of the same event.id (Stripe
// retries on timeout/5xx, or a delivery can simply be duplicated) hits the primary-key conflict,
// is ignored, and the caller treats it as already handled - real idempotency, not just the
// incidental safety of the natural-key upserts below.
async function recordWebhookEventIfNew(event) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return true; // fail open rather than dropping a real event

  const response = await fetch(`${supabaseUrl}/rest/v1/stripe_webhook_events?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=representation"
    },
    body: JSON.stringify({ id: event.id, event_type: event.type, payload: event })
  });
  if (!response.ok) return true; // fail open: don't block a real payment on an audit-log write
  const rows = await response.json().catch(() => []);
  return rows.length > 0;
}

async function markWebhookEventProcessed(eventId, errorMessage) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey || !eventId) return;
  await fetch(`${supabaseUrl}/rest/v1/stripe_webhook_events?id=eq.${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({ processed_at: new Date().toISOString(), error: errorMessage || null })
  }).catch(() => {}); // best-effort - never let audit-log bookkeeping fail the webhook response
}

export const config = { api: { bodyParser: false } };

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  // Two Stripe webhook endpoints point at this same URL, each with its own signing secret:
  // STRIPE_WEBHOOK_SECRET for platform events ("Your account" scope - subscriptions,
  // donation checkouts) and STRIPE_CONNECT_WEBHOOK_SECRET for account.updated events
  // ("Connected accounts" scope - Connect onboarding status). Stripe only ever signs with
  // one of the two for a given delivery, so try each until one verifies.
  const signingSecrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(Boolean);
  if (signingSecrets.length === 0) return response.status(503).json({ error: "Webhook is not configured." });

  const rawBody = await readRawBody(request);
  const signatureHeader = request.headers["stripe-signature"];
  if (!signingSecrets.some((secret) => verifyStripeSignature(rawBody, signatureHeader, secret))) {
    return response.status(400).json({ error: "Invalid Stripe signature." });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (error) {
    captureError("Stripe webhook payload parse failed", error);
    return response.status(400).json({ error: "Invalid payload." });
  }

  const isNewEvent = await recordWebhookEventIfNew(event);
  if (!isNewEvent) return response.status(200).json({ received: true, duplicate: true });

  try {
    const object = event.data?.object ?? {};

    // Connect account status changed (most importantly: onboarding completed) - update the
    // owning workspace's donation_settings row so the Admin UI reflects it without waiting
    // on the admin to manually re-check. event.account (not metadata) carries the connected
    // account id for these events.
    if (event.type === "account.updated" && event.account) {
      await supabaseServiceRequest(
        `/rest/v1/donation_settings?stripe_account_id=eq.${encodeURIComponent(event.account)}`,
        {
          method: "PATCH",
          prefer: "return=minimal",
          body: {
            stripe_onboarding_complete: Boolean(object.details_submitted),
            stripe_charges_enabled: Boolean(object.charges_enabled),
            stripe_payouts_enabled: Boolean(object.payouts_enabled),
            updated_at: new Date().toISOString()
          }
        }
      );
      await markWebhookEventProcessed(event.id);
      return response.status(200).json({ received: true });
    }

    // A voter's donation checkout completed - record it, and stop here (do NOT fall through
    // to the subscription-upsert logic below, which would otherwise misread the donation's
    // metadata.workspace_id as a plan change for that workspace).
    if (event.type === "checkout.session.completed" && object.metadata?.kind === "donation") {
      await recordDonation(object);
      await markWebhookEventProcessed(event.id);
      return response.status(200).json({ received: true });
    }

    const workspaceId = object.metadata?.workspace_id;
    if (!workspaceId) {
      await markWebhookEventProcessed(event.id);
      return response.status(200).json({ received: true });
    }

    const plan = object.metadata?.plan || "free";
    const status = event.type === "checkout.session.completed"
      ? "active"
      : normalizeSubscriptionStatus(object.status || "inactive");
    await upsertSubscription({
      workspace_id: workspaceId,
      plan,
      status,
      stripe_customer_id: object.customer || null,
      stripe_subscription_id: object.subscription || object.id || null,
      current_period_end: object.current_period_end ? new Date(object.current_period_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString()
    });
    await markWebhookEventProcessed(event.id);
    return response.status(200).json({ received: true });
  } catch (error) {
    captureError("Stripe webhook failed", error);
    await markWebhookEventProcessed(event.id, error.message);
    return response.status(500).json({ error: "Webhook processing failed." });
  }
}

function normalizeSubscriptionStatus(status) {
  const supportedStatuses = new Set([
    "active",
    "trialing",
    "past_due",
    "canceled",
    "inactive",
    "incomplete",
    "unpaid",
    "paused"
  ]);
  return supportedStatuses.has(status) ? status : "inactive";
}
