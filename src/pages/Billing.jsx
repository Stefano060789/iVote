import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";

const PLANS = [
  { key: "free", name: "Free", price: "EUR 0", description: "For trying iVote at a single venue.", features: ["3 total polls", "No tracked QR campaigns", "Core response results"] },
  { key: "starter", name: "Starter", price: "EUR 29 / month", description: "For small teams running recurring feedback campaigns.", features: ["25 total polls", "10 tracked QR campaigns", "Response analytics and leads"] },
  { key: "growth", name: "Growth", price: "EUR 79 / month", description: "For multi-location feedback programs.", features: ["250 total polls", "100 tracked QR campaigns", "Priority support and moderation"] }
];

export default function Billing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState("");
  const [error, setError] = useState("");
  const checkoutState = searchParams.get("checkout");

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
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-center">Plans and billing</h1>
        <p className="mt-2 text-center text-sm text-slate-400">Choose the plan that matches your feedback program.</p>
        {checkoutState === "success" && <p className="mt-5 text-center text-emerald-400">Checkout completed. Your subscription will be confirmed by Stripe.</p>}
        {checkoutState === "cancelled" && <p className="mt-5 text-center text-amber-300">Checkout was cancelled. No changes were made.</p>}
        {error && <p className="mt-5 text-center text-red-300">{error}</p>}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <section key={plan.key} className="border border-slate-700 bg-slate-900 p-5 rounded-lg">
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <p className="mt-2 text-lg font-semibold text-emerald-300">{plan.price}</p>
              <p className="mt-2 min-h-12 text-sm text-slate-300">{plan.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-200">
                {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
              <button onClick={() => startCheckout(plan)} disabled={Boolean(loadingPlan) || plan.key === "free"} className="mt-6 w-full rounded bg-blue-600 p-3 font-semibold text-white disabled:opacity-60">
                {plan.key === "free" ? "Included by default" : loadingPlan === plan.key ? "Opening checkout..." : `Choose ${plan.name}`}
              </button>
            </section>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">Payments are securely handled by Stripe. Prices and limits are launch proposals and can be changed in Stripe and this page.</p>
      </div>
    </Layout>
  );
}