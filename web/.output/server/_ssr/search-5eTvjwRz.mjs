import { i as __toESM } from "../_runtime.mjs";
import { B as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { s as Route$12 } from "./router-CLpWapA1.mjs";
import { t as AppTopbar } from "./app-topbar-BBHj5u71.mjs";
import { t as appendActivity } from "./activity-log-t8Fhfxx7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/search-5eTvjwRz.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var RECENT_SEARCHES_KEY = "vivadeo.recent-searches";
function fmt(s) {
	return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}
function SearchContent({ profileInitial }) {
	const [activeWorkspace, setActiveWorkspace] = (0, import_react.useState)("default-workspace");
	const [question, setQuestion] = (0, import_react.useState)("");
	const [turns, setTurns] = (0, import_react.useState)([]);
	const [recentSearches, setRecentSearches] = (0, import_react.useState)([]);
	const [status, setStatus] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [startedAt, setStartedAt] = (0, import_react.useState)(null);
	const [elapsedSeconds, setElapsedSeconds] = (0, import_react.useState)(0);
	const [expandedCitations, setExpandedCitations] = (0, import_react.useState)({});
	(0, import_react.useEffect)(() => {
		const workspace = document.cookie.split("; ").find((item) => item.startsWith("vivadeo_workspace="))?.split("=")[1];
		if (workspace) setActiveWorkspace(decodeURIComponent(workspace));
	}, []);
	(0, import_react.useEffect)(() => {
		try {
			const recent = window.localStorage.getItem(RECENT_SEARCHES_KEY);
			if (recent) setRecentSearches(JSON.parse(recent));
		} catch {
			return;
		}
	}, []);
	(0, import_react.useEffect)(() => {
		window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
	}, [recentSearches]);
	(0, import_react.useEffect)(() => {
		if (!loading || startedAt === null) return;
		const timer = window.setInterval(() => {
			setElapsedSeconds(Math.max(0, Math.round((Date.now() - startedAt) / 1e3)));
		}, 1e3);
		return () => window.clearInterval(timer);
	}, [loading, startedAt]);
	function recordRecentSearch(value) {
		const next = value.trim();
		if (!next) return;
		setRecentSearches((current) => [next, ...current.filter((item) => item !== next)].slice(0, 6));
	}
	async function submit(event) {
		event.preventDefault();
		const nextQuestion = question.trim();
		if (!nextQuestion || loading) return;
		const nextTurns = [...turns, {
			role: "user",
			content: nextQuestion
		}];
		setTurns(nextTurns);
		setQuestion("");
		const requestStartedAt = Date.now();
		setLoading(true);
		setStartedAt(requestStartedAt);
		setElapsedSeconds(0);
		setStatus("Finding evidence, then preparing an answer...");
		try {
			const response = await fetch("/api/proxy/v1/search/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: nextTurns.map(({ role, content }) => ({
						role,
						content
					})),
					results: 6
				})
			});
			if (!response.ok) {
				setStatus(`Chat failed (${response.status})`);
				return;
			}
			const payload = await response.json();
			const seconds = Math.max(1, Math.round((Date.now() - requestStartedAt) / 1e3));
			setTurns((current) => [...current, {
				role: "assistant",
				content: payload.answer,
				citations: payload.citations
			}]);
			recordRecentSearch(nextQuestion);
			appendActivity(activeWorkspace, "search.performed", nextQuestion);
			setStatus(payload.citations.length ? `Answer ready in ${seconds}s with ${payload.citations.length} cited evidence range(s).` : `Answer ready in ${seconds}s. No cited evidence yet.`);
		} catch (cause) {
			setStatus(cause instanceof Error ? cause.message : "Chat failed");
		} finally {
			setLoading(false);
			setStartedAt(null);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "shell page",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppTopbar, { profileInitial }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "search-shell fade-in",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "search-filters surface-section",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Ask Vivadeo" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "muted",
						children: "Transcript-grounded answers from workspace videos. Clip evidence arrives later."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							htmlFor: "workspace-filter",
							children: "Workspace"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "workspace-filter",
							value: activeWorkspace,
							readOnly: true
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "detail-card",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Answer source" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Video transcripts" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "detail-card",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Answer engine" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Vivadeo archive assistant" })]
					}),
					recentSearches.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "search-chip-group",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "search-chip-label",
							children: "Recent questions"
						}), recentSearches.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "pill pill-button",
							onClick: () => setQuestion(item),
							children: item
						}, item))]
					}) : null
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "search-main",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "surface-section search-query",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "form",
						onSubmit: submit,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								htmlFor: "query",
								children: "Ask about your videos"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "query",
								value: question,
								onChange: (event) => setQuestion(event.target.value),
								placeholder: "What did the speaker say about the launch timeline?",
								disabled: loading
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "dashboard-panel-links",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "button",
								type: "submit",
								disabled: loading,
								children: loading ? "Asking..." : "Ask"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "button-secondary",
								type: "button",
								onClick: () => setTurns([]),
								disabled: loading || turns.length === 0,
								children: "Clear chat"
							})]
						})]
					}), status ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "search-status",
						"aria-live": "polite",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: status }), loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [elapsedSeconds, "s elapsed"] }) : null]
					}) : null]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "search-layout",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
						className: "search-feed",
						children: turns.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "search-result",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "No questions yet" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "muted",
								children: "Ask a text question. Vivadeo finds relevant transcript evidence, then returns a cited answer."
							})]
						}) : turns.map((turn, index) => {
							const citations = turn.citations ?? [];
							const citationKey = `${turn.role}-${index}`;
							const showAll = expandedCitations[citationKey] ?? false;
							const visibleCitations = showAll ? citations : citations.slice(0, 3);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								className: `search-result ${turn.role === "assistant" ? "search-result-answer" : ""}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "search-top",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "search-meta",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "pill",
											children: turn.role === "user" ? "You" : "Vivadeo"
										}), turn.role === "assistant" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "search-answer-text",
											children: turn.content
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: turn.content })]
									})
								}), citations.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "search-citations",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "search-citation-head",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Evidence ranges" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [citations.length, " cited"] })]
										}),
										visibleCitations.map((citation) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
											className: "detail-card search-citation-card",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
													citation.filename,
													" • ",
													fmt(citation.start_time),
													" - ",
													fmt(citation.end_time)
												] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
													className: "detail-wrap",
													children: citation.text
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "muted",
													children: citation.source_uri
												})
											]
										}, citation.segment_id)),
										citations.length > 3 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											className: "button-secondary search-citation-toggle",
											type: "button",
											onClick: () => setExpandedCitations((current) => ({
												...current,
												[citationKey]: !showAll
											})),
											children: showAll ? "Show fewer ranges" : `Show ${citations.length - 3} more ranges`
										}) : null
									]
								}) : null]
							}, citationKey);
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
						className: "surface-section search-preview",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "dashboard-panel-head",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Evidence mode" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "muted",
								children: "Answers cite exact transcript ranges. Video clip extraction is intentionally disabled for this phase."
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "dashboard-stack",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								className: "detail-card",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Current phase" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Text questions only" })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								className: "detail-card",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Next phase" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Clip-backed answers from cited ranges" })]
							})]
						})]
					})]
				})]
			})]
		})]
	});
}
function SearchPage() {
	const session = Route$12.useLoaderData();
	const profileInitial = (session?.user?.name || session?.user?.email || "V").trim().slice(0, 1).toUpperCase();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
		fallback: null,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchContent, { profileInitial })
	});
}
var SplitComponent = SearchPage;
//#endregion
export { SplitComponent as component };
