import type { SessionContext } from "eve/context";

export function requireWorkspaceCaller(ctx: SessionContext) {
  const caller = ctx.session.auth.current;
  const workspaceId = caller?.attributes.workspaceId;
  if (caller?.principalType !== "user" || typeof workspaceId !== "string") {
    throw new Error("An authenticated Vivadeo workspace is required.");
  }
  return { workspaceId, userId: caller.principalId };
}
