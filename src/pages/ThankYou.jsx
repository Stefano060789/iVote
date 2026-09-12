import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ThankYou() {
  const [searchParams] = useSearchParams();
  const pollId = searchParams.get("poll");
  const isPositive = searchParams.get("positive") !== "0";
  const emailBenefitEligible = searchParams.get("emailBenefit") === "1";
  const reviewEligible = searchParams.get("reviewEligible") === "1";
  const visitCount = Number(searchParams.get("visits") || 0);
  const [poll, setPoll] = useState(null);

  useEffect(() => {
    async function loadPoll() {
      if (!pollId) return;
      const { data, error } = await supabase
        .rpc("get_public_poll", { target_poll_id: Number(pollId) })
        .single();
      if (!error) setPoll(data);
    }
    loadPoll();
  }, [pollId]);

  const hasReward = Boolean(poll?.reward_message || poll?.reward_code || poll?.reward_url);
  const loyaltyEligible = Boolean(poll?.loyalty_visit_threshold) && visitCount >= poll.loyalty_visit_threshold
    && Boolean(poll?.loyalty_benefit_message || poll?.loyalty_benefit_code || poll?.loyalty_benefit_url);
  const reviewPlatforms = Array.isArray(poll?.review_platforms) && poll.review_platforms.length > 0
    ? poll.review_platforms
    : poll?.review_url ? [{ name: "Review platform", url: poll.review_url }] : [];

  return (
    <div className="mx-auto max-w-lg p-10 text-center text-white">
      <h1 className="text-3xl font-bold mb-4">Thank you for voting!</h1>
      <p>Your vote has been recorded.</p>

      {hasReward && (
        <div className="mt-6 rounded border border-teal-700 bg-slate-900 p-5">
          {poll.reward_message && <p className="font-semibold text-teal-200">{poll.reward_message}</p>}
          {poll.reward_code && (
            <p className="mt-2 inline-block rounded bg-teal-950 px-3 py-1 font-mono text-teal-300">{poll.reward_code}</p>
          )}
          {poll.reward_url && (
            <a href={poll.reward_url} target="_blank" rel="noreferrer" className="mt-3 block text-sm font-semibold text-teal-300 underline">
              Redeem your reward
            </a>
          )}
        </div>
      )}

      {loyaltyEligible && (
        <div className="mt-6 rounded border border-amber-700 bg-slate-900 p-5">
          <p className="font-semibold text-amber-200">Welcome back! Thanks for visiting again.</p>
          {poll.loyalty_benefit_message && <p className="mt-2 text-sm text-slate-300">{poll.loyalty_benefit_message}</p>}
          {poll.loyalty_benefit_code && (
            <p className="mt-2 inline-block rounded bg-teal-950 px-3 py-1 font-mono text-teal-300">{poll.loyalty_benefit_code}</p>
          )}
          {poll.loyalty_benefit_url && (
            <a href={poll.loyalty_benefit_url} target="_blank" rel="noreferrer" className="mt-3 block text-sm font-semibold text-teal-300 underline">
              Redeem your returning-customer bonus
            </a>
          )}
        </div>
      )}

      {emailBenefitEligible && poll?.email_benefit_type && poll.email_benefit_type !== "none" && (
        <div className="mt-6 rounded border border-teal-700 bg-slate-900 p-5">
          <p className="font-semibold text-teal-200">Your opt-in benefit</p>
          <p className="mt-2 text-sm text-slate-300">{poll.email_benefit_type === "voucher" ? "Voucher" : "Discount code"}</p>
          {poll.email_benefit_value && <p className="mt-2 inline-block rounded bg-teal-950 px-3 py-1 font-mono text-teal-300">{poll.email_benefit_value}</p>}
          {poll.email_benefit_url && <a href={poll.email_benefit_url} target="_blank" rel="noreferrer" className="mt-3 block text-sm font-semibold text-teal-300 underline">Redeem your benefit</a>}
        </div>
      )}

      {reviewEligible && reviewPlatforms.length > 0 && (
        <div className="mt-6 rounded border border-amber-700 bg-slate-900 p-5">
          <p className="font-semibold text-amber-200">Tell others about your visit</p>
          <p className="mt-2 text-sm text-slate-300">Choose a platform and leave honest feedback, positive or not — it's entirely optional.</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">{reviewPlatforms.map((platform) => <a key={platform.url} href={platform.url} target="_blank" rel="noreferrer" className="rounded bg-amber-400 px-4 py-2 font-semibold text-slate-950">Review on {platform.name}</a>)}</div>
        </div>
      )}

      {!isPositive && (
        <div className="mt-6 rounded border border-slate-700 bg-slate-900 p-5">
          <p className="text-sm text-slate-300">Thanks for the honest feedback. The team running this poll will see it directly and follow up if needed.</p>
        </div>
      )}


      <div className="mt-8 border-t border-slate-700 pt-5">
        <p className="text-sm text-slate-300">Godwit helps venues turn simple QR scans into useful feedback.</p>
        <Link to="/" className="mt-3 inline-block text-sm font-semibold text-teal-300 underline">Learn about Godwit</Link>
      </div>
    </div>
  );
}
