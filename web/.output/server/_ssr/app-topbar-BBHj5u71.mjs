import { b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Link$1 } from "./link-CvysoLTw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/app-topbar-BBHj5u71.js
var import_jsx_runtime = require_jsx_runtime();
function AppTopbar({ profileInitial = "V" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
		className: "topbar",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "topbar-shell",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
					to: "/",
					className: "brand",
					children: "Vivadeo"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
					className: "nav-center",
					"aria-label": "Main",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
							to: "/",
							className: "nav-link",
							children: "Home"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
							to: "/dashboard",
							className: "nav-link",
							children: "Dashboard"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
							to: "/search",
							className: "nav-link",
							children: "Search"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
							to: "/dashboard/library",
							className: "nav-link",
							children: "Library"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
							to: "/jobs",
							className: "nav-link",
							children: "Jobs"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
							to: "/settings",
							className: "nav-link",
							children: "Settings"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nav-spacer" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "nav-actions",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
						to: "/settings",
						className: "nav-user",
						"aria-label": "Profile",
						children: profileInitial
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", {
						action: "/api/auth/sign-out",
						method: "post",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "nav-logout",
							type: "submit",
							children: "Log out"
						})
					})]
				})
			]
		})
	});
}
//#endregion
export { AppTopbar as t };
