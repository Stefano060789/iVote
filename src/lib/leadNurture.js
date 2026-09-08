import { supabase } from "./supabase";

export async function loadLeadNurtureSettings(workspaceId) {
  const { data, error } = await supabase
    .from("lead_nurture_settings")
    .select("is_enabled, subject, message")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw new Error(`Unable to load nurture email settings: ${error.message}`);
  return data ?? { is_enabled: false, subject: "", message: "" };
}

export async function saveLeadNurtureSettings(workspaceId, settings) {
  const { error } = await supabase
    .from("lead_nurture_settings")
    .upsert({
      workspace_id: workspaceId,
      is_enabled: Boolean(settings.is_enabled),
      subject: settings.subject?.trim() || null,
      message: settings.message?.trim() || null,
      updated_at: new Date().toISOString()
    });
  if (error) throw new Error(`Unable to save nurture email settings: ${error.message}`);
}
