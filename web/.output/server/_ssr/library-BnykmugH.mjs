import { b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { fetchDashboardData } from "./dashboard-data-Ew9HtBiW.mjs";
import { i as LibraryPanel, t as DashboardShell } from "./dashboard-ui-1_6wcaHe.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/library-BnykmugH.js
var import_jsx_runtime = require_jsx_runtime();
async function LibraryPage() {
	const activeWorkspace = { get: (_name) => void 0 }.get("vivadeo_workspace")?.value || "default-workspace";
	const profileInitial = "V".trim().slice(0, 1).toUpperCase();
	const { videos, jobs } = await fetchDashboardData(activeWorkspace);
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
						children: "Library"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Video catalog with detail." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "muted",
						children: "Status, source metadata, upload time, quick hop into job or clip flow."
					})
				] })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LibraryPanel, {
				videos,
				jobs
			})]
		})
	});
}
var SplitComponent = LibraryPage;
//#endregion
export { SplitComponent as component };
