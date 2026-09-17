import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { savePollMeta, readPollMeta } from "../lib/pollMeta";
import { POLL_TEMPLATES, getTemplateByKey } from "../lib/pollTemplates";
import { DEFAULT_ACCENT_COLOR, DEFAULT_PRIMARY_COLOR } from "../lib/pollBranding";
import { readWorkspaceProfile, loadWorkspacePlan } from "../lib/workspaceProfile";
import { getEntitlements } from "../lib/entitlements";
import LockedFeature from "../components/LockedFeature";

export default function EditPoll() {
  const { t } = useTranslation();
  const { pollId } = useParams();
  const navigate = useNavigate();

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
  const [emailBenefitType, setEmailBenefitType] = useState("none");
  const [emailBenefitValue, setEmailBenefitValue] = useState("");
  const [emailBenefitUrl, setEmailBenefitUrl] = useState("");
  const [raffleEnabled, setRaffleEnabled] = useState(false);
  const [rafflePrize, setRafflePrize] = useState("");
  const [raffleAcknowledged, setRaffleAcknowledged] = useState(false);
  const [raffleRulesUrl, setRaffleRulesUrl] = useState("");
  const [loyaltyVisitThreshold, setLoyaltyVisitThreshold] = useState("");
  const [loyaltyBenefitMessage, setLoyaltyBenefitMessage] = useState("");
  const [loyaltyBenefitCode, setLoyaltyBenefitCode] = useState("");
  const [loyaltyBenefitUrl, setLoyaltyBenefitUrl] = useState("");
  const [plan, setPlan] = useState("free");

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
      setMultipleChoice(Boolean(data.multiple_choice));
      setAllowUserAnswers(Boolean(data.allow_user_answers));
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
      setEmailBenefitType(data.email_benefit_type ?? pollMeta.email_benefit_type ?? "none");
      setEmailBenefitValue(data.email_benefit_value ?? pollMeta.email_benefit_value ?? "");
      setEmailBenefitUrl(data.email_benefit_url ?? pollMeta.email_benefit_url ?? "");
      setRaffleEnabled(data.raffle_enabled ?? pollMeta.raffle_enabled ?? false);
      setRafflePrize(data.raffle_prize ?? pollMeta.raffle_prize ?? "");
      setRaffleAcknowledged(data.raffle_terms_acknowledged ?? pollMeta.raffle_terms_acknowledged ?? false);
      setRaffleRulesUrl(data.raffle_rules_url ?? pollMeta.raffle_rules_url ?? "");
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
      if (data.workspace_id) setPlan(await loadWorkspacePlan(data.workspace_id));

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

    if (raffleEnabled && !raffleAcknowledged) {
      alert(t("admin.pollForm.errors.confirmPrizeRules"));
      return;
    }

    const { error } = await supabase
      .from("polls")
      .update({
        question: question.trim(),
        answers: cleanedAnswers,
        multiple_choice: multipleChoice,
        allow_user_answers: allowUserAnswers
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
      email_benefit_type: emailBenefitType,
      email_benefit_value: emailBenefitValue.trim() || null,
      email_benefit_url: emailBenefitUrl.trim() || null,
      raffle_enabled: raffleEnabled,
      raffle_prize: raffleEnabled ? rafflePrize.trim() || null : null,
      raffle_terms_acknowledged: raffleEnabled ? raffleAcknowledged : false,
      raffle_rules_url: raffleEnabled ? raffleRulesUrl.trim() || null : null,
      loyalty_visit_threshold: String(loyaltyVisitThreshold).trim() ? Number(loyaltyVisitThreshold) : null,
      loyalty_benefit_message: loyaltyBenefitMessage.trim() || null,
      loyalty_benefit_code: loyaltyBenefitCode.trim() || null,
      loyalty_benefit_url: loyaltyBenefitUrl.trim() || null
    });

    navigate("/admin");
  }

  const entitlements = getEntitlements(plan);

  return (
    <div className="workspace-page max-w-xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">{t("admin.pollForm.editTitle")}</h1>

      <label className="block mb-2 font-semibold">{t("admin.pollForm.template")}</label>
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

      <label className="block mb-2 font-semibold">{t("admin.pollForm.question")}</label>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="w-full border p-2 rounded mb-4 text-black"
      />

      <label className="block mb-2 font-semibold">{t("admin.pollForm.answers")}</label>
      <div className="space-y-2 mb-4">
        {answers.map((answer, index) => (
          <input
            key={index}
            type="text"
            value={answer}
            onChange={(e) => updateAnswer(index, e.target.value)}
            className="w-full border p-2 rounded text-black"
            placeholder={t("admin.pollForm.answerPlaceholder", { number: index + 1 })}
          />
        ))}
      </div>

      {answers.length >= 10 && (
        <p className="text-red-600 text-sm mb-4">{t("admin.pollForm.maxAnswers")}</p>
      )}

      <details className="mb-4 border border-slate-700 rounded">
        <summary className="cursor-pointer p-3 font-semibold">{t("admin.pollForm.responseOptions")}</summary>
        <div className="px-3 pb-3">
          <p className="mb-3 text-sm text-slate-400">{t("admin.pollForm.responseOptionsHint")}</p>
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={multipleChoice}
              onChange={(e) => setMultipleChoice(e.target.checked)}
            />
            <span>{t("admin.pollForm.multipleAnswers")}</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allowUserAnswers}
              onChange={(e) => setAllowUserAnswers(e.target.checked)}
            />
            <span>{t("admin.pollForm.customAnswers")}</span>
          </label>
        </div>
      </details>

      <label className="block mb-2 font-semibold">{t("admin.pollForm.qrLocation")}</label>
      <input
       value={locationName}
       onChange={(e) => setLocationName(e.target.value)}
       className="w-full border p-2 rounded mb-4 text-black"
       placeholder={t("admin.pollForm.qrLocationPlaceholder")}
      />

      <h2 className="text-xl font-bold mb-3">{t("admin.pollForm.branding")}</h2>

      <label className="block mb-2 font-semibold">{t("admin.pollForm.brandName")}</label>
      <input
        value={brandName}
        onChange={(e) => setBrandName(e.target.value)}
        className="w-full border p-2 rounded mb-4 text-black"
        placeholder={t("admin.pollForm.brandNamePlaceholder")}
      />

      <label className="block mb-2 font-semibold">{t("admin.pollForm.brandLogo")}</label>
      <input
        type="url"
        value={brandLogoUrl}
        onChange={(e) => setBrandLogoUrl(e.target.value)}
        className="w-full border p-2 rounded mb-4 text-black"
        placeholder={t("admin.pollForm.brandLogoPlaceholder")}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <label className="block font-semibold">
          {t("admin.pollForm.buttonColor")}
          <span className="mt-1 block text-xs font-normal text-slate-400">{t("admin.pollForm.buttonColorHint")}</span>
          <input
            type="color"
            value={brandPrimaryColor}
            onChange={(e) => setBrandPrimaryColor(e.target.value)}
            className="w-full border p-1 rounded mt-1 h-11"
          />
        </label>
        <label className="block font-semibold">
          {t("admin.pollForm.backgroundColor")}
          <span className="mt-1 block text-xs font-normal text-slate-400">{t("admin.pollForm.backgroundColorHint")}</span>
          <input
            type="color"
            value={brandAccentColor}
            onChange={(e) => setBrandAccentColor(e.target.value)}
            className="w-full border p-1 rounded mt-1 h-11"
          />
        </label>
      </div>

      <label className="block mb-2 font-semibold">{t("admin.pollForm.startsAt")}</label>
      <input
       type="datetime-local"
       value={startsAt}
       onChange={(e) => setStartsAt(e.target.value)}
       className="w-full border p-2 rounded mb-4 text-black"
      />

      <label className="block mb-2 font-semibold">{t("admin.pollForm.endsAt")}</label>
      <input
       type="datetime-local"
       value={expiresAt}
       onChange={(e) => setExpiresAt(e.target.value)}
       className="w-full border p-2 rounded mb-4 text-black"
      />

      <h2 className="text-xl font-bold mb-3">{t("admin.pollForm.afterVoting")}</h2>
      <p className="mb-3 text-sm text-slate-400">{t("admin.pollForm.afterVotingHint")}</p>

      {entitlements.rewardMessage ? (
      <>
      <label className="block mb-2 font-semibold">{t("admin.pollForm.rewardMessage")}</label>
      <input
        type="text"
        value={rewardMessage}
        onChange={(e) => setRewardMessage(e.target.value)}
        className="w-full border p-2 rounded mb-4 text-black"
        placeholder={t("admin.pollForm.rewardMessagePlaceholder")}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <input
          type="text"
          value={rewardCode}
          onChange={(e) => setRewardCode(e.target.value)}
          className="w-full border p-2 rounded text-black"
          placeholder={t("admin.pollForm.discountCode")}
        />
        <input
          type="url"
          value={rewardUrl}
          onChange={(e) => setRewardUrl(e.target.value)}
          className="w-full border p-2 rounded text-black"
          placeholder={t("admin.pollForm.redemptionLink")}
        />
      </div>
      </>
      ) : (
        <div className="mb-4">
          <LockedFeature
            feature="rewardMessage"
            title="Show a thank-you reward after voting"
            description="Give every voter a message, discount code, or redemption link right after they submit."
          />
        </div>
      )}

        <div className="mt-5 border-t border-slate-600 pt-4">
          {!entitlements.emailBenefits ? (
            <LockedFeature
              feature="emailBenefits"
              title="Offer a benefit when a voter shares their email"
              description="Collect an email only with clear consent, then provide a voucher or discount code."
            />
          ) : (
          <>
          <p className="font-semibold">{t("admin.pollForm.emailBenefitTitle")}</p>
          <p className="mt-1 text-xs text-slate-400">{t("admin.pollForm.emailBenefitBody")}</p>
          <select value={emailBenefitType} onChange={(event) => setEmailBenefitType(event.target.value)} className="mt-3 w-full border p-2 rounded text-black">
            <option value="none">{t("admin.pollForm.noEmailBenefit")}</option><option value="voucher">{t("admin.pollForm.voucher")}</option><option value="discount_code">{t("admin.pollForm.discountCodeShort")}</option>
          </select>
          {emailBenefitType !== "none" && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <input value={emailBenefitValue} onChange={(event) => setEmailBenefitValue(event.target.value)} className="border p-2 rounded text-black" placeholder={t("admin.pollForm.voucherOrCode")} />
            <input type="url" value={emailBenefitUrl} onChange={(event) => setEmailBenefitUrl(event.target.value)} className="border p-2 rounded text-black" placeholder={t("admin.pollForm.redemptionLink")} />
          </div>}
          </>
          )}
        </div>

      {entitlements.prizeDraws ? (
      <>
      <label className="mb-2 flex items-center gap-2">
        <input
          type="checkbox"
          checked={raffleEnabled}
          onChange={(e) => setRaffleEnabled(e.target.checked)}
        />
        <span className="font-semibold">{t("admin.pollForm.prizeDraw")}</span>
      </label>
      {raffleEnabled && (
        <>
          <input
            type="text"
            value={rafflePrize}
            onChange={(e) => setRafflePrize(e.target.value)}
            className="w-full border p-2 rounded mb-1 text-black"
            placeholder={t("admin.pollForm.prizePlaceholder")}
          />
          <p className="mb-2 text-xs text-slate-400">
            Voters will see official rules automatically: no purchase necessary, 18+ and locally eligible only, one entry per person, winner picked at random, void where prohibited.
          </p>
          <input
            type="url"
            value={raffleRulesUrl}
            onChange={(e) => setRaffleRulesUrl(e.target.value)}
            className="w-full border p-2 rounded mb-2 text-black"
            placeholder={t("admin.pollForm.officialRulesLink")}
          />
          <label className="mb-4 flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              checked={raffleAcknowledged}
              onChange={(e) => setRaffleAcknowledged(e.target.checked)}
              className="mt-0.5"
            />
            <span>{t("admin.pollForm.prizeAcknowledgement")}</span>
          </label>
        </>
      )}
      </>
      ) : (
        <div className="mb-4">
          <LockedFeature
            feature="prizeDraws"
            title="Run a prize draw for this poll"
            description="Let voters enter a raffle with their email for a chance to win, then pick a winner at random from the dashboard."
          />
        </div>
      )}

      <div className="mt-1 mb-4 border-t border-slate-600 pt-4">
        <p className="font-semibold">{t("admin.pollForm.returningCustomer")}</p>
        <p className="mt-1 text-xs text-slate-400">{t("admin.pollForm.returningCustomerBody")}</p>
        <input
          type="number"
          min="2"
          max="50"
          value={loyaltyVisitThreshold}
          onChange={(e) => setLoyaltyVisitThreshold(e.target.value)}
          className="mt-3 w-full border p-2 rounded text-black"
          placeholder={t("admin.pollForm.visitThreshold")}
        />
        {String(loyaltyVisitThreshold).trim() && <>
          <input
            type="text"
            value={loyaltyBenefitMessage}
            onChange={(e) => setLoyaltyBenefitMessage(e.target.value)}
            className="mt-3 w-full border p-2 rounded text-black"
            placeholder={t("admin.pollForm.welcomeBack")}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <input
              type="text"
              value={loyaltyBenefitCode}
              onChange={(e) => setLoyaltyBenefitCode(e.target.value)}
              className="border p-2 rounded text-black"
              placeholder={t("admin.pollForm.bonusCode")}
            />
            <input
              type="url"
              value={loyaltyBenefitUrl}
              onChange={(e) => setLoyaltyBenefitUrl(e.target.value)}
              className="border p-2 rounded text-black"
              placeholder={t("admin.pollForm.redemptionLink")}
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
