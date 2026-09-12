function readBearerToken(request) {
  const header = request.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

async function getAuthenticatedUserId(token) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !token) return null;

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}` }
  });
  if (!authResponse.ok) return null;
  const user = await authResponse.json();
  return user?.id || null;
}

async function supabaseServiceRequest(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service credentials are not configured.");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...options.headers }
  });
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}).`);
  return response.status === 204 ? null : response.json();
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const userId = await getAuthenticatedUserId(readBearerToken(request));
  if (!userId) return response.status(401).json({ error: "Sign in to refresh public reputation." });

  const workspaceId = request.body?.workspaceId;
  if (!workspaceId) return response.status(400).json({ error: "A workspaceId is required." });

  try {
    const membership = await supabaseServiceRequest(
      `workspace_members?workspace_id=eq.${encodeURIComponent(workspaceId)}&user_id=eq.${encodeURIComponent(userId)}&role=in.(owner,editor)&select=id&limit=1`
    );
    if (!membership?.length) return response.status(403).json({ error: "You do not manage this workspace." });

    const [subscription] = await supabaseServiceRequest(
      `workspace_subscriptions?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=plan,status`
    );
    const plan = subscription?.plan === "growth" && ["active", "trialing"].includes(subscription.status) ? "growth" : "free";
    if (plan !== "growth") return response.status(403).json({ error: "Public reputation monitoring is available on the Growth plan." });

    const [workspace] = await supabaseServiceRequest(
      `workspaces?id=eq.${encodeURIComponent(workspaceId)}&select=google_place_id`
    );
    const placeId = workspace?.google_place_id;
    if (!placeId) return response.status(400).json({ error: "Add your Google Place ID in workspace settings first." });

    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return response.status(503).json({ error: "Public reputation lookup is not configured yet." });
    }

    const placesUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=rating,user_ratings_total&key=${process.env.GOOGLE_PLACES_API_KEY}`;
    const placesResponse = await fetch(placesUrl);
    const placesPayload = await placesResponse.json();

    if (!placesResponse.ok || placesPayload.status !== "OK") {
      console.error("Google Places lookup failed", placesPayload);
      return response.status(502).json({ error: "Could not read the public rating right now." });
    }

    const rating = placesPayload.result?.rating ?? null;
    const ratingCount = placesPayload.result?.user_ratings_total ?? null;
    const capturedAt = new Date().toISOString();

    await supabaseServiceRequest("reputation_snapshots", {
      method: "POST",
      body: JSON.stringify({ workspace_id: workspaceId, source: "google", rating, rating_count: ratingCount, captured_at: capturedAt })
    });

    return response.status(200).json({ rating, rating_count: ratingCount, captured_at: capturedAt });
  } catch (error) {
    console.error("Reputation refresh failed", error);
    return response.status(500).json({ error: "Unable to refresh public reputation right now." });
  }
}
