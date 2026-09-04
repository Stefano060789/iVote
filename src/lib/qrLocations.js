import { supabase } from "./supabase";

const STORAGE_KEY = "ivote_qr_locations";

function readLocalQrLocations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function writeLocalQrLocations(locations) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
}

export function buildQrToken() {
  return `loc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function loadQrLocations() {
  try {
    const { data, error } = await supabase
      .from("qr_locations")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      if (data.length > 0) {
        writeLocalQrLocations(data);
      }
      return data;
    }
  } catch (error) {
    console.warn("Could not read qr_locations table; using local fallback.", error);
  }

  return readLocalQrLocations();
}

export async function saveQrLocation(location) {
  const cleanName = String(location?.name ?? "").trim();
  const cleanToken = String(location?.token ?? "").trim() || buildQrToken();

  if (!cleanName) {
    throw new Error("A QR location name is required.");
  }

  const payload = {
    name: cleanName,
    token: cleanToken,
    current_poll_id: location?.current_poll_id ?? null
  };

  try {
    if (location?.id) {
      const { data, error } = await supabase
        .from("qr_locations")
        .update(payload)
        .eq("id", location.id)
        .select()
        .single();

      if (!error && data) {
        const list = readLocalQrLocations().filter((item) => String(item.id) !== String(location.id));
        list.unshift(data);
        writeLocalQrLocations(list);
        return data;
      }
      if (error) {
        console.warn("Falling back to local save for qr_locations.", error);
      }
    } else {
      const { data, error } = await supabase
        .from("qr_locations")
        .insert(payload)
        .select()
        .single();

      if (!error && data) {
        const list = readLocalQrLocations();
        list.unshift(data);
        writeLocalQrLocations(list);
        return data;
      }
      if (error) {
        console.warn("Falling back to local save for qr_locations.", error);
      }
    }
  } catch (error) {
    console.warn("Could not save QR location to Supabase; local fallback used.", error);
  }

  const stored = readLocalQrLocations();
  const index = location?.id ? stored.findIndex((item) => String(item.id) === String(location.id)) : -1;
  const localLocation = {
    id: location?.id ?? `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: cleanName,
    token: cleanToken,
    current_poll_id: location?.current_poll_id ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (index >= 0) {
    stored[index] = localLocation;
  } else {
    stored.unshift(localLocation);
  }

  writeLocalQrLocations(stored);
  return localLocation;
}

export async function deleteQrLocation(locationId) {
  const id = String(locationId);

  try {
    const { error } = await supabase.from("qr_locations").delete().eq("id", locationId);
    if (error) {
      console.warn("Could not delete QR location in Supabase; falling back to local storage.", error);
    }
  } catch (error) {
    console.warn("Could not delete QR location in Supabase; falling back to local storage.", error);
  }

  const stored = readLocalQrLocations().filter((item) => String(item.id) !== id);
  writeLocalQrLocations(stored);
  return stored;
}
