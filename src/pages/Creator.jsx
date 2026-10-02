import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";
import { isCreatorEmail } from "../lib/creatorAccess";

const METRICS = [
  ["users", "Registered people"],
  ["venues", "Venues"],
  ["members", "Workspace members"],
  ["polls", "Polls"],
  ["active_polls", "Active polls"],
  ["qr_codes", "QR codes"],
  ["active_qr_codes", "Active QR codes"],
  ["actions", "Actions"],
  ["open_actions", "Open actions"]
];

function formatDate(value) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB") : "Not set";
}

export default function Creator() {
  const [authorized, setAuthorized] = useState(null);
  const [overview, setOverview] = useState(null);
  const [pilotEndDate, setPilotEndDate] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const isAllowed = isCreatorEmail(user?.email);
      setAuthorized(isAllowed);
      if (!isAllowed) return;

      const { data, error: overviewError } = await supabase.rpc("creator_overview");
      if (overviewError) {
        setError(overviewError.message);
        return;
      }
      setOverview(data);
      setPilotEndDate(data?.pilot_end_date || "");
    }
    load();
  }, []);

  async function savePilotEndDate(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    const { data, error: updateError } = await supabase.rpc("creator_update_pilot_end_date", {
      target_end_date: pilotEndDate
    });
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setOverview((current) => ({ ...current, pilot_end_date: data }));
    setMessage("Pilot end date updated.");
  }

  if (authorized === null) {
    return <Layout theme="workspace"><p className="p-6 text-center">Loading creator overview...</p></Layout>;
  }
  if (!authorized) return <Navigate to="/admin" replace />;

  return (
    <Layout theme="workspace">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-300">Creator</p>
          <h1 className="mt-1 text-3xl font-bold">Godwit overview</h1>
          <p className="mt-2 text-sm text-slate-400">Operational totals across all venues. No guest answer content or payment data is exposed here.</p>
        </div>
        {error && <p className="rounded border border-red-500/50 bg-red-950/30 p-3 text-red-200">{error}</p>}
        {overview && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {METRICS.map(([key, label]) => (
                <section key={key} className="rounded-lg border border-slate-700 bg-slate-900 p-4">
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className="mt-1 text-3xl font-bold text-teal-300">{overview[key] ?? 0}</p>
                </section>
              ))}
            </div>
            <form onSubmit={savePilotEndDate} className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-4">
              <h2 className="font-bold text-amber-200">Free pilot programme</h2>
              <p className="mt-1 text-sm text-slate-300">No automatic billing or payment method is required. Postpone the date here before the pilot ends.</p>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="text-sm text-slate-300">Pilot end date<input type="date" value={pilotEndDate} onChange={(event) => setPilotEndDate(event.target.value)} className="mt-1 block rounded border border-slate-600 bg-slate-950 p-2 text-white" required /></label>
                <button type="submit" className="rounded bg-amber-300 px-4 py-2 font-semibold text-slate-950">Save date</button>
                <span className="text-sm text-slate-300">Current: {formatDate(overview.pilot_end_date)}</span>
              </div>
              {message && <p className="mt-2 text-sm text-emerald-300">{message}</p>}
            </form>
            <section className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-slate-700 bg-slate-900"><tr>{["Venue", "Owner", "Members", "Polls", "Active polls", "QR codes", "Active QR", "Actions", "Open actions"].map((heading) => <th key={heading} className="p-3">{heading}</th>)}</tr></thead>
                <tbody>{(overview.venue_rows || []).map((venue) => <tr key={venue.id} className="border-b border-slate-800 last:border-0"><td className="p-3 font-semibold">{venue.name}</td><td className="p-3 text-slate-400">{venue.owner_email || "—"}</td><td className="p-3">{venue.member_count}</td><td className="p-3">{venue.poll_count}</td><td className="p-3">{venue.active_poll_count}</td><td className="p-3">{venue.qr_count}</td><td className="p-3">{venue.active_qr_count}</td><td className="p-3">{venue.action_count}</td><td className="p-3">{venue.open_action_count}</td></tr>)}</tbody>
              </table>
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}
