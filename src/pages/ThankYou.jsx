import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ThankYou() {
  const [searchParams] = useSearchParams();
  const pollId = searchParams.get("poll");
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

      {poll?.review_url && (
        <div className="mt-6 rounded border border-amber-700 bg-slate-900 p-5">
          <p className="font-semibold text-amber-200">Enjoyed your experience? Tell others about it.</p>
          <a href={poll.review_url} target="_blank" rel="noreferrer" className="mt-3 inline-block rounded bg-amber-400 px-4 py-2 font-semibold text-slate-950">
            Leave a review
          </a>
        </div>
      )}

      <div className="mt-8 border-t border-slate-700 pt-5">
        <p className="text-sm text-slate-300">iVote helps venues turn simple QR scans into useful feedback.</p>
        <Link to="/" className="mt-3 inline-block text-sm font-semibold text-teal-300 underline">Learn about iVote</Link>
      </div>
    </div>
  );
}
