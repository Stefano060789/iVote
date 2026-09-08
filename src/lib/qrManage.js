import { supabase } from "./supabase";

export function extractQrToken(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return "";
  const match = value.match(/\/qr\/([^/?#]+)/);
  if (match) return decodeURIComponent(match[1]);
  if (/^https?:\/\//i.test(value)) return "";
  return value;
}

export async function resolveManagedQrToken(token) {
  if (!token) return null;

  const { data: campaign } = await supabase
    .from("qr_campaigns")
    .select("id, name, poll_id, workspace_id, placement_label, variant_label")
    .eq("token", token)
    .maybeSingle();

  if (!campaign) return null;

  const [{ data: polls }, { data: currentPoll }] = await Promise.all([
    supabase.from("polls").select("id, question").eq("workspace_id", campaign.workspace_id).order("id", { ascending: false }),
    campaign.poll_id
      ? supabase.from("polls").select("id, question").eq("id", campaign.poll_id).maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  return { campaign, currentPoll, polls: polls || [] };
}

export async function reassignManagedCampaignPoll(campaignId, nextPollId) {
  const { error } = await supabase
    .from("qr_campaigns")
    .update({ poll_id: Number(nextPollId) })
    .eq("id", campaignId);
  return error;
}
