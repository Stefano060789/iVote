import { supabase } from "./supabase";
import { buildQrToken } from "./qrLocations";

export { buildQrToken };

export async function loadQrCampaigns() {
  const { data, error } = await supabase
    .from("qr_campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load QR campaigns: ${error.message}`);
  return data ?? [];
}

export async function createQrCampaign({ name, pollId, token, placementLabel, variantLabel, portalTitle, portalMessage, portalButtonLabel }) {
  const { data, error } = await supabase
    .from("qr_campaigns")
    .insert({ name: String(name).trim(), poll_id: pollId ? Number(pollId) : null, token: token || buildQrToken(), placement_label: String(placementLabel || "").trim() || null, variant_label: String(variantLabel || "").trim() || null, portal_title: String(portalTitle || "").trim() || null, portal_message: String(portalMessage || "").trim() || null, portal_button_label: String(portalButtonLabel || "").trim() || null })
    .select()
    .single();
  if (error) throw new Error(`Unable to create QR campaign: ${error.message}`);
  return data;
}