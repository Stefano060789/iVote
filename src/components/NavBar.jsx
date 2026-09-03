import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function NavBar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user: currentUser },
        error
      } = await supabase.auth.getUser();

      if (error) {
        console.error(error);
        return;
      }

      setUser(currentUser);
    }

    loadUser();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(error);
      return;
    }

    navigate("/login");
  }

  return (
    <nav className="bg-brand.dark text-white shadow mb-6">
      <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold tracking-wide">
          iVote
        </Link>

        <div className="space-x-4">
          <Link to="/admin" className="text-gray-700 hover:text-blue-600 font-medium">Admin</Link>
          <Link to="/create" className="text-gray-700 hover:text-blue-600 font-medium">Create Poll</Link>
          {user && (
            <button
              onClick={handleLogout}
              className="text-gray-700 hover:text-blue-600 font-medium"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
