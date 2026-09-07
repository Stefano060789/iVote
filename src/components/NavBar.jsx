import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { loadWorkspaceProfile } from "../lib/workspaceProfile";

export default function NavBar() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [workspace, setWorkspace] = useState({
    companyName: "iVote",
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
        setWorkspace({ companyName: "iVote", primaryColor: "#2563eb", accentColor: "#0f172a" });
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
    <nav className="site-nav" style={{ backgroundColor: workspace.accentColor, color: "white" }}>
      <div className="site-nav-bar">
        <Link to="/" onClick={closeMenu} className="site-nav-brand">
          {workspace.companyName}
        </Link>
        <div className="site-nav-actions">
          {user && <Link to="/create" onClick={closeMenu} className="site-nav-primary">Create poll</Link>}
          {user && (
            <Link
              to="/admin"
              onClick={closeMenu}
              className={`site-nav-dashboard ${location.pathname === "/admin" ? "is-active" : ""}`}
              aria-current={location.pathname === "/admin" ? "page" : undefined}
            >
              Dashboard
            </Link>
          )}
          {!user && <Link to="/register" onClick={closeMenu} className="site-nav-primary">Create workspace</Link>}
          <button
            type="button"
            className="site-nav-toggle"
            aria-expanded={menuOpen}
            aria-controls="site-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            Menu
          </button>
        </div>
      </div>

      <div id="site-navigation" className={`site-nav-links ${menuOpen ? "is-open" : ""}`}>
        <Link to="/support" onClick={closeMenu}>Support</Link>
        {!user && <>
          <Link to="/login" onClick={closeMenu}>Sign in</Link>
        </>}
        {user && <>
          {installPrompt && <button type="button" onClick={installApp}>Install iVote</button>}
          <Link to="/admin/billing" onClick={closeMenu}>Billing</Link>
          <Link to="/admin/moderation" onClick={closeMenu}>Moderation</Link>
          <Link to="/account" onClick={closeMenu}>Account</Link>
          <button type="button" onClick={signOut}>Sign out</button>
        </>}
      </div>
    </nav>
  );
}
