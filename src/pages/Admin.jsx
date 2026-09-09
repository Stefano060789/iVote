import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase, supabaseUrl, supabaseAnonKey } from "../lib/supabase";
import { createStableQrUrl } from "../lib/pollLinks";
import { isRestrictedTopic } from "../lib/restrictedContent";
import { appendAuditLog, readAuditLog, readPollMeta, savePollMeta, isPollClosed } from "../lib/pollMeta";
import { buildQrToken, deleteQrLocation, loadQrLocations, saveQrLocation } from "../lib/qrLocations";
import { createQrCampaign, loadQrCampaigns } from "../lib/qrCampaigns";
import { extractQrToken, reassignManagedCampaignPoll, resolveManagedQrToken } from "../lib/qrManage";
import QrScanner from "../components/QrScanner";
import { loadLeadNurtureSettings, saveLeadNurtureSettings } from "../lib/leadNurture";
import { loadPollRotations, createPollRotation, deletePollRotation } from "../lib/pollRotations";
import { loadApiKeys, createApiKey, deleteApiKey } from "../lib/apiKeys";
import {
  getCurrentUserRole,
  getPermissionSet,
  inviteWorkspaceMember,
  loadWorkspaceProfile,
  readWorkspaceMembers,
  readWorkspaceProfile,
  removeWorkspaceMember,
  saveWorkspaceMember,
  saveWorkspaceProfile
} from "../lib/workspaceProfile";

export default function Admin() {
  const navigate = useNavigate();
  const location = useLocation();
  const qrRef = useRef(null);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
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
  const [qrPrintFormat, setQrPrintFormat] = useState("a4");
  const [qrStyleSeed, setQrStyleSeed] = useState(1);
  const [qrStylePreset, setQrStylePreset] = useState("brand");
  const [aiImagePrompt, setAiImagePrompt] = useState("");
  const [generatedPosterImage, setGeneratedPosterImage] = useState("");
  const [imageGenerationStatus, setImageGenerationStatus] = useState("idle");
  const [imageGenerationError, setImageGenerationError] = useState("");
  const [analytics, setAnalytics] = useState({ total: 0, active: 0, closed: 0, scheduled: 0, withLocation: 0 });
  const [locationStats, setLocationStats] = useState([]);
  const [templateBenchmark, setTemplateBenchmark] = useState(null);
  const [workspaceProfile, setWorkspaceProfile] = useState({
    companyName: "iVote",
    logoUrl: "",
    primaryColor: "#0f766e",
    accentColor: "#172b2b",
    webhookUrl: "",
    role: "owner"
  });
  const [workspaceUserId, setWorkspaceUserId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState("viewer");
  const [teamMembers, setTeamMembers] = useState([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("viewer");
  const [qrCampaigns, setQrCampaigns] = useState([]);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignPollId, setNewCampaignPollId] = useState("");
  const [newCampaignPlacement, setNewCampaignPlacement] = useState("");
  const [newCampaignVariant, setNewCampaignVariant] = useState("");
  const [newCampaignPortalTitle, setNewCampaignPortalTitle] = useState("");
  const [newCampaignPortalMessage, setNewCampaignPortalMessage] = useState("");
  const [newCampaignPortalButton, setNewCampaignPortalButton] = useState("");
  const [newBulkBaseName, setNewBulkBaseName] = useState("");
  const [newBulkCount, setNewBulkCount] = useState("10");
  const [newBulkPollId, setNewBulkPollId] = useState("");
  const [invitingMember, setInvitingMember] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemMessage, setRedeemMessage] = useState("");
  const [alertRules, setAlertRules] = useState([]);
  const [feedbackAlerts, setFeedbackAlerts] = useState([]);
  const [recoveryTasks, setRecoveryTasks] = useState([]);
  const [reportSettings, setReportSettings] = useState({ recipient_email: "", is_enabled: false });
  const [nurtureSettings, setNurtureSettings] = useState({ is_enabled: false, subject: "", message: "" });
  const [sentimentSummary, setSentimentSummary] = useState({});
  const [newRulePollId, setNewRulePollId] = useState("");
  const [newRuleType, setNewRuleType] = useState("low_score");
  const [newRuleThreshold, setNewRuleThreshold] = useState("3");
  const [newRuleAnswer, setNewRuleAnswer] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAlertId, setNewTaskAlertId] = useState("");
  const [organizerMessages, setOrganizerMessages] = useState([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanLookupValue, setScanLookupValue] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [scanMessage, setScanMessage] = useState("");
  const [totalVotesCount, setTotalVotesCount] = useState(0);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [qrShared, setQrShared] = useState(false);
  const [weeklyInsight, setWeeklyInsight] = useState(null);
  const [voteTrend, setVoteTrend] = useState(null);
  const [workspaceUpdates, setWorkspaceUpdates] = useState([]);
  const [newUpdateMessage, setNewUpdateMessage] = useState("");
  const [newUpdatePollId, setNewUpdatePollId] = useState("");
  const [pollRotations, setPollRotations] = useState([]);  const [newRotationName, setNewRotationName] = useState("");
  const [newRotationFrequency, setNewRotationFrequency] = useState("daily");
  const [newRotationPollIds, setNewRotationPollIds] = useState([]);
  const [rotationPollToAdd, setRotationPollToAdd] = useState("");
  const [apiKeys, setApiKeys] = useState([]);
  const [newApiKeyLabel, setNewApiKeyLabel] = useState("");
  const [reviewClaims, setReviewClaims] = useState([]);

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
      navigate("/login");
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
        const profile = await loadWorkspaceProfile();
        setWorkspaceUserId(profile.id);
        setCurrentUserRole(profile.role);
        setWorkspaceProfile(profile);
        setTeamMembers(await readWorkspaceMembers(profile.id));
        const nextLocations = await loadQrLocations();
        setQrLocations(nextLocations);
        setQrCampaigns(await loadQrCampaigns());
        const [rulesResult, alertsResult, tasksResult, reportsResult, messagesResult] = await Promise.all([
          supabase.from("feedback_alert_rules").select("*").order("created_at", { ascending: false }),
          supabase.from("feedback_alerts").select("*").order("created_at", { ascending: false }).limit(30),
          supabase.from("feedback_recovery_tasks").select("*").order("created_at", { ascending: false }).limit(30),
          supabase.from("weekly_report_settings").select("recipient_email, is_enabled").eq("workspace_id", profile.id).maybeSingle(),
          supabase.from("organizer_messages").select("*").order("created_at", { ascending: false }).limit(30)
        ]);
        if (!rulesResult.error) setAlertRules(rulesResult.data || []);
        if (!alertsResult.error) setFeedbackAlerts(alertsResult.data || []);
        if (!tasksResult.error) setRecoveryTasks(tasksResult.data || []);
        if (!reportsResult.error && reportsResult.data) setReportSettings(reportsResult.data);
        if (!messagesResult.error) setOrganizerMessages(messagesResult.data || []);

        setNurtureSettings(await loadLeadNurtureSettings(profile.id));
        const { data: reviewClaimRows, error: reviewClaimError } = await supabase
          .from("review_benefit_claims")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (!reviewClaimError) setReviewClaims(reviewClaimRows || []);

        const { data: sentimentRows } = await supabase.from("user_answers").select("poll_id, sentiment").not("sentiment", "is", null);
        const summary = {};
        (sentimentRows || []).forEach((row) => {
          summary[row.poll_id] = summary[row.poll_id] || { positive: 0, neutral: 0, negative: 0 };
          summary[row.poll_id][row.sentiment] += 1;
        });
        setSentimentSummary(summary);

        setOnboardingDismissed(localStorage.getItem(`ivote_onboarding_dismissed_${profile.id}`) === "true");
        setQrShared(localStorage.getItem(`ivote_qr_shared_${profile.id}`) === "true");

        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
        const { count: votesCount } = await supabase.from("votes").select("id", { count: "exact", head: true });
        setTotalVotesCount(votesCount || 0);

        const { count: priorWeekCount } = await supabase.from("votes").select("id", { count: "exact", head: true }).gte("created_at", fourteenDaysAgo).lt("created_at", sevenDaysAgo);

        const { data: recentVotes } = await supabase.from("votes").select("answer, poll_id").gte("created_at", sevenDaysAgo);
        if (recentVotes && recentVotes.length > 0) {
          const tally = {};
          recentVotes.forEach((vote) => {
            const key = vote.answer;
            tally[key] = (tally[key] || 0) + 1;
          });
          const [topAnswer, topCount] = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
          setWeeklyInsight({ answer: topAnswer, count: topCount, totalVotes: recentVotes.length });
        } else {
          setWeeklyInsight(null);
        }
        setVoteTrend({ thisWeek: recentVotes?.length || 0, lastWeek: priorWeekCount || 0 });


        const { data: updatesRows } = await supabase.from("workspace_updates").select("*").order("created_at", { ascending: false }).limit(20);
        setWorkspaceUpdates(updatesRows || []);

        setPollRotations(await loadPollRotations());
        try {
          setApiKeys(await loadApiKeys(supabase, profile.id));
        } catch (apiKeyError) {
          console.warn("API key management is unavailable until its database table is installed.", apiKeyError);
          setApiKeys([]);
        }
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

  useEffect(() => {
    async function loadLocationStats() {
      if (polls.length === 0) {
        setLocationStats([]);
        return;
      }
      const { data: voteRows } = await supabase.from("votes").select("poll_id, answer");
      if (!voteRows) return;
      const countsByPoll = {};
      voteRows.forEach((vote) => {
        countsByPoll[vote.poll_id] = (countsByPoll[vote.poll_id] || 0) + 1;
      });
      const byLocation = {};
      polls.forEach((poll) => {
        const location = poll.location_name ?? readPollMeta(poll.id).location_name;
        if (!location) return;
        byLocation[location] = byLocation[location] || { votes: 0, polls: 0 };
        byLocation[location].votes += countsByPoll[poll.id] || 0;
        byLocation[location].polls += 1;
      });
      setLocationStats(Object.entries(byLocation).map(([name, stats]) => ({ name, ...stats })).sort((a, b) => b.votes - a.votes));

      const templateCounts = {};
      polls.forEach((poll) => {
        const key = poll.template_key ?? readPollMeta(poll.id).template_key;
        if (!key || key === "blank") return;
        templateCounts[key] = (templateCounts[key] || 0) + (countsByPoll[poll.id] || 0);
      });
      const topTemplateKey = Object.entries(templateCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (!topTemplateKey || !workspaceUserId) {
        setTemplateBenchmark(null);
        return;
      }

      const templatePolls = polls.filter((poll) => (poll.template_key ?? readPollMeta(poll.id).template_key) === topTemplateKey);
      let scoredVotes = 0;
      let scoreSum = 0;
      templatePolls.forEach((poll) => {
        const answers = Array.isArray(poll.answers) ? poll.answers : [];
        if (answers.length <= 1) return;
        voteRows.filter((vote) => vote.poll_id === poll.id).forEach((vote) => {
          const index = answers.indexOf(vote.answer);
          if (index < 0) return;
          scoreSum += (1 - index / (answers.length - 1)) * 100;
          scoredVotes += 1;
        });
      });
      if (scoredVotes === 0) {
        setTemplateBenchmark(null);
        return;
      }

      const { data: benchmarkRows } = await supabase.rpc("get_template_benchmark", { target_template_key: topTemplateKey, excluded_workspace_id: workspaceUserId }).maybeSingle();
      setTemplateBenchmark({
        templateKey: topTemplateKey,
        ownScore: Math.round(scoreSum / scoredVotes),
        industryScore: benchmarkRows?.average_score ? Math.round(benchmarkRows.average_score) : null,
        sampleSize: benchmarkRows?.sample_size || 0
      });
    }
    loadLocationStats();
  }, [polls, workspaceUserId]);

  async function saveWorkspaceSettings() {
    if (!workspaceUserId) return;
    try {
      const nextProfile = await saveWorkspaceProfile(workspaceUserId, workspaceProfile);
      setWorkspaceProfile((current) => ({ ...current, ...nextProfile }));
      alert("Workspace settings saved.");
    } catch (error) {
      console.error(error);
      alert(error.message || "Unable to save workspace settings.");
    }
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

  async function handleCreateCampaign() {
    if (!newCampaignName.trim() || !newCampaignPollId) {
      alert("Name the campaign and select its poll.");
      return;
    }
    try {
      const campaign = await createQrCampaign({ name: newCampaignName, pollId: newCampaignPollId, placementLabel: newCampaignPlacement, variantLabel: newCampaignVariant, portalTitle: newCampaignPortalTitle, portalMessage: newCampaignPortalMessage, portalButtonLabel: newCampaignPortalButton });
      setQrCampaigns((current) => [campaign, ...current]);
      setNewCampaignName("");
      setNewCampaignPollId("");
      setNewCampaignPlacement("");
      setNewCampaignVariant("");
      setNewCampaignPortalTitle("");
      setNewCampaignPortalMessage("");
      setNewCampaignPortalButton("");
    } catch (error) {
      console.error(error);
      alert(error.message || "Unable to create QR campaign. Run the ROI migration first.");
    }
  }

  async function handleBulkGenerateCampaigns() {
    const base = newBulkBaseName.trim();
    const count = Number(newBulkCount);
    if (!base || !Number.isInteger(count) || count < 1 || count > 50) {
      alert("Enter a name and a count between 1 and 50.");
      return;
    }
    try {
      const created = [];
      for (let index = 1; index <= count; index += 1) {
        const label = `${base} ${index}`;
        const campaign = await createQrCampaign({ name: label, pollId: newBulkPollId || null, placementLabel: label });
        created.push(campaign);
      }
      setQrCampaigns((current) => [...created, ...current]);
      setNewBulkBaseName("");
      setNewBulkCount("10");
      setNewBulkPollId("");
      alert(`Created ${created.length} QR codes. Open each printed code to assign or change its poll.`);
    } catch (error) {
      console.error(error);
      alert(error.message || "Unable to generate QR codes.");
    }
  }

  async function reassignQrCampaignPoll(campaignId, nextPollId) {
    if (!nextPollId) return;
    const { error } = await supabase.from("qr_campaigns").update({ poll_id: Number(nextPollId), rotation_id: null }).eq("id", campaignId);
    if (error) {
      alert(error.message);
      return;
    }
    setQrCampaigns((current) => current.map((item) => item.id === campaignId ? { ...item, poll_id: Number(nextPollId), rotation_id: null } : item));
  }

  async function assignCampaignRotation(campaignId, rotationId) {
    const { error } = await supabase.from("qr_campaigns").update({ rotation_id: rotationId ? Number(rotationId) : null }).eq("id", campaignId);
    if (error) {
      alert(error.message);
      return;
    }
    setQrCampaigns((current) => current.map((item) => item.id === campaignId ? { ...item, rotation_id: rotationId ? Number(rotationId) : null } : item));
  }

  function addPollToRotationDraft() {
    if (!rotationPollToAdd) return;
    setNewRotationPollIds((current) => [...current, rotationPollToAdd]);
    setRotationPollToAdd("");
  }

  function removePollFromRotationDraft(index) {
    setNewRotationPollIds((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleCreateRotation() {
    if (!newRotationName.trim() || newRotationPollIds.length < 2) {
      alert("Name the rotation and add at least 2 polls in the order you want them to rotate.");
      return;
    }
    try {
      const rotation = await createPollRotation({ name: newRotationName, pollIds: newRotationPollIds, frequency: newRotationFrequency });
      setPollRotations((current) => [rotation, ...current]);
      setNewRotationName("");
      setNewRotationPollIds([]);
      setNewRotationFrequency("daily");
    } catch (error) {
      console.error(error);
      alert(error.message || "Unable to create poll rotation.");
    }
  }

  async function handleDeleteRotation(rotationId) {
    const confirmed = window.confirm("Delete this rotation? QR codes using it will need a new poll or rotation assigned.");
    if (!confirmed) return;
    try {
      await deletePollRotation(rotationId);
      setPollRotations((current) => current.filter((item) => item.id !== rotationId));
      setQrCampaigns((current) => current.map((item) => item.rotation_id === rotationId ? { ...item, rotation_id: null } : item));
    } catch (error) {
      console.error(error);
      alert(error.message || "Unable to delete poll rotation.");
    }
  }

  async function handleCreateApiKey() {
    try {
      const { record, plaintextKey } = await createApiKey(supabase, workspaceUserId, newApiKeyLabel);
      setApiKeys((current) => [record, ...current]);
      setNewApiKeyLabel("");
      window.prompt("Copy this API key now. It won't be shown again:", plaintextKey);
    } catch (error) {
      console.error(error);
      alert(error.message || "Unable to create API key.");
    }
  }

  async function handleDeleteApiKey(keyId) {
    const confirmed = window.confirm("Delete this API key? Anything using it will stop working immediately.");
    if (!confirmed) return;
    try {
      await deleteApiKey(supabase, keyId);
      setApiKeys((current) => current.filter((item) => item.id !== keyId));
    } catch (error) {
      console.error(error);
      alert(error.message || "Unable to delete API key.");
    }
  }

  async function lookUpScannedQr(rawValue) {
    const token = extractQrToken(rawValue);
    if (!token) {
      setScanResult(null);
      setScanMessage("Could not read a QR link from that value.");
      return;
    }

    const managed = await resolveManagedQrToken(token);
    if (!managed) {
      setScanResult(null);
      setScanMessage("This QR code isn't linked to a poll in your workspace.");
      return;
    }

    setScanResult(managed);
    setScanMessage("");
  }

  async function handleScanDecode(rawValue) {
    setScannerOpen(false);
    await lookUpScannedQr(rawValue);
  }

  async function handleRedeemCode() {
    const code = redeemCode.trim();
    if (!code) {
      setRedeemMessage("Enter the reward code first.");
      return;
    }
    const { data, error } = await supabase.rpc("redeem_reward_code", { target_code: code }).maybeSingle();
    if (error) {
      setRedeemMessage(error.message);
      return;
    }
    setRedeemMessage(`Redeemed for "${data.question}". Total redemptions: ${data.reward_redeemed_count}.`);
    setRedeemCode("");
    setPolls((current) => current.map((poll) => poll.id === data.poll_id ? { ...poll, reward_redeemed_count: data.reward_redeemed_count } : poll));
  }

  async function changeScannedPoll(nextPollId) {
    if (!scanResult || !nextPollId) return;
    const error = await reassignManagedCampaignPoll(scanResult.campaign.id, nextPollId);
    if (error) {
      alert(error.message);
      return;
    }
    const nextPoll = scanResult.polls.find((poll) => String(poll.id) === String(nextPollId)) || null;
    setScanResult((current) => ({ ...current, currentPoll: nextPoll, campaign: { ...current.campaign, poll_id: Number(nextPollId) } }));
    setQrCampaigns((current) => current.map((item) => item.id === scanResult.campaign.id ? { ...item, poll_id: Number(nextPollId) } : item));
  }

  async function createAlertRule() {
    if (!newRulePollId || (newRuleType === "answer_match" && !newRuleAnswer.trim())) return alert("Choose a poll and complete the trigger.");
    const rule = { workspace_id: workspaceUserId, poll_id: Number(newRulePollId), trigger_type: newRuleType, score_threshold: newRuleType === "low_score" ? Number(newRuleThreshold) : null, answer_match: newRuleType === "answer_match" ? newRuleAnswer.trim() : null };
    const { data, error } = await supabase.from("feedback_alert_rules").insert(rule).select().single();
    if (error) return alert(error.message);
    setAlertRules((current) => [data, ...current]); setNewRuleAnswer("");
  }

  async function createRecoveryTask() {
    if (!newTaskTitle.trim()) return alert("Add a recovery task title.");
    const { data, error } = await supabase.from("feedback_recovery_tasks").insert({ workspace_id: workspaceUserId, alert_id: newTaskAlertId ? Number(newTaskAlertId) : null, title: newTaskTitle.trim() }).select().single();
    if (error) return alert(error.message);
    setRecoveryTasks((current) => [data, ...current]); setNewTaskTitle(""); setNewTaskAlertId("");
  }

  async function saveReportSettings() {
    if (!reportSettings.recipient_email.trim()) return alert("Enter a report recipient email.");
    const { error } = await supabase.from("weekly_report_settings").upsert({ workspace_id: workspaceUserId, recipient_email: reportSettings.recipient_email.trim(), is_enabled: reportSettings.is_enabled, updated_at: new Date().toISOString() });
    if (error) return alert(error.message);
    alert("Weekly report settings saved.");
  }

  async function saveNurtureSettings() {
    try {
      await saveLeadNurtureSettings(workspaceUserId, nurtureSettings);
      alert("Lead nurture email settings saved.");
    } catch (error) {
      console.error(error);
      alert(error.message || "Unable to save nurture email settings.");
    }
  }

  async function pickRaffleWinner(pollId) {
    const { data, error } = await supabase.rpc("pick_raffle_winner", { target_poll_id: pollId }).maybeSingle();
    if (error) {
      alert(error.message);
      return;
    }
    setPolls((current) => current.map((poll) => poll.id === pollId ? { ...poll, raffle_winner_email: data.email, raffle_winner_picked_at: new Date().toISOString() } : poll));
    alert(`Winner picked: ${data.email}`);
  }

  async function reviewBenefitClaim(claimId, status) {
    const { error } = await supabase.rpc("review_review_benefit_claim", {
      target_claim_id: claimId,
      next_status: status
    });
    if (error) {
      alert(error.message);
      return;
    }
    setReviewClaims((current) => current.map((claim) => claim.id === claimId
      ? { ...claim, status, reviewed_at: new Date().toISOString() }
      : claim));
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

    const email = newMemberEmail.trim();

    if (email) {
      setInvitingMember(true);
      try {
        const result = await inviteWorkspaceMember(workspaceUserId, {
          email,
          name: newMemberName.trim(),
          role: newMemberRole
        });
        setTeamMembers(await readWorkspaceMembers(workspaceUserId));
        setNewMemberName("");
        setNewMemberEmail("");
        setNewMemberRole("viewer");
        if (result.actionLink) {
          window.prompt("Invite created. Copy this sign-in link and send it to your teammate:", result.actionLink);
        } else {
          alert(`Invited ${email}. They'll receive an email to set up their account.`);
        }
      } catch (error) {
        console.error(error);
        alert(error.message || "Unable to invite team member.");
      } finally {
        setInvitingMember(false);
      }
      return;
    }

    try {
      const nextMembers = await saveWorkspaceMember(workspaceUserId, {
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
      setTeamMembers(await removeWorkspaceMember(workspaceUserId, memberId));
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
    if (workspaceUserId) {
      localStorage.setItem(`ivote_qr_shared_${workspaceUserId}`, "true");
      setQrShared(true);
    }
  }

  function dismissOnboarding() {
    if (workspaceUserId) localStorage.setItem(`ivote_onboarding_dismissed_${workspaceUserId}`, "true");
    setOnboardingDismissed(true);
  }

  async function postWorkspaceUpdate() {
    if (!newUpdateMessage.trim()) return alert("Write the update message first.");
    const { data, error } = await supabase.from("workspace_updates").insert({
      workspace_id: workspaceUserId,
      poll_id: newUpdatePollId ? Number(newUpdatePollId) : null,
      message: newUpdateMessage.trim()
    }).select().single();
    if (error) return alert(error.message);
    setWorkspaceUpdates((current) => [data, ...current]);
    setNewUpdateMessage("");
    setNewUpdatePollId("");
  }

  async function deleteWorkspaceUpdate(id) {
    const { error } = await supabase.from("workspace_updates").delete().eq("id", id);
    if (error) return alert(error.message);
    setWorkspaceUpdates((current) => current.filter((item) => item.id !== id));
  }

  function copyEmbedWidgetSnippet(poll) {
    const snippet = `<script src="${window.location.origin}/widget.js" data-poll-id="${poll.id}" data-origin="${window.location.origin}" data-label="Give Feedback" data-color="${workspaceProfile.primaryColor || "#0d9488"}"></script>`;
    navigator.clipboard.writeText(snippet);
    alert("Embed code copied. Paste it before </body> on your website.");
  }

  function copyTrustBadgeSnippet(poll) {
    const snippet = `<script src="${window.location.origin}/trust-badge.js" data-poll-id="${poll.id}" data-origin="${window.location.origin}" data-supabase-url="${supabaseUrl}" data-supabase-anon-key="${supabaseAnonKey}"></script>`;
    navigator.clipboard.writeText(snippet);
    alert("Trust badge embed code copied. Paste it anywhere on your website.");
  }

  function getQrPrintFormatConfig(format = qrPrintFormat) {
    const formatMap = {
      letter: { label: "Letter", size: "8.5in 11in", cssSize: "820px 1050px", margin: "0.5in" },
      a4: { label: "A4", size: "A4", cssSize: "794px 1123px", margin: "0.5in" },
      a5: { label: "A5", size: "A5", cssSize: "562px 794px", margin: "0.4in" },
      a6: { label: "A6", size: "A6", cssSize: "397px 562px", margin: "0.25in" },
      a3: { label: "A3", size: "A3", cssSize: "1123px 1587px", margin: "0.5in" },
      postcard: { label: "Postcard", size: "5in 7in", cssSize: "480px 680px", margin: "0.2in" },
      beerHolder: { label: "Round beer holder", size: "4in 4in", cssSize: "560px 560px", margin: "0.15in", shape: "round" },
      ticket: { label: "Ticket", size: "3.5in 8in", cssSize: "420px 960px", margin: "0.15in", shape: "ticket" }
    };

    return formatMap[format] || formatMap.a4;
  }

  function generateAiQrStyle(seedOverride = qrStyleSeed, presetOverride = qrStylePreset) {
    const baseName = `${workspaceProfile.companyName || "iVote"}-${seedOverride}`;
    const hash = Array.from(baseName).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const palette = [
      workspaceProfile.primaryColor || "#2563eb",
      workspaceProfile.accentColor || "#0f172a",
      "#f8fafc",
      "#e0f2fe",
      "#fdf2f8",
      "#ecfeff"
    ];

    const presetPalettes = {
      brand: palette,
      celebration: ["#fef3c7", "#fb7185", "#7c3aed", "#f97316", "#fefce8", "#be123c"],
      fresh: ["#ecfeff", "#14b8a6", "#0ea5e9", "#f0fdf4", "#84cc16", "#f8fafc"],
      premium: ["#f8fafc", "#cbd5e1", "#334155", "#0f172a", "#b08968", "#f5f5f4"]
    };
    const selectedPalette = presetPalettes[presetOverride] || palette;
    const first = selectedPalette[hash % selectedPalette.length];
    const second = selectedPalette[(hash + 2) % selectedPalette.length];
    const third = selectedPalette[(hash + 4) % selectedPalette.length];
    const fourth = selectedPalette[(hash + 5) % selectedPalette.length];

    return {
      background: presetOverride === "premium"
        ? `linear-gradient(135deg, ${first} 0%, ${second} 48%, ${fourth} 100%)`
        : `radial-gradient(circle at top left, ${first} 0%, ${second} 32%, ${third} 62%, ${fourth} 100%)`,
      shadow: `0 20px 45px rgba(15, 23, 42, 0.18)`
    };
  }

  async function generatePosterImage(poll) {
    const description = aiImagePrompt.trim();
    if (!description) {
      setImageGenerationError("Describe the image you want behind this QR code.");
      return;
    }

    setImageGenerationStatus("generating");
    setImageGenerationError("");

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      const response = await fetch("/api/generate-qr-poster", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`
        },
        body: JSON.stringify({
          description: `${description}. The poll topic is: ${poll.question || "general feedback"}. Use a ${qrStylePreset} visual style.`
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Image generation failed.");
      }

      setGeneratedPosterImage(payload.imageUrl);
      setImageGenerationStatus("ready");
    } catch (error) {
      console.error(error);
      setImageGenerationStatus("idle");
      setImageGenerationError(error.message || "Unable to generate an image right now.");
    }
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

  function printQR(poll) {
    const img = qrRef.current;
    if (!img) {
      console.error("QR image is not available for printing.");
      return;
    }

    const formatConfig = getQrPrintFormatConfig();
    const generatedStyle = generateAiQrStyle(qrStyleSeed, qrStylePreset);
    const posterBackground = generatedPosterImage
      ? `url("${generatedPosterImage}") center / cover no-repeat, ${generatedStyle.background}`
      : generatedStyle.background;
    const logoMarkup = workspaceProfile.logoUrl
      ? `<img src="${workspaceProfile.logoUrl}" alt="Brand logo" style="max-height: 56px; max-width: 160px; object-fit: contain; margin-right: 16px;" />`
      : "";
    const companyName = (workspaceProfile.companyName || "iVote").replace(/[<>&"']/g, "");
    const pollTitle = (poll?.question || "Poll QR").replace(/[<>&"']/g, "");

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      console.error("Unable to open print window.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR</title>
          <style>
            @page { size: ${formatConfig.size}; margin: ${formatConfig.margin}; }
            body {
              margin: 0;
              background: #f8fafc;
              font-family: Arial, sans-serif;
              color: #0f172a;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .page {
              width: ${formatConfig.cssSize};
              min-height: ${formatConfig.cssSize};
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              background: ${posterBackground};
              border-radius: ${formatConfig.shape === "round" ? "50%" : formatConfig.shape === "ticket" ? "18px 18px 4px 4px" : "20px"};
              box-shadow: ${generatedStyle.shadow};
              padding: ${formatConfig.shape === "round" ? "28px" : formatConfig.shape === "ticket" ? "22px" : "36px"};
              box-sizing: border-box;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 14px;
              margin-bottom: 18px;
            }
            .brand {
              font-size: 28px;
              font-weight: 700;
              letter-spacing: 0.04em;
              color: #0f172a;
            }
            .qr-box {
              background: rgba(255,255,255,0.92);
              border-radius: 18px;
              padding: 18px;
              box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
            }
            .qr-box img {
              display: block;
              width: ${formatConfig.shape === "round" ? "210px" : formatConfig.shape === "ticket" ? "220px" : "260px"};
              height: ${formatConfig.shape === "round" ? "210px" : formatConfig.shape === "ticket" ? "220px" : "260px"};
              object-fit: contain;
            }
            .title {
              margin-top: 18px;
              font-size: 20px;
              font-weight: 700;
              text-align: center;
              max-width: 620px;
            }
            .subtitle {
              margin-top: 8px;
              font-size: 14px;
              text-align: center;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              color: #334155;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              ${logoMarkup}
              <div class="brand">${companyName}</div>
            </div>
            <div class="qr-box">
              <img src="${img.src}" alt="QR code" />
            </div>
            <div class="subtitle">Scan to vote</div>
            <div class="title">${pollTitle}</div>
          </div>
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
  const selectedPollId = new URLSearchParams(location.search).get("poll");

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

  const adminTabs = [
    { key: "overview", label: "Overview" },
    { key: "polls", label: "Polls" },
    { key: "connection", label: "Customer connection" },
    { key: "engagement", label: "Engagement & growth" },
    { key: "feedback", label: "Feedback" },
    { key: "settings", label: "Settings" }
  ];

  const adminTabDescriptions = {
    overview: "A snapshot of your workspace: quick actions, this week's activity, and key numbers.",
    polls: "Search, share, and manage every poll you've created.",
    connection: "Turn a QR scan into an ongoing customer relationship.",
    engagement: "QR locations, campaigns, rotations, rewards, and prize draws.",
    feedback: "Voter messages, review claims, sentiment, and recovery tasks.",
    settings: "Brand, team access, developer API, and recent activity."
  };

  const quickActions = [
    { key: "create", icon: "\u2795", label: "Create a poll", description: "Start a new QR feedback poll for a table, counter, or event.", onSelect: () => navigate("/create") },
    { key: "polls", icon: "\ud83d\udcca", label: "Manage your polls", description: "Share QR codes, print posters, and see how each poll performs.", onSelect: () => setActiveTab("polls") },
    { key: "connection", icon: "\ud83e\udd1d", label: "Customer connection", description: "Collect emails, invite honest reviews, and manage rewards.", onSelect: () => setActiveTab("connection") },
    { key: "analytics", icon: "\ud83d\udcc8", label: "View analytics", description: "See trends across every poll and location.", onSelect: () => navigate("/admin/analytics") },
    { key: "feedback", icon: "\ud83d\udcac", label: "Review feedback", description: "Read voter messages and approve pending review claims.", onSelect: () => setActiveTab("feedback") },
    { key: "settings", icon: "\u2699\ufe0f", label: "Workspace settings", description: "Manage your brand, team access, and billing.", onSelect: () => setActiveTab("settings") }
  ];

  return (
    <div className="workspace-page max-w-3xl mx-auto p-6">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold">Workspace dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">Everything you need to run QR feedback, guided in one place.</p>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center">
        {adminTabs.map((tab, index) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded px-4 py-3 text-center font-semibold ${index === adminTabs.length - 1 ? "col-span-2" : ""} ${activeTab === tab.key ? "bg-teal-500 text-slate-950" : "bg-gray-800 text-slate-300"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <p className="mb-6 text-center text-sm text-slate-400">{adminTabDescriptions[activeTab]}</p>

      {activeTab === "overview" && (
      <>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quickActions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={action.onSelect}
            className="rounded border border-slate-700 bg-gray-900 p-4 text-left transition hover:border-teal-500"
          >
            <span className="text-2xl" aria-hidden="true">{action.icon}</span>
            <p className="mt-2 font-bold">{action.label}</p>
            <p className="mt-1 text-sm text-slate-400">{action.description}</p>
          </button>
        ))}
      </div>

      {!onboardingDismissed && (
        <div className="mb-6 rounded border border-teal-700 bg-slate-900 p-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold">Get started</h2>
            <button onClick={dismissOnboarding} className="text-xs text-slate-400 underline">Dismiss</button>
          </div>
          <div className="mt-3 space-y-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={polls.length > 0 ? "text-emerald-300" : "text-slate-300"}>{polls.length > 0 ? "\u2713" : "\u25cb"} Create your first poll</p>
              {polls.length === 0 && <Link to="/create" className="shrink-0 rounded bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-950">Create a poll</Link>}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={qrShared ? "text-emerald-300" : "text-slate-300"}>{qrShared ? "\u2713" : "\u25cb"} Print or share your QR code</p>
              {!qrShared && polls.length > 0 && <button onClick={() => setActiveTab("polls")} className="shrink-0 rounded bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-950">Go to your polls</button>}
            </div>
            <p className={totalVotesCount > 0 ? "text-emerald-300" : "text-slate-300"}>{totalVotesCount > 0 ? "\u2713" : "\u25cb"} Get your first vote</p>
          </div>
        </div>
      )}

      {weeklyInsight && (
        <div className="mb-6 rounded border border-indigo-700 bg-slate-900 p-4">
          <p className="text-sm font-semibold text-indigo-300">This week's insight</p>
          <p className="mt-1 text-sm text-slate-200">
            Your top mentioned answer was <span className="font-semibold">"{weeklyInsight.answer}"</span>, mentioned {weeklyInsight.count} time{weeklyInsight.count === 1 ? "" : "s"} out of {weeklyInsight.totalVotes} votes in the last 7 days.
          </p>
        </div>
      )}

      <div className="mb-6 border rounded bg-gray-900 p-4">
        <h2 className="text-xl font-bold">Scan a QR code</h2>
        <p className="mt-1 mb-3 text-sm text-slate-400">Scan a printed QR code to see which poll it uses right now, and switch it to another poll instantly.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={() => { setScannerOpen(true); setScanMessage(""); }} className="bg-teal-500 text-slate-950 px-4 py-2 rounded font-semibold">
            Open camera scanner
          </button>
          <input
            value={scanLookupValue}
            onChange={(event) => setScanLookupValue(event.target.value)}
            placeholder="Or paste the QR link here"
            className="flex-1 border p-2 rounded text-black"
          />
          <button onClick={() => lookUpScannedQr(scanLookupValue)} className="bg-slate-700 text-white px-4 py-2 rounded font-semibold">
            Look up
          </button>
        </div>
        {scanMessage && <p className="mt-3 text-sm text-amber-300">{scanMessage}</p>}
        {scanResult && (
          <div className="mt-4 rounded border border-teal-700 bg-slate-950 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-300">{scanResult.campaign.name}</p>
            <p className="mt-1 text-sm text-slate-400">
              {scanResult.campaign.placement_label || "Unlabeled placement"}{scanResult.campaign.variant_label ? ` · ${scanResult.campaign.variant_label}` : ""}
            </p>
            <p className="mt-3 font-semibold">{scanResult.currentPoll?.question || "No poll assigned yet"}</p>
            <label className="mt-4 block text-sm font-semibold">Redirect this QR code to another poll</label>
            <select
              value={scanResult.campaign.poll_id ? String(scanResult.campaign.poll_id) : ""}
              onChange={(event) => changeScannedPoll(event.target.value)}
              className="mt-2 w-full rounded border p-2 text-black"
            >
              <option value="">Choose a poll</option>
              {scanResult.polls.map((poll) => (
                <option key={poll.id} value={String(poll.id)}>#{poll.id} - {poll.question}</option>
              ))}
            </select>
            <Link to={`/create?campaign=${scanResult.campaign.id}`} className="mt-3 block rounded bg-teal-400 px-4 py-2 text-center font-semibold text-slate-950">
              Create a new poll for this QR code
            </Link>
          </div>
        )}
      </div>

      {scannerOpen && <QrScanner onDecode={handleScanDecode} onClose={() => setScannerOpen(false)} />}

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
        {voteTrend && voteTrend.lastWeek > 0 && (
          <div className="border rounded p-3 bg-gray-900">
            <p className="text-gray-400 text-sm">Votes this week</p>
            <p className={`text-2xl font-bold ${voteTrend.thisWeek >= voteTrend.lastWeek ? "text-emerald-400" : "text-red-400"}`}>
              {voteTrend.thisWeek} {voteTrend.thisWeek >= voteTrend.lastWeek ? "\u25b2" : "\u25bc"} {Math.abs(Math.round(((voteTrend.thisWeek - voteTrend.lastWeek) / voteTrend.lastWeek) * 100))}%
            </p>
          </div>
        )}
      </div>

      {templateBenchmark && templateBenchmark.industryScore !== null && templateBenchmark.sampleSize >= 3 && (
        <div className="mb-6 rounded border border-emerald-700 bg-slate-900 p-4">
          <p className="text-sm font-semibold text-emerald-300">Benchmark</p>
          <p className="mt-1 text-sm text-slate-200">
            Your average score on "{templateBenchmark.templateKey}" polls is <span className="font-semibold">{templateBenchmark.ownScore}%</span>, vs an industry average of <span className="font-semibold">{templateBenchmark.industryScore}%</span> across {templateBenchmark.sampleSize} other venues using the same template.
          </p>
        </div>
      )}

      <details className="mb-2 border rounded bg-gray-900">
        <summary className="cursor-pointer p-4 text-lg font-bold">What's new in iVote</summary>
        <div className="px-4 pb-4 space-y-2 text-sm text-slate-300">
          <p><span className="font-semibold text-teal-300">Rotating polls, smart review routing, anomaly alerts</span> - QR codes can now auto-swap polls on a schedule, and the dashboard flags unusual vote-volume drops.</p>
          <p><span className="font-semibold text-teal-300">Prize draws, AI sentiment, lead nurture emails</span> - run opt-in prize draws, auto-classify open-text feedback, and email voters who opt in for follow-up.</p>
          <p><span className="font-semibold text-teal-300">Embeddable widget and trust badge</span> - add a feedback button or a live trust score badge to any website, not just QR codes.</p>
          <p><span className="font-semibold text-teal-300">In-dashboard QR scanner and bulk QR generation</span> - scan a printed code with your camera to manage it, or generate many QR codes at once.</p>
        </div>
      </details>
      </>
      )}

      {activeTab === "connection" && (
      <section className="space-y-6">
        <div className="rounded border border-teal-700 bg-slate-900 p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-300">Your customer connection workflow</p>
          <h2 className="mt-2 text-2xl font-bold">Turn one QR scan into an ongoing relationship.</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">Use this page as your checklist. Ask for an email only with clear consent, invite selected voters to leave honest public feedback, and release benefits according to your configured rules.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded border border-slate-700 bg-gray-900 p-4">
            <span className="text-2xl font-bold text-teal-300">1</span>
            <h3 className="mt-2 text-lg font-bold">Configure the offer</h3>
            <p className="mt-2 text-sm text-slate-400">Choose the poll answers that should trigger a review request. Add Google, Tripadvisor, or another honest review destination and set the benefit.</p>
            <Link to="/create" className="mt-4 inline-block rounded bg-teal-500 px-3 py-2 text-sm font-semibold text-slate-950">Create a configured poll</Link>
          </article>
          <article className="rounded border border-slate-700 bg-gray-900 p-4">
            <span className="text-2xl font-bold text-sky-300">2</span>
            <h3 className="mt-2 text-lg font-bold">Collect permission</h3>
            <p className="mt-2 text-sm text-slate-400">Voters can voluntarily share their email after voting. Use the nurture email settings to send event news, offers, or a follow-up message.</p>
            <button onClick={() => setActiveTab("engagement")} className="mt-4 rounded bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950">Open email settings</button>
          </article>
          <article className="rounded border border-slate-700 bg-gray-900 p-4">
            <span className="text-2xl font-bold text-amber-300">3</span>
            <h3 className="mt-2 text-lg font-bold">Verify and reward</h3>
            <p className="mt-2 text-sm text-slate-400">Check pending claims in the review queue. Approve the benefit only after confirming the voter left honest feedback on the selected platform.</p>
            <button onClick={() => setActiveTab("feedback")} className="mt-4 rounded bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-950">Open review claims</button>
          </article>
        </div>

        <div className="rounded border border-slate-700 bg-gray-900 p-5">
          <h2 className="text-xl font-bold">What the customer sees</h2>
          <div className="mt-3 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
            <p><strong className="text-white">Vote:</strong> They scan the QR code and answer without creating an account.</p>
            <p><strong className="text-white">Stay connected:</strong> They choose whether to share an email for follow-up and benefits.</p>
            <p><strong className="text-white">Share honestly:</strong> Eligible answers receive your review links and can submit a verification claim.</p>
          </div>
          <p className="mt-4 text-xs text-slate-500">Do not require or script a positive review. Benefits should be offered transparently and review requests should invite honest feedback.</p>
        </div>
      </section>
      )}

      {activeTab === "polls" && (
      <>
      <div className="mb-6">
        <h2 className="text-xl font-bold">Your polls</h2>
        <p className="mt-1 mb-3 text-sm text-slate-400">Search and filter the polls you need to manage.</p>
        <div className="flex flex-col md:flex-row gap-3">
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
      </div>

      {locationStats.length > 0 && (
        <details className="mb-6 border rounded bg-gray-900">
          <summary className="cursor-pointer p-4 text-lg font-bold">Locations overview</summary>
          <div className="px-4 pb-4">
            <p className="mb-3 text-sm text-slate-400">Votes collected per QR location name, useful for chains and multi-location venues to compare performance.</p>
            <div className="space-y-2 text-sm">
              {locationStats.map((location) => (
                <div key={location.name} className="flex items-center justify-between border-b border-gray-700 py-1">
                  <span>{location.name} ({location.polls} poll{location.polls === 1 ? "" : "s"})</span>
                  <span className="font-semibold text-teal-300">{location.votes} votes</span>
                </div>
              ))}
            </div>
          </div>
        </details>
      )}
      </>
      )}

      {activeTab === "engagement" && (
      <details className="mb-6 border rounded bg-gray-900">
        <summary className="cursor-pointer p-4 text-xl font-bold">QR locations</summary>
        <div className="px-4 pb-4">
        <p className="mb-3 text-sm text-slate-400">Create reusable QR locations, then point each location at the poll currently running there.</p>
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
      </details>
      )}

      {activeTab === "feedback" && (
      <details className="mb-6 border rounded bg-gray-900">
        <summary className="cursor-pointer p-4 text-xl font-bold">Messages from voters</summary>
        <div className="px-4 pb-4">
          <p className="mb-3 text-sm text-slate-400">Private messages submitted with a vote. Reply only when the voter provided an email address.</p>
          {organizerMessages.length === 0 ? <p className="text-sm text-slate-400">No voter messages yet.</p> : <div className="space-y-3">{organizerMessages.map((message) => (
            <article key={message.id} className="rounded border border-slate-700 p-3">
              <p>{message.message}</p>
              <p className="mt-2 text-xs text-slate-400">Poll #{message.poll_id} · {new Date(message.created_at).toLocaleString()}</p>
              {message.reply_email && <a className="mt-2 inline-block text-sm text-teal-300 underline" href={`mailto:${message.reply_email}`}>Reply to voter</a>}
            </article>
          ))}</div>}
        </div>
      </details>
      )}

      {activeTab === "feedback" && (
      <details className="mb-6 border rounded bg-gray-900" open>
        <summary className="cursor-pointer p-4 text-xl font-bold">External review benefit claims</summary>
        <div className="px-4 pb-4">
          <p className="mb-3 text-sm text-slate-400">Review the configured platform link and approve a benefit only after checking that the voter left honest feedback.</p>
          {reviewClaims.length === 0 ? <p className="text-sm text-slate-400">No review claims yet.</p> : <div className="space-y-3">{reviewClaims.map((claim) => {
            const poll = polls.find((item) => item.id === claim.poll_id);
            return <article key={claim.id} className="rounded border border-slate-700 p-3">
              <p className="font-semibold">Poll #{claim.poll_id}{poll ? ` - ${poll.question}` : ""}</p>
              <p className="mt-1 text-xs text-slate-400">Answers: {(claim.selected_answers || []).join(", ")} · {new Date(claim.created_at).toLocaleString()}</p>
              <p className="mt-1 text-sm">Status: <span className={claim.status === "approved" ? "text-emerald-300" : claim.status === "rejected" ? "text-red-300" : "text-amber-300"}>{claim.status}</span></p>
              {claim.status === "pending" && <div className="mt-2 flex gap-2"><button onClick={() => reviewBenefitClaim(claim.id, "approved")} className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-semibold">Approve benefit</button><button onClick={() => reviewBenefitClaim(claim.id, "rejected")} className="rounded bg-red-700 px-3 py-1.5 text-sm font-semibold">Reject claim</button></div>}
            </article>;
          })}</div>}
        </div>
      </details>
      )}

      {activeTab === "engagement" && (
      <>
      <details className="mb-6 border rounded bg-gray-900">
        <summary className="cursor-pointer p-4 text-xl font-bold">QR campaigns</summary>
        <div className="px-4 pb-4">
          <p className="mb-3 text-sm text-slate-400">Create a durable QR code per placement to measure scans, responses, and opted-in follow-up leads.</p>
          <p className="mb-3 text-xs text-slate-500">Tip: open a printed QR code while signed in to see its name and poll, and change them directly.</p>
          <div className="grid md:grid-cols-3 gap-3 mb-3">
            <input value={newCampaignName} onChange={(event) => setNewCampaignName(event.target.value)} className="border p-2 rounded text-black" placeholder="Lobby poster, receipt, table tent" />
            <select value={newCampaignPollId} onChange={(event) => setNewCampaignPollId(event.target.value)} className="border p-2 rounded text-black">
              <option value="">Choose a poll</option>
              {polls.map((poll) => <option key={poll.id} value={String(poll.id)}>#{poll.id} - {poll.question}</option>)}
            </select>
            <button onClick={handleCreateCampaign} className="bg-violet-600 text-white px-4 py-2 rounded font-semibold">Create campaign QR</button>
          </div>
          <div className="grid md:grid-cols-2 gap-3 mb-4"><input value={newCampaignPlacement} onChange={(event) => setNewCampaignPlacement(event.target.value)} className="border p-2 rounded text-black" placeholder="Placement label: lobby, receipt, table" /><input value={newCampaignVariant} onChange={(event) => setNewCampaignVariant(event.target.value)} className="border p-2 rounded text-black" placeholder="Variant label: A, bold headline" /></div>
          <details className="mb-4 rounded border border-slate-700">
            <summary className="cursor-pointer p-3 text-sm font-semibold">Customize the QR welcome screen</summary>
            <div className="grid gap-3 px-3 pb-3 md:grid-cols-2">
              <input value={newCampaignPortalTitle} onChange={(event) => setNewCampaignPortalTitle(event.target.value)} maxLength={120} className="border p-2 rounded text-black" placeholder="Welcome headline (optional)" />
              <input value={newCampaignPortalButton} onChange={(event) => setNewCampaignPortalButton(event.target.value)} maxLength={60} className="border p-2 rounded text-black" placeholder="Button text: Share your feedback" />
              <textarea value={newCampaignPortalMessage} onChange={(event) => setNewCampaignPortalMessage(event.target.value)} maxLength={280} className="border p-2 rounded text-black md:col-span-2" placeholder="Short welcome message (optional)" rows="3" />
            </div>
          </details>
          <details className="mb-4 rounded border border-slate-700">
            <summary className="cursor-pointer p-3 text-sm font-semibold">Generate multiple QR codes at once</summary>
            <div className="grid gap-3 px-3 pb-3 md:grid-cols-3">
              <input value={newBulkBaseName} onChange={(event) => setNewBulkBaseName(event.target.value)} className="border p-2 rounded text-black" placeholder="Base name: Table" />
              <input type="number" min="1" max="50" value={newBulkCount} onChange={(event) => setNewBulkCount(event.target.value)} className="border p-2 rounded text-black" placeholder="How many? (1-50)" />
              <select value={newBulkPollId} onChange={(event) => setNewBulkPollId(event.target.value)} className="border p-2 rounded text-black">
                <option value="">Assign later</option>
                {polls.map((poll) => <option key={poll.id} value={String(poll.id)}>#{poll.id} - {poll.question}</option>)}
              </select>
              <button onClick={handleBulkGenerateCampaigns} className="md:col-span-3 bg-violet-600 text-white px-4 py-2 rounded font-semibold">Generate QR codes</button>
              <p className="md:col-span-3 text-xs text-slate-500">Creates "Table 1", "Table 2"... You can scan or open each one later to assign or change its poll.</p>
            </div>
          </details>
          <div className="space-y-2">
            {qrCampaigns.length === 0 ? <p className="text-gray-400">No tracked QR campaigns yet.</p> : qrCampaigns.map((campaign) => {
              const url = `${window.location.origin}/qr/${campaign.token}`;
              return (
                <div key={campaign.id} className="gap-3 border border-gray-700 rounded p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{campaign.name}</p>
                      <p className="text-xs text-gray-400">Poll #{campaign.poll_id} · {campaign.placement_label || "Unlabeled placement"}{campaign.variant_label ? ` · ${campaign.variant_label}` : ""} · {campaign.is_active ? "Active" : "Paused"}{campaign.rotation_id ? " · Rotating" : ""}</p>
                      <p className="truncate text-xs text-blue-300">{url}</p>
                    </div>
                    <button onClick={() => navigator.clipboard.writeText(url)} className="shrink-0 bg-slate-700 text-white px-3 py-2 rounded font-semibold">Copy link</button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="text-xs text-slate-400">Change poll:</label>
                    <select
                      value={campaign.poll_id ? String(campaign.poll_id) : ""}
                      onChange={(event) => reassignQrCampaignPoll(campaign.id, event.target.value)}
                      className="border p-1.5 rounded text-black text-sm"
                    >
                      <option value="">Choose a poll</option>
                      {polls.map((poll) => <option key={poll.id} value={String(poll.id)}>#{poll.id} - {poll.question}</option>)}
                    </select>
                    <label className="text-xs text-slate-400">Or rotate:</label>
                    <select
                      value={campaign.rotation_id ? String(campaign.rotation_id) : ""}
                      onChange={(event) => assignCampaignRotation(campaign.id, event.target.value)}
                      className="border p-1.5 rounded text-black text-sm"
                    >
                      <option value="">No rotation</option>
                      {pollRotations.map((rotation) => <option key={rotation.id} value={String(rotation.id)}>{rotation.name}</option>)}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </details>

      <details className="mb-6 border rounded bg-gray-900">
        <summary className="cursor-pointer p-4 text-xl font-bold">Poll rotations</summary>
        <div className="px-4 pb-4">
          <p className="mb-3 text-sm text-slate-400">Build an ordered list of polls that automatically swap on a schedule, so a printed QR code stays fresh without any admin action.</p>
          <div className="grid gap-3 md:grid-cols-3 mb-3">
            <input value={newRotationName} onChange={(event) => setNewRotationName(event.target.value)} className="border p-2 rounded text-black" placeholder="Rotation name: Daily question" />
            <select value={newRotationFrequency} onChange={(event) => setNewRotationFrequency(event.target.value)} className="border p-2 rounded text-black">
              <option value="daily">Change daily</option>
              <option value="weekly">Change weekly</option>
            </select>
            <div className="flex gap-2">
              <select value={rotationPollToAdd} onChange={(event) => setRotationPollToAdd(event.target.value)} className="flex-1 border p-2 rounded text-black">
                <option value="">Choose a poll to add</option>
                {polls.map((poll) => <option key={poll.id} value={String(poll.id)}>#{poll.id} - {poll.question}</option>)}
              </select>
              <button onClick={addPollToRotationDraft} className="bg-slate-700 text-white px-3 py-2 rounded font-semibold">Add</button>
            </div>
          </div>
          {newRotationPollIds.length > 0 && (
            <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm">
              {newRotationPollIds.map((pollId, index) => {
                const poll = polls.find((item) => String(item.id) === String(pollId));
                return (
                  <li key={`${pollId}-${index}`} className="flex items-center justify-between gap-2">
                    <span>{poll ? `#${poll.id} - ${poll.question}` : `Poll #${pollId}`}</span>
                    <button onClick={() => removePollFromRotationDraft(index)} className="text-xs text-red-300 underline">Remove</button>
                  </li>
                );
              })}
            </ol>
          )}
          <button onClick={handleCreateRotation} className="bg-violet-600 text-white px-4 py-2 rounded font-semibold">Create rotation</button>
          <div className="mt-4 space-y-2 text-sm">
            {pollRotations.length === 0 ? (
              <p className="text-gray-400">No poll rotations yet.</p>
            ) : (
              pollRotations.map((rotation) => (
                <div key={rotation.id} className="flex items-center justify-between border-b border-gray-700 py-2">
                  <span>{rotation.name} · {rotation.frequency} · {rotation.poll_ids.length} polls</span>
                  <button onClick={() => handleDeleteRotation(rotation.id)} className="text-xs text-red-300 underline">Delete</button>
                </div>
              ))
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">Assign a rotation to a QR campaign above using "Or rotate".</p>
        </div>
      </details>

      <details className="mb-6 border rounded bg-gray-900">
        <summary className="cursor-pointer p-4 text-xl font-bold">Reward redemptions</summary>
        <div className="px-4 pb-4">
          <p className="mb-3 text-sm text-slate-400">When a customer shows their reward code, enter it here to mark it redeemed and track how often it's used.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input value={redeemCode} onChange={(event) => setRedeemCode(event.target.value)} className="flex-1 border p-2 rounded text-black" placeholder="Enter the reward code" />
            <button onClick={handleRedeemCode} className="bg-teal-500 text-slate-950 px-4 py-2 rounded font-semibold">Mark redeemed</button>
          </div>
          {redeemMessage && <p className="mt-3 text-sm text-amber-300">{redeemMessage}</p>}
          <div className="mt-4 space-y-2 text-sm">
            {polls.filter((poll) => poll.reward_code).length === 0 ? (
              <p className="text-gray-400">No polls have a reward code yet. Add one under "After voting" when creating or editing a poll.</p>
            ) : (
              polls.filter((poll) => poll.reward_code).map((poll) => (
                <div key={poll.id} className="flex items-center justify-between border-b border-gray-700 py-1">
                  <span>#{poll.id} - {poll.question} · code {poll.reward_code}</span>
                  <span className="text-teal-300">{poll.reward_redeemed_count || 0} redeemed</span>
                </div>
              ))
            )}
          </div>
        </div>
      </details>

      <details className="mb-6 border rounded bg-gray-900">
        <summary className="cursor-pointer p-4 text-xl font-bold">Prize draws</summary>
        <div className="px-4 pb-4">
          <p className="mb-3 text-sm text-slate-400">Enable a prize draw when creating or editing a poll. Entrants are voters who opted in with their email. Pick a winner here when you're ready.</p>
          <div className="space-y-2 text-sm">
            {polls.filter((poll) => poll.raffle_enabled).length === 0 ? (
              <p className="text-gray-400">No polls have a prize draw enabled yet.</p>
            ) : (
              polls.filter((poll) => poll.raffle_enabled).map((poll) => (
                <div key={poll.id} className="border-b border-gray-700 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span>#{poll.id} - {poll.question} · prize: {poll.raffle_prize || "Not set"}</span>
                    <button onClick={() => pickRaffleWinner(poll.id)} className="shrink-0 bg-amber-500 text-slate-950 px-3 py-1.5 rounded font-semibold">Pick a winner</button>
                  </div>
                  {poll.raffle_winner_email && (
                    <p className="mt-1 text-xs text-amber-300">Winner: {poll.raffle_winner_email} ({new Date(poll.raffle_winner_picked_at).toLocaleString()})</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </details>
      </>
      )}

      {activeTab === "feedback" && (
      <details className="mb-6 border rounded bg-gray-900">
        <summary className="cursor-pointer p-4 text-xl font-bold">Answer sentiment (AI)</summary>
        <div className="px-4 pb-4">
          <p className="mb-3 text-sm text-slate-400">Free-text answers voters add are automatically classified once an OpenAI key is configured.</p>
          <div className="space-y-2 text-sm">
            {Object.keys(sentimentSummary).length === 0 ? (
              <p className="text-gray-400">No classified answers yet.</p>
            ) : (
              Object.entries(sentimentSummary).map(([pollId, counts]) => {
                const total = counts.positive + counts.neutral + counts.negative;
                const poll = polls.find((item) => String(item.id) === String(pollId));
                return (
                  <div key={pollId} className="border-b border-gray-700 py-2">
                    <span>#{pollId}{poll ? ` - ${poll.question}` : ""}: </span>
                    <span className="text-emerald-300">{Math.round((counts.positive / total) * 100)}% positive</span>
                    {" · "}
                    <span className="text-slate-300">{Math.round((counts.neutral / total) * 100)}% neutral</span>
                    {" · "}
                    <span className="text-red-300">{Math.round((counts.negative / total) * 100)}% negative</span>
                    <span className="text-gray-500"> ({total} answers)</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </details>
      )}

      {activeTab === "engagement" && (
      <details className="mb-6 border rounded bg-gray-900">
        <summary className="cursor-pointer p-4 text-xl font-bold">Lead nurture emails</summary>
        <div className="px-4 pb-4 space-y-3">
          <p className="text-sm text-slate-400">Automatically email voters who opted in for follow-up (or a prize draw) right after they vote.</p>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={nurtureSettings.is_enabled} onChange={(event) => setNurtureSettings((current) => ({ ...current, is_enabled: event.target.checked }))} />
            <span>Send a nurture email automatically</span>
          </label>
          <input value={nurtureSettings.subject || ""} onChange={(event) => setNurtureSettings((current) => ({ ...current, subject: event.target.value }))} className="w-full border p-2 rounded text-black" placeholder="Email subject: Thanks for your feedback!" />
          <textarea value={nurtureSettings.message || ""} onChange={(event) => setNurtureSettings((current) => ({ ...current, message: event.target.value }))} rows="4" className="w-full border p-2 rounded text-black" placeholder="Email message body" />
          <button onClick={saveNurtureSettings} className="bg-blue-600 text-white px-4 py-2 rounded font-semibold">Save nurture email settings</button>
          <p className="text-xs text-slate-500">Delivery requires the RESEND_API_KEY and REPORT_FROM_EMAIL server settings, same as weekly reports.</p>
        </div>
      </details>
      )}

      {activeTab === "feedback" && (
      <>
      <details className="mb-6 border rounded bg-gray-900">
        <summary className="cursor-pointer p-4 text-xl font-bold">"We heard you" updates</summary>
        <div className="px-4 pb-4">
          <p className="mb-3 text-sm text-slate-400">Post a public update when you act on feedback (e.g., "We fixed the slow Wi-Fi you mentioned"). It shows on the poll's public results page.</p>
          <div className="grid gap-3 md:grid-cols-3 mb-3">
            <textarea value={newUpdateMessage} onChange={(event) => setNewUpdateMessage(event.target.value)} rows="2" maxLength={500} className="md:col-span-2 border p-2 rounded text-black" placeholder="We heard you and..." />
            <select value={newUpdatePollId} onChange={(event) => setNewUpdatePollId(event.target.value)} className="border p-2 rounded text-black">
              <option value="">All polls</option>
              {polls.map((poll) => <option key={poll.id} value={String(poll.id)}>#{poll.id} - {poll.question}</option>)}
            </select>
          </div>
          <button onClick={postWorkspaceUpdate} className="bg-teal-500 text-slate-950 px-4 py-2 rounded font-semibold">Post update</button>
          <div className="mt-4 space-y-2 text-sm">
            {workspaceUpdates.length === 0 ? (
              <p className="text-gray-400">No updates posted yet.</p>
            ) : (
              workspaceUpdates.map((update) => (
                <div key={update.id} className="flex items-start justify-between gap-3 border-b border-gray-700 py-2">
                  <div>
                    <p>{update.message}</p>
                    <p className="text-xs text-gray-500">{update.poll_id ? `Poll #${update.poll_id}` : "All polls"} · {new Date(update.created_at).toLocaleString()}</p>
                  </div>
                  <button onClick={() => deleteWorkspaceUpdate(update.id)} className="shrink-0 text-xs text-red-300 underline">Delete</button>
                </div>
              ))
            )}
          </div>
        </div>
      </details>

      <details className="mb-6 border rounded bg-gray-900">
        <summary className="cursor-pointer p-4 text-xl font-bold">Feedback recovery and weekly reports</summary>
        <div className="px-4 pb-4 space-y-5">
          <div><p className="mb-2 text-sm text-slate-400">Open alerts, including low-score/answer matches and automatic vote-volume drop warnings (checked daily).</p><div className="text-sm">{feedbackAlerts.filter((alert) => alert.status !== "resolved").length ? feedbackAlerts.filter((alert) => alert.status !== "resolved").map((alert) => <div key={alert.id} className="flex items-center justify-between gap-2 border-b border-gray-700 py-1"><span>Poll #{alert.poll_id}: {alert.answer}</span><button onClick={async () => { const { error } = await supabase.from("feedback_alerts").update({ status: "resolved" }).eq("id", alert.id); if (!error) setFeedbackAlerts((current) => current.map((item) => item.id === alert.id ? { ...item, status: "resolved" } : item)); }} className="shrink-0 text-xs text-emerald-300 underline">Resolve</button></div>) : <p className="text-gray-400">No open alerts.</p>}</div></div>
          <div><p className="mb-2 text-sm text-slate-400">Create alerts for low numeric scores or an exact answer. New matching votes create manager-only alerts.</p><div className="grid md:grid-cols-4 gap-3"><select value={newRulePollId} onChange={(event) => setNewRulePollId(event.target.value)} className="border p-2 rounded text-black"><option value="">Choose a poll</option>{polls.map((poll) => <option key={poll.id} value={poll.id}>#{poll.id} - {poll.question}</option>)}</select><select value={newRuleType} onChange={(event) => setNewRuleType(event.target.value)} className="border p-2 rounded text-black"><option value="low_score">Low score</option><option value="answer_match">Exact answer</option></select>{newRuleType === "low_score" ? <input type="number" min="0" max="10" value={newRuleThreshold} onChange={(event) => setNewRuleThreshold(event.target.value)} className="border p-2 rounded text-black" placeholder="Score at or below" /> : <input value={newRuleAnswer} onChange={(event) => setNewRuleAnswer(event.target.value)} className="border p-2 rounded text-black" placeholder="Answer trigger" />}<button onClick={createAlertRule} className="bg-violet-600 text-white px-4 py-2 rounded font-semibold">Add alert rule</button></div><div className="mt-3 text-sm">{alertRules.length ? alertRules.map((rule) => <p key={rule.id} className="border-b border-gray-700 py-1">Poll #{rule.poll_id}: {rule.trigger_type === "low_score" ? `score at or below ${rule.score_threshold}` : `answer “${rule.answer_match}”`}</p>) : <p className="text-gray-400">No feedback alert rules yet.</p>}</div></div>
          <div><p className="mb-2 text-sm text-slate-400">Turn an alert into a recovery task and track completion.</p><div className="grid md:grid-cols-3 gap-3"><input value={newTaskTitle} onChange={(event) => setNewTaskTitle(event.target.value)} className="border p-2 rounded text-black" placeholder="Call customer, review service issue" /><select value={newTaskAlertId} onChange={(event) => setNewTaskAlertId(event.target.value)} className="border p-2 rounded text-black"><option value="">No linked alert</option>{feedbackAlerts.filter((alert) => alert.status !== "resolved").map((alert) => <option key={alert.id} value={alert.id}>#{alert.id} Poll #{alert.poll_id}: {alert.answer}</option>)}</select><button onClick={createRecoveryTask} className="bg-emerald-600 text-white px-4 py-2 rounded font-semibold">Add recovery task</button></div><div className="mt-3 text-sm">{recoveryTasks.length ? recoveryTasks.map((task) => <div key={task.id} className="flex justify-between border-b border-gray-700 py-1"><span>{task.title}</span><select value={task.status} onChange={async (event) => { const status = event.target.value; const { error } = await supabase.from("feedback_recovery_tasks").update({ status, completed_at: status === "done" ? new Date().toISOString() : null }).eq("id", task.id); if (!error) setRecoveryTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item)); }} className="text-black"><option value="open">Open</option><option value="in_progress">In progress</option><option value="done">Done</option></select></div>) : <p className="text-gray-400">No recovery tasks yet.</p>}</div></div>
          <div><p className="mb-2 text-sm text-slate-400">The Monday Vercel cron prepares a workspace summary. It delivers through Resend only when the server key is configured.</p><div className="grid md:grid-cols-3 gap-3 items-center"><input type="email" value={reportSettings.recipient_email} onChange={(event) => setReportSettings((current) => ({ ...current, recipient_email: event.target.value }))} className="border p-2 rounded text-black" placeholder="manager@example.com" /><label className="flex gap-2 items-center"><input type="checkbox" checked={reportSettings.is_enabled} onChange={(event) => setReportSettings((current) => ({ ...current, is_enabled: event.target.checked }))} /> Enable weekly report</label><button onClick={saveReportSettings} className="bg-blue-600 text-white px-4 py-2 rounded font-semibold">Save report settings</button></div></div>
        </div>
      </details>
      </>
      )}

      {activeTab === "settings" && (
      <>
      <details className="mb-6 border rounded bg-gray-900">
        <summary className="cursor-pointer p-4 text-xl font-bold">Workspace settings</summary>
        <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-slate-400">Set the name, logo, colors, and access level used across your workspace.</p>
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
          <input
            type="url"
            value={workspaceProfile.webhookUrl}
            onChange={(event) => setWorkspaceProfile((current) => ({ ...current, webhookUrl: event.target.value }))}
            className="border p-2 rounded text-black md:col-span-2"
            placeholder="Webhook URL (optional) - get notified in Slack/Zapier/Sheets on every vote"
          />
          <label className="block font-semibold md:col-span-2">
            Auto-delete votes after (days, optional)
            <input
              type="number"
              min="7"
              max="3650"
              value={workspaceProfile.voteRetentionDays}
              onChange={(event) => setWorkspaceProfile((current) => ({ ...current, voteRetentionDays: event.target.value }))}
              className="mt-1 w-full border p-2 rounded text-black"
              placeholder="Leave blank to keep votes forever"
            />
          </label>
          <label className="block font-semibold">
            Button and link color
            <span className="mt-1 block text-xs font-normal text-slate-400">Used for actions people can click.</span>
            <input
              type="color"
              value={workspaceProfile.primaryColor}
              onChange={(event) => setWorkspaceProfile((current) => ({ ...current, primaryColor: event.target.value }))}
              className="w-full border p-1 rounded mt-1 h-11"
            />
          </label>
          <label className="block font-semibold">
            Page background color
            <span className="mt-1 block text-xs font-normal text-slate-400">Used behind your public poll pages.</span>
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
      </details>

      <details className="mb-6 border rounded bg-gray-900">
        <summary className="cursor-pointer p-4 text-xl font-bold">Developer API</summary>
        <div className="px-4 pb-4">
          <p className="mb-3 text-sm text-slate-400">Generate a key to pull your workspace summary from <code>/api/v1-summary</code> with an <code>Authorization: Bearer &lt;key&gt;</code> header.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input value={newApiKeyLabel} onChange={(event) => setNewApiKeyLabel(event.target.value)} className="flex-1 border p-2 rounded text-black" placeholder="Label: BI dashboard, Zapier" />
            <button onClick={handleCreateApiKey} className="bg-violet-600 text-white px-4 py-2 rounded font-semibold">Generate key</button>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {apiKeys.length === 0 ? (
              <p className="text-gray-400">No API keys yet.</p>
            ) : (
              apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between border-b border-gray-700 py-1">
                  <span>{key.label || "Untitled key"} · created {new Date(key.created_at).toLocaleDateString()}{key.last_used_at ? ` · last used ${new Date(key.last_used_at).toLocaleDateString()}` : ""}</span>
                  <button onClick={() => handleDeleteApiKey(key.id)} className="shrink-0 text-xs text-red-300 underline">Delete</button>
                </div>
              ))
            )}
          </div>
        </div>
      </details>

      <details className="mb-6 border rounded bg-gray-900">
        <summary className="cursor-pointer p-4 text-xl font-bold">Team access</summary>
        <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-slate-400">Invite colleagues and choose what they can manage. Add an email to send them a real sign-in invite; leave it blank to just note a name.</p>
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
          disabled={!permission.canManageWorkspace || invitingMember}
          className={`px-4 py-2 rounded font-semibold mb-4 ${
            permission.canManageWorkspace ? "bg-indigo-600 text-white" : "bg-gray-600 text-gray-300 cursor-not-allowed"
          }`}
        >
          {invitingMember ? "Sending invite..." : newMemberEmail.trim() ? "Send invite" : "Add team member"}
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
      </details>

      <details className="mb-6 border rounded bg-gray-900">
        <summary className="cursor-pointer p-4 text-xl font-bold">Recent activity</summary>
        <div className="px-4 pb-4">
        <p className="mb-3 text-sm text-slate-400">Review the latest administrative actions in this workspace.</p>
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
      </details>
      </>
      )}

      {activeTab === "polls" && (
      <>
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
          <div
            key={poll.id}
            className={`border rounded-lg bg-slate-900 p-5 shadow-sm ${
              String(poll.id) === selectedPollId ? "border-teal-400 ring-1 ring-teal-400" : "border-slate-700"
            }`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Poll #{poll.id}</p>
                <h2 className="text-xl font-semibold">{poll.question}</h2>
              </div>
              {String(poll.id) === selectedPollId && (
                <span className="w-fit rounded bg-teal-400/15 px-2 py-1 text-xs font-semibold text-teal-300">Newly created</span>
              )}
            </div>

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

            <div className="mt-4 flex gap-2 flex-wrap">
              <Link to={`/results/${poll.id}`} className="rounded bg-slate-100 px-3 py-2 font-semibold text-slate-950">
                View Results
              </Link>

              <button onClick={() => { setShowQR(showQR === poll.id ? null : poll.id); if (workspaceUserId) { localStorage.setItem(`ivote_qr_shared_${workspaceUserId}`, "true"); setQrShared(true); } }} className="rounded border border-slate-500 px-3 py-2 font-semibold text-slate-100">
                {showQR === poll.id ? "Hide QR" : "Open QR tools"}
              </button>

              <Link to={`/vote/${poll.id}`} className="rounded border border-slate-600 px-3 py-2 font-semibold text-slate-200">
                Open vote page
              </Link>

              <details className="relative">
                <summary className="cursor-pointer rounded border border-slate-600 px-3 py-2 font-semibold text-slate-300">More actions</summary>
                <div className="absolute right-0 z-10 mt-2 grid min-w-56 gap-1 rounded border border-slate-700 bg-slate-950 p-2 shadow-xl">
                  <Link to={`/edit/${poll.id}`} className={`rounded px-3 py-2 text-left ${canEditPolls ? "hover:bg-slate-800" : "pointer-events-none text-slate-500"}`}>Edit poll</Link>
                  <button onClick={() => copyShareLink(poll)} className="rounded px-3 py-2 text-left hover:bg-slate-800">Copy voting link</button>
                  <button onClick={() => duplicatePoll(poll)} disabled={!canDuplicatePolls} className="rounded px-3 py-2 text-left hover:bg-slate-800 disabled:text-slate-500">Duplicate poll</button>
                  <button onClick={() => reuseQR(poll)} disabled={!canReuseQr} className="rounded px-3 py-2 text-left hover:bg-slate-800 disabled:text-slate-500">Assign existing QR</button>
                  <button onClick={() => exportPollCsv(poll)} disabled={!canExportResults} className="rounded px-3 py-2 text-left hover:bg-slate-800 disabled:text-slate-500">Export responses CSV</button>
                  <button onClick={() => copyEmbedWidgetSnippet(poll)} className="rounded px-3 py-2 text-left hover:bg-slate-800">Copy feedback widget embed code</button>
                  <button onClick={() => copyTrustBadgeSnippet(poll)} className="rounded px-3 py-2 text-left hover:bg-slate-800">Copy trust badge embed code</button>
                  <button onClick={() => closePoll(poll)} disabled={!canClosePolls} className="rounded px-3 py-2 text-left hover:bg-slate-800 disabled:text-slate-500">{isClosed ? "Reopen poll" : "Close poll"}</button>
                  <button onClick={() => deletePoll(poll.id)} disabled={!canDeletePolls} className="rounded px-3 py-2 text-left text-red-300 hover:bg-red-950 disabled:text-slate-500">Delete poll</button>
                </div>
              </details>
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
                <div
                  className="mx-auto flex max-w-sm flex-col items-center rounded-lg p-6 text-center"
                  style={{
                    background: generatedPosterImage
                      ? `url("${generatedPosterImage}") center / cover no-repeat, ${generateAiQrStyle(qrStyleSeed, qrStylePreset).background}`
                      : generateAiQrStyle(qrStyleSeed, qrStylePreset).background,
                    boxShadow: generateAiQrStyle(qrStyleSeed, qrStylePreset).shadow,
                    borderRadius: getQrPrintFormatConfig().shape === "round" ? "50%" : getQrPrintFormatConfig().shape === "ticket" ? "18px 18px 4px 4px" : undefined
                  }}
                >
                  {workspaceProfile.logoUrl && (
                    <img
                      src={workspaceProfile.logoUrl}
                      alt={`${workspaceProfile.companyName || "Workspace"} logo`}
                      className="mb-3 max-h-10 max-w-32 object-contain"
                    />
                  )}
                  <p className="mb-3 text-sm font-bold text-slate-900">{workspaceProfile.companyName || "iVote"}</p>
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <img
                      ref={qrRef}
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(poll.stable_short_url || poll.short_url || `${window.location.origin}/vote/${poll.id}`)}`}
                      alt="QR Code"
                      className="h-40 w-40"
                    />
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-700">Scan to vote</p>
                </div>
                {(poll.stable_short_url || poll.short_url) && (
                  <p
                    className="text-blue-400 underline cursor-pointer text-center mt-3"
                    onClick={() => navigator.clipboard.writeText(poll.stable_short_url || poll.short_url)}
                  >
                    {poll.stable_short_url || poll.short_url}
                  </p>
                )}
                <div className="mt-4 grid md:grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Print format</label>
                    <select
                      value={qrPrintFormat}
                      onChange={(event) => setQrPrintFormat(event.target.value)}
                      className="border p-2 rounded text-black w-full"
                    >
                      <option value="letter">Letter</option>
                      <option value="a4">A4</option>
                      <option value="a5">A5</option>
                      <option value="a6">A6</option>
                      <option value="a3">A3</option>
                      <option value="postcard">Postcard</option>
                      <option value="beerHolder">Round beer holder</option>
                      <option value="ticket">Ticket</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Visual style</label>
                    <select
                      value={qrStylePreset}
                      onChange={(event) => setQrStylePreset(event.target.value)}
                      className="border p-2 rounded text-black w-full"
                    >
                      <option value="brand">Brand colors</option>
                      <option value="celebration">Celebration</option>
                      <option value="fresh">Fresh and energetic</option>
                      <option value="premium">Premium and minimal</option>
                    </select>
                  </div>
                  <div>
                    <button
                      onClick={() => setQrStyleSeed((prev) => prev + 1)}
                      className="bg-fuchsia-600 text-white px-4 py-2 rounded font-semibold w-full"
                    >
                      Try another poster style
                    </button>
                    <p className="mt-2 text-xs text-slate-400">The preview changes immediately and is used when you print.</p>
                  </div>
                </div>
                <div className="mt-4 border border-slate-700 rounded p-4">
                  <label className="block text-sm font-semibold mb-2">Create an AI poster background</label>
                  <p className="mb-3 text-xs text-slate-400">Describe the visual direction. Your workspace logo is overlaid separately so it stays sharp and your QR code remains scannable.</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={aiImagePrompt}
                      onChange={(event) => setAiImagePrompt(event.target.value)}
                      maxLength={280}
                      className="min-w-0 flex-1 border p-2 rounded text-black"
                      placeholder="Modern blue city lights for an event poll"
                    />
                    <button
                      onClick={() => generatePosterImage(poll)}
                      disabled={imageGenerationStatus === "generating"}
                      className="bg-violet-600 text-white px-4 py-2 rounded font-semibold disabled:opacity-60"
                    >
                      {imageGenerationStatus === "generating" ? "Creating image..." : "Generate image"}
                    </button>
                  </div>
                  {imageGenerationError && <p className="mt-2 text-sm text-red-400">{imageGenerationError}</p>}
                  {imageGenerationStatus === "ready" && (
                    <div className="mt-3 flex items-center justify-between gap-3 text-sm text-emerald-300">
                      <span>AI background ready for preview and printing.</span>
                      <button
                        onClick={() => {
                          setGeneratedPosterImage("");
                          setImageGenerationStatus("idle");
                        }}
                        className="text-slate-300 underline"
                      >
                        Remove image
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-4 justify-center flex-wrap">
                  <button onClick={() => downloadQR(poll.id)} className="bg-blue-600 text-white px-4 py-2 rounded font-semibold">
                    Download QR
                  </button>

                  <button onClick={() => printQR(poll)} className="bg-green-600 text-white px-4 py-2 rounded font-semibold">
                    Print QR
                  </button>
                </div>
              </div>
            )}
          </div>
         );
       })}
     </div>
     </>
     )}
   </div>
 );
}
