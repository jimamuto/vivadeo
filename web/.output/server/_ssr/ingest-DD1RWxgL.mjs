import { b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as IngestPanel, t as DashboardShell } from "./dashboard-ui-1_6wcaHe.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ingest-DD1RWxgL.js
var import_jsx_runtime = require_jsx_runtime();
async function IngestPage() {
	const activeWorkspace = { get: (_name) => void 0 }.get("vivadeo_workspace")?.value || "default-workspace";
	const profileInitial = "V".trim().slice(0, 1).toUpperCase();
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
						children: "Ingest"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "One source, one queue." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "muted",
						children: "Upload file or queue URL without loading clip or job tables at same time."
					})
				] })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IngestPanel, { workspace: activeWorkspace })]
		})
	});
}
var SplitComponent = IngestPage;
//#endregion
export { SplitComponent as component };
