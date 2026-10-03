import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { supabaseGet, supabasePatch, supabaseRequest } from "./cronHelpers.js";
import { sendOutreachEmail } from "./outreachMailer.js";

const LOOKBACK_DAYS = 30;
const NOTIFICATION_RECIPIENT = process.env.OUTREACH_NOTIFICATION_EMAIL || process.env.SUPPORT_TO_EMAIL || "bonomistefano@outlook.it";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeSubject(value) {
  return String(value || "").replace(/^(re|fwd):\s*/gi, "").trim().toLowerCase();
}

function createClient() {
  return new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: required("OUTREACH_SMTP_USER"),
      pass: required("OUTREACH_SMTP_PASSWORD")
    }
  });
}

function contactMatches(contact, parsed, headerMessageId, headerReferences) {
  const sender = normalizeEmail(parsed.from?.value?.[0]?.address);
  const contactEmail = normalizeEmail(contact.contact_email);
  const subjectMatches = normalizeSubject(contact.subject) === normalizeSubject(parsed.subject);
  const references = [headerMessageId, ...headerReferences].filter(Boolean).map(String);
  const deliveryIds = (contact.deliveryLogs || []).map((log) => String(log.provider_message_id || ""));
  const threadMatches = deliveryIds.some((id) => references.includes(id));
  return (sender === contactEmail && subjectMatches) || (sender === contactEmail && threadMatches);
}

async function findContact(parsed, headers) {
  const contacts = await supabaseGet(
    "creator_outreach_contacts?status=in.(sent,replied)&select=id,company_name,contact_email,subject,status"
  );
  const logs = await supabaseGet(
    "creator_outreach_delivery_log?status=eq.sent&select=contact_id,provider_message_id"
  );
  const headerMessageId = headers.get("message-id");
  const headerReferences = String(headers.get("references") || "").split(/\s+/).filter(Boolean);
  const candidates = contacts.map((contact) => ({
    ...contact,
    deliveryLogs: logs.filter((log) => log.contact_id === contact.id)
  }));

  for (const contact of candidates) {
    if (contactMatches(contact, parsed, headerMessageId, headerReferences)) return contact;
  }
  return null;
}

async function alreadyStored(messageId) {
  const rows = await supabaseGet(
    `creator_outreach_replies?gmail_message_id=eq.${encodeURIComponent(messageId)}&select=id&limit=1`
  );
  return rows.length > 0;
}

async function notify(contact, reply) {
  if (!NOTIFICATION_RECIPIENT) return false;
  await sendOutreachEmail({
    to: NOTIFICATION_RECIPIENT,
    subject: `Godwit reply needs review: ${contact.company_name || contact.contact_email}`,
    text: [
      `A reply to the Godwit outreach message for ${contact.company_name || contact.contact_email} was received.`,
      "",
      `From: ${reply.from_email}`,
      `Subject: ${reply.subject || "(no subject)"}`,
      "",
      reply.text_body || "(The reply has no plain-text body.)",
      "",
      "Review and handle it from the Creator page. Godwit has not sent an automatic response."
    ].join("\n")
  });
  return true;
}

async function storeReply(contact, parsed, headers) {
  const messageId = String(headers.get("message-id") || "").trim();
  if (!messageId || await alreadyStored(messageId)) return { stored: false, duplicate: true, notified: false };

  const reply = {
    contact_id: contact.id,
    gmail_message_id: messageId,
    thread_id: String(headers.get("x-gm-thrid") || headers.get("x-gmail-thread-id") || "").trim() || null,
    from_email: normalizeEmail(parsed.from?.value?.[0]?.address),
    subject: String(parsed.subject || "").trim(),
    text_body: String(parsed.text || "").trim().slice(0, 20000),
    received_at: parsed.date?.toISOString() || new Date().toISOString(),
    needs_action: true
  };
  await supabaseRequest("creator_outreach_replies", {
    method: "POST",
    prefer: "return=minimal",
    body: reply
  });
  await supabasePatch(`creator_outreach_contacts?id=eq.${encodeURIComponent(contact.id)}`, {
    status: "replied",
    last_reply_at: reply.received_at,
    reply_needs_action: true,
    last_error: null
  });
  return { stored: true, duplicate: false, notified: await notify(contact, reply) };
}

export async function runCheckGmailReplies() {
  if (!process.env.OUTREACH_SMTP_USER || !process.env.OUTREACH_SMTP_PASSWORD) {
    return { checked: 0, matched: 0, stored: 0, notified: 0, disabled: true };
  }

  const client = createClient();
  let checked = 0;
  let matched = 0;
  let stored = 0;
  let notified = 0;
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000);
      for await (const message of client.fetch({ since }, { envelope: true, source: true })) {
        checked += 1;
        const parsed = await simpleParser(message.source);
        const contact = await findContact(parsed, parsed.headers);
        if (!contact) continue;
        matched += 1;
        const result = await storeReply(contact, parsed, parsed.headers);
        if (result.stored) stored += 1;
        if (result.notified) notified += 1;
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
  return { checked, matched, stored, notified };
}
