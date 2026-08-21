import "../_runtime.mjs";
import { a as emailVerificationEnabled, c as getWorkspaceRoleForRequest, d as sendVerificationCode, f as updateWorkspaceRoleOverrides, o as getBackendHeaders, p as verifyEmailCode, r as authHandlers, s as getBackendUrl, t as __exportAll, u as postAuthEndpoint } from "./auth-BJoGqJUw.mjs";
import { B as require_react, b as require_jsx_runtime, g as createRootRoute, h as createFileRoute, l as Scripts, m as lazyRouteComponent, p as createRouter, u as HeadContent } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as getServerFnById, n as createServerFn, t as TSS_SERVER_FUNCTION } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/server-functions-AYHSxccU.js
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var getRequestSession = createServerFn({ method: "GET" }).handler(createSsrRpc("ca4ca2f3a16cc919962eb4ac7f4d1e5134e1ace2b3fe4b1c16ce7a49dd21240c"));
createServerFn({ method: "GET" }).validator((workspace) => workspace).handler(createSsrRpc("d074c438e2c29dbb4f474942758f2d6a63a56fae65683a2388e1171ad41ee04b"));
createServerFn({ method: "GET" }).handler(createSsrRpc("4ab1a852046729ae75105f961b9e101bce9564424672497c2975d5bd38c62516"));
require_react();
var import_jsx_runtime = require_jsx_runtime();
var globals_default = "/assets/globals-Dmt_4LAx.css";
var Route$17 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "Vivadeo" },
			{
				name: "description",
				content: "Workspace-first video search, clip generation, and review."
			}
		],
		links: [{
			rel: "stylesheet",
			href: globals_default
		}]
	}),
	shellComponent: RootDocument
});
function RootDocument({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", { children }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
var $$splitComponentImporter$15 = () => import("./routes-DI39UUz-.mjs");
var Route$16 = createFileRoute("/")({
	loader: () => getRequestSession(),
	component: lazyRouteComponent($$splitComponentImporter$15, "component")
});
var $$splitComponentImporter$14 = () => import("./forgot-password-CPKnUw4f.mjs");
var Route$15 = createFileRoute("/forgot-password")({ component: lazyRouteComponent($$splitComponentImporter$14, "component") });
var $$splitComponentImporter$13 = () => import("./jobs-89CHUQsG.mjs");
var Route$14 = createFileRoute("/jobs")({ component: lazyRouteComponent($$splitComponentImporter$13, "component") });
var $$splitComponentImporter$12 = () => import("./reset-password-CoWMcWuK.mjs");
var Route$13 = createFileRoute("/reset-password")({ component: lazyRouteComponent($$splitComponentImporter$12, "component") });
var $$splitComponentImporter$11 = () => import("./search-5eTvjwRz.mjs");
var Route$12 = createFileRoute("/search")({
	loader: () => getRequestSession(),
	component: lazyRouteComponent($$splitComponentImporter$11, "component")
});
var $$splitComponentImporter$10 = () => import("./settings-B5U-utYI.mjs");
var Route$11 = createFileRoute("/settings")({
	loader: () => getRequestSession(),
	component: lazyRouteComponent($$splitComponentImporter$10, "component")
});
var $$splitComponentImporter$9 = () => import("./sign-in-C-CfQpK9.mjs");
var Route$10 = createFileRoute("/sign-in")({
	loader: () => getRequestSession(),
	component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
var $$splitComponentImporter$8 = () => import("./sign-up-B_6UdQrk.mjs");
var Route$9 = createFileRoute("/sign-up")({
	loader: () => getRequestSession(),
	component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
var $$splitComponentImporter$7 = () => import("./verify-email-V7t-s3Ja.mjs");
var Route$8 = createFileRoute("/verify-email")({
	loader: () => getRequestSession(),
	component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
function asHttpRequest(request) {
	const url = new URL(request.url);
	const values = new Map((request.headers.get("cookie") || "").split(";").flatMap((part) => {
		const [name, ...rest] = part.trim().split("=");
		return name ? [[name, decodeURIComponent(rest.join("="))]] : [];
	}));
	return Object.assign(request, {
		nextUrl: url,
		cookies: { get: (name) => values.has(name) ? {
			name,
			value: values.get(name)
		} : void 0 }
	});
}
var HttpResponse = class HttpResponse extends Response {
	static json(data, init) {
		return new HttpResponse(JSON.stringify(data), {
			...init,
			headers: {
				"content-type": "application/json",
				...init?.headers || {}
			}
		});
	}
	static redirect(url, init) {
		const responseInit = typeof init === "number" ? { status: init } : init;
		return new HttpResponse(null, {
			status: responseInit?.status || 302,
			headers: {
				location: String(url),
				...responseInit?.headers || {}
			}
		});
	}
	get cookies() {
		return { set: (name, value, options = {}) => {
			const parts = [`${name}=${encodeURIComponent(value)}`];
			if (options.path) parts.push(`Path=${options.path}`);
			if (options.httpOnly) parts.push("HttpOnly");
			if (options.secure) parts.push("Secure");
			if (options.sameSite) parts.push(`SameSite=${String(options.sameSite)}`);
			if (typeof options.maxAge === "number") parts.push(`Max-Age=${options.maxAge}`);
			this.headers.append("set-cookie", parts.join("; "));
		} };
	}
};
var route_exports$13 = /* @__PURE__ */ __exportAll({
	GET: () => GET$8,
	POST: () => POST$12
});
var GET$8 = authHandlers.GET;
var POST$12 = authHandlers.POST;
var route_exports$12 = /* @__PURE__ */ __exportAll({
	GET: () => GET$7,
	POST: () => POST$11
});
async function GET$7(request) {
	return HttpResponse.redirect(new URL("/sign-in", request.url));
}
async function POST$11(request) {
	const authResponse = await authHandlers.POST(request.clone());
	if (authResponse.status !== 501) return new HttpResponse(authResponse.body, {
		status: authResponse.status,
		headers: authResponse.headers
	});
	return HttpResponse.redirect(new URL("/dashboard?invite=accepted", request.url));
}
var route_exports$11 = /* @__PURE__ */ __exportAll({
	GET: () => GET$6,
	POST: () => POST$10
});
async function GET$6(request) {
	return HttpResponse.redirect(new URL("/forgot-password", request.url));
}
async function POST$10(request) {
	const form = await request.formData();
	const authResponse = await postAuthEndpoint(request, "/request-password-reset", {
		email: String(form.get("email") || ""),
		redirectTo: new URL("/reset-password", request.url).toString()
	});
	if (authResponse.ok) return HttpResponse.redirect(new URL("/sign-in?reset=sent", request.url));
	return new HttpResponse(authResponse.body, {
		status: authResponse.status,
		headers: authResponse.headers
	});
}
var route_exports$10 = /* @__PURE__ */ __exportAll({
	GET: () => GET$5,
	POST: () => POST$9
});
async function GET$5(request) {
	return HttpResponse.redirect(new URL("/reset-password", request.url));
}
async function POST$9(request) {
	const form = await request.formData();
	const authResponse = await postAuthEndpoint(request, "/reset-password", {
		token: String(form.get("token") || ""),
		newPassword: String(form.get("password") || "")
	});
	if (authResponse.ok) return HttpResponse.redirect(new URL("/sign-in?reset=done", request.url));
	let errorCode = "UNKNOWN";
	try {
		const body = await authResponse.json();
		errorCode = body.code || body.message || "UNKNOWN";
	} catch {}
	return HttpResponse.redirect(new URL(`/reset-password?error=${encodeURIComponent(errorCode)}`, request.url));
}
function forwardAuthCookies(authResponse, response) {
	const setCookies = authResponse.headers.getSetCookie?.() ?? [];
	for (const cookie of setCookies) response.headers.append("set-cookie", cookie);
}
var route_exports$9 = /* @__PURE__ */ __exportAll({
	GET: () => GET$4,
	POST: () => POST$8
});
async function GET$4(request) {
	return HttpResponse.redirect(new URL("/sign-in", request.url));
}
async function POST$8(request) {
	const form = await request.formData();
	const authResponse = await postAuthEndpoint(request, "/sign-in/email", {
		email: String(form.get("email") || ""),
		password: String(form.get("password") || ""),
		callbackURL: new URL("/dashboard", request.url).toString()
	});
	if (authResponse.ok) {
		const response = HttpResponse.redirect(new URL("/dashboard", request.url));
		forwardAuthCookies(authResponse, response);
		const workspace = request.nextUrl.searchParams.get("workspace") || process.env.VIVADEO_DEFAULT_ORG_ID || "default-workspace";
		response.cookies.set("vivadeo_workspace", workspace, {
			httpOnly: true,
			sameSite: "lax",
			secure: true,
			path: "/"
		});
		return response;
	}
	let errorCode = "UNKNOWN";
	try {
		const body = await authResponse.json();
		errorCode = body.code || body.message || "UNKNOWN";
	} catch {}
	return HttpResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent(errorCode)}`, request.url));
}
var route_exports$8 = /* @__PURE__ */ __exportAll({
	GET: () => GET$3,
	POST: () => POST$7
});
async function GET$3(request) {
	return HttpResponse.redirect(new URL("/sign-in", request.url));
}
async function POST$7(request) {
	const authResponse = await postAuthEndpoint(request, "/sign-out", {});
	const response = HttpResponse.redirect(new URL("/", request.url));
	forwardAuthCookies(authResponse, response);
	response.cookies.set("vivadeo_session", "", {
		httpOnly: true,
		sameSite: "lax",
		secure: true,
		path: "/",
		maxAge: 0
	});
	response.cookies.set("vivadeo_workspace", "", {
		httpOnly: true,
		sameSite: "lax",
		secure: true,
		path: "/",
		maxAge: 0
	});
	return response;
}
var route_exports$7 = /* @__PURE__ */ __exportAll({
	GET: () => GET$2,
	POST: () => POST$6
});
async function GET$2(request) {
	return HttpResponse.redirect(new URL("/sign-up", request.url));
}
async function POST$6(request) {
	const form = await request.formData();
	const workspaceName = String(form.get("workspace") || "New workspace");
	const email = String(form.get("email") || "").trim().toLowerCase();
	const password = String(form.get("password") || "");
	if (password !== String(form.get("confirmPassword") || "")) return HttpResponse.redirect(new URL("/sign-up?error=PASSWORD_MISMATCH", request.url));
	const backendResponse = await fetch(getBackendUrl("/v1/workspaces"), {
		method: "POST",
		headers: getBackendHeaders({ "Content-Type": "application/json" }),
		body: JSON.stringify({
			name: workspaceName,
			owner_email: email
		})
	});
	const workspace = backendResponse.ok ? await backendResponse.json() : null;
	const authResponse = await postAuthEndpoint(request, "/sign-up/email", {
		name: String(form.get("name") || ""),
		email: String(form.get("email") || ""),
		password,
		callbackURL: new URL("/dashboard", request.url).toString()
	});
	if (authResponse.ok) {
		const workspaceId = workspace?.id || String(form.get("workspace") || "new-workspace");
		if (workspace?.id && email) await fetch(getBackendUrl(`/v1/workspaces/${encodeURIComponent(workspace.id)}/bootstrap-auth`), {
			method: "POST",
			headers: getBackendHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({ email })
		});
		const destination = emailVerificationEnabled ? `/verify-email?email=${encodeURIComponent(email)}&sent=1` : "/dashboard";
		const response = HttpResponse.redirect(new URL(destination, request.url));
		if (!emailVerificationEnabled) forwardAuthCookies(authResponse, response);
		response.cookies.set("vivadeo_workspace", workspaceId, {
			httpOnly: true,
			sameSite: "lax",
			secure: true,
			path: "/"
		});
		return response;
	}
	let errorCode = "UNKNOWN";
	try {
		const body = await authResponse.json();
		errorCode = body.code || body.message || "UNKNOWN";
	} catch {}
	return HttpResponse.redirect(new URL(`/sign-up?error=${encodeURIComponent(errorCode)}`, request.url));
}
var route_exports$6 = /* @__PURE__ */ __exportAll({ POST: () => POST$5 });
async function POST$5(request) {
	const form = await request.formData();
	const email = String(form.get("email") || "").trim().toLowerCase();
	const intent = String(form.get("intent") || "verify");
	if (!email) return HttpResponse.redirect(new URL("/sign-in?error=UNKNOWN", request.url));
	if (intent === "resend") {
		await sendVerificationCode(email);
		return HttpResponse.redirect(new URL(`/verify-email?email=${encodeURIComponent(email)}&sent=1`, request.url));
	}
	if (!await verifyEmailCode(email, String(form.get("code") || ""))) return HttpResponse.redirect(new URL(`/verify-email?email=${encodeURIComponent(email)}&error=invalid`, request.url));
	return HttpResponse.redirect(new URL("/sign-in?verify=done", request.url));
}
var route_exports$5 = /* @__PURE__ */ __exportAll({ GET: () => GET$1 });
var TERMINAL_STATUSES = /* @__PURE__ */ new Set([
	"succeeded",
	"failed",
	"canceled"
]);
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
async function GET$1(request, { params }) {
	const { jobId } = await params;
	const workspace = request.cookies.get("vivadeo_workspace")?.value;
	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			const pushEvent = (event, data) => {
				controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
			};
			while (!request.signal.aborted) {
				try {
					const response = await fetch(getBackendUrl(`/v1/jobs/${jobId}`), {
						headers: getBackendHeaders(void 0, workspace),
						cache: "no-store"
					});
					if (!response.ok) {
						pushEvent("error", { status: response.status });
						break;
					}
					const payload = await response.json();
					pushEvent("job", payload);
					if (TERMINAL_STATUSES.has(payload.status)) break;
				} catch (cause) {
					pushEvent("error", { message: cause instanceof Error ? cause.message : "Unknown error" });
					break;
				}
				await sleep(2e3);
			}
			controller.close();
		},
		cancel() {}
	});
	return new Response(stream, { headers: {
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache, no-transform",
		Connection: "keep-alive"
	} });
}
var route_exports$4 = /* @__PURE__ */ __exportAll({
	DELETE: () => DELETE,
	GET: () => GET,
	PATCH: () => PATCH,
	POST: () => POST$4,
	PUT: () => PUT
});
function requiresEditorAccess(method, targetPath) {
	if (method === "GET" || method === "HEAD") return false;
	if (!targetPath.startsWith("/v1/")) return false;
	return true;
}
async function forward(request, path) {
	const targetPath = `/${path.join("/")}`;
	const workspace = request.cookies.get("vivadeo_workspace")?.value;
	if (requiresEditorAccess(request.method, targetPath)) {
		if (await getWorkspaceRoleForRequest(request, workspace || "default-workspace") === "viewer") return HttpResponse.json({ detail: "Viewer role cannot modify workspace content." }, { status: 403 });
	}
	const backendUrl = getBackendUrl(targetPath);
	const headers = getBackendHeaders(void 0, workspace);
	const method = request.method;
	let body;
	if (method !== "GET" && method !== "HEAD") {
		const contentType = request.headers.get("content-type") || "";
		if (contentType.includes("multipart/form-data")) {
			body = request.body;
			headers.set("Content-Type", contentType);
		} else if (contentType.includes("application/json")) {
			body = await request.text();
			headers.set("Content-Type", "application/json");
		} else if (contentType) {
			const form = await request.formData();
			const payload = Object.fromEntries(form.entries());
			body = JSON.stringify(payload);
			headers.set("Content-Type", "application/json");
		}
	}
	const response = await fetch(backendUrl, {
		method,
		headers,
		body,
		duplex: "half"
	});
	const text = await response.text();
	return new HttpResponse(response.status === 204 || response.status === 304 ? null : text, {
		status: response.status,
		headers: { "content-type": response.headers.get("content-type") || "application/json" }
	});
}
async function GET(request, { params }) {
	return forward(request, (await params).path);
}
async function POST$4(request, { params }) {
	return forward(request, (await params).path);
}
async function PATCH(request, { params }) {
	return forward(request, (await params).path);
}
async function PUT(request, { params }) {
	return forward(request, (await params).path);
}
async function DELETE(request, { params }) {
	return forward(request, (await params).path);
}
var route_exports$3 = /* @__PURE__ */ __exportAll({ POST: () => POST$3 });
async function POST$3(request) {
	const body = await request.json();
	const workspaceRole = await getWorkspaceRoleForRequest(request, body.organizationId);
	if (workspaceRole !== "owner" && workspaceRole !== "admin") return HttpResponse.json({ detail: "Only owners and admins can cancel invitations." }, { status: 403 });
	if (body.email) await updateWorkspaceRoleOverrides(body.organizationId, (current) => {
		const nextInviteRoles = { ...current.inviteRoles };
		delete nextInviteRoles[body.email];
		return {
			workspaceRoles: current.workspaceRoles,
			inviteRoles: nextInviteRoles
		};
	});
	return postAuthEndpoint(request, "/organization/cancel-invitation", { invitationId: body.invitationId });
}
var route_exports$2 = /* @__PURE__ */ __exportAll({ POST: () => POST$2 });
async function POST$2(request) {
	const body = await request.json();
	const workspaceRole = await getWorkspaceRoleForRequest(request, body.organizationId);
	if (workspaceRole !== "owner" && workspaceRole !== "admin") return HttpResponse.json({ detail: "Only owners and admins can invite members." }, { status: 403 });
	await updateWorkspaceRoleOverrides(body.organizationId, (current) => ({
		workspaceRoles: current.workspaceRoles,
		inviteRoles: {
			...current.inviteRoles,
			[body.email]: body.role
		}
	}));
	return postAuthEndpoint(request, "/organization/invite-member", {
		...body,
		role: body.role === "editor" || body.role === "viewer" ? "member" : body.role
	});
}
var route_exports$1 = /* @__PURE__ */ __exportAll({ POST: () => POST$1 });
async function POST$1(request) {
	const form = await request.formData();
	const workspace = String(form.get("workspace") || "default-workspace");
	const response = HttpResponse.redirect(new URL("/dashboard", request.url));
	response.cookies.set("vivadeo_workspace", workspace, {
		httpOnly: true,
		sameSite: "lax",
		secure: true,
		path: "/"
	});
	return response;
}
var route_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
async function POST(request) {
	const body = await request.json();
	const workspaceRole = await getWorkspaceRoleForRequest(request, body.organizationId);
	if (workspaceRole !== "owner" && workspaceRole !== "admin") return HttpResponse.json({ detail: "Only owners and admins can update member roles." }, { status: 403 });
	if (body.email) await updateWorkspaceRoleOverrides(body.organizationId, (current) => ({
		workspaceRoles: {
			...current.workspaceRoles,
			[body.email]: body.role
		},
		inviteRoles: current.inviteRoles
	}));
	return postAuthEndpoint(request, "/organization/update-member-role", {
		...body,
		role: body.role === "editor" || body.role === "viewer" ? "member" : body.role
	});
}
var rateBuckets = /* @__PURE__ */ new Map();
function rateLimited(request, path) {
	if (!(path.startsWith("auth/") || path.startsWith("proxy/")) || path === "proxy/v1/videos/upload") return false;
	const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
	const now = Date.now();
	const bucket = rateBuckets.get(ip);
	if (!bucket || now - bucket.start > 6e4) {
		rateBuckets.set(ip, {
			start: now,
			count: 1
		});
		return false;
	}
	bucket.count += 1;
	return bucket.count > 120;
}
var explicit = {
	"auth/accept-invite": route_exports$12,
	"auth/forgot-password": route_exports$11,
	"auth/reset-password": route_exports$10,
	"auth/sign-in": route_exports$9,
	"auth/sign-out": route_exports$8,
	"auth/sign-up": route_exports$7,
	"auth/verify-email": route_exports$6,
	"job-events": route_exports$5,
	"workspace/cancel-invitation": route_exports$3,
	"workspace/invite-member": route_exports$2,
	"workspace/select": route_exports$1,
	"workspace/update-member-role": route_exports
};
async function handle(request, params) {
	const splat = params._splat || "";
	const parts = splat.split("/").filter(Boolean);
	const method = request.method.toUpperCase();
	if (rateLimited(request, splat)) return new Response("Too Many Requests", { status: 429 });
	let module = route_exports$13;
	let routeParams = {};
	if (parts[0] === "proxy") {
		module = route_exports$4;
		routeParams = { path: parts.slice(1) };
	} else if (parts[0] === "job-events" && parts[1]) {
		module = route_exports$5;
		routeParams = { jobId: parts[1] };
	} else module = explicit[parts.join("/")] || (parts[0] === "auth" ? route_exports$13 : {});
	const handler = module[method];
	if (!handler) return new Response("Method Not Allowed", { status: 405 });
	return handler(asHttpRequest(request), { params: Promise.resolve(routeParams) });
}
var serverHandler = ({ request, params }) => handle(request, params);
var Route$7 = createFileRoute("/api/$")({ server: { handlers: {
	GET: serverHandler,
	POST: serverHandler,
	PATCH: serverHandler,
	PUT: serverHandler,
	DELETE: serverHandler
} } });
var $$splitComponentImporter$6 = () => import("./dashboard-m1VSWZcC.mjs");
var Route$6 = createFileRoute("/dashboard/")({ component: lazyRouteComponent($$splitComponentImporter$6, "component") });
var $$splitComponentImporter$5 = () => import("./clip-studio-B_XwXZri.mjs");
var Route$5 = createFileRoute("/dashboard/clip-studio")({ component: lazyRouteComponent($$splitComponentImporter$5, "component") });
var $$splitComponentImporter$4 = () => import("./ingest-DD1RWxgL.mjs");
var Route$4 = createFileRoute("/dashboard/ingest")({ component: lazyRouteComponent($$splitComponentImporter$4, "component") });
var $$splitComponentImporter$3 = () => import("./jobs-BSDg0oBC.mjs");
var Route$3 = createFileRoute("/dashboard/jobs")({ component: lazyRouteComponent($$splitComponentImporter$3, "component") });
var $$splitComponentImporter$2 = () => import("./library-BnykmugH.mjs");
var Route$2 = createFileRoute("/dashboard/library")({ component: lazyRouteComponent($$splitComponentImporter$2, "component") });
var $$splitComponentImporter$1 = () => import("./workspace-Dt4NTeUi.mjs");
var Route$1 = createFileRoute("/dashboard/workspace")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
var $$splitComponentImporter = () => import("../_token-DoPJ07RN.mjs");
var Route = createFileRoute("/invite/$token")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
var IndexRoute = Route$16.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$17
});
var ForgotPasswordRoute = Route$15.update({
	id: "/forgot-password",
	path: "/forgot-password",
	getParentRoute: () => Route$17
});
var JobsRoute = Route$14.update({
	id: "/jobs",
	path: "/jobs",
	getParentRoute: () => Route$17
});
var ResetPasswordRoute = Route$13.update({
	id: "/reset-password",
	path: "/reset-password",
	getParentRoute: () => Route$17
});
var SearchRoute = Route$12.update({
	id: "/search",
	path: "/search",
	getParentRoute: () => Route$17
});
var SettingsRoute = Route$11.update({
	id: "/settings",
	path: "/settings",
	getParentRoute: () => Route$17
});
var SignInRoute = Route$10.update({
	id: "/sign-in",
	path: "/sign-in",
	getParentRoute: () => Route$17
});
var SignUpRoute = Route$9.update({
	id: "/sign-up",
	path: "/sign-up",
	getParentRoute: () => Route$17
});
var VerifyEmailRoute = Route$8.update({
	id: "/verify-email",
	path: "/verify-email",
	getParentRoute: () => Route$17
});
var ApiSplatRoute = Route$7.update({
	id: "/api/$",
	path: "/api/$",
	getParentRoute: () => Route$17
});
var DashboardIndexRoute = Route$6.update({
	id: "/dashboard/",
	path: "/dashboard/",
	getParentRoute: () => Route$17
});
var rootRouteChildren = {
	IndexRoute,
	ForgotPasswordRoute,
	JobsRoute,
	ResetPasswordRoute,
	SearchRoute,
	SettingsRoute,
	SignInRoute,
	SignUpRoute,
	VerifyEmailRoute,
	ApiSplatRoute,
	DashboardClipStudioRoute: Route$5.update({
		id: "/dashboard/clip-studio",
		path: "/dashboard/clip-studio",
		getParentRoute: () => Route$17
	}),
	DashboardIngestRoute: Route$4.update({
		id: "/dashboard/ingest",
		path: "/dashboard/ingest",
		getParentRoute: () => Route$17
	}),
	DashboardJobsRoute: Route$3.update({
		id: "/dashboard/jobs",
		path: "/dashboard/jobs",
		getParentRoute: () => Route$17
	}),
	DashboardLibraryRoute: Route$2.update({
		id: "/dashboard/library",
		path: "/dashboard/library",
		getParentRoute: () => Route$17
	}),
	DashboardWorkspaceRoute: Route$1.update({
		id: "/dashboard/workspace",
		path: "/dashboard/workspace",
		getParentRoute: () => Route$17
	}),
	InviteTokenRoute: Route.update({
		id: "/invite/$token",
		path: "/invite/$token",
		getParentRoute: () => Route$17
	}),
	DashboardIndexRoute
};
var routeTree = Route$17._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
function getRouter() {
	return createRouter({
		routeTree,
		defaultPreload: "intent",
		scrollRestoration: true
	});
}
//#endregion
export { Route$10 as a, Route$16 as c, Route$9 as i, Route as n, Route$11 as o, Route$8 as r, Route$12 as s, router_exports as t };
