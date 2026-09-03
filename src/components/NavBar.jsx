import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function NavBar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <nav className="p-4 flex gap-4 bg-gray-100">
      <Link to="/" className="text-blue-600 font-semibold">Home</Link>

      {!user && (
        <Link to="/login" className="text-blue-600 font-semibold">Login</Link>
      )}

      {user && (
        <Link to="/admin" className="text-blue-600 font-semibold">Admin</Link>
      )}
    </nav>
  );
}
