#!/usr/bin/env node
// Operator tool for reviewing GDPR privacy requests (consent withdrawal, data export,
// account deletion) recorded in the `privacy_requests` table by src/pages/Account.jsx.
//
// These requests are intentionally NOT auto-executed against production data (see
// LAUNCH_SETUP.md) - a human has to review and action each one. This script is that
// missing piece of tooling: it lists open requests and lets you mark them resolved once
// you've actually handled them (exported the data, deleted the account, etc.) outside
// of this script.
//
// Usage (never run this against a project you don't operate - it uses the service role key):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/review-privacy-requests.mjs list
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/review-privacy-requests.mjs resolve <id> completed
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/review-privacy-requests.mjs resolve <id> rejected

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment before running this script.");
  process.exit(1);
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  if (!response.ok) {
    throw new Error(`Supabase request failed (${response.status}): ${await response.text()}`);
  }
  return response.status === 204 ? null : response.json();
}

async function listOpenRequests() {
  const rows = await supabaseRequest(
    "privacy_requests?status=in.(requested,in_review)&select=id,user_id,workspace_id,request_type,status,details,created_at&order=created_at.asc"
  );
  if (!rows.length) {
    console.log("No open privacy requests.");
    return;
  }
  console.log(`${rows.length} open privacy request(s):\n`);
  for (const row of rows) {
    console.log(`#${row.id}  [${row.request_type}]  status=${row.status}  created=${row.created_at}`);
    console.log(`   user_id=${row.user_id}  workspace_id=${row.workspace_id ?? "(none)"}`);
    if (row.details) console.log(`   details: ${row.details}`);
    console.log("");
  }
}

async function resolveRequest(id, outcome) {
  if (!["completed", "rejected"].includes(outcome)) {
    console.error('Outcome must be "completed" or "rejected".');
    process.exit(1);
  }
  await supabaseRequest(`privacy_requests?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: outcome, resolved_at: new Date().toISOString() })
  });
  console.log(`Request #${id} marked ${outcome}.`);
}

const [, , command, ...args] = process.argv;

try {
  if (!command || command === "list") {
    await listOpenRequests();
  } else if (command === "resolve") {
    const [id, outcome] = args;
    if (!id || !outcome) {
      console.error("Usage: node scripts/review-privacy-requests.mjs resolve <id> <completed|rejected>");
      process.exit(1);
    }
    await resolveRequest(id, outcome);
  } else {
    console.error(`Unknown command "${command}". Use "list" or "resolve".`);
    process.exit(1);
  }
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
