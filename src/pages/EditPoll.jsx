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
      brand_accent_color: brandAccentColor || DEFAULT_ACCENT_COLOR
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
          Primary color
          <input
            type="color"
            value={brandPrimaryColor}
            onChange={(e) => setBrandPrimaryColor(e.target.value)}
            className="w-full border p-1 rounded mt-1 h-11"
          />
        </label>
        <label className="block font-semibold">
          Accent color
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

      <button
        onClick={updatePoll}
        className="bg-blue-600 text-white px-4 py-2 rounded font-semibold"
      >
        Save Changes
      </button>
    </div>
  );
}
