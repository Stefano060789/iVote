import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { createStableQrUrl } from "../lib/pollLinks";
import { isRestrictedTopic } from "../lib/restrictedContent";
import { appendAuditLog, readAuditLog, readPollMeta, savePollMeta, isPollClosed } from "../lib/pollMeta";
import { buildQrToken, deleteQrLocation, loadQrLocations, saveQrLocation } from "../lib/qrLocations";
import {
  getCurrentUserRole,
  getPermissionSet,
  readWorkspaceMembers,
  readWorkspaceProfile,
  removeWorkspaceMember,
  saveWorkspaceMember,
  saveWorkspaceProfile
} from "../lib/workspaceProfile";

export default function Admin() {
  const navigate = useNavigate();
  const qrRef = useRef(null);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(null);
  const [reuseQrPoll, setReuseQrPoll] = useState(null);
  const [reuseQrTargetId, setReuseQrTargetId] = useState("");
  const [auditLog, setAuditLog] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [qrLocations, setQrLocations] = useState([]);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationToken, setNewLocationToken] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedPollForLocation, setSelectedPollForLocation] = useState("");
  const [analytics, setAnalytics] = useState({ total: 0, active: 0, closed: 0, scheduled: 0, withLocation: 0 });
  const [workspaceProfile, setWorkspaceProfile] = useState({
    companyName: "iVote",
    logoUrl: "",
    primaryColor: "#2563eb",
    accentColor: "#0f172a",
    role: "owner"
  });
  const [workspaceUserId, setWorkspaceUserId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState("viewer");
  const [teamMembers, setTeamMembers] = useState([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("viewer");

  async function createShortLink(longUrl) {
    const response = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`
    );
    if (!response.ok) {
      throw new Error(`TinyURL request failed with status ${response.status}`);
    }
    return response.text();
  }

  function getPollStatusInfo(poll) {
    const meta = readPollMeta(poll.id);
    const startsAt = poll.starts_at ?? meta.starts_at;
    const endsAt = poll.expires_at ?? meta.ends_at;

    if (poll.status === "closed" || meta.status === "closed" || poll.closed_at || meta.closed_at) {
      return "closed";
    }

    if (startsAt && new Date(startsAt) > new Date()) {
      return "scheduled";
    }

    if (endsAt && new Date(endsAt) < new Date()) {
      return "expired";
    }

    return "active";
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

    const normalizedPolls = (data ?? []).filter((poll) => Boolean(poll?.id));
    setPolls(normalizedPolls);

    const nextAnalytics = { total: normalizedPolls.length, active: 0, closed: 0, scheduled: 0, withLocation: 0 };
    normalizedPolls.forEach((poll) => {
      const meta = readPollMeta(poll.id);
      const status = getPollStatusInfo(poll);
      const locationName = poll.location_name ?? meta.location_name;

      if (status === "active") nextAnalytics.active += 1;
      if (status === "closed") nextAnalytics.closed += 1;
      if (status === "scheduled") nextAnalytics.scheduled += 1;
      if (locationName) nextAnalytics.withLocation += 1;
    });
    setAnalytics(nextAnalytics);
    setLoading(false);
  }

  useEffect(() => {
    async function loadWorkspaceProfileState() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return;
        setWorkspaceUserId(user.id);
        const role = await getCurrentUserRole(user.id);
        setCurrentUserRole(role);
        setWorkspaceProfile({ ...readWorkspaceProfile(user.id), role });
        setTeamMembers(await readWorkspaceMembers());
        const nextLocations = await loadQrLocations();
        setQrLocations(nextLocations);
      } catch (error) {
        console.error(error);
        alert(error.message || "Unable to load workspace role data.");
      }
    }

    loadPolls();
    loadWorkspaceProfileState();
    setAuditLog(readAuditLog());

    const interval = setInterval(() => {
      loadPolls();
      setAuditLog(readAuditLog());
    }, 5000);

    return () => clearInterval(interval);
  }, [navigate]);

  async function saveWorkspaceSettings() {
    if (!workspaceUserId) return;
    const nextProfile = saveWorkspaceProfile(workspaceUserId, workspaceProfile);
    setWorkspaceProfile(nextProfile);
    alert("Workspace settings saved.");
  }

  async function handleCreateLocation() {
    const name = newLocationName.trim();
    if (!name) {
      alert("Add a QR location name first.");
      return;
    }

    const nextLocation = await saveQrLocation({
      name,
      token: newLocationToken.trim() || buildQrToken(),
      current_poll_id: null
    });

    setQrLocations((current) => [nextLocation, ...current.filter((item) => String(item.id) !== String(nextLocation.id))]);
    setNewLocationName("");
    setNewLocationToken("");
  }

  async function handleDeleteLocation(locationId) {
    const location = qrLocations.find((item) => String(item.id) === String(locationId));
    if (!location) return;

    const confirmed = window.confirm(`Delete QR location "${location.name}"?`);
    if (!confirmed) return;

    await deleteQrLocation(locationId);
    setQrLocations((current) => current.filter((item) => String(item.id) !== String(locationId)));
  }

  async function assignLocationToPoll() {
    const location = qrLocations.find((item) => String(item.id) === String(selectedLocationId));
    const poll = polls.find((item) => String(item.id) === String(selectedPollForLocation));

    if (!location || !poll) {
      alert("Select both a location and a poll.");
      return;
    }

    try {
      const { error } = await supabase
        .from("polls")
        .update({
          location_name: location.name,
          location_token: location.token
        })
        .eq("id", poll.id);

      if (error) {
        console.warn("Could not sync location to Supabase, using local metadata fallback.", error);
      }
    } catch (error) {
      console.warn("Could not sync location to Supabase, using local metadata fallback.", error);
    }

    const nextLocation = { ...location, current_poll_id: poll.id };
    await saveQrLocation(nextLocation);
    await savePollMeta(poll.id, {
      location_name: location.name,
      location_token: location.token
    });

    appendAuditLog("assign_qr_location", { poll_id: poll.id, location_name: location.name, location_token: location.token });
    setAuditLog(readAuditLog());
    setSelectedLocationId("");
    setSelectedPollForLocation("");
    setQrLocations(await loadQrLocations());
    await loadPolls();
    alert(`Assigned location "${location.name}" to poll #${poll.id}.`);
  }

  async function addTeamMember() {
    if (!newMemberName.trim()) {
      alert("Add a team member name first.");
      return;
    }

    try {
      const nextMembers = await saveWorkspaceMember({
        name: newMemberName.trim(),
        email: newMemberEmail.trim(),
        role: newMemberRole
      });
      setTeamMembers(nextMembers);
      setNewMemberName("");
      setNewMemberEmail("");
      setNewMemberRole("viewer");
    } catch (error) {
      console.error(error);
      alert(error.message || "Unable to add team member.");
    }
  }

  async function deleteTeamMember(memberId) {
    try {
      setTeamMembers(await removeWorkspaceMember(memberId));
    } catch (error) {
      console.error(error);
      alert(error.message || "Unable to remove team member.");
    }
  }

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
  const permission = getPermissionSet(currentUserRole);
  const canEditPolls = permission.canEditPolls;
  const canDeletePolls = permission.canDeletePolls;
  const canDuplicatePolls = permission.canDuplicatePolls;
  const canReuseQr = permission.canReuseQr;
  const canExportResults = permission.canExportResults;
  const canClosePolls = permission.canClosePolls;

  const filteredPolls = polls.filter((poll) => {
    const pollMeta = readPollMeta(poll.id);
    const locationName = poll.location_name ?? pollMeta.location_name ?? "";
    const brandName = poll.brand_name ?? pollMeta.brand_name ?? "";
    const status = getPollStatusInfo(poll);
    const questionText = `${poll.question ?? ""} ${locationName} ${brandName}`.toLowerCase();
    const matchesSearch = questionText.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    const matchesLocation = locationFilter === "all" || locationName === locationFilter;
    return matchesSearch && matchesStatus && matchesLocation;
  });

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Admin Dashboard</h1>

      <div className="flex justify-center mb-6">
        <Link to="/admin/analytics" className="bg-purple-600 text-white px-3 py-2 rounded font-semibold">
          Analytics
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="border rounded p-3 bg-gray-900">
          <p className="text-gray-400 text-sm">Total polls</p>
          <p className="text-2xl font-bold">{analytics.total}</p>
        </div>
        <div className="border rounded p-3 bg-gray-900">
          <p className="text-gray-400 text-sm">Active</p>
          <p className="text-2xl font-bold text-green-400">{analytics.active}</p>
        </div>
        <div className="border rounded p-3 bg-gray-900">
          <p className="text-gray-400 text-sm">Closed</p>
          <p className="text-2xl font-bold text-red-400">{analytics.closed}</p>
        </div>
        <div className="border rounded p-3 bg-gray-900">
          <p className="text-gray-400 text-sm">Scheduled</p>
          <p className="text-2xl font-bold text-yellow-400">{analytics.scheduled}</p>
        </div>
        <div className="border rounded p-3 bg-gray-900">
          <p className="text-gray-400 text-sm">Locations</p>
          <p className="text-2xl font-bold text-blue-400">{analytics.withLocation}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-col md:flex-row gap-3">
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search question or location"
          className="w-full md:w-2/3 border p-2 rounded text-black"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="w-full md:w-1/3 border p-2 rounded text-black"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="scheduled">Scheduled</option>
          <option value="expired">Expired</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={locationFilter}
          onChange={(event) => setLocationFilter(event.target.value)}
          className="w-full md:w-1/3 border p-2 rounded text-black"
        >
          <option value="all">All locations</option>
          {Array.from(new Set((polls || []).map((poll) => readPollMeta(poll.id).location_name ?? poll.location_name ?? "").filter(Boolean))).map((location) => (
            <option key={location} value={location}>{location}</option>
          ))}
        </select>
      </div>

      <div className="mb-6 border rounded p-4 bg-gray-900">
        <h2 className="text-xl font-bold mb-3">QR locations</h2>
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <input
            type="text"
            value={newLocationName}
            onChange={(event) => setNewLocationName(event.target.value)}
            className="border p-2 rounded text-black"
            placeholder="Location name"
          />
          <input
            type="text"
            value={newLocationToken}
            onChange={(event) => setNewLocationToken(event.target.value)}
            className="border p-2 rounded text-black"
            placeholder="Optional token"
          />
          <button onClick={handleCreateLocation} className="bg-violet-600 text-white px-4 py-2 rounded font-semibold">
            Add location
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <select value={selectedLocationId} onChange={(event) => setSelectedLocationId(event.target.value)} className="border p-2 rounded text-black">
            <option value="">Choose a QR location</option>
            {qrLocations.map((location) => (
              <option key={location.id} value={String(location.id)}>{location.name}</option>
            ))}
          </select>
          <select value={selectedPollForLocation} onChange={(event) => setSelectedPollForLocation(event.target.value)} className="border p-2 rounded text-black">
            <option value="">Choose a poll</option>
            {polls.map((poll) => (
              <option key={poll.id} value={String(poll.id)}>
                #{poll.id} - {poll.question}
              </option>
            ))}
          </select>
        </div>

        <button onClick={assignLocationToPoll} className="bg-emerald-600 text-white px-4 py-2 rounded font-semibold mb-4">
          Assign location to poll
        </button>

        <div className="space-y-2">
          {qrLocations.length === 0 ? (
            <p className="text-gray-400">No QR locations yet.</p>
          ) : (
            qrLocations.map((location) => (
              <div key={location.id} className="flex items-center justify-between border border-gray-700 rounded p-3">
                <div>
                  <p className="font-semibold">{location.name}</p>
                  <p className="text-xs text-gray-400">Token: {location.token}</p>
                  <p className="text-xs text-gray-500">
                    {location.current_poll_id ? `Assigned to poll #${location.current_poll_id}` : "Not assigned"}
                  </p>
                </div>
                <button onClick={() => handleDeleteLocation(location.id)} className="bg-red-600 text-white px-3 py-2 rounded font-semibold">
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mb-6 border rounded p-4 bg-gray-900">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Workspace settings</h2>
          <span className="text-xs uppercase tracking-wide text-gray-300">Role: {workspaceProfile.role}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <input
            type="text"
            value={workspaceProfile.companyName}
            onChange={(event) => setWorkspaceProfile((current) => ({ ...current, companyName: event.target.value }))}
            className="border p-2 rounded text-black"
            placeholder="Company name"
          />
          <select
            value={workspaceProfile.role}
            className="border p-2 rounded text-black"
            disabled
          >
            <option value="owner">Owner</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <input
            type="url"
            value={workspaceProfile.logoUrl}
            onChange={(event) => setWorkspaceProfile((current) => ({ ...current, logoUrl: event.target.value }))}
            className="border p-2 rounded text-black md:col-span-2"
            placeholder="Logo URL"
          />
          <label className="block font-semibold">
            Primary color
            <input
              type="color"
              value={workspaceProfile.primaryColor}
              onChange={(event) => setWorkspaceProfile((current) => ({ ...current, primaryColor: event.target.value }))}
              className="w-full border p-1 rounded mt-1 h-11"
            />
          </label>
          <label className="block font-semibold">
            Accent color
            <input
              type="color"
              value={workspaceProfile.accentColor}
              onChange={(event) => setWorkspaceProfile((current) => ({ ...current, accentColor: event.target.value }))}
              className="w-full border p-1 rounded mt-1 h-11"
            />
          </label>
        </div>

        <div className="mt-4">
          <button
            onClick={saveWorkspaceSettings}
            disabled={!permission.canManageWorkspace}
            className={`px-4 py-2 rounded font-semibold ${
              permission.canManageWorkspace ? "bg-blue-600 text-white" : "bg-gray-600 text-gray-300 cursor-not-allowed"
            }`}
          >
            Save workspace settings
          </button>
        </div>
      </div>

      <div className="mb-6 border rounded p-4 bg-gray-900">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Team access</h2>
          <span className="text-xs uppercase tracking-wide text-gray-300">{teamMembers.length} members</span>
        </div>

        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <input
            type="text"
            value={newMemberName}
            onChange={(event) => setNewMemberName(event.target.value)}
            className="border p-2 rounded text-black"
            placeholder="Name or email"
          />
          <input
            type="email"
            value={newMemberEmail}
            onChange={(event) => setNewMemberEmail(event.target.value)}
            className="border p-2 rounded text-black"
            placeholder="member@example.com"
          />
          <select
            value={newMemberRole}
            onChange={(event) => setNewMemberRole(event.target.value)}
            className="border p-2 rounded text-black"
          >
            <option value="owner">Owner</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>

        <button
          onClick={addTeamMember}
          disabled={!permission.canManageWorkspace}
          className={`px-4 py-2 rounded font-semibold mb-4 ${
            permission.canManageWorkspace ? "bg-indigo-600 text-white" : "bg-gray-600 text-gray-300 cursor-not-allowed"
          }`}
        >
          Add team member
        </button>

        <div className="space-y-2">
          {teamMembers.length === 0 ? (
            <p className="text-gray-400">No team members saved yet.</p>
          ) : (
            teamMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between border border-gray-700 rounded p-3">
                <div>
                  <p className="font-semibold">{member.name}</p>
                  {member.email && <p className="text-xs text-gray-400">{member.email}</p>}
                  <p className="text-xs uppercase tracking-wide text-blue-300">{member.role}</p>
                </div>
                <button
                  onClick={() => deleteTeamMember(member.id)}
                  disabled={!permission.canManageWorkspace}
                  className={`px-3 py-2 rounded font-semibold ${
                    permission.canManageWorkspace ? "bg-red-600 text-white" : "bg-gray-700 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
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

      {filteredPolls.length === 0 && <p className="text-center text-gray-600">No matching polls found.</p>}

      <div className="space-y-4">
        {filteredPolls.map((poll) => {
          const pollMeta = readPollMeta(poll.id);
          const isClosed = isPollClosed(poll) || pollMeta.status === "closed";
          const locationName = poll.location_name ?? pollMeta.location_name;
          const startsAt = poll.starts_at ?? pollMeta.starts_at;
          const endsAt = poll.expires_at ?? pollMeta.ends_at;
          const brandName = poll.brand_name ?? pollMeta.brand_name;
          const templateKey = poll.template_key ?? pollMeta.template_key;

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

            {(brandName || templateKey) && (
              <p className="text-gray-300 text-sm mb-1">
                {brandName ? `Brand: ${brandName}` : ""} {brandName && templateKey ? "•" : ""} {templateKey ? `Template: ${templateKey}` : ""}
              </p>
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

              <Link
                to={`/edit/${poll.id}`}
                className={`px-3 py-2 rounded font-semibold ${
                  canEditPolls ? "bg-yellow-500 text-white" : "bg-gray-700 text-gray-400 cursor-not-allowed pointer-events-none"
                }`}
              >
                Edit
              </Link>

              <button onClick={() => copyShareLink(poll)} className="bg-gray-700 text-white px-3 py-2 rounded font-semibold">
                Copy Share Link
              </button>

              <button
                onClick={() => duplicatePoll(poll)}
                disabled={!canDuplicatePolls}
                className={`px-3 py-2 rounded font-semibold ${
                  canDuplicatePolls ? "bg-yellow-500 text-white" : "bg-gray-700 text-gray-400 cursor-not-allowed"
                }`}
              >
                Duplicate
              </button>

              <button
                onClick={() => reuseQR(poll)}
                disabled={!canReuseQr}
                className={`px-3 py-2 rounded font-semibold ${
                  canReuseQr ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-400 cursor-not-allowed"
                }`}
              >
                Reuse QR for another poll
              </button>

              <button onClick={() => setShowQR(showQR === poll.id ? null : poll.id)} className="bg-yellow-500 text-white px-3 py-2 rounded font-semibold">
                Show QR Code
              </button>

              <button
                onClick={() => closePoll(poll)}
                disabled={!canClosePolls}
                className={`px-3 py-2 rounded font-semibold ${
                  canClosePolls ? "bg-orange-600 text-white" : "bg-gray-700 text-gray-400 cursor-not-allowed"
                }`}
              >
                {isClosed ? "Reopen Poll" : "Close Poll"}
              </button>

              <button
                onClick={() => exportPollCsv(poll)}
                disabled={!canExportResults}
                className={`px-3 py-2 rounded font-semibold ${
                  canExportResults ? "bg-teal-600 text-white" : "bg-gray-700 text-gray-400 cursor-not-allowed"
                }`}
              >
                Export CSV
              </button>

              <button
                onClick={() => deletePoll(poll.id)}
                disabled={!canDeletePolls}
                className={`px-3 py-2 rounded font-semibold ${
                  canDeletePolls ? "bg-red-600 text-white" : "bg-gray-700 text-gray-400 cursor-not-allowed"
                }`}
              >
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
