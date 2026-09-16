import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";
import { loadWorkspaceProfile } from "../lib/workspaceProfile";
import { PLAN_FEATURES, planLabel } from "../lib/entitlements";

const PLANS = [
  { key: "free", amount: "EUR 0", recurring: false },
  { key: "starter", amount: "EUR 29", recurring: true },
  { key: "growth", amount: "EUR 79", recurring: true, highlight: true }
];

const COMPARISON_ROWS = [
  { rowKey: "pollLimit", format: (value) => value },
  { rowKey: "campaignLimit", format: (value) => value },
  { rowKey: "seatLimit", format: (value) => value },
  { rowKey: "donations" },
  { rowKey: "csvExport" },
  { rowKey: "auditLog" },
  { rowKey: "weeklyReport" },
  { rowKey: "rewardMessage" },
  { rowKey: "emailBenefits" },
  { rowKey: "publicReviewLinks" },
  { rowKey: "leadCapture" },
  { rowKey: "redemptionTracking" },
  { rowKey: "prizeDraws" },
  { rowKey: "automatedNurture" },
  { rowKey: "reputationMonitoring" },
  { rowKey: "webhooks" },
  { rowKey: "apiAccess" }
];

function FeatureCell({ value }) {
  if (typeof value === "boolean") {
    return value ? <span className="text-emerald-400">✓</span> : <span className="text-slate-600">—</span>;
  }
  return <span>{value}</span>;
}

export default function Billing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState("");
  const [error, setError] = useState("");
  const [currentPlan, setCurrentPlan] = useState("");
  const [trialEligible, setTrialEligible] = useState(false);
  const [termsAcknowledged, setTermsAcknowledged] = useState(false);
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
    if (!termsAcknowledged) {
      setError(t("billing.startAcknowledgmentRequired"));
      return;
    }
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
    <Layout theme="workspace">
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-center">{t("billing.title")}</h1>
        <p className="mt-2 text-center text-sm text-slate-400">{t("billing.subtitle")}</p>
        {trialEligible && <p className="mt-1 text-center text-sm font-semibold text-amber-300">{t("billing.trialBanner")}</p>}
        {currentPlan && <p className="mt-2 text-center text-sm text-teal-300">{t("billing.currentPlanNotice", { plan: planLabel(currentPlan) })}</p>}
        {trialJustStarted && <p className="mt-5 text-center text-emerald-400">{t("billing.trialStarted")}</p>}
        {checkoutState === "success" && !trialJustStarted && <p className="mt-5 text-center text-emerald-400">{t("billing.checkoutSuccess")}</p>}
        {checkoutState === "cancelled" && <p className="mt-5 text-center text-amber-300">{t("billing.checkoutCancelled")}</p>}
        {error && <p className="mt-5 text-center text-red-300">{error}</p>}
        <label className="mx-auto mt-6 flex max-w-xl items-start gap-2 text-left text-xs text-slate-300">
          <input
            type="checkbox"
            checked={termsAcknowledged}
            onChange={(event) => { setTermsAcknowledged(event.target.checked); if (event.target.checked) setError(""); }}
            className="mt-0.5"
          />
          <span>{t("billing.startAcknowledgment")}</span>
        </label>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            const offersTrial = plan.key !== "free" && trialEligible && !isCurrent;
            const planName = t(`billing.plans.${plan.key}.name`);
            return (
              <section
                key={plan.key}
                className={`relative border p-5 rounded-lg bg-slate-900 ${plan.highlight ? "border-teal-400 ring-1 ring-teal-400" : "border-slate-700"}`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-teal-400 px-3 py-1 text-xs font-bold text-slate-950">{t("billing.mostPopular")}</span>
                )}
                <h2 className="text-xl font-bold">{planName}</h2>
                <p className="mt-2 text-lg font-semibold text-emerald-300">{plan.amount}{plan.recurring ? ` ${t("billing.perMonth")}` : ""}</p>
                {offersTrial && (
                  <p className="mt-1 inline-block rounded-full bg-amber-400/15 px-2.5 py-0.5 text-xs font-bold text-amber-300">{t("billing.freeTrialBadge")}</p>
                )}
                <p className="mt-2 min-h-12 text-sm text-slate-300">{t(`billing.plans.${plan.key}.description`)}</p>
                <button
                  onClick={() => startCheckout(plan)}
                  disabled={Boolean(loadingPlan) || plan.key === "free" || isCurrent || !termsAcknowledged}
                  className="mt-4 w-full rounded bg-blue-600 p-3 font-semibold text-white disabled:opacity-60"
                >
                  {isCurrent
                    ? t("billing.currentPlanButton")
                    : plan.key === "free"
                    ? t("billing.includedByDefault")
                    : loadingPlan === plan.key
                    ? t("billing.openingCheckout")
                    : offersTrial
                    ? t("billing.startFreeTrial")
                    : t("billing.chooseThisPlan", { name: planName })}
                </button>
                {offersTrial && <p className="mt-2 text-center text-xs text-slate-400">{t("billing.trialFooterNote")}</p>}
              </section>
            );
          })}
        </div>

        <h2 className="mt-12 text-xl font-bold text-center">{t("billing.compareTitle")}</h2>
        <p className="mt-1 text-center text-sm text-slate-400">{t("billing.compareSubtitle")}</p>

        {/* Below sm: a table with 4 columns and long feature names doesn't fit a phone screen even
            with horizontal scroll enabled (it's easy to not notice there's more to scroll to), so
            stack one card per plan instead - each lists every feature vertically, no side-scrolling
            needed. From sm and up, there's enough width for the side-by-side table. */}
        <div className="mt-4 grid gap-3 sm:hidden">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`rounded-lg border p-4 ${plan.highlight ? "border-amber-400 bg-amber-400/5" : "border-slate-700"}`}
            >
              <p className={`font-semibold ${plan.highlight ? "text-teal-300" : "text-slate-100"}`}>
                {t(`billing.plans.${plan.key}.name`)}
                {currentPlan === plan.key && <span className="ml-1.5 text-xs font-normal text-slate-400">{t("billing.currentTag")}</span>}
              </p>
              <dl className="mt-2 divide-y divide-slate-800">
                {COMPARISON_ROWS.map((row) => {
                  const value = PLAN_FEATURES[plan.key][row.rowKey];
                  return (
                    <div key={row.rowKey} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <dt className="text-slate-400">{t(`billing.rows.${row.rowKey}`)}</dt>
                      <dd className="shrink-0 font-semibold text-slate-100">
                        <FeatureCell value={row.format ? row.format(value) : value} />
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ))}
        </div>

        <div className="mt-4 hidden overflow-x-auto rounded-lg border border-slate-700 sm:block">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900 text-left">
                <th className="p-3 font-semibold text-slate-300">{t("billing.featureHeader")}</th>
                {PLANS.map((plan) => (
                  <th
                    key={plan.key}
                    className={`p-3 text-center font-semibold ${plan.highlight ? "text-teal-300" : "text-slate-300"}`}
                  >
                    {t(`billing.plans.${plan.key}.name`)}
                    {currentPlan === plan.key && <span className="ml-1.5 font-normal text-xs text-slate-400">{t("billing.currentTag")}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.rowKey} className="border-b border-slate-800 last:border-b-0">
                  <td className="p-3 text-slate-300">{t(`billing.rows.${row.rowKey}`)}</td>
                  {PLANS.map((plan) => {
                    const value = PLAN_FEATURES[plan.key][row.rowKey];
                    return (
                      <td key={plan.key} className={`p-3 text-center text-slate-100 ${plan.highlight ? "bg-teal-400/5" : ""}`}>
                        <FeatureCell value={row.format ? row.format(value) : value} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">{t("billing.paymentsNote")}</p>
      </div>
    </Layout>
  );
}