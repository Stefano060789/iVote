import { supabaseGet, supabaseDelete } from "./cronHelpers.js";

export async function runPurgeOldVotes() {
  const workspaces = await supabaseGet("workspaces?select=id,vote_retention_days&vote_retention_days=not.is.null");
  let purgedWorkspaces = 0;

  for (const workspace of workspaces) {
    const cutoff = new Date(Date.now() - workspace.vote_retention_days * 86400000).toISOString();
    await supabaseDelete(`votes?workspace_id=eq.${encodeURIComponent(workspace.id)}&created_at=lt.${encodeURIComponent(cutoff)}`);
    purgedWorkspaces += 1;
  }

  return { workspacesChecked: workspaces.length, purgedWorkspaces };
}
