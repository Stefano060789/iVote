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
    const cutoff = new Date(Date.now() - 2 * 86400000).toISOString();
    const claims = await supabaseGet(
      `review_benefit_claims?status=eq.pending&contact_email=not.is.null&reminder_sent_at=is.null&created_at=lte.${encodeURIComponent(cutoff)}&select=id,poll_id,contact_email`
    );

    if (!claims.length) return response.status(200).json({ reminded: 0 });

    if (!process.env.RESEND_API_KEY || !process.env.REPORT_FROM_EMAIL) {
      return response.status(200).json({ reminded: 0, preview: claims });
    }

    let reminded = 0;
    for (const claim of claims) {
      const [poll] = await supabaseGet(`polls?id=eq.${claim.poll_id}&select=question`);
      const subject = "Did you leave your review yet?";
      const text = `Hi! You told us you'd leave a review after your recent visit${poll?.question ? ` about "${poll.question}"` : ""}. Once it's live, come back and let us know so we can send your reward.`;

      const delivery = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: process.env.REPORT_FROM_EMAIL, to: [claim.contact_email], subject, text })
      });

      if (delivery.ok) {
        await supabasePatch(`review_benefit_claims?id=eq.${claim.id}`, { reminder_sent_at: new Date().toISOString() });
        reminded += 1;
      } else {
        console.error(`Resend request failed for claim ${claim.id} (${delivery.status}).`);
      }
    }

    return response.status(200).json({ reminded });
  } catch (error) {
    console.error("Review reminder dispatch failed", error);
    return response.status(500).json({ error: "Review reminder dispatch failed." });
  }
}
