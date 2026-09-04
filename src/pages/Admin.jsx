import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { createStableQrUrl } from "../lib/pollLinks";
import { isRestrictedTopic } from "../lib/restrictedContent";

export default function Admin() {
  const navigate = useNavigate();
  const qrRef = useRef(null);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(null);

  async function createShortLink(longUrl) {
    const response = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`
    );
    if (!response.ok) {
      throw new Error(`TinyURL request failed with status ${response.status}`);
    }
    return response.text();
  }

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

    setPolls((data ?? []).filter((poll) => Boolean(poll?.id)));
    setLoading(false);
  }

  useEffect(() => {
    loadPolls();
  }, [navigate]);

  async function deletePoll(id) {
    const { error } = await supabase.from("polls").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert(`Error deleting poll: ${error.message}`);
      return;
    }

    setPolls((prev) => prev.filter((p) => p.id !== id));
    if (showQR === id) setShowQR(null);
  }

  async function buildUniqueDuplicateQuestion(sourceQuestion, excludedPollId = null) {
    const baseQuestion = String(sourceQuestion ?? "").trim();
    if (!baseQuestion) return "";

    let candidate = baseQuestion;
    let counter = 1;

    while (true) {
      const { data, error } = await supabase
        .from("polls")
        .select("id")
        .neq("id", excludedPollId ?? -1)
        .ilike("question", candidate)
        .limit(1);

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return candidate;
      }

      counter += 1;
      candidate = `${baseQuestion} (Copy ${counter})`;
    }
  }

  async function duplicatePoll(poll) {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(userError || "User not authenticated");
      alert("You must be logged in to duplicate a poll.");
      return;
    }

    const sourceQuestion = String(poll.question ?? "").trim();
    if (!sourceQuestion) {
      alert("Cannot duplicate poll without a valid question.");
      return;
    }

    let duplicateQuestion = sourceQuestion;
    if (isRestrictedTopic(duplicateQuestion)) {
      const replacementQuestion = prompt(
        "This poll question is blocked by restricted-topic rules. Enter a new safe question for the duplicate:"
      );

      if (!replacementQuestion || !replacementQuestion.trim()) {
        alert("Duplication canceled: a replacement question is required.");
        return;
      }

      if (isRestrictedTopic(replacementQuestion.trim())) {
        alert("The replacement question still contains restricted content.");
        return;
      }

      duplicateQuestion = replacementQuestion.trim();
    }

    try {
      duplicateQuestion = await buildUniqueDuplicateQuestion(duplicateQuestion, poll.id);
    } catch (buildError) {
      console.error(buildError);
      alert(`Could not generate a unique duplicate title: ${buildError.message}`);
      return;
    }

    const duplicateAnswers = Array.isArray(poll.answers)
      ? poll.answers.map((answer) => String(answer).trim()).filter((answer) => answer.length > 0)
      : [];

    if (duplicateAnswers.length === 0) {
      alert("Cannot duplicate poll because it has no valid answers.");
      return;
    }

    for (const answer of duplicateAnswers) {
      if (isRestrictedTopic(answer)) {
        alert(`Cannot duplicate because answer \"${answer}\" contains restricted content.`);
        return;
      }
    }

    const { data: newPoll, error } = await supabase
      .from("polls")
      .insert({
        question: duplicateQuestion,
        answers: duplicateAnswers,
        expires_at: poll.expires_at,
        multiple_choice: Boolean(poll.multiple_choice),
        allow_user_answers: Boolean(poll.allow_user_answers),
        creator_id: user.id
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      alert(`Error duplicating poll: ${error.message}`);
      return;
    }

    const stableShortUrl = createStableQrUrl();
    const { error: stableError } = await supabase
      .from("polls")
      .update({ stable_short_url: stableShortUrl })
      .eq("id", newPoll.id);

    if (stableError) {
      console.error(stableError);
    }

    const voteUrl = `${window.location.origin}/vote/${newPoll.id}`;
    const shortUrlResult = await createShortLink(voteUrl).catch((shortUrlError) => {
      console.error(shortUrlError);
      return null;
    });

    let shortError = null;
    if (shortUrlResult) {
      const { error: updateShortError } = await supabase
        .from("polls")
        .update({ short_url: shortUrlResult })
        .eq("id", newPoll.id);
      shortError = updateShortError;
      if (shortError) console.error(shortError);
    }

    if (stableError || shortError) {
      const messages = [];
      if (stableError) messages.push(`QR link: ${stableError.message}`);
      if (shortError) messages.push(`Share link: ${shortError.message}`);
      alert(`Poll duplicated, but some updates failed: ${messages.join("; ")}`);
    } else {
      alert("Poll duplicated successfully!");
    }

    await loadPolls();
  }

  async function reuseQR(oldPoll) {
    let sourceStableUrl = oldPoll.stable_short_url;

    if (!sourceStableUrl) {
      sourceStableUrl = createStableQrUrl();
      const { error: createStableError } = await supabase
        .from("polls")
        .update({ stable_short_url: sourceStableUrl })
        .eq("id", oldPoll.id);

      if (createStableError) {
        console.error(createStableError);
        alert(`Failed to prepare reusable QR for this poll: ${createStableError.message}`);
        return;
      }
    }

    const pollList = polls
      .filter((pollItem) => pollItem.id !== oldPoll.id)
      .map((pollItem) => `#${pollItem.id} - ${pollItem.question}`)
      .join("\n");

    const targetInput = prompt(
      `Reuse this QR for another poll.\n\nCurrent QR: ${sourceStableUrl}\n\nChoose a target poll ID from the list below.\n\nAvailable polls:\n${pollList || "No other polls available."}`
    );

    if (!targetInput) return;

    const trimmedTargetId = targetInput.trim();
    if (!trimmedTargetId) return;

    const targetIdNumber = Number(trimmedTargetId);
    if (!Number.isInteger(targetIdNumber)) {
      alert("Please enter a valid poll ID number.");
      return;
    }

    const targetPoll = polls.find(
      (pollItem) => Number(pollItem.id) === targetIdNumber && Number(pollItem.id) !== Number(oldPoll.id)
    );

    if (!targetPoll) {
      alert("Target poll not found. Please choose an existing poll from the list.");
      return;
    }

    const previousTargetQr = targetPoll.stable_short_url ?? null;
    const shouldOverwrite = previousTargetQr && previousTargetQr !== sourceStableUrl
      ? confirm(`Target poll #${targetPoll.id} already has another QR assigned. Reassign it to this QR?`)
      : true;

    if (!shouldOverwrite) {
      alert("QR reassignment canceled.");
      return;
    }

    const { error: clearTargetError } = previousTargetQr && previousTargetQr !== sourceStableUrl
      ? await supabase.from("polls").update({ stable_short_url: null }).eq("id", targetPoll.id)
      : { error: null };

    if (clearTargetError) {
      console.error(clearTargetError);
      alert(`Failed to free the target poll before reassigning the QR: ${clearTargetError.message}`);
      return;
    }

    const { error: assignNewError } = await supabase
      .from("polls")
      .update({ stable_short_url: sourceStableUrl })
      .eq("id", targetPoll.id);

    if (assignNewError) {
      console.error(assignNewError);
      if (previousTargetQr) {
        await supabase
          .from("polls")
          .update({ stable_short_url: previousTargetQr })
          .eq("id", targetPoll.id);
      }
      alert(`Failed to assign reusable QR to the new poll: ${assignNewError.message}`);
      return;
    }

    const { error: clearOldError } = await supabase
      .from("polls")
      .update({ stable_short_url: null })
      .eq("id", oldPoll.id);

    if (clearOldError) {
      console.error(clearOldError);
      await supabase
        .from("polls")
        .update({ stable_short_url: previousTargetQr ?? null })
        .eq("id", targetPoll.id);
      await supabase
        .from("polls")
        .update({ stable_short_url: sourceStableUrl })
        .eq("id", oldPoll.id);
      alert(`QR was moved, but the old poll could not be cleared: ${clearOldError.message}`);
      return;
    }

    await loadPolls();
    alert(`QR successfully reassigned to Poll #${targetPoll.id}!`);
  }

  function copyShareLink(poll) {
    const shareLink = poll.stable_short_url || poll.short_url || `${window.location.origin}/vote/${poll.id}`;
    navigator.clipboard.writeText(shareLink);
  }

  function downloadQR(pollId) {
    const img = qrRef.current;
    if (!img) {
      console.error("QR image is not available for download.");
      return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      console.error("Unable to prepare QR image for download.");
      return;
    }

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);

    const link = document.createElement("a");
    link.download = `poll-${pollId}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function printQR() {
    const img = qrRef.current;
    if (!img) {
      console.error("QR image is not available for printing.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      console.error("Unable to open print window.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head><title>Print QR</title></head>
        <body style="text-align:center; margin-top:50px;">
          <img src="${img.src}" style="width:200px; height:200px;" />
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  if (loading) return <p className="text-center p-6">Loading polls...</p>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Admin Dashboard</h1>

      <div className="flex justify-center mb-6">
        <Link to="/admin/analytics" className="bg-purple-600 text-white px-3 py-2 rounded font-semibold">
          Analytics
        </Link>
      </div>

      {polls.length === 0 && <p className="text-center text-gray-600">No polls created yet.</p>}

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

            <div className="flex gap-3 flex-wrap">
              <Link to={`/results/${poll.id}`} className="bg-blue-600 text-white px-3 py-2 rounded font-semibold">
                View Results
              </Link>

              <Link to={`/vote/${poll.id}`} className="bg-green-600 text-white px-3 py-2 rounded font-semibold">
                Vote Page
              </Link>

              <Link to={`/edit/${poll.id}`} className="bg-yellow-500 text-white px-3 py-2 rounded font-semibold">
                Edit
              </Link>

              <button onClick={() => copyShareLink(poll)} className="bg-gray-700 text-white px-3 py-2 rounded font-semibold">
                Copy Share Link
              </button>

              <button onClick={() => duplicatePoll(poll)} className="bg-yellow-500 text-white px-3 py-2 rounded font-semibold">
                Duplicate
              </button>

              <button onClick={() => reuseQR(poll)} className="bg-purple-600 text-white px-3 py-1 rounded font-semibold">
                Reuse QR for another poll
              </button>

              <button onClick={() => setShowQR(showQR === poll.id ? null : poll.id)} className="bg-yellow-500 text-white px-3 py-2 rounded font-semibold">
                Show QR Code
              </button>

              <button onClick={() => deletePoll(poll.id)} className="bg-red-600 text-white px-3 py-2 rounded font-semibold">
                Delete
              </button>
            </div>

            {showQR === poll.id && (
              <div className="mt-4">
                <img
                  ref={qrRef}
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(poll.stable_short_url || poll.short_url || `${window.location.origin}/vote/${poll.id}`)}`}
                  alt="QR Code"
                  className="mx-auto w-40 h-40"
                />
                {(poll.stable_short_url || poll.short_url) && (
                  <p
                    className="text-blue-400 underline cursor-pointer text-center mt-3"
                    onClick={() => navigator.clipboard.writeText(poll.stable_short_url || poll.short_url)}
                  >
                    {poll.stable_short_url || poll.short_url}
                  </p>
                )}
                <div className="flex gap-3 mt-4 justify-center">
                  <button onClick={() => downloadQR(poll.id)} className="bg-blue-600 text-white px-4 py-2 rounded font-semibold">
                    Download QR
                  </button>

                  <button onClick={printQR} className="bg-green-600 text-white px-4 py-2 rounded font-semibold">
                    Print QR
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
