import { useState } from "react";
import { Link } from "react-router-dom";
import { getCookieConsent, setCookieConsent } from "../lib/cookieConsent";

// Gates optional, non-essential data flows (currently: Sentry error reporting) behind an
// explicit choice, as required for EU/ePrivacy visitors. Voting itself works the same either
// way - this only affects diagnostics, never the core feedback flow.
export default function CookieConsent() {
  const [choice, setChoice] = useState(() => getCookieConsent());

  if (choice) return null;

  function respond(value) {
    setCookieConsent(value);
    setChoice(value);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-700 bg-slate-950/98 p-4 text-sm text-slate-200 shadow-2xl">
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-slate-300">
          We use optional error-reporting cookies to catch bugs. Voting works the same whether or not you accept them.{" "}
          <Link to="/privacy" className="underline">Learn more</Link>.
        </p>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => respond("declined")} className="rounded border border-slate-600 px-4 py-2 font-semibold text-slate-200">
            Decline
          </button>
          <button onClick={() => respond("accepted")} className="rounded bg-teal-500 px-4 py-2 font-semibold text-slate-950">
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
