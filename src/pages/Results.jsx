import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";

export default function Results() {
  const { pollId } = useParams();
  const [poll, setPoll] = useState(null);
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalVotes, setTotalVotes] = useState(0);
  const [votesToday, setVotesToday] = useState(0);

  useEffect(() => {
    async function loadPoll() {
      const { data, error } = await supabase
        .from("polls")
        .select("*")
        .eq("id", pollId)
        .single();

      if (error) {
        console.error(error);
        return;
      }

      setPoll(data);
    }

    async function fetchVotes() {
      const { data, error } = await supabase
        .from("votes")
        .select("*")
        .eq("poll_id", pollId);

      if (error) {
        console.error(error);
        return;
      }

      setVotes(data);
      const total = data.length;
      const today = new Date().toISOString().split("T")[0];
      const todayVotes = data.filter((v) => v.created_at?.startsWith(today)).length;
      setTotalVotes(total);
      setVotesToday(todayVotes);
      setLoading(false);
    }

    loadPoll();
    fetchVotes();

    const interval = setInterval(() => {
      fetchVotes();
    }, 2000);

    return () => clearInterval(interval);
  }, [pollId]);

  if (loading) return <Layout><p className="text-center p-6">Loading results…</p></Layout>;
  if (!poll) return <Layout><p className="text-center p-6">Poll not found.</p></Layout>;
  if (!Array.isArray(poll.answers)) {
    return <Layout><p className="text-center p-6">Error: Poll answers are invalid.</p></Layout>;
  }

  const counts = poll.answers.map((answer) => {
    return votes.filter((v) => v.answer === answer).length;
  });

  return (
    <Layout>
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">{poll.question}</h1>

        <div className="text-center mb-6">
          <h3 className="text-xl font-bold">Live Results</h3>
          <p className="text-gray-600">
            Total votes: <span className="font-semibold">{totalVotes}</span>
          </p>
          <p className="text-gray-600">
            Votes today: <span className="font-semibold">{votesToday}</span>
          </p>
        </div>

        <div className="space-y-4">
          {poll.answers.map((answer, index) => {
            const count = counts[index];
            const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

            return (
              <div key={index} className="border p-4 rounded">
                <div className="flex justify-between font-semibold">
                  <span>{answer}</span>
                  <span>{count} votes</span>
                </div>

                <div className="w-full bg-gray-200 h-3 rounded mt-2">
                  <div
                    className="bg-blue-600 h-3 rounded"
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>

                <p className="text-right text-sm text-gray-600 mt-1">
                  {percent}%
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <a href="/admin" className="text-blue-600 underline">Back to Admin</a>
        </div>
      </div>
    </Layout>
  );
}
