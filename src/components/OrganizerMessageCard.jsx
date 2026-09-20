import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { isValidEmail } from "../lib/validators";

export default function OrganizerMessageCard({ pollId, campaignId, branding }) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPoll() {
      const { data, error } = await supabase.rpc("get_public_poll", { target_poll_id: Number(pollId) }).single();
      if (!cancelled && !error) setEnabled(data?.allow_organizer_messages !== false);
    }

    loadPoll();
    return () => {
      cancelled = true;
    };
  }, [pollId]);

  async function submitMessage() {
    if (!message.trim() || submitting) return;
    setEmailError("");
    if (replyEmail.trim() && !isValidEmail(replyEmail)) {
      setEmailError(t("vote.emailInvalid"));
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.rpc("send_organizer_message", {
      target_poll_id: Number(pollId),
      target_campaign_id: campaignId,
      message_text: message.trim(),
      contact_email: replyEmail.trim() || null
    });
    setSubmitting(false);

    if (error) {
      console.error("Organizer message failed", error);
      return;
    }
    setSubmitted(true);
  }

  if (!enabled) return null;

  return (
    <div className="qr-portal-menu-item qr-portal-menu-message" style={{ borderColor: branding.primaryColor }}>
      <span className="qr-portal-menu-item-title">{t("vote.messageToOrganizer")}</span>
      {submitted ? (
        <p className="qr-portal-poll-thanks">{t("vote.messageSent")}</p>
      ) : (
        <>
          <p className="qr-portal-menu-item-body">{t("vote.messageOptionalNote")}</p>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={2000}
            rows="3"
            className="qr-portal-poll-freetext"
            placeholder={t("vote.messagePlaceholder")}
          />
          <input
            type="email"
            value={replyEmail}
            onChange={(event) => { setReplyEmail(event.target.value); setEmailError(""); }}
            className="qr-portal-poll-freetext"
            placeholder={t("vote.messageReplyEmailPlaceholder")}
          />
          {emailError && <p className="mt-1 text-xs text-red-600" role="alert">{emailError}</p>}
          <button
            type="button"
            onClick={submitMessage}
            disabled={!message.trim() || submitting}
            className="qr-portal-menu-item-cta qr-portal-poll-submit"
            style={{ backgroundColor: branding.primaryColor }}
          >
            {submitting ? t("vote.sendingMessage") : t("vote.sendMessage")}
          </button>
        </>
      )}
    </div>
  );
}
