import { eveChannel } from "eve/channels/eve";
import { type AuthFn, localDev } from "eve/channels/auth";
import { getSessionEmail, getWorkspaceRoleForRequest } from "../../lib/auth";

function readCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") || "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

function vivadeoSession(): AuthFn<Request> {
  return async (request) => {
    const email = await getSessionEmail(request);
    if (!email) return null;
    const workspaceId = readCookie(request, "vivadeo_workspace") || "default-workspace";
    const role = await getWorkspaceRoleForRequest(request, workspaceId);
    if (!role) return null;
    return {
      authenticator: "vivadeo",
      issuer: new URL(request.url).origin,
      principalId: email,
      principalType: "user",
      subject: email,
      attributes: { workspaceId, role },
    };
  };
}

export default eveChannel({ auth: [vivadeoSession(), localDev()] });
