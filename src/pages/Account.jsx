import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";

export default function Account() {
  const navigate = useNavigate(); const [user, setUser] = useState(null); const [message, setMessage] = useState("");
  useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (!data.user) navigate("/login"); else setUser(data.user); }); }, [navigate]);
  async function request(type) { const { error } = await supabase.from("privacy_requests").insert({ user_id: user.id, request_type: type }); setMessage(error ? error.message : "Request received. It will be reviewed before any production data is changed."); }
  if (!user) return null;
  return <Layout><div className="mx-auto max-w-xl space-y-5 p-2 sm:p-6"><h1 className="text-3xl font-bold">Account</h1><p className="text-slate-300">Signed in as {user.email}</p>{message && <output className="block rounded border p-3 text-sm">{message}</output>}<section className="space-y-3 border-t pt-4"><h2 className="text-xl font-semibold">Privacy requests</h2><button onClick={() => request("consent_withdrawal")} className="rounded border px-4 py-2">Withdraw follow-up consent</button><button onClick={() => request("data_export")} className="ml-3 rounded border px-4 py-2">Request data export</button><button onClick={() => request("account_deletion")} className="block rounded bg-red-700 px-4 py-2 text-white">Request account deletion</button></section></div></Layout>;
}