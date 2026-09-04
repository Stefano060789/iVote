import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { savePollMeta, readPollMeta } from "../lib/pollMeta";

export default function EditPoll() {
  const { pollId } = useParams();
  const navigate = useNavigate();

  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState([""]);
  const [locationName, setLocationName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

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

      const pollMeta = readPollMeta(pollId);
      setQuestion(data.question ?? "");
      setLocationName(data.location_name ?? pollMeta.location_name ?? "");
      setStartsAt(data.starts_at ? new Date(data.starts_at).toISOString().slice(0, 16) : pollMeta.starts_at ? new Date(pollMeta.starts_at).toISOString().slice(0, 16) : "");
      setExpiresAt(data.expires_at ? new Date(data.expires_at).toISOString().slice(0, 16) : pollMeta.ends_at ? new Date(pollMeta.ends_at).toISOString().slice(0, 16) : "");

      if (Array.isArray(data.answers) && data.answers.length > 0) {
        const loadedAnswers = data.answers.slice(0, 10);
        if (loadedAnswers.length < 10) loadedAnswers.push("");
        setAnswers(loadedAnswers);
      } else {
        setAnswers([""]);
      }
    }

    loadPoll();
  }, [pollId]);

  function updateAnswer(index, value) {
    const newAnswers = [...answers];
    newAnswers[index] = value;

    if (index === answers.length - 1 && value.trim() !== "" && answers.length < 10) {
      newAnswers.push("");
    }

    setAnswers(newAnswers);
  }

  async function updatePoll() {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(userError || "User not authenticated");
      return;
    }

    const cleanedAnswers = answers
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    if (!question.trim() || cleanedAnswers.length === 0) return;

    const { error } = await supabase
      .from("polls")
      .update({
        question: question.trim(),
        answers: cleanedAnswers
      })
      .eq("id", pollId)
      .eq("creator_id", user.id);

    if (error) {
      console.error(error);
    }

    await savePollMeta(pollId, {
      location_name: locationName.trim() || null,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: expiresAt ? new Date(expiresAt).toISOString() : null
    });

    navigate("/admin");
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Edit Poll</h1>

      <label className="block mb-2 font-semibold">Question</label>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="w-full border p-2 rounded mb-4 text-black"
      />

      <label className="block mb-2 font-semibold">Answers</label>
      <div className="space-y-2 mb-4">
        {answers.map((answer, index) => (
          <input
            key={index}
            type="text"
            value={answer}
            onChange={(e) => updateAnswer(index, e.target.value)}
            className="w-full border p-2 rounded text-black"
            placeholder={`Answer ${index + 1}`}
          />
        ))}
      </div>

      {answers.length >= 10 && (
        <p className="text-red-600 text-sm mb-4">Maximum of 10 answers reached.</p>
      )}

      <label className="block mb-2 font-semibold">QR location name</label>
      <input
       value={locationName}
       onChange={(e) => setLocationName(e.target.value)}
       className="w-full border p-2 rounded mb-4 text-black"
       placeholder="Entrance, Table 1, Bar"
      />

      <label className="block mb-2 font-semibold">Starts at</label>
      <input
       type="datetime-local"
       value={startsAt}
       onChange={(e) => setStartsAt(e.target.value)}
       className="w-full border p-2 rounded mb-4 text-black"
      />

      <label className="block mb-2 font-semibold">Ends at</label>
      <input
       type="datetime-local"
       value={expiresAt}
       onChange={(e) => setExpiresAt(e.target.value)}
       className="w-full border p-2 rounded mb-4 text-black"
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

