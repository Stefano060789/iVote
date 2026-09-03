import { useState } from "react";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";
import QRCode from "qrcode";

export default function CreatePoll() {
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [pollId, setPollId] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  async function createPoll() {
    if (!question || !answers) return;

    const answersArray = answers.split(",").map((a) => a.trim());

    const { data, error } = await supabase
      .from("polls")
      .insert([{
        question,
        answers: answersArray,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null
      }])
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
          className="w-full p-2 border rounded mb-4"
          placeholder="What do you think about…?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <label className="block mb-2 font-semibold">Answers (comma separated)</label>
        <input
          type="text"
          className="w-full p-2 border rounded mb-4"
          placeholder="Yes, No, Maybe"
          value={answers}
          onChange={(e) => setAnswers(e.target.value)}
        />

        <label className="block mb-2 font-semibold">Expiration Date</label>
        <input
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="w-full border p-2 rounded mb-4"
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
                <p className="text-sm text-gray-600">
                  Scan this QR code to vote.
                </p>
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
