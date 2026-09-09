import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";
import { isRestrictedTopic } from "../lib/restrictedContent";
import { readPollMeta, isPollClosed } from "../lib/pollMeta";
import { getPollBranding } from "../lib/pollBranding";
import { dispatchWorkspaceWebhook } from "../lib/webhooks";

const TRANSLATION_LANGUAGES = [
  { value: "original", label: "Original" },
  { value: "en", label: "English" },
  { value: "it", label: "Italiano" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
  { value: "ar", label: "العربية" },
  { value: "zh-CN", label: "中文 (简体)" }
];

export default function Vote() {
  const { pollId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [duplicate, setDuplicate] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [newAnswer, setNewAnswer] = useState("");
  const [userAnswers, setUserAnswers] = useState([]);
  const [reportingAnswer, setReportingAnswer] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [translationLanguage, setTranslationLanguage] = useState("original");
  const [translatedQuestion, setTranslatedQuestion] = useState("");
  const [translatedAnswers, setTranslatedAnswers] = useState({});
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationError, setTranslationError] = useState("");
  const [followUpEmail, setFollowUpEmail] = useState("");
  const [followUpConsent, setFollowUpConsent] = useState(false);
  const [organizerMessage, setOrganizerMessage] = useState("");
  const [messageReplyEmail, setMessageReplyEmail] = useState("");
  const campaignId = Number(searchParams.get("campaign"));
  const validCampaignId = Number.isSafeInteger(campaignId) && campaignId > 0 ? campaignId : null;

  const pollMeta = poll ? readPollMeta(poll.id) : {};
  const alreadyVoted = localStorage.getItem(`voted_${pollId}`);

  async function loadUserAnswers(targetPollId = pollId) {
    const { data, error } = await supabase
      .from("user_answers")
      .select("answer")
      .eq("poll_id", targetPollId)
      .eq("is_hidden", false);

    if (error) {
      console.error(error);
      return;
    }

    setUserAnswers((data ?? []).filter((row) => typeof row.answer === "string" && row.answer.trim()));
  }

  useEffect(() => {
    async function loadPoll() {
      const { data, error } = await supabase
        .rpc("get_public_poll", { target_poll_id: Number(pollId) })
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
      user_id: user?.id || null,
      campaign_id: validCampaignId
    }));

    const isAdmin = !!user;

    const { data: insertedVotes, error } = await supabase
      .from("votes")
      .insert(rows)
      .select("id, workspace_id");

    if (error) {
      if (error.code === "23505") {
        setDuplicate(true);
        return;
      }

      console.error(error);
      return;
    }

    const workspaceId = insertedVotes?.[0]?.workspace_id;
    if (workspaceId && insertedVotes?.[0]?.id) {
      dispatchWorkspaceWebhook(workspaceId, "vote_submitted", insertedVotes[0].id);
    }

    if (!isAdmin) {
      localStorage.setItem(`voted_${poll.id}`, "true");
    }

    let emailBenefitEligible = false;
    let visitCount = 0;
    if (followUpConsent && followUpEmail.trim()) {
      const { data: leadResult, error: leadError } = await supabase.rpc("capture_voter_lead", {
        target_poll_id: poll.id,
        target_campaign_id: validCampaignId,
        contact_email: followUpEmail.trim(),
        has_consented: true
      }).single();
      if (leadError) console.error("Optional follow-up sign-up failed", leadError);
      else {
        emailBenefitEligible = poll.email_benefit_type && poll.email_benefit_type !== "none";
        visitCount = leadResult?.visit_count || 0;
        const leadId = leadResult?.id;
        if (workspaceId && leadId) {
        dispatchWorkspaceWebhook(workspaceId, "lead_captured", leadId);
        fetch("/api/send-lead-nurture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, leadId })
        }).catch((nurtureError) => console.error("Nurture email dispatch failed", nurtureError));
        }
      }
    }

    if (organizerMessage.trim()) {
      const { error: messageError } = await supabase.rpc("send_organizer_message", {
        target_poll_id: poll.id,
        target_campaign_id: validCampaignId,
        message_text: organizerMessage.trim(),
        contact_email: messageReplyEmail.trim() || null
      });
      if (messageError) console.error("Optional organizer message failed", messageError);
    }

    setSubmitted(true);

    if (isAdmin) {
      navigate("/admin");
    } else {
      const answerCount = Array.isArray(poll.answers) ? poll.answers.length : 0;
      const positions = answersToSubmit.map((answer) => poll.answers.indexOf(answer)).filter((index) => index >= 0);
      const isPositiveVote = answerCount <= 1 || positions.length === 0
        ? true
        : Math.min(...positions) <= Math.floor((answerCount - 1) / 2);
      // Every respondent is offered the same public review link, regardless of
      // their answer. Gating the review ask by sentiment ("review only if happy")
      // violates Google/Tripadvisor review policies, so this must never depend on
      // isPositiveVote or on which specific answer was chosen.
      const reviewEligible = Boolean(poll.review_url)
        || (Array.isArray(poll.review_platforms) && poll.review_platforms.length > 0);
      const thanksParams = new URLSearchParams({
        poll: String(poll.id),
        positive: isPositiveVote ? "1" : "0",
        answers: JSON.stringify(answersToSubmit)
      });
      if (emailBenefitEligible) thanksParams.set("emailBenefit", "1");
      if (reviewEligible) thanksParams.set("reviewEligible", "1");
      if (visitCount > 0) thanksParams.set("visits", String(visitCount));
      if (followUpConsent && followUpEmail.trim()) thanksParams.set("contactEmail", followUpEmail.trim());
      navigate(`/thanks?${thanksParams.toString()}`);
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

    const { data: insertedAnswer, error } = await supabase
      .from("user_answers")
      .insert({
        poll_id: poll.id,
        answer: trimmed
      })
      .select("id")
      .single();

    if (error) {
      console.error(error);
      alert("Error saving answer");
      return;
    }

    if (insertedAnswer?.id) {
      fetch("/api/classify-sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answerId: insertedAnswer.id })
      }).catch((sentimentError) => console.error("Sentiment classification dispatch failed", sentimentError));
    }

    setNewAnswer("");
    setShowAddField(false);
    await loadUserAnswers(poll.id);
  }

  async function reportAnswer(answer) {
    const reason = window.prompt("Why are you reporting this answer? Use: offensive, personal_data, spam, or other.", "offensive");
    if (!reason) return;
    setReportingAnswer(answer);
    const { error } = await supabase.rpc("report_public_user_answer", {
      target_poll_id: poll.id,
      target_answer: answer,
      report_reason: reason.trim().toLowerCase()
    });
    setReportingAnswer("");
    setReportMessage(error ? error.message : "Thank you. The organizer will review this answer.");
  }

  async function translateText(text, targetLanguage) {
    const normalizedText = String(text ?? "").trim();
    if (!normalizedText) return "";

    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLanguage)}&dt=t&q=${encodeURIComponent(normalizedText)}`
    );

    if (!response.ok) {
      throw new Error(`Translation request failed with status ${response.status}`);
    }

    const data = await response.json();
    const translated = Array.isArray(data?.[0])
      ? data[0].map((item) => item?.[0] ?? "").join("").trim()
      : "";

    if (!translated) {
      throw new Error("Translation service returned an empty response.");
    }

    return translated;
  }

  const allAnswers = useMemo(
    () =>
      Array.from(
        new Set([
          ...(Array.isArray(poll?.answers) ? poll.answers : []),
          ...userAnswers.map((u) => u.answer)
        ])
      ),
    [poll?.answers, userAnswers]
  );
  const branding = getPollBranding(poll ?? {});
  const questionForDisplay = translationLanguage === "original"
    ? (poll?.question ?? "")
    : translatedQuestion || (poll?.question ?? "");

  useEffect(() => {
    let cancelled = false;

    async function runTranslation() {
      if (!poll || !Array.isArray(poll.answers)) {
        setTranslatedQuestion("");
        setTranslatedAnswers({});
        setTranslationLoading(false);
        setTranslationError("");
        return;
      }

      if (translationLanguage === "original") {
        setTranslatedQuestion("");
        setTranslatedAnswers({});
        setTranslationLoading(false);
        setTranslationError("");
        return;
      }

      setTranslationLoading(true);
      setTranslationError("");

      try {
        const translatedQuestionText = await translateText(poll.question, translationLanguage);
        const translatedPairs = await Promise.all(
          allAnswers.map(async (answer) => [answer, await translateText(answer, translationLanguage)])
        );

        if (cancelled) return;

        setTranslatedQuestion(translatedQuestionText);
        setTranslatedAnswers(Object.fromEntries(translatedPairs));
      } catch (error) {
        if (cancelled) return;
        console.error(error);
        setTranslationError(error.message || "Unable to translate poll content.");
      } finally {
        if (!cancelled) setTranslationLoading(false);
      }
    }

    runTranslation();

    return () => {
      cancelled = true;
    };
  }, [allAnswers, poll, translationLanguage]);

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
            <a href="/admin" className="text-blue-600 underline">Back to workspace</a>
          </div>
        </div>
      </Layout>
    );

  return (
    <Layout>
      <div
        className="max-w-xl mx-auto p-5 sm:p-8 rounded-lg border shadow-lg"
        style={{ borderColor: branding.primaryColor, backgroundColor: `${branding.accentColor}20` }}
      >
        {branding.logoUrl && (
          <img
            src={branding.logoUrl}
            alt={`${branding.brandName || "Brand"} logo`}
            className="mx-auto mb-3 max-h-16 object-contain"
          />
        )}
        {branding.brandName && (
          <p className="text-center text-sm font-semibold mb-4" style={{ color: branding.primaryColor }}>
            {branding.brandName}
          </p>
        )}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your vote</p>
            <p className="text-sm text-slate-300">
              {poll.multiple_choice ? "Choose one or more answers" : "Choose one answer"}
            </p>
          </div>
          <label className="text-right text-xs text-slate-300">
            Language
          <select
            value={translationLanguage}
            onChange={(event) => setTranslationLanguage(event.target.value)}
            className="mt-1 block border rounded p-2 text-black w-full min-w-32"
          >
            {TRANSLATION_LANGUAGES.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
          </label>
          {translationLoading && <p className="text-xs text-gray-400 mt-2">Translating poll content...</p>}
          {translationError && <p className="text-xs text-red-400 mt-2">{translationError}</p>}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center">{questionForDisplay}</h1>

        <div className="space-y-3">
          {allAnswers.map((answer) => {
            const isUserAnswer = userAnswers.some((item) => item.answer === answer);
            return <div key={answer} className="flex items-center gap-2">
            <label
              className={`flex flex-1 items-center gap-3 border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedAnswers.includes(answer) ? "border-2 bg-white/10" : "border-slate-600 hover:border-slate-400"
              }`}
              style={selectedAnswers.includes(answer) ? { borderColor: branding.primaryColor } : undefined}
            >
              <input
                type={(poll.multiple_choice ?? poll.allow_multiple) ? "checkbox" : "radio"}
                checked={selectedAnswers.includes(answer)}
                onChange={() => handleSelect(answer)}
                className="h-5 w-5"
              />
              <span className="font-medium">{translationLanguage === "original" ? answer : translatedAnswers[answer] || answer}</span>
            </label>
            {isUserAnswer && <button type="button" onClick={() => reportAnswer(answer)} disabled={reportingAnswer === answer} className="shrink-0 text-xs text-slate-300 underline disabled:opacity-60" aria-label={`Report user answer: ${answer}`}>{reportingAnswer === answer ? "Reporting..." : "Report"}</button>}
            </div>;
          })}
        </div>
        {reportMessage && <output className="mt-3 block text-sm text-slate-200">{reportMessage}</output>}

        {poll.allow_user_answers && (
          <div className="mt-4">
            {!showAddField && (
              <button
                onClick={() => setShowAddField(true)}
                className="px-3 py-2 rounded text-white"
                style={{ backgroundColor: branding.primaryColor }}
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
                  className="text-white px-3 py-2 rounded mt-2"
                  style={{ backgroundColor: branding.primaryColor }}
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
          className="text-white p-3 rounded mt-6 w-full font-semibold disabled:opacity-60"
          style={{ backgroundColor: branding.primaryColor }}
        >
          {selectedAnswers.length === 0 ? "Select an answer to vote" : `Submit vote${selectedAnswers.length > 1 ? ` (${selectedAnswers.length})` : ""}`}
        </button>

        <div className="mt-5 border-t border-slate-600 pt-4">
          <p className="text-sm font-semibold">{poll.raffle_enabled ? "Enter our prize draw (optional)" : "Keep in touch (optional)"}</p>
          <p className="mt-1 text-xs text-slate-300">
            {poll.raffle_enabled
              ? `Share your email for a chance to win: ${poll.raffle_prize || "a prize"}.`
              : "Share your email only if you want follow-up from the poll organizer."}
          </p>
          <input
            type="email"
            value={followUpEmail}
            onChange={(event) => setFollowUpEmail(event.target.value)}
            disabled={!followUpConsent}
            className="mt-3 w-full border rounded p-2 text-black disabled:bg-slate-200"
            placeholder="you@example.com"
          />
          <label className="mt-3 flex items-start gap-2 text-xs text-slate-200">
            <input
              type="checkbox"
              checked={followUpConsent}
              onChange={(event) => setFollowUpConsent(event.target.checked)}
              className="mt-0.5"
            />
            <span>{poll.raffle_enabled ? "Enter me in the prize draw and let the organizer contact me if I win." : "I agree that the organizer may contact me about this poll."}</span>
          </label>
        </div>

        <details className="mt-4 border-t border-slate-600 pt-4">
          <summary className="cursor-pointer text-sm font-semibold">Send a private message to the organizer</summary>
          <p className="mt-2 text-xs text-slate-300">Optional. Your message is visible only to the team running this poll.</p>
          <textarea
            value={organizerMessage}
            onChange={(event) => setOrganizerMessage(event.target.value)}
            maxLength={2000}
            rows="3"
            className="mt-3 w-full rounded border p-2 text-black"
            placeholder="Write your message"
          />
          <input
            type="email"
            value={messageReplyEmail}
            onChange={(event) => setMessageReplyEmail(event.target.value)}
            className="mt-2 w-full rounded border p-2 text-black"
            placeholder="Your email for a reply (optional)"
          />
        </details>
      </div>
    </Layout>
  );
}
