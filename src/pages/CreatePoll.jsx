import { useState } from "react";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";
import QRCode from "qrcode";

export default function CreatePoll() {
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState([""]);
  const [expiresAt, setExpiresAt] = useState("");
  const [pollId, setPollId] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  function updateAnswer(index, value) {
    const newAnswers = [...answers];
    newAnswers[index] = value;

    if (index === answers.length - 1 && value.trim() !== "" && answers.length < 10) {
      newAnswers.push("");
    }

    setAnswers(newAnswers);
  }

  async function createPoll() {
    if (!question.trim()) return;

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

    if (cleanedAnswers.length === 0) return;

    const { data, error } = await supabase
      .from("polls")
      .insert({
        question: question.trim(),
        answers: cleanedAnswers,
        creator_id: user.id,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setPollId(data.id);

    const voteUrl = `${window.location.origin}/vote/${data.id}`;
    const qr = await QRCode.toDataURL(voteUrl);
    setQrCodeUrl(qr);
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">Create a Poll</h1>

        <label className="block mb-2 font-semibold">Question</label>
        <input
          type="text"
          className="w-full border p-2 rounded mb-4 text-black placeholder-black"
          placeholder="What do you think about...?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
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

        <label className="block mb-2 font-semibold">Expiration Date</label>
        <input
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="w-full border p-2 rounded mb-4 text-black placeholder-black"
        />

        <button
          onClick={createPoll}
          className="w-full bg-blue-600 text-white p-3 rounded font-semibold"
        >
          Create Poll
        </button>

        {pollId && (
          <div className="mt-8 text-center">
            <h2 className="text-xl font-bold mb-4">Poll Created!</h2>
            <p className="mb-4">Poll ID: {pollId}</p>

            {qrCodeUrl && (
              <>
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="mx-auto mb-4 border p-2 bg-white"
                />
                <p className="text-sm text-gray-600">Scan this QR code to vote.</p>
              </>
            )}

            <div className="mt-6">
              <a href="/admin" className="text-blue-600 underline">Go to Admin</a>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
