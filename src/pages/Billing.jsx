import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";
import { loadWorkspaceProfile } from "../lib/workspaceProfile";
import { PLAN_FEATURES, planLabel } from "../lib/entitlements";

const PLANS = [
  {
    key: "free",
    name: "Free",
    price: "EUR 0",
    description: "Try the feedback loop at a single venue.",
    features: ["3 total polls", "No tracked QR campaigns", "Core response results", "1 team seat"]
  },
  {
    key: "starter",
    name: "Starter",
    price: "EUR 29 / month",
    description: "Run feedback professionally, with your own branding and exports.",
    features: ["25 total polls", "10 tracked QR campaigns", "CSV export & audit log", "Weekly email reports", "Post-vote rewards", "3 team seats"]
  },
  {
    key: "growth",
    name: "Growth",
    price: "EUR 79 / month",
    description: "Turn feedback into repeat business with automation and integrations.",
    features: ["250 total polls", "100 tracked QR campaigns", "Reward redemption tracking", "Prize draws / raffles", "Automated follow-up & win-back emails", "Public reputation monitoring", "Webhooks & developer API", "10 team seats"],
    highlight: true
  }
];

const COMPARISON_ROWS = [
  { label: "Poll limit", key: "pollLimit", format: (value) => value },
  { label: "Tracked QR campaigns", key: "campaignLimit", format: (value) => value },
  { label: "Team seats", key: "seatLimit", format: (value) => value },
  { label: "CSV export", key: "csvExport" },
  { label: "Activity / audit log", key: "auditLog" },
  { label: "Weekly email reports", key: "weeklyReport" },
  { label: "Post-vote rewards", key: "rewardMessage" },
  { label: "Lead capture (manual)", key: "leadCapture" },
  { label: "Reward redemption tracking", key: "redemptionTracking" },
  { label: "Prize draws / raffles", key: "prizeDraws" },
  { label: "Automated follow-up & win-back emails", key: "automatedNurture" },
  { label: "Public reputation monitoring", key: "reputationMonitoring" },
  { label: "Webhooks", key: "webhooks" },
  { label: "Developer API access", key: "apiAccess" }
];

function FeatureCell({ value }) {
  if (typeof value === "boolean") {
    return value ? <span className="text-emerald-400">✓</span> : <span className="text-slate-600">—</span>;
  }
  return <span>{value}</span>;
}

export default function Billing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState("");
  const [error, setError] = useState("");
  const [currentPlan, setCurrentPlan] = useState("");
  const [trialEligible, setTrialEligible] = useState(false);
  const checkoutState = searchParams.get("checkout");
  const trialJustStarted = checkoutState === "success" && searchParams.get("trial") === "1";

  useEffect(() => {
    async function loadCurrentPlan() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;
      try {
        const profile = await loadWorkspaceProfile();
        setCurrentPlan(profile.plan || "free");
        // A workspace only gets a workspace_subscriptions row once its first Stripe
        // checkout completes, so "no row yet" is exactly "never subscribed before" -
        // the same rule api/create-checkout-session.js uses to grant the trial.
        const { data: subscriptionRows } = await supabase
          .from("workspace_subscriptions")
          .select("workspace_id")
          .eq("workspace_id", profile.id)
          .limit(1);
        setTrialEligible(!subscriptionRows || subscriptionRows.length === 0);
      } catch (profileError) {
        console.error(profileError);
      }
    }
    loadCurrentPlan();
  }, []);

  async function startCheckout(plan) {
    if (plan.key === "free") return;
    setError("");
    setLoadingPlan(plan.key);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      navigate("/login");
      return;
    }
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan: plan.key })
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || "Unable to start checkout.");
      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(checkoutError.message || "Unable to start checkout.");
      setLoadingPlan("");
    }
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-center">Plans and billing</h1>
        <p className="mt-2 text-center text-sm text-slate-400">Choose the plan that matches your feedback program.</p>
        {trialEligible && <p className="mt-1 text-center text-sm font-semibold text-amber-300">New here? Every paid plan includes a 30-day free trial - no charge until it ends.</p>}
        {currentPlan && <p className="mt-2 text-center text-sm text-teal-300">Your workspace is currently on the {planLabel(currentPlan)} plan.</p>}
        {trialJustStarted && <p className="mt-5 text-center text-emerald-400">Your 30-day free trial has started. You won't be charged until it ends, and you can cancel anytime before then.</p>}
        {checkoutState === "success" && !trialJustStarted && <p className="mt-5 text-center text-emerald-400">Checkout completed. Your subscription will be confirmed by Stripe.</p>}
        {checkoutState === "cancelled" && <p className="mt-5 text-center text-amber-300">Checkout was cancelled. No changes were made.</p>}
        {error && <p className="mt-5 text-center text-red-300">{error}</p>}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            const offersTrial = plan.key !== "free" && trialEligible && !isCurrent;
            return (
              <section
                key={plan.key}
                className={`relative border p-5 rounded-lg bg-slate-900 ${plan.highlight ? "border-teal-400 ring-1 ring-teal-400" : "border-slate-700"}`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-teal-400 px-3 py-1 text-xs font-bold text-slate-950">Most popular</span>
                )}
                <h2 className="text-xl font-bold">{plan.name}</h2>
                <p className="mt-2 text-lg font-semibold text-emerald-300">{plan.price}</p>
                {offersTrial && (
                  <p className="mt-1 inline-block rounded-full bg-amber-400/15 px-2.5 py-0.5 text-xs font-bold text-amber-300">30-day free trial</p>
                )}
                <p className="mt-2 min-h-12 text-sm text-slate-300">{plan.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-200">
                  {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
                </ul>
                <button
                  onClick={() => startCheckout(plan)}
                  disabled={Boolean(loadingPlan) || plan.key === "free" || isCurrent}
                  className="mt-6 w-full rounded bg-blue-600 p-3 font-semibold text-white disabled:opacity-60"
                >
                  {isCurrent ? "Current plan" : plan.key === "free" ? "Included by default" : loadingPlan === plan.key ? "Opening checkout..." : offersTrial ? `Start free trial` : `Choose ${plan.name}`}
                </button>
                {offersTrial && <p className="mt-2 text-center text-xs text-slate-400">No charge for 30 days. Cancel anytime before the trial ends.</p>}
              </section>
            );
          })}
        </div>

        <h2 className="mt-12 text-xl font-bold text-center">Compare every feature</h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900 text-left">
                <th className="p-3 font-semibold text-slate-300">Feature</th>
                {PLANS.map((plan) => (
                  <th key={plan.key} className="p-3 text-center font-semibold text-slate-300">{plan.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.key} className="border-b border-slate-800 last:border-b-0">
                  <td className="p-3 text-slate-300">{row.label}</td>
                  {PLANS.map((plan) => {
                    const value = PLAN_FEATURES[plan.key][row.key];
                    return (
                      <td key={plan.key} className="p-3 text-center text-slate-100">
                        <FeatureCell value={row.format ? row.format(value) : value} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">Payments are securely handled by Stripe. Prices and limits are launch proposals and can be changed in Stripe and this page.</p>
      </div>
    </Layout>
  );
}