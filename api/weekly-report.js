import { timingSafeEqual } from "node:crypto";

function secureEqual(left, right) {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function supabaseRequest(path) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase reporting credentials are not configured.");
  const result = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!result.ok) throw new Error(`Supabase report query failed (${result.status}).`);
  return result.json();
}

async function count(path) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const result = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" } });
  if (!result.ok) throw new Error(`Supabase report count failed (${result.status}).`);
  return Number(result.headers.get("content-range")?.split("/")[1] || 0);
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
    const settings = await supabaseRequest("weekly_report_settings?select=workspace_id,recipient_email&is_enabled=eq.true");
    const reports = await Promise.all(settings.map(async (setting) => {
      const workspace = encodeURIComponent(setting.workspace_id);
      const [polls, votes, alerts, tasks] = await Promise.all([
        count(`polls?workspace_id=eq.${workspace}&select=id`),
        count(`votes?workspace_id=eq.${workspace}&created_at=gte.${encodeURIComponent(new Date(Date.now() - 7 * 86400000).toISOString())}&select=id`),
        count(`feedback_alerts?workspace_id=eq.${workspace}&status=in.(open,acknowledged)&select=id`),
        count(`feedback_recovery_tasks?workspace_id=eq.${workspace}&status=in.(open,in_progress)&select=id`)
      ]);
      return { to: setting.recipient_email, subject: "iVote weekly workspace summary", text: `Weekly iVote summary\n\nPolls: ${polls}\nVotes in the last 7 days: ${votes}\nOpen feedback alerts: ${alerts}\nOpen recovery tasks: ${tasks}` };
    }));
    if (process.env.RESEND_API_KEY && reports.length) {
      const sender = process.env.REPORT_FROM_EMAIL;
      if (!sender) throw new Error("REPORT_FROM_EMAIL is required when RESEND_API_KEY is configured.");
      const sent = await Promise.all(reports.map(async (report) => {
        const result = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: sender, to: [report.to], subject: report.subject, text: report.text }) });
        if (!result.ok) throw new Error(`Resend request failed (${result.status}).`);
        return result.json();
      }));
      return response.status(200).json({ delivered: reports.length, sent });
    }
    return response.status(200).json({ delivered: 0, preview: reports });
  } catch (error) {
    console.error("Weekly reporting failed", error);
    return response.status(500).json({ error: "Weekly reporting failed." });
  }
}