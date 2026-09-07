import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";

const PLANS = [
  { key: "starter", name: "Starter", description: "For small teams running recurring feedback campaigns.", features: ["QR campaigns", "Response analytics", "Consented follow-up leads"] },
  { key: "growth", name: "Growth", description: "For organizations measuring locations and outcomes at scale.", features: ["Everything in Starter", "Campaign conversion reporting", "Priority support"] }
];

export default function Billing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState("");
  const [error, setError] = useState("");
  const checkoutState = searchParams.get("checkout");

  async function startCheckout(plan) {
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
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-center">Plans and billing</h1>
        <p className="mt-2 text-center text-sm text-slate-400">Choose the plan that matches your feedback program.</p>
        {checkoutState === "success" && <p className="mt-5 text-center text-emerald-400">Checkout completed. Your subscription will be confirmed by Stripe.</p>}
        {checkoutState === "cancelled" && <p className="mt-5 text-center text-amber-300">Checkout was cancelled. No changes were made.</p>}
        {error && <p className="mt-5 text-center text-red-300">{error}</p>}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {PLANS.map((plan) => (
            <section key={plan.key} className="border border-slate-700 bg-slate-900 p-5 rounded-lg">
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <p className="mt-2 min-h-12 text-sm text-slate-300">{plan.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-200">
                {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
              <button onClick={() => startCheckout(plan)} disabled={Boolean(loadingPlan)} className="mt-6 w-full rounded bg-blue-600 p-3 font-semibold text-white disabled:opacity-60">
                {loadingPlan === plan.key ? "Opening checkout..." : `Choose ${plan.name}`}
              </button>
            </section>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">Payments are securely handled by Stripe. Plan prices are configured by the workspace administrator.</p>
      </div>
    </Layout>
  );
}