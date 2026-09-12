function isSafeWebhookUrl(value) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host === "127.0.0.1") return false;
    if (host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("169.254.")) return false;
    return true;
  } catch {
    return false;
  }
}

async function supabaseGet(path) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase webhook credentials are not configured.");
  const result = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!result.ok) throw new Error(`Supabase query failed (${result.status}).`);
  return result.json();
}

const EVENT_TABLES = { vote_submitted: "votes", lead_captured: "voter_leads", content_reported: "content_reports" };

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const { workspaceId, event, recordId } = request.body || {};
  const table = EVENT_TABLES[event];
  if (!workspaceId || !table || !recordId) {
    return response.status(400).json({ error: "Invalid webhook request." });
  }

  try {
    const [workspace] = await supabaseGet(`workspaces?id=eq.${encodeURIComponent(workspaceId)}&select=webhook_url`);
    const webhookUrl = workspace?.webhook_url;
    if (!webhookUrl || !isSafeWebhookUrl(webhookUrl)) {
      return response.status(200).json({ delivered: false });
    }

    const [subscription] = await supabaseGet(`workspace_subscriptions?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=plan,status`);
    const plan = subscription?.plan === "growth" && ["active", "trialing"].includes(subscription.status) ? "growth" : "free";
    if (plan !== "growth") return response.status(200).json({ delivered: false });

    // Re-fetch the record server-side instead of trusting client-supplied payload data.
    const [record] = await supabaseGet(`${table}?id=eq.${encodeURIComponent(recordId)}&workspace_id=eq.${encodeURIComponent(workspaceId)}&select=*`);
    if (!record) return response.status(200).json({ delivered: false });

    const delivery = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, workspace_id: workspaceId, data: record })
    });

    return response.status(200).json({ delivered: delivery.ok });
  } catch (error) {
    console.error("Webhook dispatch failed", error);
    return response.status(200).json({ delivered: false });
  }
}
