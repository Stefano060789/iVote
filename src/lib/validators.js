// Mirrors the server-side regex enforced in the `capture_voter_lead` and
// `send_organizer_message` Postgres functions (see supabase/*.sql), so a
// voter gets the same answer here as they would from the database - just
// instantly, and with a message they can act on instead of a silent failure.
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function isValidEmail(value) {
  const trimmed = String(value || "").trim();
  return trimmed.length > 0 && trimmed.length <= 320 && EMAIL_PATTERN.test(trimmed);
}
