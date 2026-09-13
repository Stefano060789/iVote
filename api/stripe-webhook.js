import { createHmac, timingSafeEqual } from "node:crypto";

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

export const config = { api: { bodyParser: false } };

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signingSecret) return response.status(503).json({ error: "Webhook is not configured." });

  const rawBody = await readRawBody(request);
  if (!verifyStripeSignature(rawBody, request.headers["stripe-signature"], signingSecret)) {
    return response.status(400).json({ error: "Invalid Stripe signature." });
  }

  try {
    const event = JSON.parse(rawBody);
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
      return response.status(200).json({ received: true });
    }

    // A voter's donation checkout completed - record it, and stop here (do NOT fall through
    // to the subscription-upsert logic below, which would otherwise misread the donation's
    // metadata.workspace_id as a plan change for that workspace).
    if (event.type === "checkout.session.completed" && object.metadata?.kind === "donation") {
      await recordDonation(object);
      return response.status(200).json({ received: true });
    }

    const workspaceId = object.metadata?.workspace_id;
    if (!workspaceId) return response.status(200).json({ received: true });

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
    return response.status(200).json({ received: true });
  } catch (error) {
    console.error("Stripe webhook failed", error);
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
