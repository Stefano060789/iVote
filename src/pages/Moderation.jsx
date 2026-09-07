import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";

export default function Moderation() {
  const [reports, setReports] = useState([]); const [message, setMessage] = useState("");
  async function load() { const { data, error } = await supabase.from("content_reports").select("*").order("created_at", { ascending: false }); if (error) setMessage(error.message); else setReports(data || []); }
  useEffect(() => { load(); }, []);
  async function review(report, status) {
    if (status === "hidden") { const { error } = await supabase.from("user_answers").update({ is_hidden: true }).eq("poll_id", report.poll_id).eq("answer", report.reported_answer); if (error) { setMessage(error.message); return; } }
    const { error } = await supabase.from("content_reports").update({ status, reviewed_at: new Date().toISOString() }).eq("id", report.id);
    setMessage(error ? error.message : "Report updated."); if (!error) load();
  }
  return <Layout><div className="mx-auto max-w-3xl space-y-4 p-2 sm:p-6"><h1 className="text-3xl font-bold">Content moderation</h1><p className="text-sm text-slate-400">Review reported user-submitted answers. Hiding removes the answer from the public voting view without deleting the report.</p>{message && <output className="block">{message}</output>}{reports.length === 0 ? <p>No reports to review.</p> : reports.map((report) => <section key={report.id} className="rounded border border-slate-700 p-4"><p className="font-semibold">{report.reported_answer}</p><p className="mt-1 text-sm text-slate-400">Poll #{report.poll_id} · {report.reason} · {report.status}</p>{report.status === "open" && <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => review(report, "hidden")} className="rounded bg-red-700 px-3 py-2 text-white">Hide answer</button><button onClick={() => review(report, "reviewed")} className="rounded border px-3 py-2">Mark reviewed</button><button onClick={() => review(report, "dismissed")} className="rounded border px-3 py-2">Dismiss</button></div>}</section>)}</div></Layout>;
}