import { i as __toESM } from "../_runtime.mjs";
import { B as require_react, b as require_jsx_runtime, d as useLocation } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as Route$9 } from "./router-CLpWapA1.mjs";
import { t as Link$1 } from "./link-CvysoLTw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/sign-up-B_6UdQrk.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function SignupForm({ initialError }) {
	const [error, setError] = (0, import_react.useState)(initialError === "PASSWORD_MISMATCH" ? "Passwords do not match." : "");
	function validate(event) {
		const form = new FormData(event.currentTarget);
		if (String(form.get("password") || "") !== String(form.get("confirmPassword") || "")) {
			event.preventDefault();
			setError("Passwords do not match.");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		className: "form",
		method: "post",
		action: "/api/auth/sign-up",
		onSubmit: validate,
		children: [
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "notice notice-bad",
				role: "alert",
				children: error
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "field",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					htmlFor: "name",
					children: "Your name"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					id: "name",
					name: "name",
					type: "text",
					autoComplete: "name",
					required: true
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "field",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					htmlFor: "workspace",
					children: "Workspace name"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					id: "workspace",
					name: "workspace",
					type: "text",
					required: true
				})]
			}),
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
					autoComplete: "new-password",
					minLength: 8,
					required: true
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "field",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					htmlFor: "confirmPassword",
					children: "Confirm password"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					id: "confirmPassword",
					name: "confirmPassword",
					type: "password",
					autoComplete: "new-password",
					minLength: 8,
					required: true
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "button",
				type: "submit",
				children: "Create workspace"
			})
		]
	});
}
function SignUpPage() {
	Route$9.useLoaderData();
	const params = { error: new URLSearchParams(useLocation().searchStr).get("error") || void 0 };
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "shell",
		style: { padding: "28px 0 48px" },
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "topbar",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "brand",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "brand-mark" }), "Vivadeo"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
				to: "/",
				className: "button-secondary",
				children: "Back to landing"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "fade-in",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "card workspace-create-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Create a workspace" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "muted",
						children: "Start a new tenant, invite your team, and keep content isolated from day one."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignupForm, { initialError: params.error })
				]
			})
		})]
	});
}
var SplitComponent = SignUpPage;
//#endregion
export { SplitComponent as component };
