import { supabase } from "./supabase";

const PROFILE_STORAGE_KEY = "ivote_workspace_profile";

export const WORKSPACE_ROLES = ["owner", "editor", "viewer"];

export const ROLE_PERMISSIONS = {
  owner: {
    canManageWorkspace: true,
    canEditPolls: true,
    canDeletePolls: true,
    canDuplicatePolls: true,
    canReuseQr: true,
    canExportResults: true,
    canClosePolls: true,
    canSeeAllData: true
  },
  editor: {
    canManageWorkspace: true,
    canEditPolls: true,
    canDeletePolls: false,
    canDuplicatePolls: true,
    canReuseQr: true,
    canExportResults: true,
    canClosePolls: true,
    canSeeAllData: true
  },
  viewer: {
    canManageWorkspace: false,
    canEditPolls: false,
    canDeletePolls: false,
    canDuplicatePolls: false,
    canReuseQr: false,
    canExportResults: false,
    canClosePolls: false,
    canSeeAllData: true
  }
};

function readAllProfiles() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error(error);
    return {};
  }
}

function writeAllProfiles(value) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(value));
}

export function readWorkspaceProfile(userId) {
  const profiles = readAllProfiles();
  const profile = profiles[String(userId)] ?? {};

  return {
    companyName: profile.companyName || "iVote",
    logoUrl: profile.logoUrl || "",
    primaryColor: profile.primaryColor || "#2563eb",
    accentColor: profile.accentColor || "#0f172a",
    role: profile.role || "owner"
  };
}

export function saveWorkspaceProfile(userId, patch = {}) {
  const profiles = readAllProfiles();
  const key = String(userId);
  const current = profiles[key] ?? {};
  const next = {
    ...current,
    ...patch,
    companyName: patch.companyName ?? current.companyName ?? "iVote",
    primaryColor: patch.primaryColor ?? current.primaryColor ?? "#2563eb",
    accentColor: patch.accentColor ?? current.accentColor ?? "#0f172a",
    role: patch.role ?? current.role ?? "owner"
  };

  profiles[key] = next;
  writeAllProfiles(profiles);
  return next;
}

export function canManageWorkspace(role) {
  return role === "owner" || role === "editor";
}

export function getPermissionSet(role) {
  return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.owner;
}

export async function readWorkspaceMembers() {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("id, user_id, name, email, role, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load workspace members: ${error.message}`);
  }

  return (data ?? []).map((member) => ({
    ...member,
    role: WORKSPACE_ROLES.includes(member.role) ? member.role : "viewer"
  }));
}

export async function getCurrentUserRole(userId) {
  if (!userId) return "viewer";

  const { data: ownMembership, error: ownMembershipError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (ownMembershipError) {
    throw new Error(`Unable to load your workspace role: ${ownMembershipError.message}`);
  }

  if (ownMembership?.role && WORKSPACE_ROLES.includes(ownMembership.role)) {
    return ownMembership.role;
  }

  const { count, error: countError } = await supabase
    .from("workspace_members")
    .select("id", { count: "exact", head: true });

  if (countError) {
    throw new Error(`Unable to verify workspace membership: ${countError.message}`);
  }

  if (count === 0) {
    const { error: bootstrapError } = await supabase.from("workspace_members").insert({
      user_id: userId,
      name: "Workspace Owner",
      email: "",
      role: "owner"
    });

    if (bootstrapError) {
      throw new Error(`Unable to create initial workspace owner: ${bootstrapError.message}`);
    }

    return "owner";
  }

  return "viewer";
}

export async function saveWorkspaceMember(member) {
  const normalized = {
    name: member.name || "Team member",
    email: member.email || "",
    role: WORKSPACE_ROLES.includes(member.role) ? member.role : "viewer",
    user_id: member.user_id ?? null
  };

  if (member.id) {
    const { error } = await supabase
      .from("workspace_members")
      .update(normalized)
      .eq("id", member.id);

    if (error) {
      throw new Error(`Unable to update workspace member: ${error.message}`);
    }
  } else {
    const { error } = await supabase.from("workspace_members").insert(normalized);

    if (error) {
      throw new Error(`Unable to create workspace member: ${error.message}`);
    }
  }

  return readWorkspaceMembers();
}

export async function removeWorkspaceMember(memberId) {
  const { error } = await supabase.from("workspace_members").delete().eq("id", memberId);
  if (error) {
    throw new Error(`Unable to remove workspace member: ${error.message}`);
  }
  return readWorkspaceMembers();
}
