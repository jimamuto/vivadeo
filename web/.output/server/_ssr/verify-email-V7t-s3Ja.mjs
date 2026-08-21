import { b as require_jsx_runtime, d as useLocation } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as Route$8 } from "./router-CLpWapA1.mjs";
import { t as Link$1 } from "./link-CvysoLTw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/verify-email-V7t-s3Ja.js
var import_jsx_runtime = require_jsx_runtime();
function VerifyEmailPage() {
	Route$8.useLoaderData();
	const query = new URLSearchParams(useLocation().searchStr);
	const params = {
		email: query.get("email") || void 0,
		error: query.get("error") || void 0,
		sent: query.get("sent") || void 0
	};
	const email = params.email || "";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "shell page",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "topbar",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "topbar-shell",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "brand",
					children: "Vivadeo"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
					to: "/sign-in",
					className: "button-secondary",
					children: "Back to sign in"
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card verify-email-card fade-in",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "eyebrow",
					children: "Email verification"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Enter your code" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "muted",
					children: [
						"We sent a six-digit code to ",
						email || "your email address",
						". Enter it below to activate your workspace."
					]
				}),
				params.sent === "1" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "notice notice-good",
					children: "A new verification code has been sent."
				}) : null,
				params.error === "invalid" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "notice notice-bad",
					children: "That code is invalid or expired. Try again or request a new one."
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "form",
					method: "post",
					action: "/api/auth/verify-email",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "hidden",
							name: "email",
							value: email
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								htmlFor: "code",
								children: "Verification code"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "code",
								name: "code",
								type: "text",
								inputMode: "numeric",
								autoComplete: "one-time-code",
								pattern: "[0-9]{6}",
								maxLength: 6,
								placeholder: "000000",
								"aria-label": "Six-digit verification code",
								required: true
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "button",
							type: "submit",
							children: "Verify email"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "verify-resend-form",
					method: "post",
					action: "/api/auth/verify-email",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "hidden",
							name: "email",
							value: email
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "hidden",
							name: "intent",
							value: "resend"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "button-secondary",
							type: "submit",
							children: "Send a new code"
						})
					]
				})
			]
		})]
	});
}
var SplitComponent = VerifyEmailPage;
//#endregion
export { SplitComponent as component };
