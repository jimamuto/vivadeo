globalThis.__nitro_main__ = import.meta.url;
import { a as toEventHandler, c as serve, i as defineLazyEventHandler, n as HTTPError, r as defineHandler, s as NodeResponse, t as H3Core } from "./_libs/h3+rou3+srvx.mjs";
import { i as withoutTrailingSlash, n as joinURL, r as withLeadingSlash, t as decodePath } from "./_libs/ufo.mjs";
import { promises } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
//#region node_modules/nitro/dist/runtime/internal/route-rules.mjs
var headers = ((m) => function headersRouteRule(event) {
	for (const [key, value] of Object.entries(m.options || {})) event.res.headers.set(key, value);
});
//#endregion
//#region #nitro/virtual/public-assets-data
var public_assets_data_default = {
	"/assets/activity-log-BoPnInhd.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1bf-A5s26Ena/8WH5kk/VPK9mQ9taJc\"",
		"mtime": "2026-08-21T10:14:11.366Z",
		"size": 447,
		"path": "../public/assets/activity-log-BoPnInhd.js"
	},
	"/assets/app-topbar-C8wzHRHE.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"466-hMT7F4J/HlELtdp/tVZ064ZqKaA\"",
		"mtime": "2026-08-21T10:14:11.368Z",
		"size": 1126,
		"path": "../public/assets/app-topbar-C8wzHRHE.js"
	},
	"/assets/dashboard-CVc3Iomz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1c6-JIhRuIM/l2YEkWeE1nGCob2v1QE\"",
		"mtime": "2026-08-21T10:14:11.373Z",
		"size": 454,
		"path": "../public/assets/dashboard-CVc3Iomz.js"
	},
	"/assets/dashboard-data-1RQ8yhmW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2f1-d75MLEAx4rWhbtyWYM6s2DSTeMk\"",
		"mtime": "2026-08-21T10:14:11.375Z",
		"size": 753,
		"path": "../public/assets/dashboard-data-1RQ8yhmW.js"
	},
	"/assets/clip-studio-DVFTLXFy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b8-CbtS8Dy6oVdUS2JneS9wz9PyTQg\"",
		"mtime": "2026-08-21T10:14:11.371Z",
		"size": 184,
		"path": "../public/assets/clip-studio-DVFTLXFy.js"
	},
	"/assets/dashboard-ui-CqddsJ4T.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8f0b-wJy5jrz5OsL7lbesHj1Z7KO5Zng\"",
		"mtime": "2026-08-21T10:14:11.380Z",
		"size": 36619,
		"path": "../public/assets/dashboard-ui-CqddsJ4T.js"
	},
	"/assets/forgot-password-DnGvgLHN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3d5-Fx/3ijT3mvHpMRZMdNR/vWjQ93U\"",
		"mtime": "2026-08-21T10:14:11.495Z",
		"size": 981,
		"path": "../public/assets/forgot-password-DnGvgLHN.js"
	},
	"/assets/ingest-BuB5m_pB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2c3-mAeNjMAT4Ccaw1C2Ce0ILUwt09U\"",
		"mtime": "2026-08-21T10:14:11.501Z",
		"size": 707,
		"path": "../public/assets/ingest-BuB5m_pB.js"
	},
	"/assets/lazyRouteComponent-Cc7Ki8_s.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1106-4y1tknRcKErDziZm+JiIW9O1rvM\"",
		"mtime": "2026-08-21T10:14:11.519Z",
		"size": 4358,
		"path": "../public/assets/lazyRouteComponent-Cc7Ki8_s.js"
	},
	"/assets/globals-Dmt_4LAx.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"97d1-lpVhVfi9+OFOcckTgcb8su9Ei0Q\"",
		"mtime": "2026-08-21T10:14:11.793Z",
		"size": 38865,
		"path": "../public/assets/globals-Dmt_4LAx.css"
	},
	"/assets/jobs-BqtDOQxX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"300-a0s9+jMw68YwYc3aNk9zPoE7yjo\"",
		"mtime": "2026-08-21T10:14:11.508Z",
		"size": 768,
		"path": "../public/assets/jobs-BqtDOQxX.js"
	},
	"/assets/jobs-HWhFyKVO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"16df-aylFc0sm7ZrO1r5FGnP5edPP9nA\"",
		"mtime": "2026-08-21T10:14:11.512Z",
		"size": 5855,
		"path": "../public/assets/jobs-HWhFyKVO.js"
	},
	"/assets/link-0QEymdqu.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ad-72pwk6LqjJ2OOMPuA/6l1nHbv9A\"",
		"mtime": "2026-08-21T10:14:11.528Z",
		"size": 173,
		"path": "../public/assets/link-0QEymdqu.js"
	},
	"/assets/library-14FS0VL7.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"323-GrcXb5Y/UDVhgUxWPq+lgyxIs7Y\"",
		"mtime": "2026-08-21T10:14:11.525Z",
		"size": 803,
		"path": "../public/assets/library-14FS0VL7.js"
	},
	"/assets/reset-password-BQVpTKee.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5e9-LHDC4DXh4nM+0XcD4W8daJzCLNg\"",
		"mtime": "2026-08-21T10:14:11.603Z",
		"size": 1513,
		"path": "../public/assets/reset-password-BQVpTKee.js"
	},
	"/assets/link-CrloB_O7.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5277-OWoNqyZfqUpdZz9uwWtRecHzUZY\"",
		"mtime": "2026-08-21T10:14:11.531Z",
		"size": 21111,
		"path": "../public/assets/link-CrloB_O7.js"
	},
	"/assets/routes-B1iLMzP4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"250c-fEfrZcgqHuP4bh4QJMfg9O8B/pU\"",
		"mtime": "2026-08-21T10:14:11.606Z",
		"size": 9484,
		"path": "../public/assets/routes-B1iLMzP4.js"
	},
	"/assets/search-DzKjzzCT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a0f-y1crBAymEqER60eSAXzgNj+sG6w\"",
		"mtime": "2026-08-21T10:14:11.615Z",
		"size": 6671,
		"path": "../public/assets/search-DzKjzzCT.js"
	},
	"/assets/settings-Bwi4Oa6C.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2038-VTqvjdZkYNNb6d5FWIOJDcciMe0\"",
		"mtime": "2026-08-21T10:14:11.683Z",
		"size": 8248,
		"path": "../public/assets/settings-Bwi4Oa6C.js"
	},
	"/assets/index-BKROCiOW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3cdad-e94SksEHmNuwZN0ybmtiZ0hfEyc\"",
		"mtime": "2026-08-21T10:14:10.998Z",
		"size": 249261,
		"path": "../public/assets/index-BKROCiOW.js"
	},
	"/assets/sign-up-CfCC2X0Y.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a1f-qtkjmnJSJybhH982PUWBEi9Z3YQ\"",
		"mtime": "2026-08-21T10:14:11.710Z",
		"size": 2591,
		"path": "../public/assets/sign-up-CfCC2X0Y.js"
	},
	"/assets/server-functions-LqOw3W_c.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"95c0-J4vhX/LB9XKoSvJLTZhOJdPh2tY\"",
		"mtime": "2026-08-21T10:14:11.637Z",
		"size": 38336,
		"path": "../public/assets/server-functions-LqOw3W_c.js"
	},
	"/assets/sign-in-GeqByq0Y.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"bd5-DDH//+trfWwaae6ckTJz5cK3+lI\"",
		"mtime": "2026-08-21T10:14:11.702Z",
		"size": 3029,
		"path": "../public/assets/sign-in-GeqByq0Y.js"
	},
	"/assets/useMatch-BZkFz_K3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"217-1enZcrJzeL6p5Q3llgP+OD3Znr4\"",
		"mtime": "2026-08-21T10:14:11.741Z",
		"size": 535,
		"path": "../public/assets/useMatch-BZkFz_K3.js"
	},
	"/assets/useLocation-BLLqp0Ie.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c3-kRRA6HwMs8VNZFKKSd4HSDm5Yas\"",
		"mtime": "2026-08-21T10:14:11.732Z",
		"size": 195,
		"path": "../public/assets/useLocation-BLLqp0Ie.js"
	},
	"/assets/useNavigate-BWwW3vwR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"139-iOIKujgW5NHGbg/2OkLLivKSDwM\"",
		"mtime": "2026-08-21T10:14:11.752Z",
		"size": 313,
		"path": "../public/assets/useNavigate-BWwW3vwR.js"
	},
	"/assets/useRouter-C_K-nOkZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"22c5-lo9JcWA6NWOc3P3ab15TGHWTOwU\"",
		"mtime": "2026-08-21T10:14:11.756Z",
		"size": 8901,
		"path": "../public/assets/useRouter-C_K-nOkZ.js"
	},
	"/assets/verify-email-BWYwRlw2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"86e-/uQt2l82IBrMIOCGqqGRPrFWQqk\"",
		"mtime": "2026-08-21T10:14:11.770Z",
		"size": 2158,
		"path": "../public/assets/verify-email-BWYwRlw2.js"
	},
	"/assets/workspace-B6cAkiM8.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"49c-cKl06ZdlAU3LljxP6yoZhqa8UfU\"",
		"mtime": "2026-08-21T10:14:11.782Z",
		"size": 1180,
		"path": "../public/assets/workspace-B6cAkiM8.js"
	},
	"/assets/_token-rAjsK8Ox.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"566-/sE+Buzms/NNRrRmlkCluWURgfE\"",
		"mtime": "2026-08-21T10:14:11.362Z",
		"size": 1382,
		"path": "../public/assets/_token-rAjsK8Ox.js"
	}
};
//#endregion
//#region #nitro/virtual/public-assets-node
function readAsset(id) {
	const serverDir = dirname(fileURLToPath(globalThis.__nitro_main__));
	return promises.readFile(resolve(serverDir, public_assets_data_default[id].path));
}
//#endregion
//#region #nitro/virtual/public-assets
var publicAssetBases = {};
function isPublicAssetURL(id = "") {
	if (public_assets_data_default[id]) return true;
	for (const base in publicAssetBases) if (id.startsWith(base)) return true;
	return false;
}
function getAsset(id) {
	return public_assets_data_default[id];
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/static.mjs
var METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
var EncodingMap = {
	gzip: ".gz",
	br: ".br",
	zstd: ".zst"
};
var static_default = defineHandler((event) => {
	if (event.req.method && !METHODS.has(event.req.method)) return;
	let id = decodePath(withLeadingSlash(withoutTrailingSlash(event.url.pathname)));
	let asset;
	const encodings = [...(event.req.headers.get("accept-encoding") || "").split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(), ""];
	for (const encoding of encodings) for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
		const _asset = getAsset(_id);
		if (_asset) {
			asset = _asset;
			id = _id;
			break;
		}
	}
	if (!asset) {
		if (isPublicAssetURL(id)) {
			event.res.headers.delete("Cache-Control");
			throw new HTTPError({ status: 404 });
		}
		return;
	}
	if (encodings.length > 1) event.res.headers.append("Vary", "Accept-Encoding");
	if (event.req.headers.get("if-none-match") === asset.etag) {
		event.res.status = 304;
		event.res.statusText = "Not Modified";
		return "";
	}
	const ifModifiedSinceH = event.req.headers.get("if-modified-since");
	const mtimeDate = new Date(asset.mtime);
	if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
		event.res.status = 304;
		event.res.statusText = "Not Modified";
		return "";
	}
	if (asset.type) event.res.headers.set("Content-Type", asset.type);
	if (asset.etag && !event.res.headers.has("ETag")) event.res.headers.set("ETag", asset.etag);
	if (asset.mtime && !event.res.headers.has("Last-Modified")) event.res.headers.set("Last-Modified", mtimeDate.toUTCString());
	if (asset.encoding && !event.res.headers.has("Content-Encoding")) event.res.headers.set("Content-Encoding", asset.encoding);
	if (asset.size > 0 && !event.res.headers.has("Content-Length")) event.res.headers.set("Content-Length", asset.size.toString());
	return readAsset(id);
});
//#endregion
//#region #nitro/virtual/routing
var findRouteRules = /* @__PURE__ */ (() => {
	const $0 = [{
		name: "headers",
		route: "/assets/**",
		handler: headers,
		options: { "cache-control": "public, max-age=31536000, immutable" }
	}];
	return (m, p) => {
		let r = [];
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		let s = p.split("/");
		if (s.length > 1) {
			if (s[1] === "assets") r.unshift({
				data: $0,
				params: { "_": s.slice(2).join("/") }
			});
		}
		return r;
	};
})();
var _lazy_cJ_2Vj = defineLazyEventHandler(() => import("./_chunks/ssr-renderer.mjs"));
var findRoute = /* @__PURE__ */ (() => {
	const data = {
		route: "/**",
		handler: _lazy_cJ_2Vj
	};
	return ((_m, p) => {
		return {
			data,
			params: { "_": p.slice(1) }
		};
	});
})();
var globalMiddleware = [toEventHandler(static_default)].filter(Boolean);
//#endregion
//#region node_modules/nitro/dist/runtime/internal/error/prod.mjs
var errorHandler = (error, event) => {
	const res = defaultHandler(error, event);
	return new NodeResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event) {
	const unhandled = error.unhandled ?? !HTTPError.isError(error);
	const { status = 500, statusText = "" } = unhandled ? {} : error;
	if (status === 404) {
		const url = event.url || new URL(event.req.url);
		const baseURL = "/";
		if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
			status: 302,
			headers: new Headers({ location: `${baseURL}${url.pathname.slice(1)}${url.search}` })
		};
	}
	const headers = new Headers(unhandled ? {} : error.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	return {
		status,
		statusText,
		headers,
		body: {
			error: true,
			...unhandled ? {
				status,
				unhandled: true
			} : typeof error.toJSON === "function" ? error.toJSON() : {
				status,
				statusText,
				message: error.message
			}
		}
	};
}
//#endregion
//#region #nitro/virtual/error-handler
var errorHandlers = [errorHandler];
async function error_handler_default(error, event) {
	for (const handler of errorHandlers) try {
		const response = await handler(error, event, { defaultHandler });
		if (response) return response;
	} catch (error) {
		console.error(error);
	}
}
//#endregion
//#region #nitro/virtual/app
function createNitroApp() {
	const captureError = (error, errorCtx) => {
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
		}
	};
	const h3App = createH3App({ onError(error, event) {
		return error_handler_default(error, event);
	} });
	let appHandler = (req) => {
		req.context ||= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		return h3App.fetch(req);
	};
	return {
		fetch: appHandler,
		h3: h3App,
		hooks: void 0,
		captureError
	};
}
function createH3App(config) {
	const h3App = new H3Core(config);
	h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
	h3App["~middleware"].push(...globalMiddleware);
	h3App["~getMiddleware"] = (event, route) => {
		const pathname = event.url.pathname;
		const method = event.req.method;
		const middleware = [];
		const routeRules = getRouteRules(method, pathname);
		event.context.routeRules = routeRules?.routeRules;
		if (routeRules?.routeRuleMiddleware.length) middleware.push(...routeRules.routeRuleMiddleware);
		middleware.push(...h3App["~middleware"]);
		if (route?.data?.middleware?.length) middleware.push(...route.data.middleware);
		return middleware;
	};
	return h3App;
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/app.mjs
var APP_ID = "default";
function useNitroApp() {
	let instance = useNitroApp._instance;
	if (instance) return instance;
	instance = useNitroApp._instance = createNitroApp();
	globalThis.__nitro__ = globalThis.__nitro__ || {};
	globalThis.__nitro__[APP_ID] = instance;
	return instance;
}
function getRouteRules(method, pathname) {
	const m = findRouteRules(method, pathname);
	if (!m?.length) return { routeRuleMiddleware: [] };
	const routeRules = {};
	for (const layer of m) for (const rule of layer.data) {
		const currentRule = routeRules[rule.name];
		if (currentRule) {
			if (rule.options === false) {
				delete routeRules[rule.name];
				continue;
			}
			if (typeof currentRule.options === "object" && typeof rule.options === "object") currentRule.options = {
				...currentRule.options,
				...rule.options
			};
			else currentRule.options = rule.options;
			currentRule.route = rule.route;
			currentRule.params = {
				...currentRule.params,
				...layer.params
			};
		} else if (rule.options !== false) routeRules[rule.name] = {
			...rule,
			params: layer.params
		};
	}
	const middleware = [];
	const orderedRules = Object.values(routeRules).sort((a, b) => (a.handler?.order || 0) - (b.handler?.order || 0));
	for (const rule of orderedRules) {
		if (rule.options === false || !rule.handler) continue;
		middleware.push(rule.handler(rule));
	}
	return {
		routeRules,
		routeRuleMiddleware: middleware
	};
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/error/hooks.mjs
function _captureError(error, type) {
	console.error(`[${type}]`, error);
	useNitroApp().captureError?.(error, { tags: [type] });
}
function trapUnhandledErrors() {
	process.on("unhandledRejection", (error) => _captureError(error, "unhandledRejection"));
	process.on("uncaughtException", (error) => _captureError(error, "uncaughtException"));
}
//#endregion
//#region #nitro/virtual/tracing
var tracingSrvxPlugins = [];
//#endregion
//#region node_modules/nitro/dist/presets/node/runtime/node-server.mjs
var _parsedPort = Number.parseInt(process.env.NITRO_PORT ?? process.env.PORT ?? "");
var port = Number.isNaN(_parsedPort) ? 3e3 : _parsedPort;
var host = process.env.NITRO_HOST || process.env.HOST;
var cert = process.env.NITRO_SSL_CERT;
var key = process.env.NITRO_SSL_KEY;
var nitroApp = useNitroApp();
serve({
	port,
	hostname: host,
	tls: cert && key ? {
		cert,
		key
	} : void 0,
	fetch: nitroApp.fetch,
	plugins: [...tracingSrvxPlugins]
});
trapUnhandledErrors();
var node_server_default = {};
//#endregion
export { node_server_default as default };
