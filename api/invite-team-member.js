function readBearerToken(request) {
  const header = request.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

async function getAuthenticatedUser(token) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !token) return null;
  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}` }
  });
  return authResponse.ok ? authResponse.json() : null;
}

async function isWorkspaceManager(workspaceId, userId) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const result = await fetch(
    `${supabaseUrl}/rest/v1/workspace_members?select=role&workspace_id=eq.${encodeURIComponent(workspaceId)}&user_id=eq.${encodeURIComponent(userId)}&role=in.(owner,editor)&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const rows = result.ok ? await result.json() : [];
  return rows.length > 0;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return response.status(500).json({ error: "Server is not configured for invitations." });
  }

  const user = await getAuthenticatedUser(readBearerToken(request));
  if (!user) return response.status(401).json({ error: "Sign in to invite team members." });

  const { workspaceId, email, name, role } = request.body || {};
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedRole = ["owner", "editor", "viewer"].includes(role) ? role : "viewer";
  if (!workspaceId || !normalizedEmail) {
    return response.status(400).json({ error: "A workspace and email are required." });
  }

  const authorized = await isWorkspaceManager(workspaceId, user.id);
  if (!authorized) return response.status(403).json({ error: "Only workspace owners or editors can invite team members." });

  try {
    const inviteResponse = await fetch(`${supabaseUrl}/auth/v1/invite`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail, data: { workspace_id: workspaceId, invited_role: normalizedRole } })
    });

    const invited = await inviteResponse.json();
    if (!inviteResponse.ok) {
      return response.status(400).json({ error: invited?.msg || invited?.error_description || "Unable to send invite. The person may already have an account." });
    }

    const memberResponse = await fetch(`${supabaseUrl}/rest/v1/workspace_members`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ workspace_id: workspaceId, user_id: invited.id, name: name || normalizedEmail, email: normalizedEmail, role: normalizedRole })
    });

    if (!memberResponse.ok) {
      const memberError = await memberResponse.json().catch(() => ({}));
      return response.status(400).json({ error: memberError?.message || "Invite sent, but adding the team member record failed." });
    }

    const [member] = await memberResponse.json();
    return response.status(200).json({ member, actionLink: invited.action_link || null });
  } catch (error) {
    console.error("Invite failed", error);
    return response.status(500).json({ error: "Unable to send invite right now." });
  }
}
