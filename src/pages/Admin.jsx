import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";

export default function Admin() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPolls() {
      const { data, error } = await supabase
        .from("polls")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }

      setPolls(data);
      setLoading(false);
    }

    loadPolls();
  }, []);

  async function deletePoll(id) {
    await supabase.from("polls").delete().eq("id", id);
    setPolls(polls.filter((p) => p.id !== id));
  }

  function copyQR(id) {
    const url = `${window.location.origin}/vote/${id}`;
    navigator.clipboard.writeText(url);
    alert("QR link copied to clipboard!");
  }

  if (loading) return <Layout><p className="text-center p-6">Loading polls…</p></Layout>;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">Admin Dashboard</h1>

        {polls.length === 0 && (
          <p className="text-center text-gray-600">No polls created yet.</p>
        )}

        <div className="space-y-4">
          {polls.map((poll) => (
            <div key={poll.id} className="border p-4 rounded shadow-sm">
              <h2 className="text-xl font-semibold">{poll.question}</h2>
              <p className="text-gray-600 text-sm mb-3">
                Created: {new Date(poll.created_at).toLocaleString()}
              </p>

              <div className="flex gap-3">
                <a
                  href={`/results/${poll.id}`}
                  className="bg-blue-600 text-white px-3 py-2 rounded font-semibold"
                >
                  View Results
                </a>

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
    </Layout>
  );
}
