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
  const result = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!result.ok) throw new Error(`Supabase query failed (${result.status}).`);
  return result.json();
}

async function supabaseDelete(path) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const result = await fetch(`${url}/rest/v1/${path}`, {
    method: "DELETE",
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "return=minimal" }
  });
  if (!result.ok) throw new Error(`Supabase delete failed (${result.status}).`);
}

export default async function handler(request, response) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!secureEqual(supplied, secret)) return response.status(401).json({ error: "Unauthorized." });

  try {
    const workspaces = await supabaseGet("workspaces?select=id,vote_retention_days&vote_retention_days=not.is.null");
    let purgedWorkspaces = 0;

    for (const workspace of workspaces) {
      const cutoff = new Date(Date.now() - workspace.vote_retention_days * 86400000).toISOString();
      await supabaseDelete(`votes?workspace_id=eq.${encodeURIComponent(workspace.id)}&created_at=lt.${encodeURIComponent(cutoff)}`);
      purgedWorkspaces += 1;
    }

    return response.status(200).json({ workspacesChecked: workspaces.length, purgedWorkspaces });
  } catch (error) {
    console.error("Vote retention purge failed", error);
    return response.status(500).json({ error: "Vote retention purge failed." });
  }
}
