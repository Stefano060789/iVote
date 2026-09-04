import { supabase } from "./supabase";

export const METADATA_STORAGE_KEY = "ivote_poll_meta";
export const AUDIT_STORAGE_KEY = "ivote_audit_log";

function readStorageMap(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(error);
    return fallback;
  }
}

function writeStorageMap(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function readPollMeta(pollId) {
  const pollIdKey = String(pollId);
  return readStorageMap(METADATA_STORAGE_KEY, {})[pollIdKey] ?? {};
}

export function writePollMeta(pollId, patch) {
  const pollIdKey = String(pollId);
  const stored = readStorageMap(METADATA_STORAGE_KEY, {});
  const current = stored[pollIdKey] ?? {};
  const next = { ...current, ...patch };
  stored[pollIdKey] = next;
  writeStorageMap(METADATA_STORAGE_KEY, stored);
  return next;
}

export async function savePollMeta(pollId, patch) {
  const safePatch = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined && value !== null)
  );

  if (Object.keys(safePatch).length === 0) {
    return readPollMeta(pollId);
  }

  writePollMeta(pollId, safePatch);

  const supabasePatch = {};

  for (const [key, value] of Object.entries(safePatch)) {
    if (
      [
        "location_name",
        "location_token",
        "starts_at",
        "ends_at",
        "status",
        "closed_at",
        "brand_name",
        "brand_logo_url",
        "brand_primary_color",
        "brand_accent_color",
        "template_key"
      ].includes(key)
    ) {
      supabasePatch[key] = value;
    }
  }

  if (Object.keys(supabasePatch).length > 0) {
    try {
      const { error } = await supabase.from("polls").update(supabasePatch).eq("id", pollId);
      if (error) {
        console.warn("Falling back to local metadata for poll", pollId, error);
      }
    } catch (error) {
      console.warn("Falling back to local metadata for poll", pollId, error);
    }
  }

  return readPollMeta(pollId);
}

export function readAuditLog() {
  const value = readStorageMap(AUDIT_STORAGE_KEY, []);
  return Array.isArray(value) ? value : [];
}

export function appendAuditLog(action, details = {}) {
  const entries = readAuditLog();
  const nextEntry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    action,
    created_at: new Date().toISOString(),
    details
  };

  const next = [nextEntry, ...entries];
  writeStorageMap(AUDIT_STORAGE_KEY, next);
  return nextEntry;
}

export function getPollStatus(poll) {
  const pollMeta = readPollMeta(poll?.id);
  const status = poll?.status ?? pollMeta.status ?? "active";
  return status === "closed" ? "closed" : "active";
}

export function isPollClosed(poll) {
  const pollMeta = readPollMeta(poll?.id);
  const closedAt = poll?.closed_at ?? pollMeta.closed_at;
  const status = poll?.status ?? pollMeta.status;
  return status === "closed" || (closedAt && new Date(closedAt) <= new Date());
}
