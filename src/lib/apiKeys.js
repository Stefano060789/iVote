async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const base = Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `ivote_${base}`;
}

export async function loadApiKeys(supabase, workspaceId) {
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, label, created_at, last_used_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load API keys: ${error.message}`);
  return data ?? [];
}

export async function createApiKey(supabase, workspaceId, label) {
  const key = randomKey();
  const keyHash = await sha256Hex(key);
  const { data, error } = await supabase
    .from("api_keys")
    .insert({ workspace_id: workspaceId, key_hash: keyHash, label: label?.trim() || null })
    .select("id, label, created_at, last_used_at")
    .single();
  if (error) throw new Error(`Unable to create API key: ${error.message}`);
  return { record: data, plaintextKey: key };
}

export async function deleteApiKey(supabase, keyId) {
  const { error } = await supabase.from("api_keys").delete().eq("id", keyId);
  if (error) throw new Error(`Unable to delete API key: ${error.message}`);
}
