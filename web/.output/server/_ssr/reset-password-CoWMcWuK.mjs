import { b as require_jsx_runtime, d as useLocation } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Link$1 } from "./link-CvysoLTw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reset-password-CoWMcWuK.js
var import_jsx_runtime = require_jsx_runtime();
function ResetPasswordPage() {
	const error = new URLSearchParams(useLocation().searchStr).get("error") || void 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "shell page",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "topbar",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "brand",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "brand-mark" }), "Vivadeo"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
				to: "/sign-in",
				className: "button-secondary",
				children: "Back to sign in"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card fade-in",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Choose a new password" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "muted",
					children: "Enter the reset token from your email to complete the password reset."
				}),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					style: {
						color: "var(--color-error, #f87171)",
						marginBottom: 16
					},
					children: error === "INVALID_TOKEN" ? "This reset link is invalid or has expired. Please request a new one." : `Reset failed: ${error}`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "form",
					method: "post",
					action: "/api/auth/reset-password",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								htmlFor: "token",
								children: "Reset token"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "token",
								name: "token",
								type: "text",
								required: true
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								htmlFor: "password",
								children: "New password"
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
							children: "Reset password"
						})
					]
				})
			]
		})]
	});
}
var SplitComponent = ResetPasswordPage;
//#endregion
export { SplitComponent as component };
