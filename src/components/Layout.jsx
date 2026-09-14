import CookieConsent from "./CookieConsent";

// `theme="app"` (default) is the neutral teal/cream style used for voter-facing pages (Vote,
// Results, Thank You, Unsubscribe...). `theme="workspace"` switches to the same navy/gold
// brand palette as the main Admin dashboard, for every other page a logged-in venue owner uses
// (Create/Edit poll, Billing, Account, Essentials guide, Moderation, product feedback) so the
// whole logged-in experience reads as one coherent product instead of two different-looking apps.
export default function Layout({ children, theme = "app" }) {
  return (
    <main className={`${theme === "workspace" ? "workspace-page" : "app-page"} max-w-3xl mx-auto px-4 py-6`}>
      {children}
      <CookieConsent />
    </main>
  );
}
