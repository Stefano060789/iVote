import { supabaseGet, supabasePatch, supabaseRequest } from "./cronHelpers.js";
import { captureError } from "../errorReporting.js";
import { sendOutreachEmail } from "./outreachMailer.js";

const CONTACT_BATCH_SIZE = 500;
const OUTREACH_OPTOUT_EMAIL = "contact@hellogodwit.com";
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function isValidOutreachEmail(email) {
  const normalized = normalizeEmail(email);
  return normalized.length > 0 && normalized.length <= 320 && EMAIL_PATTERN.test(normalized);
}

export function appendOutreachOptOut(message) {
  const mailto = `mailto:${OUTREACH_OPTOUT_EMAIL}?subject=Godwit%20outreach%20opt-out`;
  return `${String(message || "").trim()}\n\n---\nTo opt out of future Godwit outreach, email ${OUTREACH_OPTOUT_EMAIL} or use ${mailto}.`;
}

function truncateError(error) {
  const message = error instanceof Error ? error.message : String(error || "Unknown outreach delivery error.");
  return message.slice(0, 1000);
}

async function isSuppressed(email) {
  const rows = await supabaseGet(
    `creator_outreach_suppressions?email=eq.${encodeURIComponent(email)}&select=email&limit=1`
  );
  return rows.length > 0;
}

async function recordAttempt({ contact, recipient, subject, attemptedAt }) {
  const rows = await supabaseRequest("creator_outreach_delivery_log", {
    method: "POST",
    prefer: "return=representation",
    body: {
      contact_id: contact.id,
      recipient,
      subject,
      status: "attempted",
      sent_at: attemptedAt
    }
  });
  return rows?.[0]?.id;
}

async function updateAttempt(logId, body) {
  if (!logId) return;
  await supabaseRequest(`creator_outreach_delivery_log?id=eq.${encodeURIComponent(logId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body
  });
}

async function updateContact(contactId, body) {
  await supabasePatch(`creator_outreach_contacts?id=eq.${encodeURIComponent(contactId)}`, body);
}

async function markSkipped(contact, status, reason) {
  await updateContact(contact.id, { status, last_error: reason });
}

async function sendContact(contact) {
  const recipient = normalizeEmail(contact.contact_email);
  const subject = String(contact.subject || "").trim();
  const message = String(contact.message || "").trim();

  if (!isValidOutreachEmail(recipient)) {
    await markSkipped(contact, "bounced", "Invalid email address; outreach skipped.");
    return { skipped: true, reason: "invalid_email" };
  }
  if (await isSuppressed(recipient)) {
    await markSkipped(contact, "opted_out", "Email address is suppressed; outreach skipped.");
    return { skipped: true, reason: "suppressed" };
  }
  if (!subject || !message) {
    await updateContact(contact.id, { last_error: "Missing subject or message; outreach skipped." });
    return { skipped: true, reason: "missing_content" };
  }

  const attemptedAt = new Date().toISOString();
  const logId = await recordAttempt({ contact, recipient, subject, attemptedAt });

  try {
    const delivery = await sendOutreachEmail({
      to: recipient,
      subject,
      text: appendOutreachOptOut(message)
    });
    const providerMessageId = delivery.providerMessageId;
    const sentAt = new Date().toISOString();

    await updateAttempt(logId, {
      provider_message_id: providerMessageId,
      status: "sent",
      sent_at: sentAt,
      error: null
    });
    await updateContact(contact.id, {
      status: "sent",
      sent_at: sentAt,
      last_error: null
    });
    return { sent: true, providerMessageId };
  } catch (error) {
    const message = truncateError(error);
    await updateAttempt(logId, { status: "error", error: message });
    await updateContact(contact.id, { last_error: message });
    captureError(`Creator outreach email failed for contact ${contact.id}`, error);
    return { errored: true, error: message };
  }
}

export async function runSendOutreachEmails({ contactIds } = {}) {
  if (!process.env.OUTREACH_SMTP_PASSWORD) {
    return { sent: 0, attempted: 0, skipped: 0, errors: 0, disabled: true };
  }

  const selectedFilter = Array.isArray(contactIds) && contactIds.length > 0
    ? `&id=in.(${contactIds.map((id) => encodeURIComponent(id)).join(",")})`
    : "";
  const contacts = [];
  let offset = 0;
  while (true) {
    const batch = await supabaseGet(
      `creator_outreach_contacts?status=eq.approved&business_review_status=eq.approved&message_review_status=eq.approved${selectedFilter}&select=id,contact_email,subject,message,status&order=approved_at.asc.nullslast,created_at.asc&limit=${CONTACT_BATCH_SIZE}&offset=${offset}`
    );
    contacts.push(...batch);
    if (batch.length < CONTACT_BATCH_SIZE) break;
    offset += batch.length;
  }

  let sent = 0;
  let attempted = 0;
  let skipped = 0;
  let errors = 0;
  const deliveryErrors = [];

  for (const contact of contacts) {
    const result = await sendContact(contact);
    if (result.skipped) {
      skipped += 1;
      continue;
    }
    attempted += 1;
    if (result.sent) sent += 1;
    if (result.errored) {
      errors += 1;
      deliveryErrors.push(result.error);
    }
  }

  return {
    sent,
    attempted,
    skipped,
    errors,
    deliveryErrors
  };
}
