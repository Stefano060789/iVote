import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";
import { isRestrictedTopic } from "../lib/restrictedContent";
import { readPollMeta, isPollClosed } from "../lib/pollMeta";
import { getPollBranding } from "../lib/pollBranding";
import { dispatchWorkspaceWebhook } from "../lib/webhooks";
import { isValidEmail } from "../lib/validators";

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

// Kill switch: the translation call below uses Google's unofficial, unsupported "gtx" endpoint
// (there is no official-API key wiring yet). Set VITE_ENABLE_TRANSLATION=false to hide the
// language switcher instantly, without a code change, if that endpoint gets rate-limited or
// blocked. See TODO.md for the plan to move to the official Google Cloud Translation API.
const TRANSLATION_ENABLED = import.meta.env.VITE_ENABLE_TRANSLATION !== "false";
const TRANSLATION_TIMEOUT_MS = 5000;

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
  const [followUpEmailError, setFollowUpEmailError] = useState("");
  const [organizerMessage, setOrganizerMessage] = useState("");
  const [messageReplyEmail, setMessageReplyEmail] = useState("");
  const [messageReplyEmailError, setMessageReplyEmailError] = useState("");
  // Basic bot friction: a hidden field real visitors never fill in, plus a minimum time
  // on the page before a submission is accepted. This is not a substitute for real
  // rate limiting (see TODO.md) but stops the most naive scripted submissions for free.
  const [honeypot, setHoneypot] = useState("");
  const pageOpenedAtRef = useRef(Date.now());
  const MIN_DWELL_MS = 1200;
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

    // Silently drop obvious bot submissions: a filled honeypot, or a submission that
    // arrived faster than a human could plausibly read the question and choose an answer.
    if (honeypot.trim() || Date.now() - pageOpenedAtRef.current < MIN_DWELL_MS) {
      return;
    }

    // Validate optional emails before the vote is inserted, not after - once the vote is
    // in, the voter is redirected to /thanks and has no way back to fix a typo, and the
    // opt-in email (or reply address) would just silently fail to save server-side.
    setFollowUpEmailError("");
    setMessageReplyEmailError("");
    if (followUpConsent && followUpEmail.trim() && !isValidEmail(followUpEmail)) {
      setFollowUpEmailError("Enter a valid email address, e.g. name@example.com.");
      return;
    }
    if (messageReplyEmail.trim() && !isValidEmail(messageReplyEmail)) {
      setMessageReplyEmailError("Enter a valid email address, e.g. name@example.com.");
      return;
    }

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
    const { data: reportResult, error } = await supabase.rpc("report_public_user_answer", {
      target_poll_id: poll.id,
      target_answer: answer,
      report_reason: reason.trim().toLowerCase()
    }).single();
    setReportingAnswer("");
    setReportMessage(error ? error.message : "Thank you. The organizer will review this answer.");

    if (!error && reportResult?.workspace_id && reportResult?.id) {
      dispatchWorkspaceWebhook(reportResult.workspace_id, "content_reported", reportResult.id);
      fetch("/api/notify-content-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: reportResult.workspace_id, reportId: reportResult.id })
      }).catch((notifyError) => console.error("Content report notification dispatch failed", notifyError));
    }
  }

  async function translateText(text, targetLanguage) {
    const normalizedText = String(text ?? "").trim();
    if (!normalizedText) return "";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TRANSLATION_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLanguage)}&dt=t&q=${encodeURIComponent(normalizedText)}`,
        { signal: controller.signal }
      );
    } catch (fetchError) {
      if (fetchError.name === "AbortError") {
        throw new Error("Translation timed out. Showing the original text instead.");
      }
      throw new Error("Translation is unavailable right now. Showing the original text instead.");
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error("Translation is unavailable right now. Showing the original text instead.");
    }

    const data = await response.json();
    const translated = Array.isArray(data?.[0])
      ? data[0].map((item) => item?.[0] ?? "").join("").trim()
      : "";

    if (!translated) {
      throw new Error("Translation is unavailable right now. Showing the original text instead.");
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
      if (!TRANSLATION_ENABLED || !poll || !Array.isArray(poll.answers)) {
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
          {TRANSLATION_ENABLED ? (
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
          ) : (
            <span className="mt-1 block text-slate-500">Original only</span>
          )}
          </label>
          {translationLoading && <p className="text-xs text-gray-400 mt-2">Translating poll content...</p>}
          {translationError && <p className="text-xs text-amber-300 mt-2">{translationError}</p>}
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

        <input
          type="text"
          name="company"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
          autoComplete="off"
          tabIndex={-1}
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        />

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
          {poll.raffle_enabled && (
            <p className="mt-2 text-xs text-slate-400">
              No purchase necessary. Open only to entrants who are 18+ and legally eligible to receive this prize where they live. One entry per person. The organizer selects a winner at random from all entries and contacts the email provided. Void where prohibited.
            </p>
          )}
          <input
            type="email"
            value={followUpEmail}
            onChange={(event) => { setFollowUpEmail(event.target.value); setFollowUpEmailError(""); }}
            onBlur={() => {
              if (followUpConsent && followUpEmail.trim() && !isValidEmail(followUpEmail)) {
                setFollowUpEmailError("Enter a valid email address, e.g. name@example.com.");
              }
            }}
            disabled={!followUpConsent}
            aria-invalid={Boolean(followUpEmailError)}
            className={`mt-3 w-full border rounded p-2 text-black disabled:bg-slate-200 ${followUpEmailError ? "border-red-500" : ""}`}
            placeholder="you@example.com"
          />
          {followUpEmailError && <p className="mt-1 text-xs text-red-400">{followUpEmailError}</p>}
          <label className="mt-3 flex items-start gap-2 text-xs text-slate-200">
            <input
              type="checkbox"
              checked={followUpConsent}
              onChange={(event) => setFollowUpConsent(event.target.checked)}
              className="mt-0.5"
            />
            <span>{poll.raffle_enabled ? "I'm 18+ and eligible to receive this prize under local law. Enter me in the prize draw and let the organizer contact me if I win." : "I agree that the organizer may contact me about this poll."}</span>
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
            onChange={(event) => { setMessageReplyEmail(event.target.value); setMessageReplyEmailError(""); }}
            onBlur={() => {
              if (messageReplyEmail.trim() && !isValidEmail(messageReplyEmail)) {
                setMessageReplyEmailError("Enter a valid email address, e.g. name@example.com.");
              }
            }}
            aria-invalid={Boolean(messageReplyEmailError)}
            className={`mt-2 w-full rounded border p-2 text-black ${messageReplyEmailError ? "border-red-500" : ""}`}
            placeholder="Your email for a reply (optional)"
          />
          {messageReplyEmailError && <p className="mt-1 text-xs text-red-400">{messageReplyEmailError}</p>}
        </details>
      </div>
    </Layout>
  );
}
