const PLANS = {
  starter: { priceEnv: "STRIPE_PRICE_STARTER", label: "Starter" },
  growth: { priceEnv: "STRIPE_PRICE_GROWTH", label: "Growth" }
};

function readBearerToken(request) {
  const header = request.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

async function getAuthenticatedUser(token) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !token) return null;

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}` }
  });

  return authResponse.ok ? authResponse.json() : null;
}

async function getManagedWorkspace(token, userId) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const headers = { apikey: supabaseAnonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const workspaceResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/current_workspace_id`, { method: "POST", headers, body: "{}" });
  if (!workspaceResponse.ok) return null;
  const workspaceId = await workspaceResponse.json();
  const memberResponse = await fetch(`${supabaseUrl}/rest/v1/workspace_members?select=role&workspace_id=eq.${encodeURIComponent(workspaceId)}&user_id=eq.${encodeURIComponent(userId)}&role=in.(owner,editor)&limit=1`, { headers });
  const members = memberResponse.ok ? await memberResponse.json() : [];
  return members.length ? workspaceId : null;
}

// A workspace only ever gets a row in workspace_subscriptions once its first Stripe
// checkout completes (there's no default row created up front). So "a row exists at
// all" - regardless of its current plan/status - reliably means this workspace has
// already been through Stripe checkout at least once, which is what disqualifies it
// from a second free trial (otherwise: subscribe, cancel, resubscribe, repeat forever).
const FREE_TRIAL_DAYS = 30;

async function hasUsedTrialBefore(headers, workspaceId) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return true; // fail closed: no trial if we can't check
  const response = await fetch(
    `${supabaseUrl}/rest/v1/workspace_subscriptions?select=workspace_id&workspace_id=eq.${encodeURIComponent(workspaceId)}&limit=1`,
    { headers }
  );
  if (!response.ok) return true; // fail closed
  const rows = await response.json();
  return rows.length > 0;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const planKey = String(request.body?.plan || "");
  const plan = PLANS[planKey];
  const priceId = plan && process.env[plan.priceEnv];
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.APP_URL || request.headers.origin;
  const user = await getAuthenticatedUser(readBearerToken(request));

  if (!user) return response.status(401).json({ error: "Sign in to start a subscription." });
  if (!plan || !priceId) return response.status(503).json({ error: "This plan is not configured yet." });
  if (!stripeSecretKey || !appUrl) return response.status(503).json({ error: "Billing is not configured yet." });
  const workspaceId = await getManagedWorkspace(readBearerToken(request), user.id);
  if (!workspaceId) return response.status(403).json({ error: "A workspace owner or editor role is required." });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const alreadyTrialed = supabaseUrl && supabaseAnonKey
    ? await hasUsedTrialBefore({ apikey: supabaseAnonKey, Authorization: `Bearer ${readBearerToken(request)}` }, workspaceId)
    : true;
  const trialEligible = planKey !== "free" && !alreadyTrialed;

  const form = new URLSearchParams({
    mode: "subscription",
    success_url: `${appUrl}/admin/billing?checkout=success${trialEligible ? "&trial=1" : ""}`,
    cancel_url: `${appUrl}/admin/billing?checkout=cancelled`,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    "metadata[plan]": planKey,
    "metadata[supabase_user_id]": user.id,
    "metadata[workspace_id]": workspaceId,
    "subscription_data[metadata][plan]": planKey,
    "subscription_data[metadata][workspace_id]": workspaceId,
    client_reference_id: user.id
  });
  if (user.email) form.set("customer_email", user.email);
  if (trialEligible) {
    form.set("subscription_data[trial_period_days]", String(FREE_TRIAL_DAYS));
    // If a trial ends with no payment method on file, cancel it rather than silently
    // billing a card that was never actually confirmed.
    form.set("subscription_data[trial_settings][end_behavior][missing_payment_method]", "cancel");
    form.set("payment_method_collection", "always");
  }

  try {
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: form
    });
    const checkout = await stripeResponse.json();

    if (!stripeResponse.ok || !checkout.url) {
      console.error("Stripe Checkout session failed", checkout);
      return response.status(502).json({ error: "Unable to start checkout. Please try again." });
    }

    return response.status(200).json({ url: checkout.url, plan: plan.label, trialDays: trialEligible ? FREE_TRIAL_DAYS : 0 });
  } catch (error) {
    console.error("Stripe Checkout error", error);
    return response.status(500).json({ error: "Unable to start checkout right now." });
  }
}