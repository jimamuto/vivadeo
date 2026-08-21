import { b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { fetchDashboardData } from "./dashboard-data-Ew9HtBiW.mjs";
import { r as JobsPanel, t as DashboardShell } from "./dashboard-ui-1_6wcaHe.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/jobs-BSDg0oBC.js
var import_jsx_runtime = require_jsx_runtime();
async function JobsPage() {
	const activeWorkspace = { get: (_name) => void 0 }.get("vivadeo_workspace")?.value || "default-workspace";
	const profileInitial = "V".trim().slice(0, 1).toUpperCase();
	const { jobs } = await fetchDashboardData(activeWorkspace);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardShell, {
		workspace: activeWorkspace,
		profileInitial,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "dashboard-stack",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "dashboard-section-head",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "eyebrow",
						children: "Jobs"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Queue state only." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "muted",
						children: "Progress table lives here, not buried in mixed dashboard content."
					})
				] })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JobsPanel, { jobs })]
		})
	});
}
var SplitComponent = JobsPage;
//#endregion
export { SplitComponent as component };
