import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";

export default function Vote() {
  const { pollId } = useParams();
  const navigate = useNavigate();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    const alreadyVoted = localStorage.getItem(`voted_${pollId}`);
    if (alreadyVoted) {
      navigate("/thanks");
      return;
    }

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
  }, [navigate, pollId]);

  async function submitVote(answersToSubmit) {
    if (!Array.isArray(answersToSubmit) || answersToSubmit.length === 0) return;

    const {
      data: { user }
    } = await supabase.auth.getUser();

    const rows = answersToSubmit.map((answer) => ({
      poll_id: poll.id,
      answer,
      user_id: user?.id || null
    }));

    const isAdmin = !!user;

    const { error } = await supabase
      .from("votes")
      .insert(rows);

    if (error) {
      console.error(error);
      return;
    }

    if (!isAdmin) {
      localStorage.setItem(`voted_${poll.id}`, "true");
    }

    setSubmitted(true);

    if (isAdmin) {
      navigate("/admin");
    } else {
      navigate("/thanks");
    }
  }

  function toggleAnswer(answer) {
    if (!poll.allow_multiple) {
      setSelected([answer]);
      submitVote([answer]);
      return;
    }

    setSelected((prev) =>
      prev.includes(answer) ? prev.filter((a) => a !== answer) : [...prev, answer]
    );
  }

  if (loading) return <Layout><p className="text-center p-6">Loading poll…</p></Layout>;

  if (!poll) return <Layout><p className="text-center p-6">Poll not found.</p></Layout>;

  if (!Array.isArray(poll.answers)) {
    return <Layout><p className="text-center p-6">Error: Poll answers are invalid.</p></Layout>;
  }

  if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <h1 className="text-3xl font-bold mb-4">This poll has expired</h1>
        <a href="/admin" className="text-blue-600 underline">Back to Admin</a>
      </div>
    );
  }

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
              onClick={() => toggleAnswer(answer)}
              className={`w-full p-3 rounded font-semibold text-left ${
                selected.includes(answer) ? "bg-blue-600 text-white" : "bg-gray-700 text-white"
              }`}
            >
              {answer}
            </button>
          ))}
        </div>

        {poll.allow_multiple && (
          <button
            onClick={() => submitVote(selected)}
            disabled={selected.length === 0}
            className="bg-green-600 text-white p-3 rounded mt-4 w-full disabled:opacity-60"
          >
            Submit Vote
          </button>
        )}
      </div>
    </Layout>
  );
}

