// The "flock": a set of bird mascots, each associated with one area of the Godwit workspace.
// Used to give admins a friendly, memorable way to discover and learn features, both here
// (the in-app guide) and on the public marketing site (see src/pages/Landing.jsx, which keeps
// its own translated copy for the five customer-facing birds: Redshank, Magpie, Flamingo, Tern,
// and Waxwing). Robin and Owl below are admin-only guide characters, not part of the sales pitch.
//
// `icon` is a simple emoji placeholder. Swap it for a custom illustration (matching the Godwit
// logo style) by rendering an <img> from src/assets/birds/<key>.svg instead once those exist.
//
// `tab` points at an Admin.jsx activeTab key; `route` is used instead when the feature lives on
// its own page (e.g. analytics).

export const FLOCK = [
  {
    key: "robin",
    name: "Robin",
    role: "Your friendly first guide",
    detail: "Walks new workspaces through their first poll, first QR code, and first vote — no manual required.",
    icon: "\ud83d\udc26",
    tab: "overview"
  },
  {
    key: "tern",
    name: "Tern",
    role: "Quick and precise",
    detail: "Keeps every poll light enough for a busy counter or doorway — one scan, one question, one honest answer.",
    icon: "\ud83d\udd4a\ufe0f",
    tab: "polls"
  },
  {
    key: "flamingo",
    name: "Flamingo",
    role: "Puts your best side forward",
    detail: "Shapes what guests see right after they vote: the review invite, the reward, and the thank-you moment.",
    icon: "\ud83e\udda9",
    tab: "connection"
  },
  {
    key: "waxwing",
    name: "Waxwing",
    role: "The premium plumage",
    detail: "Runs QR campaigns, rotations, prize draws, and the extras that keep guests coming back.",
    icon: "\u2728",
    tab: "engagement"
  },
  {
    key: "redshank",
    name: "Redshank",
    role: "Catches trouble early",
    detail: "Routes low-score feedback to a private message before it ever reaches Google, Booking, or Tripadvisor.",
    icon: "\ud83d\udea8",
    tab: "feedback"
  },
  {
    key: "owl",
    name: "Owl",
    role: "Watches over the nest",
    detail: "Keeps an eye on your brand, your team's access, your plan, and the developer API.",
    icon: "\ud83e\udd89",
    tab: "settings"
  },
  {
    key: "magpie",
    name: "Magpie",
    role: "Gathers the scattered nest",
    detail: "Pulls trends from every poll and QR location into one dashboard, so nothing gets missed.",
    icon: "\ud83d\udcca",
    tab: null,
    route: "/admin/analytics"
  }
];

export function flockMemberForTab(tab) {
  return FLOCK.find((bird) => bird.tab === tab) || null;
}
