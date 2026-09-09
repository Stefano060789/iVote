import { timingSafeEqual } from "node:crypto";

function secureEqual(left, right) {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function supabaseGet(path) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase credentials are not configured.");
  const result = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!result.ok) throw new Error(`Supabase query failed (${result.status}).`);
  return result.json();
}

async function supabasePatch(path, body) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const result = await fetch(`${url}/rest/v1/${path}`, {
    method: "PATCH",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body)
  });
  if (!result.ok) throw new Error(`Supabase update failed (${result.status}).`);
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed." });
  }
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!secureEqual(supplied, secret)) return response.status(401).json({ error: "Unauthorized." });

  try {
    const settings = await supabaseGet("winback_settings?is_enabled=eq.true&select=workspace_id,days_since_last_visit,subject,message");
    if (!settings.length) return response.status(200).json({ sent: 0 });

    const canSend = Boolean(process.env.RESEND_API_KEY && process.env.REPORT_FROM_EMAIL);
    let sent = 0;
    const preview = [];

    for (const setting of settings) {
      const cutoff = new Date(Date.now() - setting.days_since_last_visit * 86400000).toISOString();
      const lapsedVoters = await supabaseGet(
        `voter_profiles?workspace_id=eq.${encodeURIComponent(setting.workspace_id)}&last_seen_at=lte.${encodeURIComponent(cutoff)}&winback_sent_at=is.null&unsubscribed_at=is.null&select=id,email,unsubscribe_token`
      );

      for (const voter of lapsedVoters) {
        if (!canSend) {
          preview.push({ workspace_id: setting.workspace_id, email: voter.email });
          continue;
        }

        const appUrl = process.env.APP_URL || "";
        const unsubscribeLine = voter.unsubscribe_token
          ? `\n\n---\nDon't want these emails? Unsubscribe: ${appUrl}/unsubscribe?token=${voter.unsubscribe_token}`
          : "";

        const delivery = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: process.env.REPORT_FROM_EMAIL,
            to: [voter.email],
            subject: setting.subject || "We miss you!",
            text: `${setting.message || "It's been a while since your last visit. Come back soon!"}${unsubscribeLine}`
          })
        });

        if (delivery.ok) {
          await supabasePatch(`voter_profiles?id=eq.${voter.id}`, { winback_sent_at: new Date().toISOString() });
          sent += 1;
        } else {
          console.error(`Resend request failed for voter profile ${voter.id} (${delivery.status}).`);
        }
      }
    }

    return response.status(200).json(canSend ? { sent } : { sent: 0, preview });
  } catch (error) {
    console.error("Win-back email dispatch failed", error);
    return response.status(500).json({ error: "Win-back email dispatch failed." });
  }
}
