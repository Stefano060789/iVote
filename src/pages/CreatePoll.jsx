import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";
import QRCode from "qrcode";
import { isRestrictedTopic } from "../lib/restrictedContent";
import { createStableQrUrl } from "../lib/pollLinks";
import { savePollMeta } from "../lib/pollMeta";
import { POLL_TEMPLATES, getTemplateByKey } from "../lib/pollTemplates";
import { DEFAULT_ACCENT_COLOR, DEFAULT_PRIMARY_COLOR } from "../lib/pollBranding";
import { readWorkspaceProfile } from "../lib/workspaceProfile";

export default function CreatePoll() {
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
  const [pollId, setPollId] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  useEffect(() => {
    async function loadDefaultBranding() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;

      const profile = readWorkspaceProfile(user.id);
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
      brand_accent_color: brandAccentColor || DEFAULT_ACCENT_COLOR
    });

    setPollId(data.id);
    const qr = await QRCode.toDataURL(stableShortUrl);
    setQrCodeUrl(qr);
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">Create a Poll</h1>

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
          type="text"
          className="w-full border p-2 rounded mb-4 text-black placeholder-black"
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

        <label className="flex items-center gap-2 mt-4 mb-4">
          <input
            type="checkbox"
            checked={multipleChoice}
            onChange={(e) => setMultipleChoice(e.target.checked)}
          />
          <span>Allow multiple answers</span>
        </label>

        <label className="flex items-center gap-2 mt-4 mb-4">
          <input
            type="checkbox"
            checked={allowUserAnswers}
            onChange={(e) => setAllowUserAnswers(e.target.checked)}
          />
          <span>Allow users to add their own answers</span>
        </label>

        <label className="block mb-2 font-semibold">QR location name</label>
        <input
          type="text"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          className="w-full border p-2 rounded mb-4 text-black placeholder-black"
          placeholder="Entrance, Table 1, Bar"
        />

        <h2 className="text-xl font-bold mb-3">Branding</h2>

        <label className="block mb-2 font-semibold">Customer/Brand name</label>
        <input
          type="text"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          className="w-full border p-2 rounded mb-4 text-black placeholder-black"
          placeholder="Acme Events"
        />

        <label className="block mb-2 font-semibold">Brand logo URL (optional)</label>
        <input
          type="url"
          value={brandLogoUrl}
          onChange={(e) => setBrandLogoUrl(e.target.value)}
          className="w-full border p-2 rounded mb-4 text-black placeholder-black"
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
          className="w-full border p-2 rounded mb-4 text-black placeholder-black"
        />

        <label className="block mb-2 font-semibold">Ends at</label>
        <input
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="w-full border p-2 rounded mb-4 text-black placeholder-black"
        />

        <button
          onClick={createPoll}
          className="w-full bg-blue-600 text-white p-3 rounded font-semibold"
        >
          Create Poll
        </button>

        {pollId && (
          <div className="mt-8 text-center">
            <h2 className="text-xl font-bold mb-4">Poll Created!</h2>
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
              <a href="/admin" className="text-blue-600 underline">Go to Admin</a>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
