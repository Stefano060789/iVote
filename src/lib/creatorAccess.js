export const CREATOR_EMAILS = [
  "bonomistefano@outlook.it",
  "afelix470@gmail.com",
  ...(import.meta.env.VITE_CREATOR_EMAILS || "").split(",")
]
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isCreatorEmail(email) {
  return Boolean(email && CREATOR_EMAILS.includes(email.toLowerCase()));
}
