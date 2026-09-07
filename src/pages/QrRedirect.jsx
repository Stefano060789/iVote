import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getPollBranding } from "../lib/pollBranding";

export default function QrRedirect() {
  const navigate = useNavigate();
  const { token } = useParams();
  const [portal, setPortal] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function resolveQr() {
      const { data: campaign, error: campaignError } = await supabase
        .rpc("get_public_qr_campaign", { target_token: token })
        .maybeSingle();

      if (!campaignError && campaign?.poll_id) {
        await supabase.rpc("record_qr_scan", { target_campaign_id: campaign.campaign_id });
        const { data: poll, error: pollError } = await supabase
          .rpc("get_public_poll", { target_poll_id: Number(campaign.poll_id) })
          .single();
        if (pollError || !poll) {
          setErrorMessage("This feedback campaign is unavailable right now.");
          return;
        }
        setPortal({ campaign, poll, branding: getPollBranding(poll) });
        return;
      }

      const stableShortUrl = `${window.location.origin}/qr/${token}`;
      const { data, error } = await supabase
        .rpc("get_public_poll_by_qr", { target_url: stableShortUrl })
        .single();

      if (error || !data) {
        console.error(error);
        setErrorMessage("This QR code does not have an active poll.");
        return;
      }

      navigate(`/vote/${data.id}`, { replace: true });
    }

    resolveQr();
  }, [navigate, token]);

  if (errorMessage) return <p className="p-6 text-center">{errorMessage}</p>;
  if (!portal) return <p className="p-6 text-center">Opening feedback...</p>;

  const { campaign, poll, branding } = portal;
  return (
    <main className="qr-portal" style={{ backgroundColor: branding.accentColor }}>
      <section className="qr-portal-card">
        {branding.logoUrl && <img src={branding.logoUrl} alt={`${branding.brandName || "Venue"} logo`} className="qr-portal-logo" />}
        <p className="qr-portal-brand" style={{ color: branding.primaryColor }}>{branding.brandName || "iVote"}</p>
        <h1>{campaign.portal_title || "Your feedback matters."}</h1>
        <p>{campaign.portal_message || `Take a moment to share feedback about ${poll.question}.`}</p>
        <button
          type="button"
          onClick={() => navigate(`/vote/${poll.id}?campaign=${campaign.campaign_id}`, { replace: true })}
          style={{ backgroundColor: branding.primaryColor }}
        >
          {campaign.portal_button_label || "Share your feedback"}
        </button>
        <span>It only takes a few seconds.</span>
      </section>
    </main>
  );
}
