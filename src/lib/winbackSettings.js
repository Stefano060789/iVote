import { supabase } from "./supabase";

export async function loadWinbackSettings(workspaceId) {
  const { data, error } = await supabase
    .from("winback_settings")
    .select("is_enabled, days_since_last_visit, subject, message")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw new Error(`Unable to load win-back email settings: ${error.message}`);
  return data ?? { is_enabled: false, days_since_last_visit: 30, subject: "", message: "" };
}

export async function saveWinbackSettings(workspaceId, settings) {
  const { error } = await supabase
    .from("winback_settings")
    .upsert({
      workspace_id: workspaceId,
      is_enabled: Boolean(settings.is_enabled),
      days_since_last_visit: Number(settings.days_since_last_visit) || 30,
      subject: settings.subject?.trim() || null,
      message: settings.message?.trim() || null,
      updated_at: new Date().toISOString()
    });
  if (error) throw new Error(`Unable to save win-back email settings: ${error.message}`);
}
