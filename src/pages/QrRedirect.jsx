import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function QrRedirect() {
  const navigate = useNavigate();
  const { token } = useParams();

  useEffect(() => {
    async function resolveQr() {
      const { data: campaign, error: campaignError } = await supabase
        .rpc("get_public_qr_campaign", { target_token: token })
        .maybeSingle();

      if (!campaignError && campaign?.poll_id) {
        await supabase.rpc("record_qr_scan", { target_campaign_id: campaign.campaign_id });
        navigate(`/vote/${campaign.poll_id}?campaign=${campaign.campaign_id}`, { replace: true });
        return;
      }

      const stableShortUrl = `${window.location.origin}/qr/${token}`;
      const { data, error } = await supabase
        .rpc("get_public_poll_by_qr", { target_url: stableShortUrl })
        .single();

      if (error || !data) {
        console.error(error);
        return;
      }

      navigate(`/vote/${data.id}`, { replace: true });
    }

    resolveQr();
  }, [navigate, token]);

  return <p className="text-center p-6">Opening poll...</p>;
}
