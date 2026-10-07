export const WEBSITE_VISIT_SESSION_KEY = "godwit-website-visit-session";
const PUBLIC_WEBSITE_PATHS = new Set(["/", "/essentials", "/privacy", "/terms", "/support"]);

export function isPublicWebsitePath(pathname) {
  return PUBLIC_WEBSITE_PATHS.has(pathname);
}

export async function recordWebsiteVisit({ client, storage, pathname, consent, date, createId }) {
  if (consent !== "accepted" || !isPublicWebsitePath(pathname)) return;
  const { data, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (data.session) return;

  const recordedKey = `godwit-website-visit-recorded:${date}`;
  if (storage.getItem(recordedKey)) return;
  let sessionId = storage.getItem(WEBSITE_VISIT_SESSION_KEY);
  if (!sessionId) {
    sessionId = createId();
    storage.setItem(WEBSITE_VISIT_SESSION_KEY, sessionId);
  }
  const { error } = await client.rpc("record_website_visit", { visitor_session: sessionId });
  if (error) throw error;
  storage.setItem(recordedKey, "true");
}
