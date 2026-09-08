// Fire-and-forget so a slow or failing webhook never blocks the voter/admin experience.
export function dispatchWorkspaceWebhook(workspaceId, event, recordId) {
  if (!workspaceId || !event || !recordId) return;
  fetch("/api/dispatch-webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspaceId, event, recordId })
  }).catch((error) => console.error("Webhook dispatch failed", error));
}
