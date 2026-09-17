import { stripeRequest, supabaseGet, supabasePost, sendEmail } from "./cronHelpers.js";

async function retrieveStripeObjects(ids, resource) {
  const entries = await Promise.all(ids.filter(Boolean).map(async (id) => {
    try {
      return [id, await stripeRequest(`${resource}/${encodeURIComponent(id)}`)];
    } catch (error) {
      if (error.message.includes("(404)")) return [id, null];
      throw error;
    }
  }));
  return new Map(entries);
}

function compareSubscription(local, remote) {
  if (!remote) return "missing_in_stripe";
  if (remote.status !== local.status) return `status:${local.status}->${remote.status}`;
  const remoteEnd = remote.current_period_end ? new Date(remote.current_period_end * 1000).toISOString() : null;
  if (remoteEnd !== (local.current_period_end || null)) return "period_end_mismatch";
  return null;
}

function compareDonation(local, remote) {
  if (!remote) return "missing_in_stripe";
  const expectedAmount = Math.round(Number(local.amount_total) * 100);
  if (remote.amount_received !== expectedAmount && remote.amount !== expectedAmount) return "amount_mismatch";
  if (String(remote.currency || "").toUpperCase() !== local.currency) return "currency_mismatch";
  const expectedStatus = remote.status === "succeeded" ? "succeeded" : remote.status === "canceled" ? "failed" : "pending";
  if (expectedStatus !== local.status && !(local.status === "refunded" && remote.status === "succeeded")) {
    return `status:${local.status}->${expectedStatus}`;
  }
  return null;
}

export async function runStripeReconciliation() {
  const [subscriptions, donations] = await Promise.all([
    supabaseGet("workspace_subscriptions?select=workspace_id,status,stripe_customer_id,stripe_subscription_id,current_period_end"),
    supabaseGet("donations?select=id,workspace_id,stripe_payment_intent_id,amount_total,currency,status,created_at")
  ]);

  const [subscriptionsById, paymentIntentsById] = await Promise.all([
    retrieveStripeObjects(subscriptions.map(({ stripe_subscription_id }) => stripe_subscription_id), "subscriptions"),
    retrieveStripeObjects(donations.map(({ stripe_payment_intent_id }) => stripe_payment_intent_id), "payment_intents")
  ]);
  const mismatches = [];
  for (const subscription of subscriptions) {
    const mismatch = compareSubscription(subscription, subscriptionsById.get(subscription.stripe_subscription_id));
    if (mismatch) mismatches.push({ type: "subscription", id: subscription.stripe_subscription_id, workspaceId: subscription.workspace_id, issue: mismatch });
  }
  for (const donation of donations) {
    const mismatch = compareDonation(donation, paymentIntentsById.get(donation.stripe_payment_intent_id));
    if (mismatch) mismatches.push({ type: "donation", id: donation.id, paymentIntentId: donation.stripe_payment_intent_id, workspaceId: donation.workspace_id, issue: mismatch });
  }

  const run = {
    checkedSubscriptions: subscriptions.length,
    checkedDonations: donations.length,
    stripeSubscriptionsRetrieved: subscriptionsById.size,
    stripePaymentIntentsRetrieved: paymentIntentsById.size,
    mismatchCount: mismatches.length,
    mismatches
  };
  await supabasePost("stripe_reconciliation_runs", { summary: run, mismatch_count: mismatches.length });
  if (mismatches.length && process.env.RESEND_API_KEY && process.env.REPORT_FROM_EMAIL && process.env.RECONCILIATION_ALERT_EMAIL) {
    await sendEmail({
      to: process.env.RECONCILIATION_ALERT_EMAIL,
      subject: `Godwit Stripe reconciliation: ${mismatches.length} mismatch(es)`,
      text: JSON.stringify(run, null, 2)
    });
  }
  return run;
}
