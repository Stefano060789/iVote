async function supabaseGet(path) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase credentials are not configured.");
  const result = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!result.ok) throw new Error(`Supabase query failed (${result.status}).`);
  return result.json();
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const workspaceId = request.body?.workspaceId;
  const reportId = Number(request.body?.reportId);
  if (!workspaceId || !Number.isSafeInteger(reportId) || reportId <= 0) {
    return response.status(400).json({ error: "A valid workspaceId and reportId are required." });
  }

  try {
    // Re-fetch the report server-side instead of trusting client-supplied content, so a
    // malicious caller can't use this endpoint to email arbitrary text to a workspace.
    const [report] = await supabaseGet(
      `content_reports?id=eq.${reportId}&workspace_id=eq.${encodeURIComponent(workspaceId)}&status=eq.open&select=id,poll_id,reported_answer,reason`
    );
    if (!report) return response.status(200).json({ notified: false });

    const [reportSettings] = await supabaseGet(
      `weekly_report_settings?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=recipient_email`
    );
    const recipientEmail = reportSettings?.recipient_email;
    if (!recipientEmail) return response.status(200).json({ notified: false, reason: "no_recipient_configured" });

    if (!process.env.RESEND_API_KEY || !process.env.REPORT_FROM_EMAIL) {
      return response.status(200).json({ notified: false, reason: "email_not_configured" });
    }

    const appUrl = process.env.APP_URL || "";
    const preview = String(report.reported_answer || "").slice(0, 200);
    const delivery = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.REPORT_FROM_EMAIL,
        to: [recipientEmail],
        subject: "A voter reported an answer for review",
        text: `A voter reported an answer on poll #${report.poll_id} (reason: ${report.reason}):\n\n"${preview}"\n\nReview it here: ${appUrl}/moderation`
      })
    });

    if (!delivery.ok) throw new Error(`Resend request failed (${delivery.status}).`);
    return response.status(200).json({ notified: true });
  } catch (error) {
    console.error("Content report notification failed", error);
    // Never let a notification failure surface as an error to the reporting voter.
    return response.status(200).json({ notified: false });
  }
}
