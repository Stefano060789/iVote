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
  const [outreachContacts, setOutreachContacts] = useState([]);
  const [outreachReplies, setOutreachReplies] = useState([]);
  const [outreachLoading, setOutreachLoading] = useState(false);

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
      await loadOutreach();
    }
    load();
  }, []);

  async function loadOutreach() {
    setOutreachLoading(true);
    const { data, error: outreachError } = await supabase
      .from("creator_outreach_contacts")
      .select("*")
      .in("status", ["draft", "approved"])
      .order("created_at", { ascending: true });
    setOutreachLoading(false);
    if (outreachError) {
      setError(outreachError.message);
      return;
    }
    setOutreachContacts(data || []);
    const { data: replyData, error: replyError } = await supabase
    .from("creator_outreach_replies")
    .select("*, creator_outreach_contacts(company_name, contact_email)")
    .order("received_at", { ascending: false });
    if (replyError) {
    setError(replyError.message);
    return;
    }
    setOutreachReplies(replyData || []);
  }

  async function reviewOutreachReply(replyId) {
    setError("");
    const { data, error: reviewError } = await supabase.rpc("creator_review_outreach_reply", {
      target_reply_id: replyId
    });
    if (reviewError) {
      setError(reviewError.message);
      return;
    }
    const updated = data?.[0];
    setOutreachReplies((current) => current.map((reply) => reply.id === replyId ? { ...reply, ...updated } : reply));
    setMessage("Reply marked as reviewed.");
  }

  async function reviewOutreach(contactId, reviewArea, decision) {
    setError("");
    const { data, error: reviewError } = await supabase.rpc("creator_review_outreach_contact", {
      target_contact_id: contactId,
      review_area: reviewArea,
      decision
    });
    if (reviewError) {
      setError(reviewError.message);
      return;
    }
    const updated = data?.[0];
    setOutreachContacts((current) => current.map((contact) => contact.id === contactId ? { ...contact, ...updated } : contact));
    setMessage(`${reviewArea === "business" ? "Business" : "Message"} ${decision}.`);
  }

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
            <section className="space-y-4 rounded-lg border border-slate-700 bg-slate-950/50 p-4">
              <div>
                <h2 className="text-xl font-bold">Godwit outreach</h2>
                <p className="mt-1 text-sm text-slate-400">Review the business and its message separately. An email is sent only when both are approved.</p>
              </div>
              {outreachLoading && <p className="text-sm text-slate-400">Loading outreach queue...</p>}
              {!outreachLoading && outreachContacts.length === 0 && <p className="text-sm text-slate-400">No outreach drafts are waiting for review.</p>}
              {outreachReplies.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Replies needing attention</h3>
                  {outreachReplies.map((reply) => (
                    <article key={reply.id} className="rounded-lg border border-amber-400/40 bg-amber-950/20 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{reply.creator_outreach_contacts?.company_name || reply.creator_outreach_contacts?.contact_email || "Unknown contact"}</p>
                          <p className="text-sm text-slate-400">{reply.from_email} · {reply.subject || "No subject"}</p>
                        </div>
                        <span className="text-xs text-amber-200">{reply.needs_action ? "Needs action" : "Reviewed"}</span>
                      </div>
                      <p className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-sm text-slate-300">{reply.text_body || "No plain-text content."}</p>
                      {reply.needs_action && <button type="button" onClick={() => reviewOutreachReply(reply.id)} className="mt-3 rounded bg-amber-200 px-3 py-2 text-sm font-semibold text-slate-950">Mark reviewed</button>}
                    </article>
                  ))}
                </div>
              )}
              <div className="space-y-4">
                {outreachContacts.map((contact) => (
                  <article key={contact.id} className="rounded-lg border border-slate-700 bg-slate-900 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">{contact.company_name || "Unnamed business"}</h3>
                        <p className="text-sm text-slate-400">{[contact.city, contact.country, contact.business_type].filter(Boolean).join(" · ")}</p>
                        {contact.website && <a className="text-sm text-teal-300 underline" href={contact.website} target="_blank" rel="noreferrer">{contact.website}</a>}
                      </div>
                      <span className="text-xs text-slate-400">Delivery: {contact.status}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">{contact.personalization_note || "No research note provided."}</p>
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div className="rounded border border-slate-700 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold">Business approval</h4>
                          <span className="text-xs text-slate-400">{contact.business_review_status}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">Approve this prospect as a meaningful Godwit target.</p>
                        <div className="mt-3 flex gap-2">
                          <button type="button" onClick={() => reviewOutreach(contact.id, "business", "approved")} className="rounded bg-emerald-300 px-3 py-2 text-sm font-semibold text-slate-950">Approve business</button>
                          <button type="button" onClick={() => reviewOutreach(contact.id, "business", "rejected")} className="rounded border border-red-400/60 px-3 py-2 text-sm font-semibold text-red-200">Reject</button>
                        </div>
                      </div>
                      <div className="rounded border border-slate-700 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold">Message approval</h4>
                          <span className="text-xs text-slate-400">{contact.message_review_status}</span>
                        </div>
                        <p className="mt-2 font-semibold text-teal-200">{contact.subject || "No subject"}</p>
                        <p className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-sm text-slate-300">{contact.message || "No draft message."}</p>
                        <div className="mt-3 flex gap-2">
                          <button type="button" onClick={() => reviewOutreach(contact.id, "message", "approved")} className="rounded bg-emerald-300 px-3 py-2 text-sm font-semibold text-slate-950">Approve message</button>
                          <button type="button" onClick={() => reviewOutreach(contact.id, "message", "rejected")} className="rounded border border-red-400/60 px-3 py-2 text-sm font-semibold text-red-200">Reject</button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}
