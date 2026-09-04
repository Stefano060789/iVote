import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";
import { isRestrictedTopic } from "../lib/restrictedContent";
import { readPollMeta, isPollClosed } from "../lib/pollMeta";

export default function Vote() {
  const { pollId } = useParams();
  const navigate = useNavigate();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [duplicate, setDuplicate] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [newAnswer, setNewAnswer] = useState("");
  const [userAnswers, setUserAnswers] = useState([]);

  const pollMeta = poll ? readPollMeta(poll.id) : {};
  const alreadyVoted = localStorage.getItem(`voted_${pollId}`);

  async function loadUserAnswers(targetPollId = pollId) {
    const { data, error } = await supabase
      .from("user_answers")
      .select("answer")
      .eq("poll_id", targetPollId);

    if (error) {
      console.error(error);
      return;
    }

    setUserAnswers((data ?? []).filter((row) => typeof row.answer === "string" && row.answer.trim()));
  }

  useEffect(() => {
    async function loadPoll() {
      const { data, error } = await supabase
        .from("polls")
        .select("*")
        .eq("id", pollId)
        .single();

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setPoll(data);
      await loadUserAnswers(pollId);
      setLoading(false);
    }

    loadPoll();
  }, [pollId]);

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
      if (error.code === "23505") {
        setDuplicate(true);
        return;
      }

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

  function handleSelect(answer) {
    const isMultipleChoice = Boolean(poll.multiple_choice ?? poll.allow_multiple);
    if (isMultipleChoice) {
      setSelectedAnswers((prev) =>
        prev.includes(answer) ? prev.filter((a) => a !== answer) : [...prev, answer]
      );
      return;
    }

    setSelectedAnswers([answer]);
  }

  async function submitNewAnswer() {
    const trimmed = newAnswer.trim();
    if (!trimmed) return;

    if (isRestrictedTopic(trimmed)) {
      alert("This answer contains political, religious, or sexual content.");
      return;
    }

    const { error } = await supabase
      .from("user_answers")
      .insert({
        poll_id: poll.id,
        answer: trimmed
      });

    if (error) {
      console.error(error);
      alert("Error saving answer");
      return;
    }

    setNewAnswer("");
    setShowAddField(false);
    await loadUserAnswers(poll.id);
  }

  if (loading) return <Layout><p className="text-center p-6">Loading poll...</p></Layout>;

  if (duplicate || alreadyVoted) {
    return (
      <Layout>
        <div className="text-center p-6">
          <h2 className="text-2xl font-bold mb-4">You already voted</h2>
          <p className="text-gray-600 mb-6">
            Thank you! Your vote has already been recorded.
          </p>
        </div>
      </Layout>
    );
  }

  if (!poll) return <Layout><p className="text-center p-6">Poll not found.</p></Layout>;

  if (!Array.isArray(poll.answers)) {
    return <Layout><p className="text-center p-6">Error: Poll answers are invalid.</p></Layout>;
  }

  const startsAt = poll.starts_at ?? pollMeta.starts_at;
  const endsAt = poll.expires_at ?? pollMeta.ends_at;
  const isExpired = Boolean(endsAt && new Date(endsAt) < new Date()) || isPollClosed(poll);
  const isNotStarted = Boolean(startsAt && new Date(startsAt) > new Date());

  if (isNotStarted) {
    return (
      <Layout>
        <div className="text-center p-6">
          <h2 className="text-2xl font-bold mb-4">This poll is not open yet</h2>
          <p className="text-gray-600 mb-6">
            Voting opens at {new Date(startsAt).toLocaleString()}.
          </p>
        </div>
      </Layout>
    );
  }

  if (isExpired) {
    return (
      <Layout>
        <div className="text-center p-6">
          <h2 className="text-2xl font-bold mb-4">This poll has expired</h2>
          <p className="text-gray-600 mb-6">
            Voting is no longer possible.
          </p>
        </div>
      </Layout>
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

  const allAnswers = Array.from(
    new Set([
      ...poll.answers,
      ...userAnswers.map((u) => u.answer)
    ])
  );

  return (
    <Layout>
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">{poll.question}</h1>
        <p className="text-gray-500 text-sm mb-4">
          {poll.multiple_choice ? "Multiple-choice poll" : "Single-choice poll"}
        </p>

        <div className="space-y-4">
          {allAnswers.map((answer) => (
            <label key={answer} className="flex items-center gap-2">
              <input
                type={(poll.multiple_choice ?? poll.allow_multiple) ? "checkbox" : "radio"}
                checked={selectedAnswers.includes(answer)}
                onChange={() => handleSelect(answer)}
              />
              {answer}
            </label>
          ))}
        </div>

        {poll.allow_user_answers && (
          <div className="mt-4">
            {!showAddField && (
              <button
                onClick={() => setShowAddField(true)}
                className="bg-gray-200 px-3 py-2 rounded"
              >
                Add your own answer
              </button>
            )}

            {showAddField && (
              <div className="mt-3">
                <input
                  type="text"
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  className="border p-2 rounded w-full text-black"
                  placeholder="Type your answer..."
                />

                <button
                  onClick={submitNewAnswer}
                  className="bg-blue-600 text-white px-3 py-2 rounded mt-2"
                >
                  Submit answer
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => submitVote(selectedAnswers)}
          disabled={selectedAnswers.length === 0}
          className="bg-green-600 text-white p-3 rounded mt-4 w-full disabled:opacity-60"
        >
          Submit Vote
        </button>
      </div>
    </Layout>
  );
}
