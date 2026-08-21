import { b as require_jsx_runtime, d as useLocation } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Route$10 } from "./router-CLpWapA1.mjs";
import { t as Link$1 } from "./link-CvysoLTw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/sign-in-C-CfQpK9.js
var import_jsx_runtime = require_jsx_runtime();
var ERROR_MESSAGES = {
	EMAIL_NOT_VERIFIED: "Your email address has not been verified. Enter the code from your inbox.",
	INVALID_EMAIL_OR_PASSWORD: "Invalid email or password.",
	USER_NOT_FOUND: "Invalid email or password.",
	INVALID_PASSWORD: "Invalid email or password.",
	UNKNOWN: "Something went wrong. Please try again."
};
function errorMessage(code) {
	return ERROR_MESSAGES[code] ?? `Sign-in failed (${code}). Please try again.`;
}
function AuthArt() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "auth-art",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "auth-art-sheen" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "auth-art-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Workspace access" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Welcome back" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Sign in to manage uploads, search, and clips in a clean workspace boundary." })
			]
		})]
	});
}
function SignInPage() {
	Route$10.useLoaderData();
	const query = new URLSearchParams(useLocation().searchStr);
	const params = {
		error: query.get("error") || void 0,
		verify: query.get("verify") || void 0,
		reset: query.get("reset") || void 0
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "shell page",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "topbar",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "topbar-shell",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "brand",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "brand-mark" }), "Vivadeo"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "nav-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
							to: "/",
							className: "nav-link",
							children: "Home"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
							to: "/dashboard",
							className: "nav-link",
							children: "Dashboard"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nav-spacer" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "nav-actions",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
							to: "/sign-up",
							className: "button",
							children: "Sign Up"
						})
					})
				]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "auth-shell fade-in",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthArt, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "card auth-panel",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Sign in" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "muted",
						children: "Use your workspace account to manage uploads, search, and clips."
					}),
					params.verify === "done" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "notice notice-good",
						children: "Email verified. You can now sign in."
					}),
					params.reset === "sent" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "notice notice-good",
						children: "Password reset email sent - check your inbox."
					}),
					params.error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "notice notice-bad",
						children: errorMessage(params.error)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "form",
						method: "post",
						action: "/api/auth/sign-in",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "field",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									htmlFor: "email",
									children: "Email"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									id: "email",
									name: "email",
									type: "email",
									autoComplete: "email",
									required: true
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "field",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									htmlFor: "password",
									children: "Password"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									id: "password",
									name: "password",
									type: "password",
									autoComplete: "current-password",
									required: true
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "button",
								type: "submit",
								children: "Sign in"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "muted",
						style: { marginTop: 16 },
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
							to: "/forgot-password",
							children: "Forgot password?"
						})
					})
				]
			})]
		})]
	});
}
var SplitComponent = SignInPage;
//#endregion
export { SplitComponent as component };
