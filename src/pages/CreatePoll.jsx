import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";
import QRCode from "qrcode";
import { isRestrictedTopic } from "../lib/restrictedContent";
import { createStableQrUrl } from "../lib/pollLinks";
import { savePollMeta } from "../lib/pollMeta";
import { POLL_TEMPLATES, INDUSTRY_LABELS, getTemplateByKey } from "../lib/pollTemplates";
import { DEFAULT_ACCENT_COLOR, DEFAULT_PRIMARY_COLOR } from "../lib/pollBranding";
import { loadWorkspaceProfile } from "../lib/workspaceProfile";

export default function CreatePoll() {
  const [searchParams] = useSearchParams();
  const assignCampaignId = searchParams.get("campaign");
  const [assignedCampaignName, setAssignedCampaignName] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState([""]);
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [allowUserAnswers, setAllowUserAnswers] = useState(false);
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
  const [raffleEnabled, setRaffleEnabled] = useState(false);
  const [rafflePrize, setRafflePrize] = useState("");
  const [loyaltyVisitThreshold, setLoyaltyVisitThreshold] = useState("");
  const [loyaltyBenefitMessage, setLoyaltyBenefitMessage] = useState("");
  const [loyaltyBenefitCode, setLoyaltyBenefitCode] = useState("");
  const [loyaltyBenefitUrl, setLoyaltyBenefitUrl] = useState("");
  const [pollId, setPollId] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  useEffect(() => {
    async function loadDefaultBranding() {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(Boolean(user?.id));
      if (!user?.id) return;

      const profile = await loadWorkspaceProfile();
      setBrandName((current) => current || profile.companyName || "");
      setBrandLogoUrl((current) => current || profile.logoUrl || "");
      setBrandPrimaryColor((current) => current === DEFAULT_PRIMARY_COLOR ? profile.primaryColor : current);
      setBrandAccentColor((current) => current === DEFAULT_ACCENT_COLOR ? profile.accentColor : current);
    }

    loadDefaultBranding();
  }, []);

  async function createShortLink(longUrl) {
    const response = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`
    );
    if (!response.ok) {
      throw new Error(`TinyURL request failed with status ${response.status}`);
    }
    return response.text();
  }

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
    if (template.suggestedPrimaryColor) {
      setBrandPrimaryColor(template.suggestedPrimaryColor);
    }
  }

  function updateReviewPlatform(index, field, value) {
    setReviewPlatforms((current) => current.map((platform, platformIndex) => (
      platformIndex === index ? { ...platform, [field]: value } : platform
    )));
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

    if (isRestrictedTopic(question.trim())) {
      alert("The question contains political, religious, or sexual content.");
      return;
    }

    for (const ans of cleanedAnswers) {
      if (isRestrictedTopic(ans)) {
        alert(`The answer "${ans}" contains restricted content.`);
        return;
      }
    }

    const { data, error } = await supabase
      .from("polls")
      .insert({
        question: question.trim(),
        answers: cleanedAnswers,
        multiple_choice: multipleChoice,
        allow_user_answers: allowUserAnswers,
        creator_id: user.id
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      alert(`Error creating poll: ${error.message}`);
      return;
    }

    const stableShortUrl = createStableQrUrl();
    const { error: stableShortUrlError } = await supabase
      .from("polls")
      .update({ stable_short_url: stableShortUrl })
      .eq("id", data.id);

    if (stableShortUrlError) {
      console.error(stableShortUrlError);
      alert(`Poll created, but QR link could not be saved: ${stableShortUrlError.message}`);
      return;
    }

    const voteUrl = `${window.location.origin}/vote/${data.id}`;
    try {
      const shortUrl = await createShortLink(voteUrl);
      const { error: shortUrlError } = await supabase
        .from("polls")
        .update({ short_url: shortUrl })
        .eq("id", data.id);

      if (shortUrlError) {
        console.error(shortUrlError);
      }
    } catch (shortUrlError) {
      console.error(shortUrlError);
    }

    await savePollMeta(data.id, {
      location_name: locationName.trim() || null,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      status: "active",
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
      raffle_enabled: raffleEnabled,
      raffle_prize: raffleEnabled ? rafflePrize.trim() || null : null,
      loyalty_visit_threshold: loyaltyVisitThreshold.trim() ? Number(loyaltyVisitThreshold) : null,
      loyalty_benefit_message: loyaltyBenefitMessage.trim() || null,
      loyalty_benefit_code: loyaltyBenefitCode.trim() || null,
      loyalty_benefit_url: loyaltyBenefitUrl.trim() || null
    });

    if (assignCampaignId) {
      const { data: campaign, error: assignError } = await supabase
        .from("qr_campaigns")
        .update({ poll_id: data.id })
        .eq("id", assignCampaignId)
        .select("name")
        .maybeSingle();
      if (!assignError && campaign) setAssignedCampaignName(campaign.name);
    }

    setPollId(data.id);
    const qr = await QRCode.toDataURL(stableShortUrl);
    setQrCodeUrl(qr);
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto p-6">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold">Create a poll</h1>
          <p className="mt-2 text-sm text-slate-400">Polls live inside your workspace and collect feedback from your customers.</p>
          {assignCampaignId && (
            <p className="mt-2 rounded border border-teal-700 bg-teal-950 p-2 text-sm text-teal-200">
              This poll will be assigned to your scanned QR code automatically.
            </p>
          )}
        </div>

        {isAuthenticated === false && (
          <div className="rounded border border-sky-700 bg-slate-900 p-5 text-center">
            <h2 className="text-xl font-bold">Create a workspace first</h2>
            <p className="mt-2 text-sm text-slate-300">A workspace is your venue or business account. Once you create one and sign in, you can create polls, QR codes, and manage customer feedback here.</p>
            <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/register" className="rounded bg-sky-500 px-4 py-2 font-semibold text-slate-950">Create a workspace</Link>
              <Link to="/login" className="rounded border border-slate-500 px-4 py-2 font-semibold text-slate-100">Sign in</Link>
            </div>
          </div>
        )}

        {isAuthenticated === null && <p className="text-center text-sm text-slate-400">Checking your workspace access...</p>}

        {isAuthenticated !== true ? null : <>

        <label className="block mb-2 font-semibold">Template</label>
        <select
          value={templateKey}
          onChange={(e) => applyTemplate(e.target.value)}
          className="w-full border p-2 rounded mb-4 text-black"
        >
          {Object.entries(INDUSTRY_LABELS).map(([industryKey, industryLabel]) => (
            <optgroup key={industryKey} label={industryLabel}>
              {POLL_TEMPLATES.filter((template) => template.industry === industryKey).map((template) => (
                <option key={template.key} value={template.key}>
                  {template.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <label className="block mb-2 font-semibold">Question</label>
        <input
          type="text"
          className="w-full border p-2 rounded mb-4 text-black"
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

        <details className="mb-4 border border-slate-700 rounded">
          <summary className="cursor-pointer p-3 font-semibold">Response options</summary>
          <div className="px-3 pb-3">
            <p className="mb-3 text-sm text-slate-400">Choose how people can respond to this poll.</p>
            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={multipleChoice}
                onChange={(e) => setMultipleChoice(e.target.checked)}
              />
              <span>Allow more than one answer</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allowUserAnswers}
                onChange={(e) => setAllowUserAnswers(e.target.checked)}
              />
              <span>Let people add their own answer</span>
            </label>
          </div>
        </details>

        <details className="mb-4 border border-slate-700 rounded">
          <summary className="cursor-pointer p-3 font-semibold">Branding and location</summary>
          <div className="px-3 pb-3">
            <p className="mb-3 text-sm text-slate-400">Add a brand or location to personalize this poll and its QR materials.</p>
            <label className="block mb-2 font-semibold">QR location name</label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full border p-2 rounded mb-4 text-black placeholder-black"
              placeholder="Entrance, Table 1, Bar"
            />
            <label className="block mb-2 font-semibold">Customer/Brand name</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full border p-2 rounded mb-4 text-black placeholder-black"
              placeholder="Acme Events"
            />
            <label className="block mb-2 font-semibold">Brand logo URL</label>
            <input
              type="url"
              value={brandLogoUrl}
              onChange={(e) => setBrandLogoUrl(e.target.value)}
              className="w-full border p-2 rounded mb-4 text-black placeholder-black"
              placeholder="https://example.com/logo.png"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          </div>
        </details>

        <details className="mb-6 border border-slate-700 rounded">
          <summary className="cursor-pointer p-3 font-semibold">Schedule this poll</summary>
          <div className="px-3 pb-3">
            <p className="mb-3 text-sm text-slate-400">Leave these blank to open the poll immediately and keep it open until you close it.</p>
            <label className="block mb-2 font-semibold">Starts at</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full border p-2 rounded mb-4 text-black placeholder-black"
            />
            <label className="block mb-2 font-semibold">Ends at</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full border p-2 rounded text-black placeholder-black"
            />
          </div>
        </details>

        <details className="mb-6 border border-slate-700 rounded">
          <summary className="cursor-pointer p-3 font-semibold">After voting (optional)</summary>
          <div className="px-3 pb-3">
            <p className="mb-3 text-sm text-slate-400">Show a thank-you reward and/or ask happy voters to leave a public review.</p>
            <label className="block mb-2 font-semibold">Reward message</label>
            <input
              type="text"
              value={rewardMessage}
              onChange={(e) => setRewardMessage(e.target.value)}
              className="w-full border p-2 rounded mb-4 text-black placeholder-black"
              placeholder="Enjoy 10% off your next visit!"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <input
                type="text"
                value={rewardCode}
                onChange={(e) => setRewardCode(e.target.value)}
                className="w-full border p-2 rounded text-black placeholder-black"
                placeholder="Discount code (optional)"
              />
              <input
                type="url"
                value={rewardUrl}
                onChange={(e) => setRewardUrl(e.target.value)}
                className="w-full border p-2 rounded text-black placeholder-black"
                placeholder="Link to redeem (optional)"
              />
            </div>
            <label className="block mb-2 font-semibold">Review link</label>
            <input
              type="url"
              value={reviewUrl}
              onChange={(e) => setReviewUrl(e.target.value)}
              className="w-full border p-2 rounded text-black placeholder-black"
              placeholder="Your Google/TripAdvisor review link"
            />
            <div className="mt-5 border-t border-slate-600 pt-4">
              <p className="font-semibold">Email opt-in benefit</p>
              <p className="mt-1 text-xs text-slate-400">Give an opted-in voter a voucher or online discount code. Their email is stored only after explicit consent.</p>
              <select value={emailBenefitType} onChange={(event) => setEmailBenefitType(event.target.value)} className="mt-3 w-full border p-2 rounded text-black">
                <option value="none">No email benefit</option>
                <option value="voucher">Voucher</option>
                <option value="discount_code">Discount code</option>
              </select>
              {emailBenefitType !== "none" && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <input value={emailBenefitValue} onChange={(event) => setEmailBenefitValue(event.target.value)} className="border p-2 rounded text-black" placeholder="Voucher or discount code" />
                <input type="url" value={emailBenefitUrl} onChange={(event) => setEmailBenefitUrl(event.target.value)} className="border p-2 rounded text-black" placeholder="Redemption link (optional)" />
              </div>}
            </div>
            <div className="mt-5 border-t border-slate-600 pt-4">
              <p className="font-semibold">Public review platforms</p>
              <p className="mt-1 text-xs text-slate-400">Shown to every voter after they submit, regardless of their answer. Never tie a reward to leaving a review — most review platforms prohibit incentivized or gated reviews.</p>
              {reviewPlatforms.map((platform, index) => <div key={platform.name} className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <input value={platform.name} onChange={(event) => updateReviewPlatform(index, "name", event.target.value)} className="border p-2 rounded text-black" placeholder="Platform name" />
                <input type="url" value={platform.url} onChange={(event) => updateReviewPlatform(index, "url", event.target.value)} className="border p-2 rounded text-black" placeholder="Review page URL" />
              </div>)}
            </div>
            <label className="mt-4 flex items-center gap-2">
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
                className="mt-2 w-full border p-2 rounded text-black placeholder-black"
                placeholder="Prize: a free dessert, a $50 voucher..."
              />
            )}
            <div className="mt-5 border-t border-slate-600 pt-4">
              <p className="font-semibold">Returning customer bonus</p>
              <p className="mt-1 text-xs text-slate-400">Show an extra thank-you once a voter who left their email crosses this many visits. No account or sign-up is ever required to vote.</p>
              <input
                type="number"
                min="2"
                max="50"
                value={loyaltyVisitThreshold}
                onChange={(e) => setLoyaltyVisitThreshold(e.target.value)}
                className="mt-3 w-full border p-2 rounded text-black placeholder-black"
                placeholder="Visit number that unlocks the bonus, e.g. 3"
              />
              {loyaltyVisitThreshold.trim() && <>
                <input
                  type="text"
                  value={loyaltyBenefitMessage}
                  onChange={(e) => setLoyaltyBenefitMessage(e.target.value)}
                  className="mt-3 w-full border p-2 rounded text-black placeholder-black"
                  placeholder="Welcome back message: Thanks for being a regular!"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <input
                    type="text"
                    value={loyaltyBenefitCode}
                    onChange={(e) => setLoyaltyBenefitCode(e.target.value)}
                    className="border p-2 rounded text-black placeholder-black"
                    placeholder="Bonus code (optional)"
                  />
                  <input
                    type="url"
                    value={loyaltyBenefitUrl}
                    onChange={(e) => setLoyaltyBenefitUrl(e.target.value)}
                    className="border p-2 rounded text-black placeholder-black"
                    placeholder="Redemption link (optional)"
                  />
                </div>
              </>}
            </div>
          </div>
        </details>

        <button
          onClick={createPoll}
          className="w-full bg-blue-600 text-white p-3 rounded font-semibold"
        >
          Create Poll
        </button>

        {pollId && (
          <div className="mt-8 text-center">
            <h2 className="text-xl font-bold mb-4">Poll Created!</h2>
            {assignedCampaignName && (
              <p className="mb-4 rounded border border-teal-700 bg-teal-950 p-2 text-sm text-teal-200">
                Assigned to QR code "{assignedCampaignName}".
              </p>
            )}
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

            <p className="text-white mt-4">
              Share link:{" "}
              <span
                className="text-blue-400 underline cursor-pointer"
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/vote/${pollId}`)}
              >
                {window.location.origin}/vote/{pollId}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/vote/${pollId}`)}
                className="ml-2 bg-blue-600 text-white px-2 py-1 rounded"
              >
                Copy
              </button>
            </p>

            <div className="mt-6">
              <Link
                to={`/admin?poll=${pollId}`}
                className="inline-flex items-center justify-center rounded bg-slate-100 px-4 py-2 font-semibold text-slate-900"
              >
                Manage this poll in workspace
              </Link>
            </div>
          </div>
        )}

        </>}

        <p className="mt-10 text-center text-xs text-slate-400">
          iVote v1.0.1
        </p>
      </div>
    </Layout>
  );
}
