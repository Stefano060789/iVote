import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { readWorkspaceProfile } from "../lib/workspaceProfile";

export default function NavBar() {
  const [user, setUser] = useState(null);
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
        setWorkspace(readWorkspaceProfile(nextUser.id));
      }
    }

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user || null;
      setUser(nextUser);
      setWorkspace(nextUser?.id ? readWorkspaceProfile(nextUser.id) : {
        companyName: "iVote",
        primaryColor: "#2563eb",
        accentColor: "#0f172a"
      });
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <nav
      className="p-4 flex gap-4 items-center"
      style={{ backgroundColor: workspace.accentColor, color: "white" }}
    >
      <Link to="/" className="font-semibold" style={{ color: "white" }}>
        {workspace.companyName}
      </Link>

      {!user && (
        <>
          <Link to="/register" className="font-semibold" style={{ color: "white" }}>Register</Link>
          <Link to="/login" className="font-semibold" style={{ color: "white" }}>Login</Link>
        </>
      )}

      {user && (
        <>
          <Link to="/admin" className="font-semibold" style={{ color: "white" }}>Admin</Link>
          <button
            onClick={() => supabase.auth.signOut()}
            className="font-semibold"
            style={{ color: "white" }}
          >
            Logout
          </button>
        </>
      )}
    </nav>
  );
}
