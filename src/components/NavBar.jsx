import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { loadWorkspaceProfile } from "../lib/workspaceProfile";
import godwitMark from "../assets/godwit-mark.svg";
import LanguageSwitcher from "./LanguageSwitcher";

export default function NavBar() {
  const location = useLocation();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [workspace, setWorkspace] = useState({
    companyName: "Godwit",
    primaryColor: "#2563eb",
    accentColor: "#0f172a"
  });

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      const nextUser = data.user;
      setUser(nextUser);

      if (nextUser?.id) {
        try {
          setWorkspace(await loadWorkspaceProfile());
        } catch (error) {
          console.error(error);
        }
      }
    }

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user || null;
      setUser(nextUser);
      if (nextUser?.id) {
        loadWorkspaceProfile().then(setWorkspace).catch(console.error);
      } else {
        setWorkspace({ companyName: "Godwit", primaryColor: "#2563eb", accentColor: "#0f172a" });
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function saveInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }

    function clearInstallPrompt() {
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", saveInstallPrompt);
    window.addEventListener("appinstalled", clearInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", saveInstallPrompt);
      window.removeEventListener("appinstalled", clearInstallPrompt);
    };
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    closeMenu();
  }

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    closeMenu();
  }

  return (
    <nav className="site-nav">
      <div className="site-nav-bar">
        <Link to="/" onClick={closeMenu} className="site-nav-brand">
          <img src={godwitMark} alt="" className="site-nav-brand-mark" width="28" height="28" />
          <span>{workspace.companyName}</span>
        </Link>
        <div className="site-nav-actions">
          {user && <Link to="/create" onClick={closeMenu} className="site-nav-primary">{t("nav.createPoll")}</Link>}
          {user && (
            <Link
              to="/admin"
              onClick={closeMenu}
              className={`site-nav-dashboard ${location.pathname === "/admin" ? "is-active" : ""}`}
              aria-current={location.pathname === "/admin" ? "page" : undefined}
            >
              {t("nav.dashboard")}
            </Link>
          )}          {!user && <Link to="/register" onClick={closeMenu} className="site-nav-primary">{t("nav.getStarted")}</Link>}
          <LanguageSwitcher className="site-nav-lang" />
          <button
            type="button"
            className="site-nav-toggle"
            aria-expanded={menuOpen}
            aria-controls="site-navigation"
            aria-label={t("nav.menu")}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg viewBox="0 0 20 16" width="18" height="14" aria-hidden="true">
              <rect width="20" height="2" rx="1" fill="currentColor" />
              <rect y="7" width="20" height="2" rx="1" fill="currentColor" />
              <rect y="14" width="20" height="2" rx="1" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>

      <div id="site-navigation" className={`site-nav-links ${menuOpen ? "is-open" : ""}`}>
        <Link to="/essentials" onClick={closeMenu}>{t("nav.quickStart")}</Link>
        <Link to="/support" onClick={closeMenu}>{t("nav.support")}</Link>
        {!user && <>
          <Link to="/login" onClick={closeMenu}>{t("nav.signIn")}</Link>
        </>}
        {user && <>
          {installPrompt && <button type="button" onClick={installApp}>{t("nav.install")}</button>}
          <Link to="/admin/billing" onClick={closeMenu}>{t("nav.billing")}</Link>
          <Link to="/admin/moderation" onClick={closeMenu}>{t("nav.moderation")}</Link>
          <Link to="/feedback" onClick={closeMenu}>{t("nav.shareFeedback")}</Link>
          <Link to="/account" onClick={closeMenu}>{t("nav.account")}</Link>
          <button type="button" onClick={signOut}>{t("nav.signOut")}</button>
        </>}
      </div>
    </nav>
  );
}
