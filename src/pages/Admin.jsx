import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Admin() {
  const navigate = useNavigate();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPolls() {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(userError);
        setLoading(false);
        return;
      }

      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("polls")
        .select("*")
        .order("id", { ascending: false });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setPolls((data ?? []).filter((poll) => {
        if (!poll?.id) {
          console.error("Poll missing required id:", poll);
          return false;
        }

        return true;
      }));
      setLoading(false);
    }

    loadPolls();
  }, [navigate]);

  async function deletePoll(id) {
    await supabase.from("polls").delete().eq("id", id);
    setPolls(polls.filter(p => p.id !== id));
  }

  function copyQR(id) {
    const url = `${window.location.origin}/vote/${id}`;
    navigator.clipboard.writeText(url);
    alert("QR link copied to clipboard!");
  }

  if (loading) return <p className="text-center p-6">Loading polls…</p>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Admin Dashboard</h1>

      {polls.length === 0 && (
        <p className="text-center text-gray-600">No polls created yet.</p>
      )}

      <div className="space-y-4">
        {polls.map((poll) => (
          <div key={poll.id} className="border p-4 rounded shadow-sm">
            <h2 className="text-xl font-semibold">{poll.question}</h2>

            {poll.expires_at && new Date(poll.expires_at) < new Date() && (
              <span className="inline-block bg-red-600 text-white px-2 py-1 rounded text-sm mb-3">
                Expired
              </span>
            )}

            <p className="text-gray-600 text-sm mb-3">
              Created: {new Date(poll.created_at).toLocaleString()}
            </p>

            <div className="flex gap-3">
              <Link
                to={`/results/${poll.id}`}
                className="bg-blue-600 text-white px-3 py-2 rounded font-semibold"
              >
                View Results
              </Link>

              <Link
                to={`/vote/${poll.id}`}
                className="bg-green-600 text-white px-3 py-2 rounded font-semibold"
              >
                Vote Page
              </Link>

              <Link
                to={`/edit/${poll.id}`}
                className="bg-yellow-500 text-white px-3 py-2 rounded font-semibold"
              >
                Edit
              </Link>

              <button
                onClick={() => copyQR(poll.id)}
                className="bg-gray-700 text-white px-3 py-2 rounded font-semibold"
              >
                Copy QR Link
              </button>

              <button
                onClick={() => deletePoll(poll.id)}
                className="bg-red-600 text-white px-3 py-2 rounded font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

