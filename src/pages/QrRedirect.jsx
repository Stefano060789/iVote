import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getPollBranding } from "../lib/pollBranding";

export default function QrRedirect() {
  const navigate = useNavigate();
  const { token } = useParams();
  const [portal, setPortal] = useState(null);
  const [manage, setManage] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function resolveQr() {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (user) {
        const { data: ownedCampaign } = await supabase
          .from("qr_campaigns")
          .select("id, name, poll_id, workspace_id, placement_label, variant_label")
          .eq("token", token)
          .maybeSingle();

        if (ownedCampaign) {
          const [{ data: polls }, { data: currentPoll }] = await Promise.all([
            supabase.from("polls").select("id, question").eq("workspace_id", ownedCampaign.workspace_id).order("id", { ascending: false }),
            ownedCampaign.poll_id
              ? supabase.from("polls").select("id, question").eq("id", ownedCampaign.poll_id).maybeSingle()
              : Promise.resolve({ data: null })
          ]);
          setManage({ campaign: ownedCampaign, currentPoll, polls: polls || [] });
          return;
        }
      }

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

  async function changeAssignedPoll(nextPollId) {
    if (!manage || !nextPollId) return;
    const { error } = await supabase.from("qr_campaigns").update({ poll_id: Number(nextPollId) }).eq("id", manage.campaign.id);
    if (error) {
      alert(error.message);
      return;
    }
    const nextPoll = manage.polls.find((poll) => String(poll.id) === String(nextPollId)) || null;
    setManage((current) => ({ ...current, currentPoll: nextPoll, campaign: { ...current.campaign, poll_id: Number(nextPollId) } }));
  }

  if (manage) {
    return (
      <main className="mx-auto max-w-md p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-300">You are managing this QR code</p>
        <h1 className="mt-1 text-2xl font-bold">{manage.campaign.name}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {manage.campaign.placement_label || "Unlabeled placement"}{manage.campaign.variant_label ? ` · ${manage.campaign.variant_label}` : ""}
        </p>

        <div className="mt-6 rounded border border-slate-700 bg-slate-900 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Currently showing</p>
          <p className="mt-1 font-semibold">{manage.currentPoll?.question || "No poll assigned yet"}</p>
        </div>

        <label className="mt-6 block text-sm font-semibold">Change the poll for this QR code</label>
        <select
          value={manage.campaign.poll_id ? String(manage.campaign.poll_id) : ""}
          onChange={(event) => changeAssignedPoll(event.target.value)}
          className="mt-2 w-full rounded border p-2 text-black"
        >
          <option value="">Choose a poll</option>
          {manage.polls.map((poll) => (
            <option key={poll.id} value={String(poll.id)}>#{poll.id} - {poll.question}</option>
          ))}
        </select>

        <Link
          to={`/create?campaign=${manage.campaign.id}`}
          className="mt-4 block rounded bg-teal-400 px-4 py-3 text-center font-semibold text-slate-950"
        >
          Create a new poll for this QR code
        </Link>

        <Link to="/admin" className="mt-6 block text-center text-sm text-slate-300 underline">Back to Admin dashboard</Link>
      </main>
    );
  }

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
