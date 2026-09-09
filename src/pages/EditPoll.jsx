import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { savePollMeta, readPollMeta } from "../lib/pollMeta";
import { POLL_TEMPLATES, getTemplateByKey } from "../lib/pollTemplates";
import { DEFAULT_ACCENT_COLOR, DEFAULT_PRIMARY_COLOR } from "../lib/pollBranding";
import { readWorkspaceProfile } from "../lib/workspaceProfile";

export default function EditPoll() {
  const { pollId } = useParams();
  const navigate = useNavigate();

  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState([""]);
  const [templateKey, setTemplateKey] = useState("blank");
  const [locationName, setLocationName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR);
  const [brandAccentColor, setBrandAccentColor] = useState(DEFAULT_ACCENT_COLOR);
  const [rewardMessage, setRewardMessage] = useState("");
  const [rewardCode, setRewardCode] = useState("");
  const [rewardUrl, setRewardUrl] = useState("");
  const [reviewUrl, setReviewUrl] = useState("");
  const [emailBenefitType, setEmailBenefitType] = useState("none");
  const [emailBenefitValue, setEmailBenefitValue] = useState("");
  const [emailBenefitUrl, setEmailBenefitUrl] = useState("");
  const [reviewPlatforms, setReviewPlatforms] = useState([{ name: "Google", url: "" }, { name: "Tripadvisor", url: "" }]);
  const [reviewTriggerAnswers, setReviewTriggerAnswers] = useState([]);
  const [reviewBenefitType, setReviewBenefitType] = useState("none");
  const [reviewBenefitValue, setReviewBenefitValue] = useState("");
  const [reviewBenefitUrl, setReviewBenefitUrl] = useState("");
  const [raffleEnabled, setRaffleEnabled] = useState(false);
  const [rafflePrize, setRafflePrize] = useState("");
  const [loyaltyVisitThreshold, setLoyaltyVisitThreshold] = useState("");
  const [loyaltyBenefitMessage, setLoyaltyBenefitMessage] = useState("");
  const [loyaltyBenefitCode, setLoyaltyBenefitCode] = useState("");
  const [loyaltyBenefitUrl, setLoyaltyBenefitUrl] = useState("");

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
      setTemplateKey(data.template_key ?? pollMeta.template_key ?? "blank");
      setLocationName(data.location_name ?? pollMeta.location_name ?? "");
      setStartsAt(data.starts_at ? new Date(data.starts_at).toISOString().slice(0, 16) : pollMeta.starts_at ? new Date(pollMeta.starts_at).toISOString().slice(0, 16) : "");
      setExpiresAt(data.expires_at ? new Date(data.expires_at).toISOString().slice(0, 16) : pollMeta.ends_at ? new Date(pollMeta.ends_at).toISOString().slice(0, 16) : "");
      setBrandName(data.brand_name ?? pollMeta.brand_name ?? "");
      setBrandLogoUrl(data.brand_logo_url ?? pollMeta.brand_logo_url ?? "");
      setBrandPrimaryColor(data.brand_primary_color ?? pollMeta.brand_primary_color ?? DEFAULT_PRIMARY_COLOR);
      setBrandAccentColor(data.brand_accent_color ?? pollMeta.brand_accent_color ?? DEFAULT_ACCENT_COLOR);
      setRewardMessage(data.reward_message ?? pollMeta.reward_message ?? "");
      setRewardCode(data.reward_code ?? pollMeta.reward_code ?? "");
      setRewardUrl(data.reward_url ?? pollMeta.reward_url ?? "");
      setReviewUrl(data.review_url ?? pollMeta.review_url ?? "");
      setEmailBenefitType(data.email_benefit_type ?? pollMeta.email_benefit_type ?? "none");
      setEmailBenefitValue(data.email_benefit_value ?? pollMeta.email_benefit_value ?? "");
      setEmailBenefitUrl(data.email_benefit_url ?? pollMeta.email_benefit_url ?? "");
      setReviewPlatforms(Array.isArray(data.review_platforms ?? pollMeta.review_platforms) && (data.review_platforms ?? pollMeta.review_platforms).length > 0 ? (data.review_platforms ?? pollMeta.review_platforms) : [{ name: "Google", url: "" }, { name: "Tripadvisor", url: "" }]);
      setReviewTriggerAnswers(data.review_trigger_answers ?? pollMeta.review_trigger_answers ?? []);
      setReviewBenefitType(data.review_benefit_type ?? pollMeta.review_benefit_type ?? "none");
      setReviewBenefitValue(data.review_benefit_value ?? pollMeta.review_benefit_value ?? "");
      setReviewBenefitUrl(data.review_benefit_url ?? pollMeta.review_benefit_url ?? "");
      setRaffleEnabled(data.raffle_enabled ?? pollMeta.raffle_enabled ?? false);
      setRafflePrize(data.raffle_prize ?? pollMeta.raffle_prize ?? "");
      setLoyaltyVisitThreshold(data.loyalty_visit_threshold ?? pollMeta.loyalty_visit_threshold ?? "");
      setLoyaltyBenefitMessage(data.loyalty_benefit_message ?? pollMeta.loyalty_benefit_message ?? "");
      setLoyaltyBenefitCode(data.loyalty_benefit_code ?? pollMeta.loyalty_benefit_code ?? "");
      setLoyaltyBenefitUrl(data.loyalty_benefit_url ?? pollMeta.loyalty_benefit_url ?? "");

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id && !data.brand_name && !pollMeta.brand_name) {
        const profile = readWorkspaceProfile(user.id);
        setBrandName(profile.companyName || "");
        setBrandLogoUrl(profile.logoUrl || "");
        setBrandPrimaryColor(profile.primaryColor || DEFAULT_PRIMARY_COLOR);
        setBrandAccentColor(profile.accentColor || DEFAULT_ACCENT_COLOR);
      }

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

  function applyTemplate(selectedKey) {
    const template = getTemplateByKey(selectedKey);
    setTemplateKey(template.key);
    setQuestion(template.question);
    const nextAnswers = Array.isArray(template.answers) ? template.answers.slice(0, 10) : [""];
    if (nextAnswers.length < 10) {
      nextAnswers.push("");
    }
    setAnswers(nextAnswers);
  }

  function updateReviewPlatform(index, field, value) {
    setReviewPlatforms((current) => current.map((platform, platformIndex) => (
      platformIndex === index ? { ...platform, [field]: value } : platform
    )));
  }

  function toggleReviewTriggerAnswer(answer) {
    setReviewTriggerAnswers((current) => current.includes(answer)
      ? current.filter((item) => item !== answer)
      : [...current, answer]);
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
      ends_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      template_key: templateKey,
      brand_name: brandName.trim() || null,
      brand_logo_url: brandLogoUrl.trim() || null,
      brand_primary_color: brandPrimaryColor || DEFAULT_PRIMARY_COLOR,
      brand_accent_color: brandAccentColor || DEFAULT_ACCENT_COLOR,
      reward_message: rewardMessage.trim() || null,
      reward_code: rewardCode.trim() || null,
      reward_url: rewardUrl.trim() || null,
      review_url: reviewUrl.trim() || null,
      email_benefit_type: emailBenefitType,
      email_benefit_value: emailBenefitValue.trim() || null,
      email_benefit_url: emailBenefitUrl.trim() || null,
      review_platforms: reviewPlatforms.filter((platform) => platform.url.trim()).map((platform) => ({ name: platform.name.trim(), url: platform.url.trim() })),
      review_trigger_answers: reviewTriggerAnswers,
      review_benefit_type: reviewBenefitType,
      review_benefit_value: reviewBenefitValue.trim() || null,
      review_benefit_url: reviewBenefitUrl.trim() || null,
      raffle_enabled: raffleEnabled,
      raffle_prize: raffleEnabled ? rafflePrize.trim() || null : null,
      loyalty_visit_threshold: String(loyaltyVisitThreshold).trim() ? Number(loyaltyVisitThreshold) : null,
      loyalty_benefit_message: loyaltyBenefitMessage.trim() || null,
      loyalty_benefit_code: loyaltyBenefitCode.trim() || null,
      loyalty_benefit_url: loyaltyBenefitUrl.trim() || null
    });

    navigate("/admin");
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Edit Poll</h1>

      <label className="block mb-2 font-semibold">Template</label>
      <select
        value={templateKey}
        onChange={(e) => applyTemplate(e.target.value)}
        className="w-full border p-2 rounded mb-4 text-black"
      >
        {POLL_TEMPLATES.map((template) => (
          <option key={template.key} value={template.key}>
            {template.label}
          </option>
        ))}
      </select>

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

      <h2 className="text-xl font-bold mb-3">Branding</h2>

      <label className="block mb-2 font-semibold">Customer/Brand name</label>
      <input
        value={brandName}
        onChange={(e) => setBrandName(e.target.value)}
        className="w-full border p-2 rounded mb-4 text-black"
        placeholder="Acme Events"
      />

      <label className="block mb-2 font-semibold">Brand logo URL (optional)</label>
      <input
        type="url"
        value={brandLogoUrl}
        onChange={(e) => setBrandLogoUrl(e.target.value)}
        className="w-full border p-2 rounded mb-4 text-black"
        placeholder="https://example.com/logo.png"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <label className="block font-semibold">
          Button and link color
          <span className="mt-1 block text-xs font-normal text-slate-400">Used for actions people can click.</span>
          <input
            type="color"
            value={brandPrimaryColor}
            onChange={(e) => setBrandPrimaryColor(e.target.value)}
            className="w-full border p-1 rounded mt-1 h-11"
          />
        </label>
        <label className="block font-semibold">
          Page background color
          <span className="mt-1 block text-xs font-normal text-slate-400">Used behind the poll and QR page.</span>
          <input
            type="color"
            value={brandAccentColor}
            onChange={(e) => setBrandAccentColor(e.target.value)}
            className="w-full border p-1 rounded mt-1 h-11"
          />
        </label>
      </div>

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

      <h2 className="text-xl font-bold mb-3">After voting (optional)</h2>

      <label className="block mb-2 font-semibold">Reward message</label>
      <input
        type="text"
        value={rewardMessage}
        onChange={(e) => setRewardMessage(e.target.value)}
        className="w-full border p-2 rounded mb-4 text-black"
        placeholder="Enjoy 10% off your next visit!"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <input
          type="text"
          value={rewardCode}
          onChange={(e) => setRewardCode(e.target.value)}
          className="w-full border p-2 rounded text-black"
          placeholder="Discount code (optional)"
        />
        <input
          type="url"
          value={rewardUrl}
          onChange={(e) => setRewardUrl(e.target.value)}
          className="w-full border p-2 rounded text-black"
          placeholder="Link to redeem (optional)"
        />
      </div>

      <label className="block mb-2 font-semibold">Review link</label>
      <input
        type="url"
        value={reviewUrl}
        onChange={(e) => setReviewUrl(e.target.value)}
        className="w-full border p-2 rounded mb-4 text-black"
        placeholder="Your Google/TripAdvisor review link"
      />

        <div className="mt-5 border-t border-slate-600 pt-4">
          <p className="font-semibold">Email opt-in benefit</p>
          <p className="mt-1 text-xs text-slate-400">Give an opted-in voter a voucher or online discount code.</p>
          <select value={emailBenefitType} onChange={(event) => setEmailBenefitType(event.target.value)} className="mt-3 w-full border p-2 rounded text-black">
            <option value="none">No email benefit</option><option value="voucher">Voucher</option><option value="discount_code">Discount code</option>
          </select>
          {emailBenefitType !== "none" && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <input value={emailBenefitValue} onChange={(event) => setEmailBenefitValue(event.target.value)} className="border p-2 rounded text-black" placeholder="Voucher or discount code" />
            <input type="url" value={emailBenefitUrl} onChange={(event) => setEmailBenefitUrl(event.target.value)} className="border p-2 rounded text-black" placeholder="Redemption link (optional)" />
          </div>}
        </div>

        <div className="mt-5 border-t border-slate-600 pt-4">
          <p className="font-semibold">External review benefit</p>
          <p className="mt-1 text-xs text-slate-400">Claims remain pending until a manager checks the platform.</p>
          {reviewPlatforms.map((platform, index) => <div key={platform.name} className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <input value={platform.name} onChange={(event) => updateReviewPlatform(index, "name", event.target.value)} className="border p-2 rounded text-black" placeholder="Platform name" />
            <input type="url" value={platform.url} onChange={(event) => updateReviewPlatform(index, "url", event.target.value)} className="border p-2 rounded text-black" placeholder="Review page URL" />
          </div>)}
          <div className="mt-3 space-y-2"><p className="text-sm font-semibold">Trigger answers</p>
            {answers.filter((answer) => answer.trim()).map((answer) => <label key={answer} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reviewTriggerAnswers.includes(answer)} onChange={() => toggleReviewTriggerAnswer(answer)} /><span>{answer}</span></label>)}
          </div>
          <select value={reviewBenefitType} onChange={(event) => setReviewBenefitType(event.target.value)} className="mt-3 w-full border p-2 rounded text-black">
            <option value="none">No review benefit</option><option value="voucher">Voucher</option><option value="discount_code">Discount code</option>
          </select>
          {reviewBenefitType !== "none" && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <input value={reviewBenefitValue} onChange={(event) => setReviewBenefitValue(event.target.value)} className="border p-2 rounded text-black" placeholder="Voucher or discount code" />
            <input type="url" value={reviewBenefitUrl} onChange={(event) => setReviewBenefitUrl(event.target.value)} className="border p-2 rounded text-black" placeholder="Redemption link (optional)" />
          </div>}
        </div>

      <label className="mb-2 flex items-center gap-2">
        <input
          type="checkbox"
          checked={raffleEnabled}
          onChange={(e) => setRaffleEnabled(e.target.checked)}
        />
        <span className="font-semibold">Run a prize draw for this poll</span>
      </label>
      {raffleEnabled && (
        <input
          type="text"
          value={rafflePrize}
          onChange={(e) => setRafflePrize(e.target.value)}
          className="w-full border p-2 rounded mb-4 text-black"
          placeholder="Prize: a free dessert, a $50 voucher..."
        />
      )}

      <div className="mt-1 mb-4 border-t border-slate-600 pt-4">
        <p className="font-semibold">Returning customer bonus</p>
        <p className="mt-1 text-xs text-slate-400">Show an extra thank-you once a voter who left their email crosses this many visits. No account or sign-up is ever required to vote.</p>
        <input
          type="number"
          min="2"
          max="50"
          value={loyaltyVisitThreshold}
          onChange={(e) => setLoyaltyVisitThreshold(e.target.value)}
          className="mt-3 w-full border p-2 rounded text-black"
          placeholder="Visit number that unlocks the bonus, e.g. 3"
        />
        {String(loyaltyVisitThreshold).trim() && <>
          <input
            type="text"
            value={loyaltyBenefitMessage}
            onChange={(e) => setLoyaltyBenefitMessage(e.target.value)}
            className="mt-3 w-full border p-2 rounded text-black"
            placeholder="Welcome back message: Thanks for being a regular!"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <input
              type="text"
              value={loyaltyBenefitCode}
              onChange={(e) => setLoyaltyBenefitCode(e.target.value)}
              className="border p-2 rounded text-black"
              placeholder="Bonus code (optional)"
            />
            <input
              type="url"
              value={loyaltyBenefitUrl}
              onChange={(e) => setLoyaltyBenefitUrl(e.target.value)}
              className="border p-2 rounded text-black"
              placeholder="Redemption link (optional)"
            />
          </div>
        </>}
      </div>

      <button
        onClick={updatePoll}
        className="bg-blue-600 text-white px-4 py-2 rounded font-semibold"
      >
        Save Changes
      </button>
    </div>
  );
}
