import { b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Link$1 } from "./link-CvysoLTw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/forgot-password-CPKnUw4f.js
var import_jsx_runtime = require_jsx_runtime();
function ForgotPasswordPage() {
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
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Password reset" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "muted",
					children: "Request a reset link for your workspace account."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "form",
					method: "post",
					action: "/api/auth/forgot-password",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							htmlFor: "email",
							children: "Email"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "email",
							name: "email",
							type: "email",
							required: true
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "button",
						type: "submit",
						children: "Send reset link"
					})]
				})
			]
		})]
	});
}
var SplitComponent = ForgotPasswordPage;
//#endregion
export { SplitComponent as component };
