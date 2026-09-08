import { createHash } from "node:crypto";

async function supabaseGet(path) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const result = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!result.ok) throw new Error(`Supabase query failed (${result.status}).`);
  return result.json();
}

async function supabasePatch(path, body) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  await fetch(`${url}/rest/v1/${path}`, {
    method: "PATCH",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body)
  });
}

export default async function handler(request, response) {
  const authHeader = request.headers.authorization || "";
  const providedKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!providedKey) return response.status(401).json({ error: "Provide your API key as a Bearer token." });

  const keyHash = createHash("sha256").update(providedKey).digest("hex");

  try {
    const [apiKey] = await supabaseGet(`api_keys?key_hash=eq.${keyHash}&select=id,workspace_id`);
    if (!apiKey) return response.status(401).json({ error: "Invalid API key." });

    supabasePatch(`api_keys?id=eq.${apiKey.id}`, { last_used_at: new Date().toISOString() }).catch(() => {});

    const workspaceId = encodeURIComponent(apiKey.workspace_id);
    const [pollCount, voteCount, openAlerts, recentVotes] = await Promise.all([
      supabaseGet(`polls?workspace_id=eq.${workspaceId}&select=id`).then((rows) => rows.length),
      supabaseGet(`votes?workspace_id=eq.${workspaceId}&select=id`).then((rows) => rows.length),
      supabaseGet(`feedback_alerts?workspace_id=eq.${workspaceId}&status=in.(open,acknowledged)&select=id`).then((rows) => rows.length),
      supabaseGet(`votes?workspace_id=eq.${workspaceId}&select=poll_id,answer,created_at&order=created_at.desc&limit=50`)
    ]);

    return response.status(200).json({ polls: pollCount, votes: voteCount, openAlerts, recentVotes });
  } catch (error) {
    console.error("API v1 summary failed", error);
    return response.status(500).json({ error: "Unable to load summary right now." });
  }
}
