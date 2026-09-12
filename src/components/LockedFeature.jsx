import { Link } from "react-router-dom";
import { minPlanLabelFor } from "../lib/entitlements";

// Contextual upgrade prompt shown instead of a gated feature's controls. Keeps the dashboard
// clean per-plan while still telling the admin exactly what unlocking it would do for them.
export default function LockedFeature({ feature, title, description }) {
  const requiredPlan = minPlanLabelFor(feature);
  return (
    <div className="rounded border border-dashed border-slate-600 bg-slate-950/60 p-4 text-sm">
      <p className="font-semibold text-slate-200">{title}</p>
      <p className="mt-1 text-slate-400">{description}</p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-amber-300">
        Available on {requiredPlan}
        {" · "}
        <Link to="/admin/billing" className="underline">
          Upgrade
        </Link>
      </p>
    </div>
  );
}
