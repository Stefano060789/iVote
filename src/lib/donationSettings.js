import { supabase } from "./supabase";
import { normalizeIban } from "./validators";

export async function loadDonationSettings(workspaceId) {
  const { data, error } = await supabase
    .from("donation_settings")
    .select("is_enabled, iban, account_holder_name, bic, currency, suggested_amount, message")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw new Error(`Unable to load donation settings: ${error.message}`);
  return data ?? { is_enabled: false, iban: "", account_holder_name: "", bic: "", currency: "EUR", suggested_amount: "", message: "" };
}

export async function saveDonationSettings(workspaceId, settings) {
  const { error } = await supabase
    .from("donation_settings")
    .upsert({
      workspace_id: workspaceId,
      is_enabled: Boolean(settings.is_enabled),
      iban: settings.iban ? normalizeIban(settings.iban) : null,
      account_holder_name: settings.account_holder_name?.trim() || null,
      bic: settings.bic?.trim().toUpperCase() || null,
      currency: (settings.currency || "EUR").trim().toUpperCase(),
      suggested_amount: settings.suggested_amount ? Number(settings.suggested_amount) : null,
      message: settings.message?.trim() || null,
      updated_at: new Date().toISOString()
    });
  if (error) throw new Error(`Unable to save donation settings: ${error.message}`);
}
