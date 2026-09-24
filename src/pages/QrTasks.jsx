import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { addWoodpeckerMessage, completeWoodpeckerTask, loadWoodpeckerPortal } from "../lib/woodpecker";

export default function QrTasks() {
  const { token } = useParams();
  const [tasks, setTasks] = useState([]);
  const [message, setMessage] = useState({});
  const [error, setError] = useState("");
  async function refresh() { try { setTasks(await loadWoodpeckerPortal(token)); } catch (e) { setError(e.message); } }
  useEffect(() => {
    refresh();
    const channel = supabase.channel(`woodpecker-${token}`).on("postgres_changes", { event: "*", schema: "public", table: "woodpecker_tasks" }, refresh).on("postgres_changes", { event: "INSERT", schema: "public", table: "woodpecker_task_history" }, refresh).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [token]);
  async function send(taskId) { if (!message[taskId]?.trim()) return; await addWoodpeckerMessage(taskId, message[taskId]); setMessage({ ...message, [taskId]: "" }); await refresh(); }
  async function complete(taskId) { await completeWoodpeckerTask(taskId); await refresh(); }
  return <main className="qr-portal"><section className="qr-portal-card"><p className="qr-portal-brand">Godwit · Woodpecker</p><h1>Tasks for this QR code</h1><p>See what needs attention and share an update with the team.</p>{error && <p role="alert">{error}</p>}{tasks.length === 0 && <p>No tasks yet.</p>}{tasks.map((task) => <article key={task.id} className="qr-portal-menu-item"><div className="flex justify-between gap-3"><h2 className="font-bold">{task.title}</h2><span>{task.status}</span></div>{task.description && <p>{task.description}</p>}<div className="mt-3 space-y-2">{(task.history || []).map((event) => <p key={event.id} className="text-sm"><strong>{event.event_type === "completed" ? "✓ " : ""}</strong>{event.message || event.event_type}</p>)}</div>{task.status !== "completed" && <><textarea value={message[task.id] || ""} onChange={(e) => setMessage({ ...message, [task.id]: e.target.value })} placeholder="Add a message" className="mt-3 w-full rounded border p-2 text-black" rows="2" /><div className="mt-2 flex gap-2"><button onClick={() => send(task.id)} className="rounded bg-teal-500 px-3 py-2 text-sm font-semibold text-slate-950">Send update</button><button onClick={() => complete(task.id)} className="rounded border border-teal-400 px-3 py-2 text-sm">Mark complete</button></div></>}</article>)}</section></main>;
}
