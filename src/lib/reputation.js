import { supabase } from "./supabase";

export async function loadLatestReputationSnapshot(workspaceId) {
  const { data, error } = await supabase
    .from("reputation_snapshots")
    .select("rating, rating_count, captured_at")
    .eq("workspace_id", workspaceId)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Unable to load public reputation: ${error.message}`);
  return data ?? null;
}

export async function loadReputationHistory(workspaceId, limit = 12) {
  const { data, error } = await supabase
    .from("reputation_snapshots")
    .select("rating, rating_count, captured_at")
    .eq("workspace_id", workspaceId)
    .order("captured_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Unable to load reputation history: ${error.message}`);
  return (data ?? []).reverse();
}

export async function refreshReputationSnapshot(workspaceId) {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch("/api/refresh-reputation", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
    body: JSON.stringify({ workspaceId })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Unable to refresh public reputation.");
  return payload;
}
