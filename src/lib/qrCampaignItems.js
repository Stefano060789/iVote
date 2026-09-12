import { supabase } from "./supabase";

export async function loadQrCampaignItems() {
  const { data, error } = await supabase
    .from("qr_campaign_items")
    .select("*")
    .order("campaign_id", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Unable to load QR code items: ${error.message}`);
  return data ?? [];
}

export async function addQrCampaignPollItem(campaignId, pollId) {
  const { data, error } = await supabase
    .from("qr_campaign_items")
    .insert({ campaign_id: Number(campaignId), item_type: "poll", poll_id: Number(pollId) })
    .select()
    .single();
  if (error) throw new Error(`Unable to add that poll to the QR code: ${error.message}`);
  return data;
}

export async function addQrCampaignInfoItem(campaignId, { title, body, linkUrl, linkLabel }) {
  const { data, error } = await supabase
    .from("qr_campaign_items")
    .insert({
      campaign_id: Number(campaignId),
      item_type: "info",
      title: String(title || "").trim(),
      body: String(body || "").trim() || null,
      link_url: String(linkUrl || "").trim() || null,
      link_label: String(linkLabel || "").trim() || null
    })
    .select()
    .single();
  if (error) throw new Error(`Unable to add that info card to the QR code: ${error.message}`);
  return data;
}

export async function removeQrCampaignItem(itemId) {
  const { error } = await supabase.from("qr_campaign_items").delete().eq("id", itemId);
  if (error) throw new Error(`Unable to remove that item: ${error.message}`);
}

// Swaps the `sort_order` of two items so one moves up/down in the voter-facing menu.
export async function swapQrCampaignItemPositions(itemA, itemB) {
  const [{ error: errorA }, { error: errorB }] = await Promise.all([
    supabase.from("qr_campaign_items").update({ sort_order: itemB.sort_order }).eq("id", itemA.id),
    supabase.from("qr_campaign_items").update({ sort_order: itemA.sort_order }).eq("id", itemB.id)
  ]);
  if (errorA || errorB) throw new Error(`Unable to reorder items: ${(errorA || errorB).message}`);
}
