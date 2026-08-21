import { b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as WorkspacePanel, t as DashboardShell } from "./dashboard-ui-1_6wcaHe.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/workspace-Dt4NTeUi.js
var import_jsx_runtime = require_jsx_runtime();
async function WorkspacePage() {
	const activeWorkspace = { get: (_name) => void 0 }.get("vivadeo_workspace")?.value || "default-workspace";
	const profileInitial = "V".trim().slice(0, 1).toUpperCase();
	const { stats } = await import("./dashboard-data-Ew9HtBiW.mjs").then((mod) => mod.fetchDashboardData(activeWorkspace));
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
						children: "Workspace"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Switch context, no clutter." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "muted",
						children: "One page for workspace state and account actions."
					})
				] })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "workspace-grid",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "summary-chip summary-chip-large workspace-summary-card",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Active workspace" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: activeWorkspace }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "muted",
							children: "Current org context for uploads, jobs, and clips."
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorkspacePanel, {
					activeWorkspace,
					stats
				})]
			})]
		})
	});
}
var SplitComponent = WorkspacePage;
//#endregion
export { SplitComponent as component };
