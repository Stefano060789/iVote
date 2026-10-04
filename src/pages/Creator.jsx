import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";
import { isCreatorEmail } from "../lib/creatorAccess";
import { getOutreachLanguageLabel, OUTREACH_LANGUAGES } from "../../lib/cron/outreachCopy.js";
import { RESEARCH_BUSINESS_TYPES, RESEARCH_COUNTRIES } from "../../lib/cron/researchOptions.js";

const LANGUAGE_OPTIONS = [
  ["auto", "Automatic by country"],
  ...OUTREACH_LANGUAGES.map((language) => [language, getOutreachLanguageLabel(language)])
];

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

const VENUE_METRICS = [
  ["member_count", "Members"],
  ["poll_count", "Polls"],
  ["active_poll_count", "Active polls"],
  ["qr_count", "QR codes"],
  ["active_qr_count", "Active QR"],
  ["action_count", "Actions"],
  ["open_action_count", "Open actions"]
];

function formatDate(value) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB") : "Not set";
}

function isValidRecipientEmail(value) {
  const email = String(value || "").trim();
  return email.length <= 320 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export default function Creator() {
  const [authorized, setAuthorized] = useState(null);
  const [overview, setOverview] = useState(null);
  const [pilotEndDate, setPilotEndDate] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [outreachContacts, setOutreachContacts] = useState([]);
  const [outreachFeedback, setOutreachFeedback] = useState({});
  const [recipientEmails, setRecipientEmails] = useState({});
  const [outreachReplies, setOutreachReplies] = useState([]);
  const [researchCountries, setResearchCountries] = useState(RESEARCH_COUNTRIES);
  const [researchBusinessTypes, setResearchBusinessTypes] = useState(RESEARCH_BUSINESS_TYPES.map(({ id }) => id));
  const [outreachLanguage, setOutreachLanguage] = useState(() => {
    const storedLanguage = window.localStorage.getItem("godwit-outreach-language");
    return ["auto", ...OUTREACH_LANGUAGES].includes(storedLanguage) ? storedLanguage : "auto";
  });
  const [outreachActionLoading, setOutreachActionLoading] = useState(false);
  const [outreachLoading, setOutreachLoading] = useState(false);

  useEffect(() => {
    window.localStorage.setItem("godwit-outreach-language", outreachLanguage);
  }, [outreachLanguage]);

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
      .neq("message_review_status", "rejected")
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

  async function discardOutreachDraft(contactId) {
    setError("");
    setMessage("");
    const { error: reviewError } = await supabase.rpc("creator_review_outreach_contact", {
      target_contact_id: contactId,
      review_area: "message",
      decision: "rejected"
    });
    if (reviewError) {
      setError(reviewError.message);
      return;
    }
    setOutreachContacts((current) => current.filter((contact) => contact.id !== contactId));
    setMessage("Draft discarded.");
  }

  async function runOutreachAction(action, contactId, options = {}) {
    setError("");
    setMessage("");
    setOutreachActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/creator-outreach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`
        },
        body: JSON.stringify({ action, contactId, ...options })
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Outreach action failed.");
        return;
      }
      if (action === "research") {
        const countryTotals = Object.entries(result.countries || {})
          .map(([country, count]) => `${country}: ${count}`)
          .join(", ");
        const emailCount = Number(result.emailsFound || 0);
        setMessage(`Research complete: ${result.inserted || 0} new drafts added, ${emailCount} public contact email${emailCount === 1 ? "" : "s"} found${countryTotals ? ` (${countryTotals})` : ""}.`);
        await loadOutreach();
        return;
      }
      setOutreachContacts((current) => current.map((contact) => contact.id === contactId ? {
        ...contact,
        subject: result.subject,
        message: result.message,
        message_review_status: "pending",
        status: "draft"
      } : contact));
      setMessage("A new message draft was generated. Review it before sending.");
    } finally {
      setOutreachActionLoading(false);
    }
  }

  function toggleSelection(setSelection, currentSelection, value) {
    setSelection(currentSelection.includes(value)
      ? currentSelection.filter((selected) => selected !== value)
      : [...currentSelection, value]);
  }

  async function sendOutreachMessage(contactId, recipientEmail) {
    const contact = outreachContacts.find((item) => item.id === contactId);
    if (!isValidRecipientEmail(recipientEmail)) {
      setOutreachFeedback((current) => ({
        ...current,
        [contactId]: { text: "Enter a valid business contact email above. The message sender is hellogodwit@gmail.com.", isError: true }
      }));
      return;
    }
    if (!contact?.subject || !contact.message) {
      setOutreachFeedback((current) => ({
        ...current,
        [contactId]: { text: "This draft is missing a subject or message. Regenerate the draft before sending.", isError: true }
      }));
      return;
    }
    setError("");
    setMessage("");
    setOutreachFeedback((current) => ({
      ...current,
      [contactId]: { text: "Sending from hellogodwit@gmail.com…", isError: false }
    }));
    setOutreachActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/creator-outreach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`
        },
        body: JSON.stringify({ action: "send", contactIds: [contactId], recipientEmail })
      });
      const result = await response.json();
      if (!response.ok) {
        setOutreachFeedback((current) => ({
          ...current,
          [contactId]: { text: result.error || "Message sending failed.", isError: true }
        }));
        return;
      }
      if (result.disabled) {
        setOutreachFeedback((current) => ({
          ...current,
          [contactId]: { text: "Delivery is not configured. Add the Google App Password for hellogodwit@gmail.com as OUTREACH_SMTP_PASSWORD in Vercel.", isError: true }
        }));
      } else if (result.remaining === 0 && result.sent === 0 && result.attempted === 0) {
        setOutreachFeedback((current) => ({
          ...current,
          [contactId]: { text: "The daily outreach sending limit has been reached. Try again tomorrow.", isError: true }
        }));
      } else if (result.sent > 0) {
        setOutreachFeedback((current) => ({
          ...current,
          [contactId]: { text: "Message sent from hellogodwit@gmail.com.", isError: false }
        }));
      } else if (result.errors > 0) {
        const detail = result.deliveryErrors?.[0];
        setOutreachFeedback((current) => ({
          ...current,
          [contactId]: {
            text: detail
              ? `Email delivery failed: ${detail}`
              : "Email delivery failed. Check the Gmail App Password configured in Vercel.",
            isError: true
          }
        }));
      } else if (result.skipped > 0) {
        setOutreachFeedback((current) => ({
          ...current,
          [contactId]: { text: "Not sent: this contact email is invalid or suppressed.", isError: true }
        }));
      } else {
        setOutreachFeedback((current) => ({
          ...current,
          [contactId]: { text: "No email was sent. Check the delivery status and try again.", isError: true }
        }));
      }
      await loadOutreach();
    } catch (sendError) {
      setOutreachFeedback((current) => ({
        ...current,
        [contactId]: {
          text: sendError instanceof Error
            ? `Could not send the message: ${sendError.message}`
            : "Could not send the message because the request failed.",
          isError: true
        }
      }));
    } finally {
      setOutreachActionLoading(false);
    }
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
      <div className="mx-auto max-w-6xl space-y-6 px-3 py-4 sm:p-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-300">Creator</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Godwit overview</h1>
          <p className="mt-2 text-sm text-slate-400">Operational totals across all venues. No guest answer content or payment data is exposed here.</p>
        </div>
        {error && <p className="rounded border border-red-500/50 bg-red-950/30 p-3 text-red-200">{error}</p>}
        {overview && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {METRICS.map(([key, label]) => (
                <section key={key} className="rounded-lg border border-slate-700 bg-slate-900 p-4">
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className="mt-1 break-words text-2xl font-bold text-teal-300 sm:text-3xl">{overview[key] ?? 0}</p>
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
            <div className="space-y-3 lg:hidden">
              {(overview.venue_rows || []).map((venue) => (
                <section key={venue.id} className="min-w-0 rounded-lg border border-slate-700 bg-slate-900 p-3">
                  <h2 className="break-words font-semibold">{venue.name}</h2>
                  <p className="break-all text-sm text-slate-400">{venue.owner_email || "—"}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-3">
                    {VENUE_METRICS.map(([key, label]) => (
                      <div key={key} className="min-w-0">
                        <dt className="text-xs text-slate-400">{label}</dt>
                        <dd className="break-words font-semibold">{venue[key] ?? 0}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
            <section className="hidden overflow-x-auto rounded-lg border border-slate-700 lg:block">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-slate-700 bg-slate-900"><tr>{["Venue", "Owner", ...VENUE_METRICS.map(([, label]) => label)].map((heading) => <th key={heading} className="p-3">{heading}</th>)}</tr></thead>
                <tbody>{(overview.venue_rows || []).map((venue) => <tr key={venue.id} className="border-b border-slate-800 last:border-0"><td className="p-3 font-semibold">{venue.name}</td><td className="p-3 text-slate-400">{venue.owner_email || "—"}</td>{VENUE_METRICS.map(([key]) => <td key={key} className="p-3">{venue[key]}</td>)}</tr>)}</tbody>
              </table>
            </section>
            <section className="creator-outreach min-w-0 space-y-4 rounded-lg border border-slate-700 bg-slate-950/50 p-3 sm:p-4">
              <div>
                <h2 className="text-xl font-bold">Godwit outreach</h2>
                <p className="mt-1 text-sm text-slate-400">Review each prospect and its draft. Choosing Send message sends that email immediately.</p>
                <div className="creator-research-panel mt-4 grid min-w-0 gap-4 rounded-lg border border-slate-700 bg-slate-900/70 p-3 sm:p-4 lg:grid-cols-2">
                  <fieldset>
                    <legend className="font-semibold">Countries</legend>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                      {RESEARCH_COUNTRIES.map((country) => (
                        <label key={country} className="flex items-center gap-2 text-sm text-slate-300">
                          <input
                            type="checkbox"
                            checked={researchCountries.includes(country)}
                            onChange={() => toggleSelection(setResearchCountries, researchCountries, country)}
                          />
                          {country}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className="text-sm font-semibold">
                    Outreach language
                    <select
                      value={outreachLanguage}
                      onChange={(event) => setOutreachLanguage(event.target.value)}
                      className="mt-1 block w-full rounded border border-slate-600 bg-slate-950 p-2 text-white"
                    >
                      {LANGUAGE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <span className="mt-1 block font-normal text-slate-400">Automatic uses German for Austria, Italian for Italy, and English for Malaysia. Your choice is saved in this browser and also applies when you regenerate a draft.</span>
                  </label>
                  <fieldset className="lg:col-span-2">
                    <legend className="font-semibold">Business types</legend>
                    <div className="mt-2 grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                      {RESEARCH_BUSINESS_TYPES.map(({ id, label }) => (
                        <label key={id} className="flex min-w-0 items-center gap-2 text-sm text-slate-300">
                          <input
                            type="checkbox"
                            checked={researchBusinessTypes.includes(id)}
                            onChange={() => toggleSelection(setResearchBusinessTypes, researchBusinessTypes, id)}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
                    <button
                      type="button"
                      disabled={outreachActionLoading || researchCountries.length === 0 || researchBusinessTypes.length === 0}
                      onClick={() => runOutreachAction("research", undefined, {
                        countries: researchCountries,
                        businessTypes: researchBusinessTypes,
                        language: outreachLanguage
                      })}
                      className="rounded bg-teal-300 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                    >
                      Research businesses
                    </button>
                    {(researchCountries.length === 0 || researchBusinessTypes.length === 0) && (
                      <span className="text-sm text-amber-200">Select at least one country and one business type.</span>
                    )}
                  </div>
                </div>
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
                  <article key={contact.id} className="min-w-0 rounded-lg border border-slate-700 bg-slate-900 p-3 sm:p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-lg font-semibold">{contact.company_name || "Unnamed business"}</p>
                        <p className="break-words text-sm text-slate-400">City: {contact.city || "Not available"} · {contact.country || "Country unknown"} · {contact.business_type || "Business type unknown"}</p>
                        {contact.website && <a className="break-all text-sm text-teal-300 underline" href={contact.website} target="_blank" rel="noreferrer">{contact.website}</a>}
                      </div>
                      <span className="text-xs text-slate-400">Delivery: {contact.status}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">{contact.personalization_note || "No research note provided."}</p>
                    <div className="mt-4 min-w-0 rounded border border-slate-700 p-2 sm:p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="font-semibold">Outreach email draft</h4>
                          <span className="text-xs text-slate-400">{contact.message_review_status === "pending" ? "Ready for your review" : contact.message_review_status}</span>
                        </div>
                        <p className="mt-3 text-sm text-slate-500">From: hellogodwit@gmail.com</p>
                        <label className="mt-2 block text-sm font-medium text-slate-300">
                          Business contact email
                          <input
                            type="email"
                            autoComplete="email"
                            value={recipientEmails[contact.id] ?? contact.contact_email ?? ""}
                            onChange={(event) => setRecipientEmails((current) => ({
                              ...current,
                              [contact.id]: event.target.value
                            }))}
                            placeholder="name@business.com"
                            className="mt-1 block w-full rounded border border-slate-600 bg-slate-950 p-2 text-white"
                          />
                          {!contact.contact_email && <span className="mt-1 block text-xs font-normal text-slate-400">Research checks the business website and contact pages for a public email. If none is listed, enter one here. Messages always send from hellogodwit@gmail.com.</span>}
                        </label>
                        <p className="mt-2 break-words font-semibold text-teal-200">{contact.subject || "No subject"}</p>
                        <p className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-sm text-slate-300">{contact.message || "No draft message."}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" disabled={outreachActionLoading} onClick={() => runOutreachAction("regenerate", contact.id, { language: outreachLanguage })} className="flex-1 rounded border border-teal-300/60 px-3 py-2 text-sm font-semibold text-teal-200 disabled:opacity-50">Regenerate</button>
                          <button type="button" disabled={outreachActionLoading} onClick={() => sendOutreachMessage(contact.id, String(recipientEmails[contact.id] ?? contact.contact_email ?? "").trim())} className="flex-1 rounded bg-emerald-300 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">Send message</button>
                          <button type="button" disabled={outreachActionLoading} onClick={() => discardOutreachDraft(contact.id)} className="flex-1 rounded border border-red-400/60 px-3 py-2 text-sm font-semibold text-red-200 disabled:opacity-50">Discard draft</button>
                        </div>
                        {outreachFeedback[contact.id] && (
                          <p role="status" aria-live="polite" className={`creator-send-feedback mt-3 ${outreachFeedback[contact.id].isError ? "is-error" : "is-success"}`}>
                            {outreachFeedback[contact.id].text}
                          </p>
                        )}
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
