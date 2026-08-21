import { n as auth } from "./auth-BJoGqJUw.mjs";
import { i as getRequestHeaders, n as createServerFn, r as getCookie, t as TSS_SERVER_FUNCTION } from "./ssr.mjs";
import { fetchDashboardData } from "./dashboard-data-Ew9HtBiW.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/server-functions-CVTCv6Y1.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var getRequestSession_createServerFn_handler = createServerRpc({
	id: "ca4ca2f3a16cc919962eb4ac7f4d1e5134e1ace2b3fe4b1c16ce7a49dd21240c",
	name: "getRequestSession",
	filename: "src/lib/server-functions.ts"
}, (opts) => getRequestSession.__executeServer(opts));
var getRequestSession = createServerFn({ method: "GET" }).handler(getRequestSession_createServerFn_handler, async () => {
	const session = await auth.api.getSession({ headers: getRequestHeaders() });
	return session?.user ? { user: {
		name: session.user.name,
		email: session.user.email
	} } : null;
});
var getDashboardData_createServerFn_handler = createServerRpc({
	id: "d074c438e2c29dbb4f474942758f2d6a63a56fae65683a2388e1171ad41ee04b",
	name: "getDashboardData",
	filename: "src/lib/server-functions.ts"
}, (opts) => getDashboardData.__executeServer(opts));
var getDashboardData = createServerFn({ method: "GET" }).validator((workspace) => workspace).handler(getDashboardData_createServerFn_handler, ({ data: workspace }) => fetchDashboardData(workspace));
var getActiveWorkspace_createServerFn_handler = createServerRpc({
	id: "4ab1a852046729ae75105f961b9e101bce9564424672497c2975d5bd38c62516",
	name: "getActiveWorkspace",
	filename: "src/lib/server-functions.ts"
}, (opts) => getActiveWorkspace.__executeServer(opts));
var getActiveWorkspace = createServerFn({ method: "GET" }).handler(getActiveWorkspace_createServerFn_handler, () => getCookie("vivadeo_workspace") || "default-workspace");
//#endregion
export { getActiveWorkspace_createServerFn_handler, getDashboardData_createServerFn_handler, getRequestSession_createServerFn_handler };
