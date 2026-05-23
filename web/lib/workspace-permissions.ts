"use client";

import { useEffect, useState } from "react";

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

function normalizeRole(role: string | null | undefined): WorkspaceRole {
  if (role === "owner" || role === "admin" || role === "editor" || role === "viewer") {
    return role;
  }
  if (role === "member") return "editor";
  return "viewer";
}

export function useWorkspacePermissions(workspace?: string) {
  const [role, setRole] = useState<WorkspaceRole>("viewer");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const activeWorkspace =
      workspace ||
      document.cookie
        .split("; ")
        .find((item) => item.startsWith("vivadeo_workspace="))
        ?.split("=")[1] ||
      "default-workspace";

    void (async () => {
      try {
        const [sessionResponse, settingsResponse] = await Promise.all([
          fetch("/api/auth/get-session"),
          fetch("/api/proxy/v1/settings"),
        ]);
        if (!sessionResponse.ok) throw new Error("session");
        const sessionPayload = (await sessionResponse.json()) as { user?: { email?: string | null } };
        const email = sessionPayload.user?.email;
        if (!email) {
          setRole("viewer");
          return;
        }
        if (settingsResponse.ok) {
          const settingsPayload = (await settingsResponse.json()) as {
            settings?: { workspace_roles?: Record<string, WorkspaceRole>; invite_roles?: Record<string, WorkspaceRole> };
          };
          const overrideRole =
            settingsPayload.settings?.workspace_roles?.[email] ||
            settingsPayload.settings?.invite_roles?.[email];
          if (overrideRole) {
            setRole(overrideRole);
            return;
          }
        }
        const membersResponse = await fetch(
          `/api/auth/organization/list-members?organizationId=${encodeURIComponent(activeWorkspace)}`,
        );
        if (!membersResponse.ok) {
          setRole(activeWorkspace === "default-workspace" ? "editor" : "viewer");
          return;
        }
        const membersPayload = (await membersResponse.json()) as {
          members: Array<{ role: string; user?: { email?: string | null } }>;
        };
        const member = membersPayload.members.find((item) => item.user?.email === email);
        setRole(member ? normalizeRole(member.role) : activeWorkspace === "default-workspace" ? "editor" : "viewer");
      } catch {
        setRole("viewer");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [workspace]);

  return {
    role,
    isLoading,
    canEdit: role === "owner" || role === "admin" || role === "editor",
    canManageWorkspace: role === "owner" || role === "admin",
  };
}
