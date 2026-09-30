export const CREATOR_EMAILS = (import.meta.env.VITE_CREATOR_EMAILS || "bonomistefano@outlook.it")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isCreatorEmail(email) {
  return Boolean(email && CREATOR_EMAILS.includes(email.toLowerCase()));
}
