import { b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as Route$16 } from "./router-CLpWapA1.mjs";
import { t as Link$1 } from "./link-CvysoLTw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DI39UUz-.js
var import_jsx_runtime = require_jsx_runtime();
var services = [
	{
		title: "Search",
		body: "Ask about footage and get transcript-grounded answers with timestamp citations.",
		meta: "Cited answers"
	},
	{
		title: "Ingest",
		body: "Upload files or queue URLs, then watch every indexing stage move toward ready.",
		meta: "Live pipeline"
	},
	{
		title: "Clip review",
		body: "Use cited moments as the starting point for faster editorial review.",
		meta: "Evidence first"
	},
	{
		title: "Workspaces",
		body: "Keep teams, jobs, libraries, and permissions isolated by organization.",
		meta: "Role aware"
	},
	{
		title: "Automation",
		body: "Background processing keeps heavier video tasks off the front end.",
		meta: "Async jobs"
	},
	{
		title: "Admin",
		body: "Invite users, switch workspaces, and review operational settings.",
		meta: "Controlled ops"
	}
];
function HomePage() {
	const session = Route$16.useLoaderData();
	const signedIn = Boolean(session?.user);
	const profileInitial = (session?.user?.name || session?.user?.email || "V").trim().slice(0, 1).toUpperCase();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "shell page",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
				className: "topbar",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "topbar-shell",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
							to: "/",
							className: "brand",
							children: "Vivadeo"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "nav-center",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
									to: "/",
									className: "nav-link",
									children: "Home"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
									to: "#about",
									className: "nav-link",
									children: "About"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
									to: "#features",
									className: "nav-link",
									children: "Services"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
									to: "#contact",
									className: "nav-link",
									children: "Contact"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nav-spacer" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "nav-actions",
							children: signedIn ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
									to: "/dashboard",
									className: "button-secondary",
									children: "Console"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
									to: "/settings",
									className: "nav-user",
									"aria-label": "Profile",
									children: profileInitial
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", {
									action: "/api/auth/sign-out",
									method: "post",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "nav-logout",
										type: "submit",
										children: "Log out"
									})
								})
							] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
								to: "/sign-in",
								className: "button-secondary",
								children: "Sign in"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
								to: "/sign-up",
								className: "button",
								children: "Sign Up"
							})] })
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "hero hero-home fade-in",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "hero-copy",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "eyebrow",
							children: "Transcript-grounded video search"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Search footage with clarity and keep review in one place." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "hero-lead",
							children: "Vivadeo gives teams a clear place to search footage, review cited moments, and keep archive work moving."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "hero-actions",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
								to: signedIn ? "/dashboard" : "/sign-up",
								className: "button",
								children: "Open console"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
								to: "#features",
								className: "button-secondary",
								children: "See services"
							})]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "hero-product-demo",
					"aria-label": "Vivadeo workflow preview",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "demo-toolbar",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "demo-live-dot" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Archive search" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Workspace ready" })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "demo-question",
							children: "What did the team decide about launch timing?"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "demo-answer",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "demo-citation demo-citation-one",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "00:42-01:08" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Launch shifts after final accessibility pass." })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "demo-citation demo-citation-two",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "03:14-03:38" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Archive owner confirms review window." })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "demo-pipeline",
							"aria-label": "Ingest pipeline stages",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Upload" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Chunk" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Embed" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Ready" })
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "service-band",
				id: "features",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "section-heading",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "eyebrow eyebrow-dark",
							children: "Efficient and integrated video services"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Everything the archive needs, in one system." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Search, ingest, clip, and administer without fragmenting the workflow." })
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "service-grid",
					children: services.map((service) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "service-card",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: service.meta }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: service.title }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: service.body })
						]
					}, service.title))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "benefits-band",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "benefits-visual workflow-preview",
					"aria-label": "Indexing workflow preview",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "workflow-card workflow-card-active",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "01" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Upload source" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Drop a video or queue a permitted URL." })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "workflow-card",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "02" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Index transcript" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Chunks, embeddings, and job status stay visible." })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "workflow-card",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "03" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Ask and cite" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Answers point back to the exact footage range." })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "workflow-rail",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "benefits-copy",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "eyebrow",
							children: "Key benefits"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Search, clip, and manage footage with less friction." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Accurate retrieval" }), " Text and image search share one embedding path."] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Faster review" }), " Inline clip preview keeps context on screen."] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Cleaner ops" }), " Workspace controls stay visible and scannable."] })
						] })
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "pricing-band",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "section-heading section-heading-dark",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "eyebrow eyebrow-dark",
								children: "Tailored plans"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Pricing for one workspace or many." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Pick a shape that fits your team, then scale without changing workflows." })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "pricing-grid",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "pricing-card",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Studio" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "For small teams getting started with searchable archives." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Launch" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Simple onboarding and a focused workspace." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
									to: signedIn ? "/dashboard" : "/sign-up",
									className: "button-secondary pricing-cta",
									children: "Get started"
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "pricing-card",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Archive" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "For larger teams that need multiple workspaces and tighter controls." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Custom" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Audit, admin, and rollout support." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
									to: signedIn ? "/dashboard" : "/sign-up",
									className: "button-secondary pricing-cta",
									children: "Talk to sales"
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "pricing-pro",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Professional" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Designed for flexibility, with advanced tools for custom tailoring." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
								to: signedIn ? "/dashboard" : "/sign-in",
								className: "button pricing-cta",
								children: "Open console"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "integration-band",
				id: "contact",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Empowering teams with seamless integrations." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Vivadeo keeps search, review, and workspace context synchronized." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
						to: signedIn ? "/dashboard" : "/sign-up",
						className: "button-secondary",
						children: "Work with us"
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "integration-orbit",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "API" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Storage" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Review" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Auth" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Jobs" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Media" })
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "cta-band",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "From idea to production in days." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Ship searchable video workflows without rebuilding the stack around them." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
						to: signedIn ? "/dashboard" : "/sign-up",
						className: "button",
						children: "Start free"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
				className: "footer",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link$1, {
						to: "/",
						className: "brand",
						children: "Vivadeo"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Video search and clip review for workspace teams." })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { children: "Company" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "#about",
							children: "About us"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "#about",
							children: "Customers"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "#features",
							children: "Newsroom"
						})
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { children: "Products" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "/dashboard",
							children: "Search"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "/dashboard",
							children: "Clips"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "/dashboard",
							children: "Admin"
						})
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { children: "Get in touch" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "mailto:hello@vivadeo.example",
						children: "hello@vivadeo.example"
					})] })
				]
			})
		]
	});
}
var SplitComponent = HomePage;
//#endregion
export { SplitComponent as component };
