import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { COOKIE_CONSENT_EVENT, getCookieConsent } from "../lib/cookieConsent";
import { recordWebsiteVisit } from "../lib/websiteVisits";

export default function WebsiteVisitTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    async function record() {
      if (!import.meta.env.PROD) return;
      try {
        await recordWebsiteVisit({
          client: supabase,
          storage: window.sessionStorage,
          pathname,
          consent: getCookieConsent(),
          date: new Date().toISOString().slice(0, 10),
          createId: () => crypto.randomUUID()
        });
      } catch (error) {
        console.error("Website visit tracking failed:", error);
      }
    }
    record();
    window.addEventListener(COOKIE_CONSENT_EVENT, record);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, record);
  }, [pathname]);
  return null;
}
