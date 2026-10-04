import { runResearchGodwitProspects } from "../lib/cron/researchGodwitProspectsJob.js";
import { createOutreachCopy, OUTREACH_LANGUAGES } from "../lib/cron/outreachCopy.js";
import { RESEARCH_BUSINESS_TYPES, RESEARCH_COUNTRIES } from "../lib/cron/researchOptions.js";
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

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }
  try {
    await requireCreator(request);
    const action = String(request.body?.action || "");
    if (action === "research") {
      const language = String(request.body?.language || "auto");
      const countries = request.body?.countries;
      const businessTypes = request.body?.businessTypes;
      if (language !== "auto" && !OUTREACH_LANGUAGES.includes(language)) {
        return response.status(400).json({ error: "Select a supported outreach language." });
      }
      if (
        (countries !== undefined && (!Array.isArray(countries) || countries.length === 0 ||
          countries.some((country) => !RESEARCH_COUNTRIES.includes(String(country))))) ||
        (businessTypes !== undefined && (!Array.isArray(businessTypes) || businessTypes.length === 0 ||
          businessTypes.some((type) => !RESEARCH_BUSINESS_TYPES.some(({ id }) => id === String(type)))))
      ) {
        return response.status(400).json({ error: "Select supported countries and business types." });
      }
      return response.status(200).json(await runResearchGodwitProspects({
        countries,
        businessTypes,
        language
      }));
    }
    if (action === "regenerate") {
      const contactId = String(request.body?.contactId || "");
      const language = String(request.body?.language || "auto");
      if (!contactId) return response.status(400).json({ error: "contactId is required." });
      if (language !== "auto" && !OUTREACH_LANGUAGES.includes(language)) {
        return response.status(400).json({ error: "Select a supported outreach language." });
      }
      const contacts = await supabaseGet(`creator_outreach_contacts?id=eq.${encodeURIComponent(contactId)}&select=id,company_name,business_type,country`);
      const contact = contacts[0];
      if (!contact) return response.status(404).json({ error: "Outreach draft not found." });
      const { subject, message } = createOutreachCopy({ ...contact, language });
      await supabasePatch(`creator_outreach_contacts?id=eq.${encodeURIComponent(contactId)}`, {
        subject,
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
