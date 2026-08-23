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

export function useWorkspacePermissions(_workspace?: string) {
  const [role, setRole] = useState<WorkspaceRole>("viewer");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
        const roleResponse = await fetch("/api/workspace/role", { cache: "no-store" });
        if (!roleResponse.ok) {
          setRole("viewer");
          return;
        }
        const rolePayload = (await roleResponse.json()) as { role?: string | null };
        setRole(normalizeRole(rolePayload.role));
      } catch {
        setRole("viewer");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [_workspace]);

  return {
    role,
    isLoading,
    canEdit: role === "owner" || role === "admin" || role === "editor",
    canManageWorkspace: role === "owner" || role === "admin",
  };
}
