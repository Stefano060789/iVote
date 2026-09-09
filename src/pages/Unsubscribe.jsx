import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState(token ? "working" : "missing");

  useEffect(() => {
    if (!token) return;

    async function run() {
      const { data, error } = await supabase.rpc("unsubscribe_voter_profile", { target_token: token });
      if (error) {
        setStatus("error");
        return;
      }
      setStatus(data ? "done" : "notfound");
    }

    run();
  }, [token]);

  return (
    <Layout>
      <div className="mx-auto max-w-lg p-10 text-center text-white">
        <h1 className="text-2xl font-bold mb-4">Email preferences</h1>
        {status === "working" && <p className="text-sm text-slate-300">Updating your preferences...</p>}
        {status === "done" && <p className="text-sm text-slate-300">You're unsubscribed. You won't receive any more follow-up or win-back emails from this workspace.</p>}
        {status === "notfound" && <p className="text-sm text-slate-300">This unsubscribe link is no longer valid, but if you're trying to stop these emails, please contact the organizer directly.</p>}
        {status === "missing" && <p className="text-sm text-slate-300">This link is missing a token, so we couldn't identify your subscription.</p>}
        {status === "error" && <p className="text-sm text-slate-300">Something went wrong. Please try again in a moment.</p>}
        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-teal-300 underline">Back to iVote</Link>
      </div>
    </Layout>
  );
}
