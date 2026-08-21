import { i as __toESM } from "../_runtime.mjs";
import { B as require_react, b as require_jsx_runtime, d as useLocation, y as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Link$1 } from "./link-CvysoLTw.mjs";
import { t as AppTopbar } from "./app-topbar-BBHj5u71.mjs";
import { n as readActivityLog, t as appendActivity } from "./activity-log-t8Fhfxx7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/dashboard-ui-1_6wcaHe.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function NavItem({ href, label }) {
	const pathname = useLocation().pathname;
	const active = pathname === href || pathname.startsWith(`${href}/`);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
		className: `dash-nav-item${active ? " is-active" : ""}`,
		to: href,
		children: label
	});
}
function DashboardShell({ workspace, profileInitial, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "shell page dashboard-wrap",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppTopbar, { profileInitial }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "dashboard-shell",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "dashboard-sidebar",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "dashboard-sidebar-brand",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "muted",
							children: ["Workspace ", workspace]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
						className: "dashboard-nav",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavItem, {
								href: "/dashboard",
								label: "Overview"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavItem, {
								href: "/dashboard/ingest",
								label: "Ingest"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavItem, {
								href: "/dashboard/library",
								label: "Library"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavItem, {
								href: "/dashboard/jobs",
								label: "Jobs"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavItem, {
								href: "/dashboard/workspace",
								label: "Workspace"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "dashboard-sidebar-foot",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
							to: "/",
							className: "button-secondary",
							children: "Landing"
						})
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "dashboard-stage",
				children
			})]
		})]
	});
}
var CLIP_REGISTRY_KEY = "vivadeo.clip-registry";
function readSavedClips() {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(CLIP_REGISTRY_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}
function writeSavedClips(clips) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(CLIP_REGISTRY_KEY, JSON.stringify(clips));
}
var VIDEO_LABELS_KEY = "vivadeo.video-labels";
function readVideoLabels() {
	if (typeof window === "undefined") return {};
	try {
		const raw = window.localStorage.getItem(VIDEO_LABELS_KEY);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
}
function writeVideoLabels(labels) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(VIDEO_LABELS_KEY, JSON.stringify(labels));
}
function normalizeRole(role) {
	if (role === "owner" || role === "admin" || role === "editor" || role === "viewer") return role;
	if (role === "member") return "editor";
	return "viewer";
}
function useWorkspacePermissions(workspace) {
	const [role, setRole] = (0, import_react.useState)("viewer");
	const [isLoading, setIsLoading] = (0, import_react.useState)(true);
	(0, import_react.useEffect)(() => {
		const activeWorkspace = workspace || document.cookie.split("; ").find((item) => item.startsWith("vivadeo_workspace="))?.split("=")[1] || "default-workspace";
		(async () => {
			try {
				const [sessionResponse, settingsResponse] = await Promise.all([fetch("/api/auth/get-session"), fetch("/api/proxy/v1/settings")]);
				if (!sessionResponse.ok) throw new Error("session");
				const email = (await sessionResponse.json()).user?.email;
				if (!email) {
					setRole("viewer");
					return;
				}
				if (settingsResponse.ok) {
					const settingsPayload = await settingsResponse.json();
					const overrideRole = settingsPayload.settings?.workspace_roles?.[email] || settingsPayload.settings?.invite_roles?.[email];
					if (overrideRole) {
						setRole(overrideRole);
						return;
					}
				}
				const membersResponse = await fetch(`/api/auth/organization/list-members?organizationId=${encodeURIComponent(activeWorkspace)}`);
				if (!membersResponse.ok) {
					setRole(activeWorkspace === "default-workspace" ? "editor" : "viewer");
					return;
				}
				const member = (await membersResponse.json()).members.find((item) => item.user?.email === email);
				setRole(member ? normalizeRole(member.role) : activeWorkspace === "default-workspace" ? "editor" : "viewer");
			} catch {
				setRole("viewer");
			} finally {
				setIsLoading(false);
			}
		})();
	}, [workspace]);
	return {
		role,
		isLoading,
		canEdit: role === "owner" || role === "admin" || role === "editor",
		canManageWorkspace: role === "owner" || role === "admin"
	};
}
function StatusLine({ status }) {
	if (status.state === "idle") return null;
	const color = status.state === "ok" ? "var(--accent)" : status.state === "error" ? "var(--danger)" : "inherit";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "muted",
		style: {
			marginTop: 10,
			color
		},
		children: status.state === "loading" ? "Working..." : status.message
	});
}
async function proxyPost(path, body, json = true) {
	const res = await fetch(`/api/proxy${path}`, {
		method: "POST",
		body,
		...json ? { headers: { "Content-Type": "application/json" } } : {}
	});
	const data = await res.json();
	if (!res.ok) throw new Error(data.detail ?? JSON.stringify(data));
	return data;
}
function statusTone(status) {
	if (status === "succeeded" || status === "ready") return "good";
	if (status === "failed" || status === "canceled") return "bad";
	if (status === "running" || status === "processing") return "live";
	return "idle";
}
function sourceLabel(sourceType) {
	return sourceType.replace(/_/g, " ");
}
function fmt(seconds) {
	if (seconds == null) return "-";
	return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}
function fmtDate(value) {
	return new Intl.DateTimeFormat(void 0, {
		dateStyle: "medium",
		timeStyle: "short"
	}).format(new Date(value));
}
function fmtBytes(bytes) {
	if (bytes <= 0) return "0 B";
	const units = [
		"B",
		"KB",
		"MB",
		"GB",
		"TB"
	];
	let value = bytes;
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}
	return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
function StatStrip({ label, value, note }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "stat-strip",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: value }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: note })
		]
	});
}
function JobStages({ job }) {
	const stages = [
		"queued",
		"chunking",
		"embedding",
		"indexing",
		"ready"
	];
	const activeIndex = job.status === "failed" ? Math.max(0, stages.indexOf(job.message?.toLowerCase().includes("embed") ? "embedding" : "chunking")) : job.status === "succeeded" ? stages.length - 1 : Math.max(0, Math.min(stages.length - 2, Math.floor((job.progress ?? 0) * (stages.length - 1))));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "job-stage-list",
		"aria-label": "Job stages",
		children: stages.map((stage, index) => {
			const state = job.status === "failed" && index === activeIndex ? "failed" : index < activeIndex ? "done" : index === activeIndex ? "active" : "pending";
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `job-stage job-stage-${state}`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: stage })
			}, stage);
		})
	});
}
function OverviewPanel({ activeWorkspace, videos, jobs, stats }) {
	const readyVideos = videos.filter((video) => video.status === "ready").length;
	const failedJobs = jobs.filter((job) => job.status === "failed").length;
	const [activity, setActivity] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		setActivity(readActivityLog().filter((entry) => entry.workspace === activeWorkspace));
	}, [activeWorkspace]);
	const ingestCount = activity.filter((entry) => entry.action === "ingest.queued").length;
	const searchCount = activity.filter((entry) => entry.action === "search.performed").length;
	const clipCount = activity.filter((entry) => entry.action === "clip.created").length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "dashboard-stack fade-in",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "dashboard-hero",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "dashboard-title card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "eyebrow",
						children: "Signed-in console"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Dashboard built like control room." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Move between ingest, library, jobs, clips, workspace without mixing every task into one page." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "dashboard-chips",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "pill",
								children: ["Workspace ", activeWorkspace]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "pill",
								children: [readyVideos, " ready videos"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "pill",
								children: [failedJobs, " failed jobs"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "pill",
								children: "Search + preview"
							})
						]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "dashboard-hero-side",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatStrip, {
						label: "Jobs",
						value: `${jobs.length}`,
						note: "Queued, active, or finished."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatStrip, {
						label: "Videos",
						value: `${stats.total_videos}`,
						note: "Indexed items in workspace."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatStrip, {
						label: "Chunks",
						value: `${stats.total_chunks}`,
						note: "Searchable segments in this workspace."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatStrip, {
						label: "Storage",
						value: fmtBytes(stats.total_storage_bytes),
						note: "Source and clip objects found in storage."
					})
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "dashboard-summary-row",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "summary-chip",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Ingest throughput" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: ingestCount }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Queued ingest actions in this browser workspace view." })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "summary-chip",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Search volume" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: searchCount }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Recorded searches from current workspace context." })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "summary-chip",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Clip creation" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: clipCount }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Clip creation actions recorded from UI." })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "summary-chip",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Job failures" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: failedJobs }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Failed jobs currently visible in workspace history." })
					]
				})
			]
		})]
	});
}
function IngestPanel({ workspace = "default-workspace" }) {
	const navigate = useNavigate();
	const permissions = useWorkspacePermissions(workspace);
	const fileRef = (0, import_react.useRef)(null);
	const urlRef = (0, import_react.useRef)(null);
	const [fileStatus, setFileStatus] = (0, import_react.useState)({ state: "idle" });
	const [urlStatus, setUrlStatus] = (0, import_react.useState)({ state: "idle" });
	const [fileWarning, setFileWarning] = (0, import_react.useState)(null);
	const [isDragActive, setIsDragActive] = (0, import_react.useState)(false);
	const [interruptedJobs, setInterruptedJobs] = (0, import_react.useState)([]);
	const [recoveryStatus, setRecoveryStatus] = (0, import_react.useState)({ state: "idle" });
	(0, import_react.useEffect)(() => {
		(async () => {
			try {
				const response = await fetch("/api/proxy/v1/jobs");
				if (!response.ok) return;
				const payload = await response.json();
				setInterruptedJobs(payload.filter((job) => [
					"ingest_uploaded_object",
					"ingest_url",
					"ingest_local_path"
				].includes(job.kind) && ["failed", "canceled"].includes(job.status)));
			} catch {
				return;
			}
		})();
	}, []);
	function validateFile(file) {
		if (!file) return "Please select a file.";
		const sizeLimitMb = 512;
		if (!file.type.startsWith("video/")) return "Only video uploads are supported right now.";
		if (file.size > sizeLimitMb * 1024 * 1024) return `File is larger than ${sizeLimitMb} MB. Use a smaller source or URL ingest.`;
		return null;
	}
	function syncSelectedFile(file) {
		const warning = file ? `${file.name} • ${(file.size / 1048576).toFixed(1)} MB • ${file.type || "unknown type"}` : null;
		setFileWarning(warning);
		const validationError = validateFile(file);
		if (validationError) setFileStatus({
			state: "error",
			message: validationError
		});
		else setFileStatus({ state: "idle" });
	}
	function bindDroppedFile(file) {
		if (!fileRef.current || !file) {
			syncSelectedFile(void 0);
			return;
		}
		const files = new DataTransfer();
		files.items.add(file);
		fileRef.current.files = files.files;
		syncSelectedFile(file);
	}
	async function handleUpload() {
		const file = fileRef.current?.files?.[0];
		const validationError = validateFile(file);
		if (validationError) return setFileStatus({
			state: "error",
			message: validationError
		});
		setFileStatus({ state: "loading" });
		try {
			const fd = new FormData();
			fd.append("file", file);
			const job = await proxyPost("/v1/videos/upload", fd, false);
			appendActivity(workspace, "ingest.queued", file.name);
			navigate({ to: `/jobs?job=${encodeURIComponent(job.id)}` });
			if (fileRef.current) fileRef.current.value = "";
		} catch (e) {
			setFileStatus({
				state: "error",
				message: `Upload failed: ${e.message}`
			});
		}
	}
	async function handleSubmit(e) {
		e.preventDefault();
		const url = urlRef.current?.value?.trim();
		if (!url) return setUrlStatus({
			state: "error",
			message: "Please enter a URL."
		});
		try {
			const parsed = new URL(url);
			if (!["http:", "https:"].includes(parsed.protocol)) {
				setUrlStatus({
					state: "error",
					message: "Only http and https URLs are supported."
				});
				return;
			}
			if (!parsed.hostname.includes(".")) {
				setUrlStatus({
					state: "error",
					message: "URL must include a valid host."
				});
				return;
			}
		} catch {
			setUrlStatus({
				state: "error",
				message: "Enter a valid URL."
			});
			return;
		}
		setUrlStatus({ state: "loading" });
		try {
			const job = await proxyPost("/v1/videos/url", JSON.stringify({ url }));
			appendActivity(workspace, "ingest.queued", url);
			navigate({ to: `/jobs?job=${encodeURIComponent(job.id)}` });
			if (urlRef.current) urlRef.current.value = "";
		} catch (e) {
			setUrlStatus({
				state: "error",
				message: `Failed: ${e.message}`
			});
		}
	}
	async function retryInterruptedJob(jobId) {
		setRecoveryStatus({ state: "loading" });
		try {
			const job = await proxyPost(`/v1/jobs/${jobId}/retry`, "");
			setInterruptedJobs((current) => current.filter((item) => item.id !== jobId));
			setRecoveryStatus({
				state: "ok",
				message: "Interrupted ingest re-queued."
			});
			navigate({ to: `/jobs?job=${encodeURIComponent(job.id)}` });
		} catch (cause) {
			setRecoveryStatus({
				state: "error",
				message: cause instanceof Error ? cause.message : "Retry failed"
			});
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "dashboard-module-grid dashboard-module-grid-ingest",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "card dash-stack dash-primary",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "File ingest" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "muted",
					children: "Upload one source, then jump straight into job detail. Drag a file here or browse from disk."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "form",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "field",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									htmlFor: "file",
									children: "Video file"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									className: `ingest-dropzone${isDragActive ? " is-active" : ""}`,
									onClick: () => fileRef.current?.click(),
									onDragEnter: (event) => {
										event.preventDefault();
										setIsDragActive(true);
									},
									onDragOver: (event) => {
										event.preventDefault();
										setIsDragActive(true);
									},
									onDragLeave: (event) => {
										event.preventDefault();
										const nextTarget = event.relatedTarget;
										if (!nextTarget || !event.currentTarget.contains(nextTarget)) setIsDragActive(false);
									},
									onDrop: (event) => {
										event.preventDefault();
										setIsDragActive(false);
										bindDroppedFile(event.dataTransfer.files?.[0]);
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: isDragActive ? "Drop video to upload" : "Drop video here" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Or click to choose a local source file." })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: fileRef,
									id: "file",
									name: "file",
									type: "file",
									accept: "video/*",
									onChange: (event) => {
										syncSelectedFile(event.target.files?.[0]);
									}
								})
							]
						}),
						fileWarning ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "notice notice-soft",
							children: fileWarning
						}) : null,
						!permissions.canEdit ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "muted",
							children: "Viewer role cannot upload or queue ingest jobs."
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "button",
							onClick: handleUpload,
							disabled: fileStatus.state === "loading" || !permissions.canEdit,
							children: "Upload video"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusLine, { status: fileStatus })
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "card dash-stack dash-secondary",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "URL ingest" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "muted",
					children: "Queue remote source, keep same jobs flow and retry path. HTTP(S) only. Make sure you have permission to ingest external media before indexing it."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "form",
					onSubmit: handleSubmit,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								htmlFor: "url",
								children: "Video URL"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								ref: urlRef,
								id: "url",
								name: "url",
								placeholder: "https://youtu.be/..."
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "button",
							type: "submit",
							disabled: urlStatus.state === "loading" || !permissions.canEdit,
							children: "Queue ingest"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusLine, { status: urlStatus })
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
				className: "card dash-stack dash-expandable ingest-history-panel",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", {
						className: "ingest-history-summary",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Interrupted ingests" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "muted",
							children: "Retry canceled or failed ingest jobs from this workspace without re-entering everything."
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ingest-history-meta",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "pill",
								children: [interruptedJobs.length, " queued for recovery"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "pill",
								children: recoveryStatus.state === "loading" ? "Working" : "Tap to expand"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusLine, { status: recoveryStatus }),
					interruptedJobs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "muted",
						children: "No interrupted ingests found."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "job-history-list ingest-history-list",
						children: interruptedJobs.map((job) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "detail-card",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: job.kind.replace(/_/g, " ") }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: job.message || job.status }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "muted",
									children: [
										job.status,
										" • ",
										job.video_id || "No video id"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "dashboard-panel-links",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "button-secondary",
										onClick: () => void retryInterruptedJob(job.id),
										disabled: !permissions.canEdit,
										children: "Retry ingest"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
										to: `/jobs?job=${encodeURIComponent(job.id)}`,
										className: "button-secondary",
										children: "Open job"
									})]
								})
							]
						}, job.id))
					})
				]
			})
		]
	});
}
function JobsPanel({ jobs }) {
	const permissions = useWorkspacePermissions();
	const [items, setItems] = (0, import_react.useState)(jobs);
	const [selectedId, setSelectedId] = (0, import_react.useState)(jobs[0]?.id ?? "");
	const [error, setError] = (0, import_react.useState)(null);
	const [retryNote, setRetryNote] = (0, import_react.useState)(null);
	const [cancelNote, setCancelNote] = (0, import_react.useState)(null);
	const [timeline, setTimeline] = (0, import_react.useState)([]);
	const [deadLetterEntries, setDeadLetterEntries] = (0, import_react.useState)([]);
	const [isPending, startTransition] = (0, import_react.useTransition)();
	(0, import_react.useEffect)(() => {
		setItems(jobs);
		setSelectedId((current) => current && jobs.some((job) => job.id === current) ? current : jobs[0]?.id ?? "");
	}, [jobs]);
	(0, import_react.useEffect)(() => {
		if (!selectedId) return;
		setTimeline([]);
		const stream = new EventSource(`/api/job-events/${selectedId}`);
		stream.addEventListener("job", (event) => {
			const nextJob = JSON.parse(event.data);
			setItems((current) => current.map((job) => job.id === nextJob.id ? {
				...job,
				...nextJob
			} : job));
			setTimeline((current) => {
				const nextMessage = nextJob.message || nextJob.status;
				if (current[0]?.message === nextMessage) return current;
				return [{
					at: (/* @__PURE__ */ new Date()).toISOString(),
					message: nextMessage
				}, ...current].slice(0, 12);
			});
			if (nextJob.status === "succeeded" || nextJob.status === "failed" || nextJob.status === "canceled") stream.close();
		});
		stream.addEventListener("error", () => {
			stream.close();
		});
		return () => {
			stream.close();
		};
	}, [selectedId]);
	(0, import_react.useEffect)(() => {
		(async () => {
			try {
				const response = await fetch("/api/proxy/v1/jobs/dead-letter");
				if (!response.ok) return;
				const payload = await response.json();
				setDeadLetterEntries(payload);
			} catch {
				return;
			}
		})();
	}, []);
	const selectedJob = items.find((job) => job.id === selectedId) ?? items[0] ?? null;
	async function retryJob(jobId) {
		setRetryNote(null);
		setCancelNote(null);
		setError(null);
		try {
			const nextJob = await proxyPost(`/v1/jobs/${jobId}/retry`, "");
			setItems((current) => current.map((job) => job.id === jobId ? {
				...job,
				...nextJob
			} : job));
			setRetryNote("Retry queued.");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Unknown error");
		}
	}
	async function cancelJob(jobId) {
		setRetryNote(null);
		setCancelNote(null);
		setError(null);
		try {
			const nextJob = await proxyPost(`/v1/jobs/${jobId}/cancel`, "");
			setItems((current) => current.map((job) => job.id === jobId ? {
				...job,
				...nextJob
			} : job));
			setCancelNote("Job canceled.");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Unknown error");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "dashboard-split-panel",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
			className: "card dashboard-panel",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "dashboard-panel-head",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Job history" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "muted",
					children: "Workspace queue with lifecycle state, failure reason, retry entry point."
				})]
			}), items.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "muted",
				children: "No jobs yet."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "job-history-list",
				children: items.map((job) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: `job-history-item${job.id === selectedJob?.id ? " is-active" : ""}`,
					onClick: () => setSelectedId(job.id),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: job.kind.replace(/_/g, " ") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: job.message || "No worker message yet." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "job-history-meta",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: `job-status job-status-${statusTone(job.status)}`,
							children: job.status
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [Math.round((job.progress ?? 0) * 100), "%"] })]
					})]
				}, job.id))
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
			className: "card dashboard-panel",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "dashboard-panel-head",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Job detail" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "muted",
						children: "Full lifecycle view with stage rail and retry when work fails."
					})]
				}),
				error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "notice notice-bad",
					children: error
				}) : null,
				!selectedJob ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "muted",
					children: "Select job to inspect details."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "job-card",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "job-card-head",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "eyebrow",
								children: ["Job ", selectedJob.id.slice(0, 8)]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: selectedJob.kind.replace(/_/g, " ") })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `job-status job-status-${statusTone(selectedJob.status)}`,
								children: selectedJob.status
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "job-progress",
							"aria-label": "Job progress",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "job-progress-track",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "job-progress-fill",
									style: { width: `${Math.max(0, Math.min(1, selectedJob.progress ?? 0)) * 100}%` }
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "job-progress-meta",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [Math.round((selectedJob.progress ?? 0) * 100), "%"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: selectedJob.message || "Waiting for worker" })]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(JobStages, { job: selectedJob }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "detail-grid",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: "detail-card",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Video ID" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: selectedJob.video_id || "-" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: "detail-card",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Clip ID" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: selectedJob.clip_id || "-" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: "detail-card",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Queued" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: fmtDate(selectedJob.created_at) })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: "detail-card",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Updated" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: fmtDate(selectedJob.updated_at) })]
								})
							]
						}),
						timeline.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "dashboard-stack",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Worker timeline" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "job-history-list",
								children: timeline.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: "detail-card",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: entry.message }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: new Date(entry.at).toLocaleTimeString() })]
								}, `${entry.at}-${entry.message}`))
							})]
						}) : null,
						selectedJob.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "notice notice-bad",
							children: ["Failure reason: ", selectedJob.error]
						}) : null,
						selectedJob.status === "queued" || selectedJob.status === "running" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "button-secondary",
							type: "button",
							onClick: () => startTransition(() => cancelJob(selectedJob.id)),
							disabled: isPending || !permissions.canEdit,
							children: "Cancel job"
						}) : null,
						selectedJob.status === "failed" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "button",
							type: "button",
							onClick: () => startTransition(() => retryJob(selectedJob.id)),
							disabled: isPending || !permissions.canEdit,
							children: "Retry failed job"
						}) : null,
						cancelNote ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "notice notice-good",
							children: cancelNote
						}) : null,
						retryNote ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "notice notice-good",
							children: retryNote
						}) : null,
						deadLetterEntries.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "dashboard-stack",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Dead-letter queue" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "job-history-list",
								children: deadLetterEntries.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: "detail-card",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: entry.chunk_id }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
											fmt(entry.start_time),
											" - ",
											fmt(entry.end_time)
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "muted",
											children: entry.source_uri
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "muted",
											children: entry.error
										})
									]
								}, entry.id))
							})]
						}) : null
					]
				})
			]
		})]
	});
}
function LibraryPanel({ videos, jobs }) {
	const permissions = useWorkspacePermissions();
	const [query, setQuery] = (0, import_react.useState)("");
	const [items, setItems] = (0, import_react.useState)(videos);
	const [selectedId, setSelectedId] = (0, import_react.useState)(videos[0]?.id ?? "");
	const [statusFilter, setStatusFilter] = (0, import_react.useState)("all");
	const [savedClips, setSavedClips] = (0, import_react.useState)([]);
	const [editingClipId, setEditingClipId] = (0, import_react.useState)("");
	const [videoLabels, setVideoLabels] = (0, import_react.useState)({});
	const [labelDraft, setLabelDraft] = (0, import_react.useState)("");
	const [chunks, setChunks] = (0, import_react.useState)([]);
	const [chunksStatus, setChunksStatus] = (0, import_react.useState)({ state: "idle" });
	const [actionStatus, setActionStatus] = (0, import_react.useState)({ state: "idle" });
	(0, import_react.useEffect)(() => {
		setSavedClips(readSavedClips());
		setVideoLabels(readVideoLabels());
	}, []);
	(0, import_react.useEffect)(() => {
		setItems(videos);
	}, [videos]);
	const filteredVideos = (0, import_react.useMemo)(() => {
		return items.filter((video) => {
			if (statusFilter !== "all" && video.status !== statusFilter) return false;
			if (!query.trim()) return true;
			return `${video.filename} ${video.source_uri} ${video.id}`.toLowerCase().includes(query.trim().toLowerCase());
		});
	}, [
		items,
		query,
		statusFilter
	]);
	(0, import_react.useEffect)(() => {
		setSelectedId((current) => current && filteredVideos.some((video) => video.id === current) ? current : filteredVideos[0]?.id ?? "");
	}, [filteredVideos]);
	const selectedVideo = filteredVideos.find((video) => video.id === selectedId) ?? filteredVideos[0] ?? null;
	const latestJobByVideo = (0, import_react.useMemo)(() => {
		return new Map(jobs.map((job) => [job.video_id, job]));
	}, [jobs]);
	const clipsForSelectedVideo = savedClips.filter((clip) => clip.video_id === selectedVideo?.id);
	const labelsForSelectedVideo = selectedVideo ? videoLabels[selectedVideo.id] || [] : [];
	(0, import_react.useEffect)(() => {
		if (!selectedVideo) {
			setChunks([]);
			setChunksStatus({ state: "idle" });
			return;
		}
		let mounted = true;
		setChunksStatus({ state: "loading" });
		(async () => {
			try {
				const response = await fetch(`/api/proxy/v1/videos/${selectedVideo.id}/chunks`);
				if (!response.ok) throw new Error(`Chunk lookup failed (${response.status})`);
				const payload = await response.json();
				if (!mounted) return;
				setChunks(payload);
				setChunksStatus({
					state: "ok",
					message: payload.length ? `Loaded ${payload.length} chunks.` : "No chunks yet."
				});
			} catch (cause) {
				if (!mounted) return;
				setChunks([]);
				setChunksStatus({
					state: "error",
					message: cause instanceof Error ? cause.message : "Chunk lookup failed."
				});
			}
		})();
		return () => {
			mounted = false;
		};
	}, [selectedVideo]);
	function updateSavedClip(clipId, field, value) {
		setSavedClips((current) => {
			const next = current.map((clip) => clip.id === clipId ? {
				...clip,
				[field]: value
			} : clip);
			writeSavedClips(next);
			return next;
		});
	}
	function addLabel() {
		if (!selectedVideo || !labelDraft.trim()) return;
		const next = {
			...videoLabels,
			[selectedVideo.id]: [.../* @__PURE__ */ new Set([...videoLabels[selectedVideo.id] || [], labelDraft.trim()])]
		};
		setVideoLabels(next);
		writeVideoLabels(next);
		setLabelDraft("");
	}
	function removeLabel(label) {
		if (!selectedVideo) return;
		const next = {
			...videoLabels,
			[selectedVideo.id]: (videoLabels[selectedVideo.id] || []).filter((item) => item !== label)
		};
		setVideoLabels(next);
		writeVideoLabels(next);
	}
	async function runVideoAction(videoId, action) {
		setActionStatus({ state: "loading" });
		try {
			const response = await fetch(`/api/proxy/v1/videos/${videoId}${action === "delete" ? "" : `/${action}`}`, { method: action === "delete" ? "DELETE" : "POST" });
			if (!response.ok) throw new Error(`${action} failed (${response.status})`);
			if (action === "archive") {
				const nextVideo = await response.json();
				setItems((current) => current.map((video) => video.id === videoId ? nextVideo : video));
				setActionStatus({
					state: "ok",
					message: "Video archived."
				});
			}
			if (action === "reindex") {
				setItems((current) => current.map((video) => video.id === videoId ? {
					...video,
					status: "queued",
					error: null
				} : video));
				setActionStatus({
					state: "ok",
					message: "Reindex queued."
				});
			}
			if (action === "delete") {
				setItems((current) => current.filter((video) => video.id !== videoId));
				setSavedClips((current) => {
					const next = current.filter((clip) => clip.video_id !== videoId);
					writeSavedClips(next);
					return next;
				});
				setActionStatus({
					state: "ok",
					message: "Video deleted."
				});
			}
		} catch (cause) {
			setActionStatus({
				state: "error",
				message: cause instanceof Error ? cause.message : `${action} failed`
			});
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "dashboard-split-panel library-workbench",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
			className: "card dashboard-panel library-list-panel",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "dashboard-panel-head library-panel-head",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Video library" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "muted",
						children: "Browse workspace videos with status, duration, upload time, source type."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "pill",
						children: [filteredVideos.length, " videos"]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "library-toolbar",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: query,
						onChange: (event) => setQuery(event.target.value),
						placeholder: "Search library",
						"aria-label": "Search library"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						value: statusFilter,
						onChange: (event) => setStatusFilter(event.target.value),
						"aria-label": "Filter library by status",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "all",
								children: "All statuses"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "ready",
								children: "Ready"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "queued",
								children: "Queued"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "failed",
								children: "Failed"
							})
						]
					})]
				}),
				filteredVideos.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "empty-state",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "No videos yet" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "muted",
							children: "Upload first source from ingest. New workspace should not feel blank."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
							to: "/dashboard/ingest",
							className: "button",
							children: "Open ingest"
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "library-list",
					children: filteredVideos.map((video) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: `library-item${video.id === selectedVideo?.id ? " is-active" : ""}`,
						onClick: () => setSelectedId(video.id),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: video.filename }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
							sourceLabel(video.source_type),
							" • ",
							fmt(video.duration)
						] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "job-history-meta",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `job-status job-status-${statusTone(video.status)}`,
								children: video.status
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: fmtDate(video.created_at) })]
						})]
					}, video.id))
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
			className: "card dashboard-panel library-detail-panel",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "dashboard-panel-head library-panel-head",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Video detail" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "muted",
						children: "Source metadata, latest ingest state, searchable chunks, and transcript-ready answers."
					})] }), selectedVideo ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: `job-status job-status-${statusTone(selectedVideo.status)}`,
						children: selectedVideo.status
					}) : null]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusLine, { status: actionStatus }),
				!selectedVideo ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "muted",
					children: "Select video to inspect details."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "dashboard-stack library-detail-body",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "library-detail-hero",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "eyebrow",
									children: "Selected source"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: selectedVideo.filename }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "muted detail-wrap",
									children: selectedVideo.source_uri
								})
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "library-detail-stats",
								"aria-label": "Selected video summary",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [fmt(selectedVideo.duration), " duration"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [chunks.length, " chunks"] })]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "detail-grid",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: "detail-card",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Duration" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: fmt(selectedVideo.duration) })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: "detail-card",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Uploaded" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: fmtDate(selectedVideo.created_at) })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: "detail-card",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Source type" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: sourceLabel(selectedVideo.source_type) })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: "detail-card",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Chunks" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: chunks.length })]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "detail-card",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Source URI" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "detail-wrap",
								children: selectedVideo.source_uri
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "detail-card",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Labels" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: labelsForSelectedVideo.length > 0 ? labelsForSelectedVideo.join(", ") : "No labels yet" })]
						}),
						selectedVideo.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "notice notice-bad",
							children: ["Video error: ", selectedVideo.error]
						}) : null,
						latestJobByVideo.get(selectedVideo.id) ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "detail-card",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Latest job" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: latestJobByVideo.get(selectedVideo.id)?.message || latestJobByVideo.get(selectedVideo.id)?.kind })]
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "dashboard-panel-links",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "button-secondary",
									onClick: () => void runVideoAction(selectedVideo.id, "archive"),
									disabled: !permissions.canEdit,
									children: "Archive"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "button-secondary",
									onClick: () => void runVideoAction(selectedVideo.id, "reindex"),
									disabled: !permissions.canEdit,
									children: "Reindex"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "button-secondary",
									onClick: () => void runVideoAction(selectedVideo.id, "delete"),
									disabled: !permissions.canEdit,
									children: "Delete"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "dashboard-panel-links",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: labelDraft,
								onChange: (event) => setLabelDraft(event.target.value),
								placeholder: "Add label",
								"aria-label": "Add label"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "button-secondary",
								onClick: addLabel,
								disabled: !permissions.canEdit,
								children: "Add label"
							})]
						}),
						labelsForSelectedVideo.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "dashboard-panel-links",
							children: labelsForSelectedVideo.map((label) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "pill pill-button",
								onClick: () => removeLabel(label),
								disabled: !permissions.canEdit,
								children: label
							}, label))
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
							className: "chunk-browser-panel",
							open: true,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", {
									className: "chunk-browser-summary",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Chunk browser" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "muted",
										children: "Ordered searchable segments from this source video."
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "pill",
										children: [chunks.length, " chunks"]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusLine, { status: chunksStatus }),
								chunks.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "job-history-list chunk-browser-list",
									children: chunks.map((chunk) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
										className: "detail-card",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
												"Chunk ",
												fmt(chunk.start_time),
												" - ",
												fmt(chunk.end_time)
											] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [Math.max(0, chunk.end_time - chunk.start_time).toFixed(1), "s span"] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "muted",
												children: [
													chunk.embedding_backend,
													" • ",
													chunk.embedding_model
												]
											})
										]
									}, chunk.id))
								}) : chunksStatus.state === "ok" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "muted",
									children: "No indexed chunks yet for this video."
								}) : null
							]
						}),
						clipsForSelectedVideo.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "dashboard-stack",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Clips from this video" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "job-history-list",
								children: clipsForSelectedVideo.map((clip) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: "detail-card",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: editingClipId === clip.id ? "Editing clip metadata" : clip.name }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
											fmt(clip.start_time),
											" - ",
											fmt(clip.end_time)
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "muted",
											children: selectedVideo.source_uri
										}),
										editingClipId === clip.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "form",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													value: clip.name,
													onChange: (event) => updateSavedClip(clip.id, "name", event.target.value),
													"aria-label": "Clip name"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													value: clip.collection,
													onChange: (event) => updateSavedClip(clip.id, "collection", event.target.value),
													"aria-label": "Clip collection"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
													value: clip.notes,
													onChange: (event) => updateSavedClip(clip.id, "notes", event.target.value),
													"aria-label": "Clip notes"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													className: "button-secondary",
													onClick: () => setEditingClipId(""),
													children: "Done"
												})
											]
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "dashboard-panel-links",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												className: "button-secondary",
												onClick: () => setEditingClipId(clip.id),
												disabled: !permissions.canEdit,
												children: "Edit metadata"
											}), clip.url ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
												href: clip.url,
												className: "button-secondary",
												target: "_blank",
												rel: "noreferrer",
												children: "Open clip"
											}) : null]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "muted",
											children: ["Collection ", clip.collection]
										})
									]
								}, clip.id))
							})]
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "dashboard-panel-links",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
								to: `/jobs?job=${encodeURIComponent(latestJobByVideo.get(selectedVideo.id)?.id ?? "")}`,
								className: "button-secondary",
								children: "Open latest job"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
								to: "/search",
								className: "button-secondary",
								children: "Ask about this video"
							})]
						})
					]
				})
			]
		})]
	});
}
function WorkspacePanel({ activeWorkspace, stats }) {
	const permissions = useWorkspacePermissions(activeWorkspace);
	const [members, setMembers] = (0, import_react.useState)([]);
	const [invites, setInvites] = (0, import_react.useState)([]);
	const [email, setEmail] = (0, import_react.useState)("");
	const [role, setRole] = (0, import_react.useState)("editor");
	const [status, setStatus] = (0, import_react.useState)({ state: "idle" });
	const [activity, setActivity] = (0, import_react.useState)([]);
	const [roleOverrides, setRoleOverrides] = (0, import_react.useState)({});
	async function loadWorkspaceData() {
		try {
			const [membersResponse, invitesResponse, settingsResponse] = await Promise.all([
				fetch(`/api/auth/organization/list-members?organizationId=${encodeURIComponent(activeWorkspace)}`),
				fetch(`/api/auth/organization/list-invitations?organizationId=${encodeURIComponent(activeWorkspace)}`),
				fetch("/api/proxy/v1/settings")
			]);
			if (membersResponse.ok) {
				const payload = await membersResponse.json();
				setMembers(payload.members);
			}
			if (invitesResponse.ok) {
				const payload = await invitesResponse.json();
				setInvites(payload);
			}
			if (settingsResponse.ok) {
				const payload = await settingsResponse.json();
				setRoleOverrides(payload.settings || {});
			}
		} catch {
			return;
		}
		setActivity(readActivityLog().filter((entry) => entry.workspace === activeWorkspace));
	}
	(0, import_react.useEffect)(() => {
		loadWorkspaceData();
	}, [activeWorkspace]);
	async function inviteMember(e) {
		e.preventDefault();
		setStatus({ state: "loading" });
		try {
			const response = await fetch("/api/workspace/invite-member", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email,
					role,
					organizationId: activeWorkspace
				})
			});
			if (!response.ok) throw new Error(`Invite failed (${response.status})`);
			setEmail("");
			appendActivity(activeWorkspace, "workspace.invite_sent", `${email} as ${role}`);
			setStatus({
				state: "ok",
				message: "Invite sent."
			});
			await loadWorkspaceData();
		} catch (cause) {
			setStatus({
				state: "error",
				message: cause instanceof Error ? cause.message : "Invite failed"
			});
		}
	}
	async function updateRole(memberId, nextRole) {
		setStatus({ state: "loading" });
		try {
			const response = await fetch("/api/workspace/update-member-role", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					memberId,
					role: nextRole,
					organizationId: activeWorkspace,
					email: members.find((member) => member.id === memberId)?.user?.email
				})
			});
			if (!response.ok) throw new Error(`Role update failed (${response.status})`);
			appendActivity(activeWorkspace, "workspace.role_updated", `${memberId} -> ${nextRole}`);
			setStatus({
				state: "ok",
				message: "Member role updated."
			});
			await loadWorkspaceData();
		} catch (cause) {
			setStatus({
				state: "error",
				message: cause instanceof Error ? cause.message : "Role update failed"
			});
		}
	}
	async function cancelInvite(invitationId) {
		setStatus({ state: "loading" });
		try {
			const response = await fetch("/api/workspace/cancel-invitation", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					invitationId,
					organizationId: activeWorkspace,
					email: invites.find((invite) => invite.id === invitationId)?.email
				})
			});
			if (!response.ok) throw new Error(`Cancel failed (${response.status})`);
			appendActivity(activeWorkspace, "workspace.invite_canceled", invitationId);
			setStatus({
				state: "ok",
				message: "Invite canceled."
			});
			await loadWorkspaceData();
		} catch (cause) {
			setStatus({
				state: "error",
				message: cause instanceof Error ? cause.message : "Cancel failed"
			});
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "card dashboard-panel workspace-management-panel",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "dashboard-panel-head workspace-management-head",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Workspace" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "muted",
					children: "Switch org, invite users, review members, manage pending invites."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "form workspace-switch-card",
				action: "/api/workspace/select",
				method: "post",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "field",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						htmlFor: "workspace",
						children: "Workspace ID"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						id: "workspace",
						name: "workspace",
						defaultValue: activeWorkspace,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "default-workspace",
								children: "Default workspace"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "northwind",
								children: "Northwind"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "contoso",
								children: "Contoso"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "acme",
								children: "Acme"
							})
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "button-secondary",
					type: "submit",
					children: "Switch workspace"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "detail-grid workspace-stat-grid",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "detail-card",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Workspace videos" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: stats.total_videos })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "detail-card",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Searchable chunks" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: stats.total_chunks })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "detail-card",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Storage used" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: fmtBytes(stats.total_storage_bytes) })]
					})
				]
			}),
			!permissions.canManageWorkspace ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "muted",
				children: [
					"Current role: ",
					permissions.role,
					". Only owners and admins can manage invites and workspace roles."
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "form workspace-invite-card",
				onSubmit: inviteMember,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							htmlFor: "invite_email",
							children: "Invite by email"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "invite_email",
							value: email,
							onChange: (event) => setEmail(event.target.value),
							placeholder: "teammate@example.com"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							htmlFor: "invite_role",
							children: "Role"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							id: "invite_role",
							value: role,
							onChange: (event) => setRole(event.target.value),
							disabled: !permissions.canManageWorkspace,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "editor",
									children: "Editor"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "viewer",
									children: "Viewer"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "admin",
									children: "Admin"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "owner",
									children: "Owner"
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "button",
						type: "submit",
						disabled: !permissions.canManageWorkspace,
						children: "Send invite"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusLine, { status })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "dashboard-stack workspace-members-card",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "dashboard-panel-head",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Members" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "muted",
						children: "Update roles for current workspace members."
					})]
				}), members.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "muted",
					children: "No member data loaded."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "job-history-list",
					children: members.map((member) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "detail-card",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: member.user?.email || member.userId }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: member.user?.name || "Workspace member" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "dashboard-panel-links",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									value: roleOverrides.workspace_roles?.[member.user?.email || ""] || (member.role === "member" ? "editor" : member.role),
									onChange: (event) => updateRole(member.id, event.target.value),
									disabled: !permissions.canManageWorkspace,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "editor",
											children: "Editor"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "viewer",
											children: "Viewer"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "admin",
											children: "Admin"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "owner",
											children: "Owner"
										})
									]
								})
							})
						]
					}, member.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "dashboard-stack workspace-invites-card",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "dashboard-panel-head",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Pending invites" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "muted",
						children: "Track invitations that still need acceptance."
					})]
				}), invites.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "muted",
					children: "No pending invites."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "job-history-list",
					children: invites.map((invite) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "detail-card",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: invite.email }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: roleOverrides.invite_roles?.[invite.email] || invite.role }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "muted",
								children: [
									"Status ",
									invite.status,
									" • Expires ",
									fmtDate(invite.expiresAt)
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "dashboard-panel-links",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "button-secondary",
									onClick: () => cancelInvite(invite.id),
									disabled: !permissions.canManageWorkspace,
									children: "Cancel invite"
								})
							})
						]
					}, invite.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "dashboard-stack workspace-activity-card",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "dashboard-panel-head",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Workspace activity" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "muted",
						children: "Recent product actions in this workspace."
					})]
				}), activity.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "muted",
					children: "No activity logged yet."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "job-history-list",
					children: activity.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "detail-card",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: entry.action }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: entry.detail }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "muted",
								children: fmtDate(entry.created_at)
							})
						]
					}, entry.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "dashboard-panel-links workspace-actions",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
					to: "/dashboard/library",
					className: "button-secondary",
					children: "Open library"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
					to: "/settings",
					className: "button-secondary",
					children: "Open settings"
				})]
			})
		]
	});
}
//#endregion
export { OverviewPanel as a, LibraryPanel as i, IngestPanel as n, WorkspacePanel as o, JobsPanel as r, DashboardShell as t };
