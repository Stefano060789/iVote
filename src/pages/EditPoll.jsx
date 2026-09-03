import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function EditPoll() {
  const { pollId } = useParams();
  const navigate = useNavigate();

  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState("");

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

      setQuestion(data.question);
      setAnswers(data.answers);
    }

    loadPoll();
  }, [pollId]);

  async function updatePoll() {
    const answersArray = answers
      .split(",")
      .map((answer) => answer.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from("polls")
      .update({
        question,
        answers: answersArray
      })
      .eq("id", pollId);

    if (error) {
      console.error(error);
      return;
    }

    navigate("/admin");
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Edit Poll</h1>

      <label className="block mb-2 font-semibold">Question</label>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="w-full border p-2 rounded mb-4"
      />

      <label className="block mb-2 font-semibold">Answers (comma separated)</label>
      <input
        value={answers}
        onChange={(e) => setAnswers(e.target.value)}
        className="w-full border p-2 rounded mb-4"
      />

      <button
        onClick={updatePoll}
        className="bg-blue-600 text-white px-4 py-2 rounded font-semibold"
      >
        Save Changes
      </button>
    </div>
  );
}
