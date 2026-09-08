import { supabase } from "./supabase";

export async function loadPollRotations() {
  const { data, error } = await supabase
    .from("poll_rotations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load poll rotations: ${error.message}`);
  return data ?? [];
}

export async function createPollRotation({ name, pollIds, frequency }) {
  const { data, error } = await supabase
    .from("poll_rotations")
    .insert({ name: String(name).trim(), poll_ids: pollIds.map(Number), frequency })
    .select()
    .single();
  if (error) throw new Error(`Unable to create poll rotation: ${error.message}`);
  return data;
}

export async function deletePollRotation(rotationId) {
  const { error } = await supabase.from("poll_rotations").delete().eq("id", rotationId);
  if (error) throw new Error(`Unable to delete poll rotation: ${error.message}`);
}
