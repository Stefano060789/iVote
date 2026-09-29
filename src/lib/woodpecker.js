import { supabase } from "./supabase";

export async function loadWoodpeckerTasks(workspaceId) {
  const { data, error } = await supabase.from("woodpecker_tasks").select("*, woodpecker_task_campaigns(campaign_id, qr_campaigns(name, token)), woodpecker_task_history(*)").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((task) => ({ ...task, history: task.woodpecker_task_history || [] }));
}

export async function loadWoodpeckerPortal(token) {
  const { data, error } = await supabase.rpc("get_public_woodpecker_portal", { target_token: token });
  if (error) throw error;
  return data || [];
}

export async function addWoodpeckerMessage(taskId, message, actorName = "QR visitor") {
  const { data, error } = await supabase.rpc("add_woodpecker_message", { target_task_id: taskId, message_text: message, actor_name: actorName });
  if (error) throw error;
  return data;
}

export async function completeWoodpeckerTask(taskId) {
  const { data, error } = await supabase.rpc("complete_woodpecker_task", { target_task_id: taskId });
  if (error) throw error;
  return data;
}
