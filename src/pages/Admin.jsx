import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { createStableQrUrl } from "../lib/pollLinks";
import { isRestrictedTopic } from "../lib/restrictedContent";
import { appendAuditLog, readAuditLog, readPollMeta, savePollMeta, isPollClosed } from "../lib/pollMeta";

export default function Admin() {
  const navigate = useNavigate();
  const qrRef = useRef(null);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(null);
  const [reuseQrPoll, setReuseQrPoll] = useState(null);
  const [reuseQrTargetId, setReuseQrTargetId] = useState("");
  const [auditLog, setAuditLog] = useState([]);

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
    setAuditLog(readAuditLog());

    const interval = setInterval(() => {
      loadPolls();
      setAuditLog(readAuditLog());
    }, 5000);

    return () => clearInterval(interval);
  }, [navigate]);

  async function deletePoll(id) {
    const { error } = await supabase.from("polls").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert(`Error deleting poll: ${error.message}`);
      return;
    }

    appendAuditLog("delete_poll", { poll_id: id });
    setAuditLog(readAuditLog());
    setPolls((prev) => prev.filter((p) => p.id !== id));
    if (showQR === id) setShowQR(null);
  }

  async function closePoll(poll) {
    const status = isPollClosed(poll) ? "active" : "closed";
    const closedAt = status === "closed" ? new Date().toISOString() : null;

    await savePollMeta(poll.id, {
      status,
      closed_at: closedAt
    });

    appendAuditLog(status === "closed" ? "close_poll" : "reopen_poll", { poll_id: poll.id, question: poll.question });
    setAuditLog(readAuditLog());
    await loadPolls();
    alert(status === "closed" ? "Poll closed." : "Poll reopened.");
  }

  async function exportPollCsv(poll) {
    const { data: voteRows, error } = await supabase
      .from("votes")
      .select("*")
      .eq("poll_id", poll.id);

    if (error) {
      console.error(error);
      alert(`Unable to export results: ${error.message}`);
      return;
    }

    const rows = [
      ["poll_id", "question", "answer", "user_id", "created_at"],
      ...(voteRows ?? []).map((row) => [
        String(poll.id),
        String(poll.question ?? ""),
        String(row.answer ?? ""),
        String(row.user_id ?? ""),
        String(row.created_at ?? "")
      ])
    ];

    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `poll-${poll.id}-results.csv`;
    link.click();
    URL.revokeObjectURL(url);
    appendAuditLog("export_csv", { poll_id: poll.id });
    setAuditLog(readAuditLog());
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
        .neq("id", excludedPollId ?? "")
        .eq("question", candidate)
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

  function buildDuplicateQuestionCandidate(baseQuestion, attempt) {
    if (attempt <= 1) {
      return `${baseQuestion} (Copy)`;
    }
    return `${baseQuestion} (Copy ${attempt})`;
  }

  function isQuestionUniqueViolation(error) {
    const message = String(error?.message ?? "");
    return error?.code === "23505" && message.includes("polls_question_key");
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

    let newPoll = null;
    let insertError = null;
    const baseQuestion = duplicateQuestion;
    let candidateQuestion = duplicateQuestion;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const { data, error } = await supabase
        .from("polls")
        .insert({
          question: candidateQuestion,
          answers: duplicateAnswers,
          expires_at: poll.expires_at,
          multiple_choice: Boolean(poll.multiple_choice),
          allow_user_answers: Boolean(poll.allow_user_answers),
          creator_id: user.id
        })
        .select()
        .single();

      if (!error) {
        newPoll = data;
        break;
      }

      if (isQuestionUniqueViolation(error)) {
        candidateQuestion = buildDuplicateQuestionCandidate(baseQuestion, attempt + 1);
        insertError = error;
        continue;
      }

      insertError = error;
      break;
    }

    if (!newPoll) {
      console.error(insertError);
      alert(`Error duplicating poll: ${insertError?.message ?? "Unknown error"}`);
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
      appendAuditLog("duplicate_poll", { original_poll_id: poll.id, duplicate_poll_id: newPoll.id, question: duplicateQuestion });
      setAuditLog(readAuditLog());
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

    const candidatePolls = polls.filter((pollItem) => String(pollItem.id) !== String(oldPoll.id));
    if (candidatePolls.length === 0) {
      alert("No other polls available to receive this QR.");
      return;
    }

    setReuseQrPoll({ ...oldPoll, stable_short_url: sourceStableUrl });
    setReuseQrTargetId(String(candidatePolls[0].id));
  }

  async function confirmReuseQR() {
    if (!reuseQrPoll) return;

    const targetPoll = polls.find(
      (pollItem) => String(pollItem.id) === String(reuseQrTargetId) && String(pollItem.id) !== String(reuseQrPoll.id)
    );

    if (!targetPoll) {
      alert("Please choose a valid target poll.");
      return;
    }

    const sourceStableUrl = reuseQrPoll.stable_short_url || createStableQrUrl();
    const previousTargetQr = targetPoll.stable_short_url ?? null;
    const shouldOverwrite = previousTargetQr && previousTargetQr !== sourceStableUrl
      ? window.confirm(`Target poll #${targetPoll.id} already has another QR assigned. Reassign it to this QR?`)
      : true;

    if (!shouldOverwrite) {
      alert("QR reassignment canceled.");
      return;
    }

    if (previousTargetQr && previousTargetQr !== sourceStableUrl) {
      const { error: clearTargetError } = await supabase
        .from("polls")
        .update({ stable_short_url: null })
        .eq("id", targetPoll.id);

      if (clearTargetError) {
        console.error(clearTargetError);
        alert(`Failed to free the target poll before reassigning the QR: ${clearTargetError.message}`);
        return;
      }
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
      .eq("id", reuseQrPoll.id);

    if (clearOldError) {
      console.error(clearOldError);
      await supabase
        .from("polls")
        .update({ stable_short_url: previousTargetQr ?? null })
        .eq("id", targetPoll.id);
      alert(`QR was moved, but the old poll could not be cleared: ${clearOldError.message}`);
      return;
    }

    appendAuditLog("reuse_qr", { source_poll_id: reuseQrPoll.id, target_poll_id: targetPoll.id, qr_url: sourceStableUrl });
    setAuditLog(readAuditLog());
    setReuseQrPoll(null);
    setReuseQrTargetId("");
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

  const auditEntries = auditLog.slice(0, 5);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Admin Dashboard</h1>

      <div className="flex justify-center mb-6">
        <Link to="/admin/analytics" className="bg-purple-600 text-white px-3 py-2 rounded font-semibold">
          Analytics
        </Link>
      </div>

      <div className="mb-6 border rounded p-4 bg-gray-900">
        <h2 className="text-xl font-bold mb-3">Recent audit log</h2>
        <div className="space-y-2 text-sm">
          {auditEntries.length === 0 ? (
            <p className="text-gray-400">No activity yet.</p>
          ) : (
            auditEntries.map((entry) => (
              <div key={entry.id} className="border-b border-gray-700 pb-2 last:border-b-0 last:pb-0">
                <p className="font-semibold text-blue-300">{entry.action}</p>
                <p className="text-gray-400">{new Date(entry.created_at).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {polls.length === 0 && <p className="text-center text-gray-600">No polls created yet.</p>}

      <div className="space-y-4">
        {polls.map((poll) => {
          const pollMeta = readPollMeta(poll.id);
          const isClosed = isPollClosed(poll) || pollMeta.status === "closed";
          const locationName = poll.location_name ?? pollMeta.location_name;
          const startsAt = poll.starts_at ?? pollMeta.starts_at;
          const endsAt = poll.expires_at ?? pollMeta.ends_at;

          return (
          <div key={poll.id} className="border p-4 rounded shadow-sm">
            <h2 className="text-xl font-semibold">{poll.question}</h2>

            {isClosed && (
              <span className="inline-block bg-red-600 text-white px-2 py-1 rounded text-sm mb-3">
                Closed
              </span>
            )}

            {locationName && (
              <p className="text-gray-300 text-sm mb-1">Location: {locationName}</p>
            )}

            {startsAt && (
              <p className="text-gray-300 text-sm mb-1">Starts: {new Date(startsAt).toLocaleString()}</p>
            )}

            {endsAt && (
              <p className="text-gray-300 text-sm mb-1">Ends: {new Date(endsAt).toLocaleString()}</p>
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

              <button onClick={() => closePoll(poll)} className="bg-orange-600 text-white px-3 py-2 rounded font-semibold">
                {isClosed ? "Reopen Poll" : "Close Poll"}
              </button>

              <button onClick={() => exportPollCsv(poll)} className="bg-teal-600 text-white px-3 py-2 rounded font-semibold">
                Export CSV
              </button>

              <button onClick={() => deletePoll(poll.id)} className="bg-red-600 text-white px-3 py-2 rounded font-semibold">
                Delete
              </button>
            </div>

            {reuseQrPoll && String(reuseQrPoll.id) === String(poll.id) && (
              <div className="mt-4 border border-purple-400 rounded p-3 bg-gray-900">
                <p className="mb-2 font-semibold">Reuse QR from Poll #{reuseQrPoll.id}</p>
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <select
                    value={reuseQrTargetId}
                    onChange={(event) => setReuseQrTargetId(event.target.value)}
                    className="text-black rounded p-2 min-w-[220px]"
                  >
                    {polls
                      .filter((pollItem) => String(pollItem.id) !== String(poll.id))
                      .map((pollItem) => (
                        <option key={pollItem.id} value={String(pollItem.id)}>
                          #{pollItem.id} - {pollItem.question}
                        </option>
                      ))}
                  </select>
                  <button onClick={confirmReuseQR} className="bg-purple-600 text-white px-3 py-2 rounded font-semibold">
                    Assign QR
                  </button>
                  <button
                    onClick={() => {
                      setReuseQrPoll(null);
                      setReuseQrTargetId("");
                    }}
                    className="bg-gray-700 text-white px-3 py-2 rounded font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

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
         );
       })}
     </div>
   </div>
 );
}
