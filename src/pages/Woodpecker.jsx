import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { loadWorkspaceProfile } from "../lib/workspaceProfile";
import { loadQrCampaigns } from "../lib/qrCampaigns";
import woodpecker from "../assets/birds/woodpecker.svg";
import { loadWoodpeckerTasks } from "../lib/woodpecker";

export default function Woodpecker({ embedded = false }) {
  const { t } = useTranslation();
  const [workspace, setWorkspace] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", campaignId: "", responseMode: "scan" });
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("woodpecker_notifications")) || { messages: true, completions: true };
    } catch {
      return { messages: true, completions: true };
    }
  });
  const [notificationStatus, setNotificationStatus] = useState("");
  const initialRealtimeLoad = useRef(true);

  async function refresh(id) {
    setTasks(await loadWoodpeckerTasks(id));
    setCampaigns(await loadQrCampaigns());
  }
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error(t("woodpecker.signIn"));
        const profile = await loadWorkspaceProfile();
        setWorkspace(profile);
        await refresh(profile.id);
      } catch (e) { setError(e.message); }
    })();
  }, [t]);

  useEffect(() => {
    if (!workspace?.id) return undefined;
    const channel = supabase
      .channel(`woodpecker-admin-${workspace.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "woodpecker_task_history" }, async (payload) => {
        const eventType = payload.new?.event_type;
        const enabled = eventType === "message" ? notifications.messages : eventType === "completed" ? notifications.completions : false;
        await refresh(workspace.id);
        if (!initialRealtimeLoad.current && enabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("Woodpecker task update", { body: payload.new?.message || "A task was updated." });
        }
        initialRealtimeLoad.current = false;
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspace?.id, notifications]);

  function updateNotifications(next) {
    setNotifications(next);
    localStorage.setItem("woodpecker_notifications", JSON.stringify(next));
  }

  async function requestNotifications() {
    if (typeof Notification === "undefined") {
      setNotificationStatus("Browser notifications are not available.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationStatus(permission === "granted" ? "Browser notifications enabled." : "Browser notifications remain disabled.");
  }

  async function createTask(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.campaignId) return;
    const { data, error: insertError } = await supabase.from("woodpecker_tasks").insert({
      workspace_id: workspace.id, campaign_id: Number(form.campaignId), title: form.title.trim(),
      description: form.description.trim() || null,
      completion_mode: form.responseMode === "scan" ? "scan" : "manual",
      response_mode: form.responseMode
    }).select("*, qr_campaigns(name, token)").single();
    if (insertError) { setError(insertError.message); return; }
    setTasks((current) => [data, ...current]);
    setForm({ title: "", description: "", campaignId: "", responseMode: "scan" });
  }

  async function attachTask(taskId, campaignId) {
    if (!campaignId) return;
    const { error: updateError } = await supabase
      .from("woodpecker_tasks")
      .update({ campaign_id: Number(campaignId) })
      .eq("id", taskId)
      .eq("workspace_id", workspace.id)
      .select("*, qr_campaigns(name, token)")
      .single();
    if (updateError) { setError(updateError.message); return; }
    await refresh(workspace.id);
  }

  function exportTask(task) {
    const rows = [["Action", "Status", "Response type", "Event", "Message", "Created at"]];
    (task.history || []).forEach((event) => rows.push([
      task.title, task.status, task.response_mode || "scan", event.event_type, event.message || "", event.created_at
    ]));
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    link.download = `${task.title.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}-action.csv`;
    link.click();
  }

  if (error) return <section className={embedded ? "p-0" : "workspace-page mx-auto max-w-3xl p-6"} role="alert">{error}</section>;
  if (!workspace) return <section className={embedded ? "p-6 text-center" : "workspace-page p-6 text-center"}>{t("woodpecker.loading")}</section>;
  return <section className={embedded ? "p-0" : "workspace-page mx-auto max-w-3xl p-6"}>
    <div className="mb-6 flex items-center gap-3"><img src={woodpecker} alt="" width="64" height="64" /><div><p className="text-xs uppercase tracking-wide text-amber-300">{t("woodpecker.eyebrow")}</p><h1 className="text-3xl font-bold">{t("woodpecker.title")}</h1><p className="text-sm text-slate-400">{t("woodpecker.subtitle")}</p></div></div>
    <form onSubmit={createTask} className="mb-8 rounded border border-slate-700 bg-slate-900 p-4">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-wide text-amber-300">{t("woodpecker.createEyebrow")}</p>
        <h2 className="text-2xl font-bold">{t("woodpecker.createTitle")}</h2>
        <p className="mt-1 text-sm text-slate-400">{t("woodpecker.createHint")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block font-semibold">{t("woodpecker.actionName")}
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("woodpecker.taskTitle")} className="mt-1 w-full rounded border p-2 text-black" />
        </label>
        <label className="block font-semibold">{t("woodpecker.chooseQr")}
          <select required value={form.campaignId} onChange={(e) => setForm({ ...form, campaignId: e.target.value })} className="mt-1 w-full rounded border p-2 text-black">
            <option value="">{t("woodpecker.chooseCampaign")}</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="block font-semibold md:col-span-2">{t("woodpecker.instructions")}
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("woodpecker.description")} className="mt-1 w-full rounded border p-2 text-black" rows="3" />
        </label>
        <label className="block font-semibold md:col-span-2">{t("woodpecker.completionRequirement")}
          <select value={form.responseMode} onChange={(e) => setForm({ ...form, responseMode: e.target.value })} className="mt-1 w-full rounded border p-2 text-black">
            <option value="scan">{t("woodpecker.requireScan")}</option>
            <option value="text">{t("woodpecker.requireText")}</option>
            <option value="photo">{t("woodpecker.requirePhoto")}</option>
          </select>
        </label>
      </div>
      <button className="mt-4 rounded bg-amber-400 px-5 py-3 font-semibold text-slate-950">{t("woodpecker.create")}</button>
    </form>
    <section className="mb-8 rounded border border-slate-700 bg-slate-900 p-4">
      <h2 className="text-lg font-bold">{t("woodpecker.notificationsTitle")}</h2>
      <p className="mt-1 text-sm text-slate-400">{t("woodpecker.notificationsHint")}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={notifications.messages} onChange={(event) => updateNotifications({ ...notifications, messages: event.target.checked })} />
          {t("woodpecker.notifyMessages")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={notifications.completions} onChange={(event) => updateNotifications({ ...notifications, completions: event.target.checked })} />
          {t("woodpecker.notifyCompletions")}
        </label>
      </div>
      <button type="button" onClick={requestNotifications} className="mt-3 rounded border border-teal-400 px-3 py-2 text-sm text-teal-300">
        {t("woodpecker.enableBrowserNotifications")}
      </button>
      {notificationStatus && <p className="mt-2 text-xs text-slate-400" role="status">{notificationStatus}</p>}
    </section>
    <div className="mb-3 flex items-end justify-between gap-3">
      <div><p className="text-xs uppercase tracking-wide text-amber-300">{t("woodpecker.listEyebrow")}</p><h2 className="text-2xl font-bold">{t("woodpecker.listTitle")}</h2></div>
      <span className="text-sm text-slate-400">{tasks.length} {t("woodpecker.actionCount")}</span>
    </div>
    <div className="space-y-3">{tasks.length === 0 && <p className="text-slate-400">{t("woodpecker.empty")}</p>}{tasks.map((task) => <article key={task.id} className="rounded border border-slate-700 bg-slate-900 p-4"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">{task.title}</h2><p className="text-xs text-slate-400">{task.qr_campaigns?.name} · {task.response_mode === "scan" ? t("woodpecker.requireScan") : task.response_mode === "photo" ? t("woodpecker.requirePhoto") : t("woodpecker.requireText")}</p>{task.description && <p className="mt-2 text-sm text-slate-300">{task.description}</p>}</div><span className="text-xs uppercase text-amber-300">{task.status}</span></div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)} className="rounded border border-slate-600 px-3 py-2 text-sm">{t("woodpecker.viewResults")}</button>
        <button type="button" onClick={() => exportTask(task)} className="rounded border border-slate-600 px-3 py-2 text-sm">{t("woodpecker.export")}</button>
        <select value={task.campaign_id || ""} onChange={(event) => attachTask(task.id, event.target.value)} className="rounded border p-2 text-sm text-black" aria-label={t("woodpecker.addToQr")}>
          <option value="">{t("woodpecker.addToQr")}</option>
          {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
        </select>
        {task.qr_campaigns?.token && <Link className="rounded bg-teal-500 px-3 py-2 text-sm font-semibold text-slate-950" to={`/qr/${task.qr_campaigns.token}/tasks`}>{t("woodpecker.openPortal")}</Link>}
      </div>
      {expandedTaskId === task.id && <div className="mt-4 rounded border border-slate-700 bg-slate-950 p-3 text-sm"><p className="font-semibold">{t("woodpecker.responses")}: {(task.history || []).filter((event) => event.event_type === "message").length}</p>{(task.history || []).map((event) => <p key={event.id} className="mt-2 text-slate-300"><strong>{event.event_type === "completed" ? "✓ " : ""}</strong>{event.message || event.event_type}</p>)}</div>}
    </article>)}</div>
  </section>;
}
