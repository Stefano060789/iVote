// Mirrors the server-side regex enforced in the `capture_voter_lead` and
// `send_organizer_message` Postgres functions (see supabase/*.sql), so a
// voter gets the same answer here as they would from the database - just
// instantly, and with a message they can act on instead of a silent failure.
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function isValidEmail(value) {
  const trimmed = String(value || "").trim();
  return trimmed.length > 0 && trimmed.length <= 320 && EMAIL_PATTERN.test(trimmed);
}

// Structural IBAN check (country code + 2 check digits + up to 30 alphanumeric
// BBAN characters) plus the standard ISO 7064 MOD 97-10 checksum. Mirrors the
// equivalent Postgres function (public.is_valid_iban in
// supabase/20260916_donations.sql) used as a DB-level constraint, so client
// and server never disagree about what counts as a valid IBAN.
const IBAN_STRUCTURE_PATTERN = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/;

export function normalizeIban(value) {
  return String(value || "").replace(/\s+/g, "").toUpperCase();
}

export function isValidIban(value) {
  const cleaned = normalizeIban(value);
  if (!IBAN_STRUCTURE_PATTERN.test(cleaned)) return false;

  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const digits = /[0-9]/.test(char) ? char : String(char.charCodeAt(0) - 55);
    for (const digit of digits) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return remainder === 1;
}

export function formatIbanForDisplay(value) {
  const cleaned = normalizeIban(value);
  return cleaned.replace(/(.{4})/g, "$1 ").trim();
}
