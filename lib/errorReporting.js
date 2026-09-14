import * as Sentry from "@sentry/node";

// Server-side companion to src/main.jsx's client-side Sentry.init(): before this, only
// browser/React errors were ever reported anywhere - a Stripe webhook failure, a cron job
// throwing, or an AI classification error would only ever show up in Vercel's function logs
// (easy to miss) with nothing routed to Sentry. Uses its own SENTRY_DSN (a separate Sentry
// project from the client's VITE_SENTRY_DSN, so frontend/backend issues don't mix in one
// feed) and is a safe no-op if that env var isn't set, so every api/*.js file can import this
// unconditionally.
let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "production",
    sendDefaultPii: false
  });
}

// Drop-in replacement for the `console.error(label, error)` calls already used throughout
// api/*.js and lib/cron/*.js: still logs to the function's console (visible in Vercel logs
// either way) and additionally reports to Sentry once SENTRY_DSN is configured. Also accepts
// a single-argument call (`captureError("message")`) for the handful of call sites that log
// a plain string rather than an Error object.
export function captureError(label, detail) {
  if (detail !== undefined) console.error(label, detail);
  else console.error(label);

  ensureInitialized();
  if (!process.env.SENTRY_DSN) return;

  try {
    const error = detail instanceof Error ? detail : new Error(label);
    Sentry.captureException(error, { extra: { label, detail: detail instanceof Error ? undefined : detail } });
  } catch {
    // Error reporting itself must never break the request it's reporting on behalf of.
  }
}
