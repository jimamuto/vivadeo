import { createFileRoute } from "@tanstack/react-router";
import { asHttpRequest } from "~/lib/http-compat";
import * as authAll from "~/server-api/auth/[...all]/route";
import * as acceptInvite from "~/server-api/auth/accept-invite/route";
import * as forgotPassword from "~/server-api/auth/forgot-password/route";
import * as resetPassword from "~/server-api/auth/reset-password/route";
import * as signIn from "~/server-api/auth/sign-in/route";
import * as signOut from "~/server-api/auth/sign-out/route";
import * as signUp from "~/server-api/auth/sign-up/route";
import * as verifyEmail from "~/server-api/auth/verify-email/route";
import * as jobEvents from "~/server-api/job-events/[jobId]/route";
import * as proxy from "~/server-api/proxy/[...path]/route";
import * as cancelInvitation from "~/server-api/workspace/cancel-invitation/route";
import * as inviteMember from "~/server-api/workspace/invite-member/route";
import * as selectWorkspace from "~/server-api/workspace/select/route";
import * as updateMemberRole from "~/server-api/workspace/update-member-role/route";

type Handler = (request: Request, context: { params: Promise<Record<string, string | string[]>> }) => Response | Promise<Response>;

const rateBuckets = new Map<string, { start: number; count: number }>();
function rateLimited(request: Request, path: string): boolean {
  const protectedPath = path.startsWith("auth/") || path.startsWith("proxy/");
  if (!protectedPath || path === "proxy/v1/videos/upload") return false;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.start > 60_000) {
    rateBuckets.set(ip, { start: now, count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > 120;
}

const explicit: Record<string, Record<string, Handler>> = {
  "auth/accept-invite": acceptInvite as any,
  "auth/forgot-password": forgotPassword as any,
  "auth/reset-password": resetPassword as any,
  "auth/sign-in": signIn as any,
  "auth/sign-out": signOut as any,
  "auth/sign-up": signUp as any,
  "auth/verify-email": verifyEmail as any,
  "job-events": jobEvents as any,
  "workspace/cancel-invitation": cancelInvitation as any,
  "workspace/invite-member": inviteMember as any,
  "workspace/select": selectWorkspace as any,
  "workspace/update-member-role": updateMemberRole as any,
};

async function handle(request: Request, params: { _splat?: string }) {
  const splat = params._splat || "";
  const parts = splat.split("/").filter(Boolean);
  const method = request.method.toUpperCase();
  if (rateLimited(request, splat)) return new Response("Too Many Requests", { status: 429 });
  let module: Record<string, Handler> = authAll;
  let routeParams: Record<string, string | string[]> = {};

  if (parts[0] === "proxy") {
    module = proxy as any;
    routeParams = { path: parts.slice(1) };
  } else if (parts[0] === "job-events" && parts[1]) {
    module = jobEvents as any;
    routeParams = { jobId: parts[1] };
  } else {
    const key = parts.join("/");
    module = explicit[key] || (parts[0] === "auth" ? authAll : {});
  }

  const handler = module[method];
  if (!handler) return new Response("Method Not Allowed", { status: 405 });
  return handler(asHttpRequest(request), { params: Promise.resolve(routeParams) });
}

const serverHandler = ({ request, params }: any) => handle(request, params);

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: serverHandler,
      POST: serverHandler,
      PATCH: serverHandler,
      PUT: serverHandler,
      DELETE: serverHandler,
    },
  },
});
