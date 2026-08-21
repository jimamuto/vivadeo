import { b as require_jsx_runtime } from "./_libs/@tanstack/react-router+[...].mjs";
import { n as Route } from "./_ssr/router-CLpWapA1.mjs";
import { t as Link$1 } from "./_ssr/link-CvysoLTw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_token-DoPJ07RN.js
var import_jsx_runtime = require_jsx_runtime();
function InvitePage() {
	const { token } = Route.useParams();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "shell",
		style: { padding: "28px 0 48px" },
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "topbar",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "brand",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "brand-mark" }), "Vivadeo"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
				to: "/sign-in",
				className: "button-secondary",
				children: "Sign in"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card fade-in",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Join workspace invite" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "muted",
					children: "Accept the invitation token below to join the workspace."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "pill",
					children: ["Token: ", token]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "form",
					method: "post",
					action: "/api/auth/accept-invite",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "hidden",
							name: "token",
							value: token
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								htmlFor: "name",
								children: "Your name"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "name",
								name: "name",
								type: "text",
								required: true
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								htmlFor: "password",
								children: "Set password"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "password",
								name: "password",
								type: "password",
								required: true
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "button",
							type: "submit",
							children: "Accept invite"
						})
					]
				})
			]
		})]
	});
}
var SplitComponent = InvitePage;
//#endregion
export { SplitComponent as component };
