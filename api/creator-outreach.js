import { runResearchGodwitProspects } from "../lib/cron/researchGodwitProspectsJob.js";
import { runSendOutreachEmails } from "../lib/cron/sendOutreachEmailsJob.js";
import { supabaseGet, supabasePatch } from "../lib/cron/cronHelpers.js";

function getBearer(request) {
  return request.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
}

async function requireCreator(request) {
  const token = getBearer(request);
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!token || !url || !key) throw new Error("Creator authentication is not configured.");
  const result = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` }
  });
  if (!result.ok) throw new Error("Creator authentication failed.");
  const user = await result.json();
  const allowed = (process.env.CREATOR_EMAILS || process.env.VITE_CREATOR_EMAILS || "bonomistefano@outlook.it")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.includes(String(user.email || "").toLowerCase())) throw new Error("Creator access is required.");
}

function draftMessage(contact, variation) {
  const name = contact.company_name || "your team";
  const type = contact.business_type || "visitor-facing business";
  const focus = variation % 2 === 0
    ? "collect useful feedback at the moment it happens and turn it into practical follow-up"
    : "understand what guests and visitors value, where their experience can improve, and what deserves follow-up";
  return `Hello ${name} team,\n\nAs a ${type}, ${name} may benefit from a simple way to ${focus}. Godwit uses QR-based feedback flows that are easy for visitors and straightforward for teams to review.\n\nWe would be happy to offer ${name} a free two-week guided pilot tailored to your visitor experience. Would you be open to a 15-minute online introduction to see whether it could fit your team?\n\nBest,\nStefano`;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }
  try {
    await requireCreator(request);
    const action = String(request.body?.action || "");
    if (action === "research") return response.status(200).json(await runResearchGodwitProspects());
    if (action === "regenerate") {
      const contactId = String(request.body?.contactId || "");
      if (!contactId) return response.status(400).json({ error: "contactId is required." });
      const contacts = await supabaseGet(`creator_outreach_contacts?id=eq.${encodeURIComponent(contactId)}&select=id,company_name,business_type,message`);
      const contact = contacts[0];
      if (!contact) return response.status(404).json({ error: "Outreach draft not found." });
      const variation = String(contact.message || "").length % 2;
      const message = draftMessage(contact, variation);
      await supabasePatch(`creator_outreach_contacts?id=eq.${encodeURIComponent(contactId)}`, {
        message,
        message_review_status: "pending",
        status: "draft",
        last_error: null
      });
      return response.status(200).json({ message });
    }
    if (action === "send") {
      const contactIds = Array.isArray(request.body?.contactIds)
        ? [...new Set(request.body.contactIds.map(String).filter(Boolean))].slice(0, 5)
        : [];
      if (contactIds.length === 0) return response.status(400).json({ error: "At least one contact must be selected." });
      const contacts = await supabaseGet(
        `creator_outreach_contacts?id=in.(${contactIds.map(encodeURIComponent).join(",")})&status=in.(draft,approved)&select=id,business_review_status,message_review_status`
      );
      if (contacts.length !== contactIds.length) {
        return response.status(400).json({ error: "One or more drafts are no longer available to send." });
      }
      if (contacts.some((contact) => contact.business_review_status === "rejected" || contact.message_review_status === "rejected")) {
        return response.status(400).json({ error: "A discarded or rejected draft cannot be sent." });
      }
      for (const contactId of contactIds) {
        await supabasePatch(`creator_outreach_contacts?id=eq.${encodeURIComponent(contactId)}&status=in.(draft,approved)`, {
          status: "approved",
          business_review_status: "approved",
          message_review_status: "approved",
          approved_at: new Date().toISOString(),
          last_error: null
        });
      }
      return response.status(200).json(await runSendOutreachEmails({ contactIds }));
    }
    return response.status(400).json({ error: "Unknown outreach action." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Creator outreach action failed.";
    const status = message.includes("required") || message.includes("authentication") ? 401 : 500;
    return response.status(status).json({ error: message });
  }
}
