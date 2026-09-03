import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";

export default function Vote() {
  const { pollId } = useParams();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

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
      setLoading(false);
    }

    loadPoll();
  }, [pollId]);

  async function submitVote(answer) {
    const { error } = await supabase
      .from("votes")
      .insert([{ poll_id: pollId, answer }]);

    if (error) {
      console.error(error);
      return;
    }

    setSubmitted(true);
  }

  if (loading) return <Layout><p className="text-center p-6">Loading poll…</p></Layout>;

  if (!poll) return <Layout><p className="text-center p-6">Poll not found.</p></Layout>;

  if (submitted)
    return (
      <Layout>
        <div className="text-center p-6">
          <h2 className="text-2xl font-bold mb-4">Thank you for voting!</h2>
          <p className="text-gray-600 mb-6">Your vote has been recorded.</p>

          <a
            href={`/results/${pollId}`}
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded font-semibold"
          >
            View Results
          </a>

          <div className="mt-4">
            <a href="/admin" className="text-blue-600 underline">Back to Admin</a>
          </div>
        </div>
      </Layout>
    );

  return (
    <Layout>
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">{poll.question}</h1>

        <div className="space-y-4">
          {poll.answers.map((answer, index) => (
            <button
              key={index}
              onClick={() => submitVote(answer)}
              className="w-full bg-blue-600 text-white p-3 rounded font-semibold"
            >
              {answer}
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
}
