import { getBackendHeaders, getBackendUrl } from "@/lib/backend";

type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

type WorkspaceRoleSettings = {
  workspace_roles?: Record<string, WorkspaceRole>;
  invite_roles?: Record<string, WorkspaceRole>;
};

async function fetchWorkspaceSettings(
  organizationId: string,
): Promise<WorkspaceRoleSettings> {
  try {
    const response = await fetch(getBackendUrl("/v1/settings"), {
      headers: getBackendHeaders(undefined, organizationId),
      cache: "no-store",
    });
    if (!response.ok) return {};
    const payload = (await response.json()) as { settings?: WorkspaceRoleSettings };
    return payload.settings || {};
  } catch {
    return {};
  }
}

export async function getWorkspaceRoleOverrides(organizationId: string) {
  const settings = await fetchWorkspaceSettings(organizationId);
  return {
    workspaceRoles: settings.workspace_roles || {},
    inviteRoles: settings.invite_roles || {},
  };
}

export async function updateWorkspaceRoleOverrides(
  organizationId: string,
  updater: (current: {
    workspaceRoles: Record<string, WorkspaceRole>;
    inviteRoles: Record<string, WorkspaceRole>;
  }) => {
    workspaceRoles: Record<string, WorkspaceRole>;
    inviteRoles: Record<string, WorkspaceRole>;
  },
) {
  const current = await getWorkspaceRoleOverrides(organizationId);
  const next = updater(current);
  await fetch(getBackendUrl("/v1/settings"), {
    method: "PUT",
    headers: getBackendHeaders({ "Content-Type": "application/json" }, organizationId),
    body: JSON.stringify({
      settings: {
        workspace_roles: next.workspaceRoles,
        invite_roles: next.inviteRoles,
      },
    }),
  });
  return next;
}
