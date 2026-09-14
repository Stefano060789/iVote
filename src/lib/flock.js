// The "flock": a set of bird mascots, each associated with one area of the Godwit workspace.
// Used to give admins a friendly, memorable way to discover and learn features, both here
// (the in-app guide) and on the public marketing site (see src/pages/Landing.jsx, which keeps
// its own translated copy for the five customer-facing birds: Redshank, Magpie, Flamingo, Tern,
// and Waxwing). Robin and Owl below are admin-only guide characters, not part of the sales pitch.
//
// `icon` is an emoji fallback (used only if `image` fails to load or isn't needed at a given
// size). `image` is the real illustrated mark - same gold-gradient, feather-line style as
// src/assets/godwit-mark.svg - imported from src/assets/birds/<key>.svg. Always render it
// through the <FlockAvatar> component (src/components/FlockAvatar.jsx) so every usage stays
// the same proportions (the source SVGs are all a 1024x1024 square).
//
// `tab` points at an Admin.jsx activeTab key; `route` is used instead when the feature lives on
// its own page (e.g. analytics).

import robinImage from "../assets/birds/robin.svg";
import ternImage from "../assets/birds/tern.svg";
import flamingoImage from "../assets/birds/flamingo.svg";
import magpieImage from "../assets/birds/magpie.svg";
import redshankImage from "../assets/birds/redshank.svg";
import owlImage from "../assets/birds/owl.svg";
import waxwingImage from "../assets/birds/waxwing.svg";

export const FLOCK = [
  {
    key: "robin",
    name: "Robin",
    role: "Your friendly first guide",
    detail: "Walks new workspaces through their first poll, first QR code, and first vote — no manual required.",
    icon: "\ud83d\udc26",
    image: robinImage,
    tab: "overview"
  },
  {
    key: "tern",
    name: "Tern",
    role: "Quick and precise",
    detail: "Keeps every poll light enough for a busy counter or doorway — one scan, one question, one honest answer.",
    icon: "\ud83d\udd4a\ufe0f",
    image: ternImage,
    tab: "polls"
  },
  {
    key: "flamingo",
    name: "Flamingo",
    role: "Puts your best side forward",
    detail: "Shapes what guests see right after they vote: the review invite, the reward, and the thank-you moment.",
    icon: "\ud83e\udda9",
    image: flamingoImage,
    tab: "connection"
  },
  {
    key: "magpie",
    name: "Magpie",
    role: "Gathers everything into one nest",
    detail: "Builds each QR code as a menu: one or more polls, an info card, and a donation ask, plus rotations and prize draws.",
    icon: "\u2728",
    image: magpieImage,
    tab: "engagement"
  },
  {
    key: "redshank",
    name: "Redshank",
    role: "Catches trouble early",
    detail: "Routes low-score feedback to a private message before it ever reaches Google, Booking, or Tripadvisor.",
    icon: "\ud83d\udea8",
    image: redshankImage,
    tab: "feedback"
  },
  {
    key: "owl",
    name: "Owl",
    role: "Watches over the nest",
    detail: "Keeps an eye on your brand, your team's access, your plan, and the developer API.",
    icon: "\ud83e\udd89",
    image: owlImage,
    tab: "settings"
  },
  {
    key: "waxwing",
    name: "Waxwing",
    role: "The premium overview",
    detail: "Pulls trends from every poll and QR location into one dashboard, so nothing gets missed.",
    icon: "\ud83d\udcca",
    image: waxwingImage,
    tab: null,
    route: "/admin/analytics"
  }
];

export function flockMemberForTab(tab) {
  return FLOCK.find((bird) => bird.tab === tab) || null;
}
