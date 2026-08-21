import { i as __toESM } from "../_runtime.mjs";
import { B as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as Route$11 } from "./router-CLpWapA1.mjs";
import { t as AppTopbar } from "./app-topbar-BBHj5u71.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings-B5U-utYI.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AccountSettingsPanel({ email, displayName, emailVerified }) {
	const [name, setName] = (0, import_react.useState)(displayName);
	const [currentPassword, setCurrentPassword] = (0, import_react.useState)("");
	const [newPassword, setNewPassword] = (0, import_react.useState)("");
	const [profileStatus, setProfileStatus] = (0, import_react.useState)({ state: "idle" });
	const [passwordStatus, setPasswordStatus] = (0, import_react.useState)({ state: "idle" });
	const [verifyStatus, setVerifyStatus] = (0, import_react.useState)({ state: "idle" });
	async function saveProfile() {
		setProfileStatus({ state: "loading" });
		try {
			const response = await fetch("/api/auth/update-user", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: name.trim() })
			});
			if (!response.ok) throw new Error(`Profile update failed (${response.status})`);
			setProfileStatus({
				state: "ok",
				message: "Profile updated."
			});
		} catch (cause) {
			setProfileStatus({
				state: "error",
				message: cause instanceof Error ? cause.message : "Profile update failed"
			});
		}
	}
	async function resendVerification() {
		setVerifyStatus({ state: "loading" });
		try {
			const response = await fetch("/api/auth/send-verification-email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email,
					callbackURL: `${window.location.origin}/settings?verify=done`
				})
			});
			if (!response.ok) throw new Error(`Verification email failed (${response.status})`);
			setVerifyStatus({
				state: "ok",
				message: "Verification email sent."
			});
		} catch (cause) {
			setVerifyStatus({
				state: "error",
				message: cause instanceof Error ? cause.message : "Verification email failed"
			});
		}
	}
	async function changePassword() {
		if (!currentPassword || !newPassword) {
			setPasswordStatus({
				state: "error",
				message: "Enter current and new password."
			});
			return;
		}
		setPasswordStatus({ state: "loading" });
		try {
			const response = await fetch("/api/auth/change-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					currentPassword,
					newPassword,
					revokeOtherSessions: false
				})
			});
			if (!response.ok) throw new Error(`Password change failed (${response.status})`);
			setCurrentPassword("");
			setNewPassword("");
			setPasswordStatus({
				state: "ok",
				message: "Password changed."
			});
		} catch (cause) {
			setPasswordStatus({
				state: "error",
				message: cause instanceof Error ? cause.message : "Password change failed"
			});
		}
	}
	function renderStatus(status) {
		if (status.state === "idle") return null;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "muted",
			children: status.state === "loading" ? "Working..." : status.message
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "surface-section dashboard-panel",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "dashboard-panel-head",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Account settings" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "muted",
					children: "Profile, password, email verification, and session controls live here."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "form",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							htmlFor: "displayName",
							children: "Display name"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "displayName",
							value: name,
							onChange: (event) => setName(event.target.value)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							htmlFor: "email",
							children: "Email"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "email",
							value: email,
							readOnly: true
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "dashboard-panel-links",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "button",
							type: "button",
							onClick: saveProfile,
							children: "Save profile"
						}), !emailVerified ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "button-secondary",
							type: "button",
							onClick: resendVerification,
							children: "Send verification email"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "pill",
							children: "Email verified"
						})]
					}),
					renderStatus(profileStatus),
					renderStatus(verifyStatus)
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "form",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							htmlFor: "currentPassword",
							children: "Current password"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "currentPassword",
							type: "password",
							value: currentPassword,
							onChange: (event) => setCurrentPassword(event.target.value)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							htmlFor: "newPassword",
							children: "New password"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "newPassword",
							type: "password",
							value: newPassword,
							onChange: (event) => setNewPassword(event.target.value)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "dashboard-panel-links",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "button-secondary",
							type: "button",
							onClick: changePassword,
							children: "Change password"
						})
					}),
					renderStatus(passwordStatus)
				]
			})
		]
	});
}
function DeleteAccountPanel() {
	const [status, setStatus] = (0, import_react.useState)({ state: "idle" });
	async function requestDeletion() {
		setStatus({ state: "loading" });
		try {
			const response = await fetch("/api/auth/delete-user", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ callbackURL: "/sign-in" })
			});
			if (!response.ok) throw new Error(`Delete request failed (${response.status})`);
			const payload = await response.json();
			setStatus({
				state: "ok",
				message: payload.message || "Deletion verification sent."
			});
		} catch (cause) {
			setStatus({
				state: "error",
				message: cause instanceof Error ? cause.message : "Delete request failed"
			});
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "surface-section dashboard-panel",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "dashboard-panel-head",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Delete account" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "muted",
					children: "Starts verified deletion flow. Better Auth sends confirmation email before deleting user."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "dashboard-panel-links",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "button-secondary",
					onClick: requestDeletion,
					children: "Request account deletion"
				})
			}),
			status.state !== "idle" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "muted",
				children: status.state === "loading" ? "Working..." : status.message
			}) : null
		]
	});
}
function fmtDate(value) {
	return new Intl.DateTimeFormat(void 0, {
		dateStyle: "medium",
		timeStyle: "short"
	}).format(new Date(value));
}
function SessionPanel() {
	const [sessions, setSessions] = (0, import_react.useState)([]);
	const [status, setStatus] = (0, import_react.useState)({ state: "idle" });
	async function loadSessions() {
		try {
			const response = await fetch("/api/auth/list-sessions");
			if (!response.ok) throw new Error(`Session lookup failed (${response.status})`);
			const payload = await response.json();
			setSessions(payload);
		} catch (cause) {
			setStatus({
				state: "error",
				message: cause instanceof Error ? cause.message : "Session lookup failed"
			});
		}
	}
	(0, import_react.useEffect)(() => {
		loadSessions();
	}, []);
	async function revokeSession(token) {
		setStatus({ state: "loading" });
		try {
			const response = await fetch("/api/auth/revoke-session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token })
			});
			if (!response.ok) throw new Error(`Revoke failed (${response.status})`);
			setStatus({
				state: "ok",
				message: "Session revoked."
			});
			await loadSessions();
		} catch (cause) {
			setStatus({
				state: "error",
				message: cause instanceof Error ? cause.message : "Revoke failed"
			});
		}
	}
	async function revokeOtherSessions() {
		setStatus({ state: "loading" });
		try {
			const response = await fetch("/api/auth/revoke-other-sessions", { method: "POST" });
			if (!response.ok) throw new Error(`Revoke failed (${response.status})`);
			setStatus({
				state: "ok",
				message: "Other sessions revoked."
			});
			await loadSessions();
		} catch (cause) {
			setStatus({
				state: "error",
				message: cause instanceof Error ? cause.message : "Revoke failed"
			});
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "surface-section dashboard-panel",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "dashboard-panel-head",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Sessions" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "muted",
					children: "Review active sessions and revoke anything you do not trust."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "dashboard-panel-links",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "button-secondary",
					onClick: revokeOtherSessions,
					children: "Revoke other sessions"
				})
			}),
			status.state !== "idle" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "muted",
				children: status.state === "loading" ? "Working..." : status.message
			}) : null,
			sessions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "muted",
				children: "No active sessions returned."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "job-history-list",
				children: sessions.map((session) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "detail-card",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: session.ipAddress || "Unknown IP" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: session.userAgent || "Unknown device" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "muted",
							children: [
								"Created ",
								fmtDate(session.createdAt),
								" • Expires ",
								fmtDate(session.expiresAt)
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "dashboard-panel-links",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "button-secondary",
								onClick: () => revokeSession(session.token),
								children: "Revoke session"
							})
						})
					]
				}, session.token))
			})
		]
	});
}
function SettingsPage() {
	const user = Route$11.useLoaderData()?.user;
	const displayName = user?.name || "Your display name";
	const email = user?.email || "your@email.example";
	const emailVerified = Boolean(user && "emailVerified" in user ? user.emailVerified : false);
	const initial = (displayName || "V").trim().slice(0, 1).toUpperCase();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "shell page",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppTopbar, { profileInitial: initial }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "split settings-surface fade-in",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccountSettingsPanel, {
					email,
					displayName,
					emailVerified
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "surface-section",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Admin controls" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "muted",
							children: "Workspace roles, invites, and billing settings are scoped to the active organization."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Invite teammates" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Review workspace role assignments" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Update plan and support settings" })
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", {
							action: "/api/auth/sign-out",
							method: "post",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "button-secondary",
								type: "submit",
								children: "Sign out"
							})
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "settings-surface fade-in",
				style: { marginTop: 18 },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SessionPanel, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "settings-surface fade-in",
				style: { marginTop: 18 },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeleteAccountPanel, {})
			})
		]
	});
}
var SplitComponent = SettingsPage;
//#endregion
export { SplitComponent as component };
