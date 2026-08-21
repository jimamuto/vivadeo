import { i as __toESM } from "../_runtime.mjs";
import { B as require_react, b as require_jsx_runtime, d as useLocation } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as AppTopbar } from "./app-topbar-BBHj5u71.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/jobs-89CHUQsG.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var INGEST_STAGES = [
	"queued",
	"uploading",
	"chunking",
	"embedding",
	"indexing",
	"ready",
	"failed"
];
function resolveStage(job) {
	const message = (job.message ?? "").toLowerCase();
	if (job.status === "failed" || job.status === "canceled") return "failed";
	if (job.status === "succeeded") return "ready";
	if (message.includes("upload")) return "uploading";
	if (message.includes("chunk")) return "chunking";
	if (message.includes("embed")) return "embedding";
	if (message.includes("index")) return "indexing";
	if ((job.progress ?? 0) >= .8) return "indexing";
	if ((job.progress ?? 0) >= .6) return "embedding";
	if ((job.progress ?? 0) >= .35) return "chunking";
	if ((job.progress ?? 0) > 0) return "uploading";
	return "queued";
}
function JobStages({ job }) {
	const activeStage = resolveStage(job);
	const activeIndex = INGEST_STAGES.indexOf(activeStage);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "job-stage-list",
		"aria-label": "Job stages",
		children: INGEST_STAGES.map((stage, index) => {
			const state = stage === "failed" ? job.status === "failed" ? "failed" : "pending" : index < activeIndex ? "done" : index === activeIndex ? "active" : "pending";
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `job-stage job-stage-${state}`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: stage })
			}, stage);
		})
	});
}
function JobsContent() {
	const location = useLocation();
	const searchParams = new URLSearchParams(location.searchStr);
	const [jobId, setJobId] = (0, import_react.useState)(searchParams.get("job") ?? "");
	const [job, setJob] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const [retryNote, setRetryNote] = (0, import_react.useState)(null);
	const [cancelNote, setCancelNote] = (0, import_react.useState)(null);
	const [timeline, setTimeline] = (0, import_react.useState)([]);
	const [isPending, startTransition] = (0, import_react.useTransition)();
	(0, import_react.useEffect)(() => {
		setJobId(searchParams.get("job") ?? "");
	}, [searchParams]);
	(0, import_react.useEffect)(() => {
		if (!jobId) return;
		let mounted = true;
		setTimeline([]);
		const stream = new EventSource(`/api/job-events/${jobId}`);
		stream.addEventListener("job", (event) => {
			if (!mounted) return;
			const nextJob = JSON.parse(event.data);
			setJob(nextJob);
			setError(null);
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
			if (mounted) setError("Live update stream failed.");
			stream.close();
		});
		return () => {
			mounted = false;
			stream.close();
		};
	}, [jobId]);
	async function retryJob() {
		if (!jobId) return;
		setRetryNote(null);
		setError(null);
		try {
			const response = await fetch(`/api/proxy/v1/jobs/${jobId}/retry`, { method: "POST" });
			if (!response.ok) throw new Error(`Retry failed (${response.status})`);
			const nextJob = await response.json();
			setJob(nextJob);
			setRetryNote("Retry queued.");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Unknown error");
		}
	}
	async function cancelJob() {
		if (!jobId) return;
		setCancelNote(null);
		setError(null);
		try {
			const response = await fetch(`/api/proxy/v1/jobs/${jobId}/cancel`, { method: "POST" });
			if (!response.ok) throw new Error(`Cancel failed (${response.status})`);
			const nextJob = await response.json();
			setJob(nextJob);
			setCancelNote("Job canceled.");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Unknown error");
		}
	}
	const progress = job ? Math.max(0, Math.min(1, job.progress ?? 0)) : 0;
	const activeStage = job ? resolveStage(job) : "queued";
	const statusTone = job?.status === "succeeded" ? "good" : job?.status === "failed" || job?.status === "canceled" ? "bad" : job?.status === "running" ? "live" : "idle";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "shell page",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppTopbar, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card fade-in",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "dashboard-panel-head",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Ingest progress" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "muted",
						children: "Paste job ID or arrive here after upload. This page tracks queued, uploading, chunking, embedding, indexing, ready, and failed states."
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "form",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							htmlFor: "jobId",
							children: "Job ID"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "jobId",
							value: jobId,
							onChange: (event) => setJobId(event.target.value),
							placeholder: "job_123"
						})]
					})
				}),
				error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					style: { color: "var(--danger)" },
					children: error
				}) : null,
				job ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "job-card",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "job-card-head",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "eyebrow",
								children: "Live job"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: job.kind.replace(/_/g, " ") })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `job-status job-status-${statusTone}`,
								children: job.status
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "job-progress",
							"aria-label": "Job progress",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "job-progress-track",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "job-progress-fill",
									style: { width: `${progress * 100}%` }
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "job-progress-meta",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [Math.round(progress * 100), "%"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: job.message || "Waiting for worker" })]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(JobStages, { job }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "muted",
							children: ["Current stage: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: activeStage })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "muted",
							children: job.message || "No job message yet."
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
						job.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							style: { color: "var(--danger)" },
							children: job.error
						}) : null,
						job.status === "succeeded" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "job-finish",
							children: "Ready. Ingest finished and source should now appear in library and search."
						}) : null,
						job.status === "failed" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "job-finish",
							children: "Failed. Check error above, then retry if source is still valid."
						}) : null,
						job.status === "canceled" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "job-finish",
							children: "Canceled. Work should stop at the next safe checkpoint."
						}) : null,
						job.status !== "succeeded" && job.status !== "failed" && job.status !== "canceled" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "job-finish",
							children: "Still processing. Keep this page open or check dashboard jobs later."
						}) : null,
						job.status === "queued" || job.status === "running" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "button-secondary",
							type: "button",
							onClick: () => startTransition(cancelJob),
							disabled: isPending,
							style: { marginTop: 14 },
							children: "Cancel job"
						}) : null,
						job.status === "failed" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "button",
							type: "button",
							onClick: () => startTransition(retryJob),
							disabled: isPending,
							style: { marginTop: 14 },
							children: "Retry failed job"
						}) : null,
						cancelNote ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "notice notice-good",
							style: { marginTop: 12 },
							children: cancelNote
						}) : null,
						retryNote ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "notice notice-good",
							style: { marginTop: 12 },
							children: retryNote
						}) : null
					]
				}) : null
			]
		})]
	});
}
function JobsPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
		fallback: null,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JobsContent, {})
	});
}
var SplitComponent = JobsPage;
//#endregion
export { SplitComponent as component };
