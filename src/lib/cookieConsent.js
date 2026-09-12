const STORAGE_KEY = "ivote_cookie_consent";
export const COOKIE_CONSENT_EVENT = "ivote:cookie-consent";

// "accepted" | "declined" | null (no choice made yet)
export function getCookieConsent() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setCookieConsent(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Ignore storage failures (e.g. private browsing) - the banner will just reappear.
  }
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: value }));
}
