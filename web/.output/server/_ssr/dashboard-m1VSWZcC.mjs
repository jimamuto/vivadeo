import { b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { fetchDashboardData } from "./dashboard-data-Ew9HtBiW.mjs";
import { a as OverviewPanel, t as DashboardShell } from "./dashboard-ui-1_6wcaHe.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/dashboard-m1VSWZcC.js
var import_jsx_runtime = require_jsx_runtime();
async function DashboardPage() {
	const activeWorkspace = { get: (_name) => void 0 }.get("vivadeo_workspace")?.value || "default-workspace";
	const profileInitial = "V".trim().slice(0, 1).toUpperCase();
	const { videos, jobs, stats } = await fetchDashboardData(activeWorkspace);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardShell, {
		workspace: activeWorkspace,
		profileInitial,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OverviewPanel, {
			activeWorkspace,
			videos,
			jobs,
			stats
		})
	});
}
var SplitComponent = DashboardPage;
//#endregion
export { SplitComponent as component };
