import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { loadWorkspaceProfile } from "../lib/workspaceProfile";

export default function NavBar() {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
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

  function closeMenu() {
    setMenuOpen(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
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
          <Link to="/admin" onClick={closeMenu}>Admin dashboard</Link>
          <Link to="/admin/billing" onClick={closeMenu}>Billing</Link>
          <Link to="/admin/moderation" onClick={closeMenu}>Moderation</Link>
          <Link to="/account" onClick={closeMenu}>Account</Link>
          <button type="button" onClick={signOut}>Sign out</button>
        </>}
      </div>
    </nav>
  );
}
