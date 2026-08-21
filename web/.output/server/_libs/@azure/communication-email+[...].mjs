import { n as __exportAll, r as __require, t as __commonJSMin } from "../../_runtime.mjs";
import { _ as getErrorMessage, a as RestError$1, b as stringToUint8Array, c as RestError, d as createClientLogger, f as isTokenCredential, g as uint8ArrayToString, h as stringToUint8Array$1, i as bearerTokenAuthenticationPolicy, l as isRestError, m as isNodeLike, n as parseClientArguments, o as isRestError$1, p as isError, r as createCommunicationAuthPolicy, s as logger$4, t as isKeyCredential, u as createClientLogger$1, v as delay$1, y as Sanitizer } from "./communication-common+[...].mjs";
import nodeHTTP from "node:http";
import { Transform } from "node:stream";
import nodeHTTPS from "node:https";
import { Readable as Readable$1 } from "stream";
import os from "node:os";
import process$1 from "node:process";
import zlib from "node:zlib";
//#region node_modules/@typespec/ts-http-runtime/dist/esm/util/random.js
/**
* Returns a random integer value between a lower and upper bound,
* inclusive of both bounds.
* Note that this uses Math.random and isn't secure. If you need to use
* this for any kind of security purpose, find a better source of random.
* @param min - The smallest integer value allowed.
* @param max - The largest integer value allowed.
*/
function getRandomIntegerInclusive(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/util/delay.js
/**
* Calculates the delay interval for retry attempts using exponential delay with jitter.
* @param retryAttempt - The current retry attempt number.
* @param config - The exponential retry configuration.
* @returns An object containing the calculated retry delay.
*/
function calculateRetryDelay(retryAttempt, config) {
	const exponentialDelay = config.retryDelayInMs * Math.pow(2, retryAttempt);
	const clampedDelay = Math.min(config.maxRetryDelayInMs, exponentialDelay);
	return { retryAfterInMs: clampedDelay / 2 + getRandomIntegerInclusive(0, clampedDelay / 2) };
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/util/uuidUtils.js
/**
* Generated Universally Unique Identifier
*
* @returns RFC4122 v4 UUID.
*/
function randomUUID() {
	return globalThis.crypto.randomUUID();
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/abort-controller/AbortError.js
/**
* This error is thrown when an asynchronous operation has been aborted.
* Check for this error by testing the `name` that the name property of the
* error matches `"AbortError"`.
*
* @example
* ```ts snippet:ReadmeSampleAbortError
* import { AbortError } from "@typespec/ts-http-runtime";
*
* async function doAsyncWork(options: { abortSignal: AbortSignal }): Promise<void> {
*   if (options.abortSignal.aborted) {
*     throw new AbortError();
*   }
*
*   // do async work
* }
*
* const controller = new AbortController();
* controller.abort();
*
* try {
*   doAsyncWork({ abortSignal: controller.signal });
* } catch (e) {
*   if (e instanceof Error && e.name === "AbortError") {
*     // handle abort error here.
*   }
* }
* ```
*/
var AbortError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "AbortError";
	}
};
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/httpHeaders.js
function normalizeName(name) {
	return name.toLowerCase();
}
/**
* Removes CR and LF characters from a header value to prevent obs-fold
* (line folding) sequences, as forbidden by RFC 7230 §3.2.4.
* @param value - The header value to sanitize.
*/
function normalizeValue(value) {
	return String(value).trim().replace(/[\r\n]/g, "");
}
function* headerIterator(map) {
	for (const entry of map.values()) yield [entry.name, entry.value];
}
var HttpHeadersImpl = class {
	_headersMap;
	constructor(rawHeaders) {
		this._headersMap = /* @__PURE__ */ new Map();
		if (rawHeaders) for (const headerName of Object.keys(rawHeaders)) this.set(headerName, rawHeaders[headerName]);
	}
	/**
	* Set a header in this collection with the provided name and value. The name is
	* case-insensitive.
	* @param name - The name of the header to set. This value is case-insensitive.
	* @param value - The value of the header to set.
	*/
	set(name, value) {
		this._headersMap.set(normalizeName(name), {
			name,
			value: normalizeValue(value)
		});
	}
	/**
	* Get the header value for the provided header name, or undefined if no header exists in this
	* collection with the provided name.
	* @param name - The name of the header. This value is case-insensitive.
	*/
	get(name) {
		return this._headersMap.get(normalizeName(name))?.value;
	}
	/**
	* Get whether or not this header collection contains a header entry for the provided header name.
	* @param name - The name of the header to set. This value is case-insensitive.
	*/
	has(name) {
		return this._headersMap.has(normalizeName(name));
	}
	/**
	* Remove the header with the provided headerName.
	* @param name - The name of the header to remove.
	*/
	delete(name) {
		this._headersMap.delete(normalizeName(name));
	}
	/**
	* Get the JSON object representation of this HTTP header collection.
	*/
	toJSON(options = {}) {
		const result = {};
		if (options.preserveCase) for (const entry of this._headersMap.values()) result[entry.name] = entry.value;
		else for (const [normalizedName, entry] of this._headersMap) result[normalizedName] = entry.value;
		return result;
	}
	/**
	* Get the string representation of this HTTP header collection.
	*/
	toString() {
		return JSON.stringify(this.toJSON({ preserveCase: true }));
	}
	/**
	* Iterate over tuples of header [name, value] pairs.
	*/
	[Symbol.iterator]() {
		return headerIterator(this._headersMap);
	}
};
/**
* Creates an object that satisfies the `HttpHeaders` interface.
* @param rawHeaders - A simple object representing initial headers
*/
function createHttpHeaders(rawHeaders) {
	return new HttpHeadersImpl(rawHeaders);
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/pipelineRequest.js
var PipelineRequestImpl = class {
	url;
	method;
	headers;
	timeout;
	withCredentials;
	body;
	multipartBody;
	formData;
	streamResponseStatusCodes;
	enableBrowserStreams;
	proxySettings;
	disableKeepAlive;
	abortSignal;
	requestId;
	allowInsecureConnection;
	onUploadProgress;
	onDownloadProgress;
	requestOverrides;
	authSchemes;
	constructor(options) {
		this.url = options.url;
		this.body = options.body;
		this.headers = options.headers ?? createHttpHeaders();
		this.method = options.method ?? "GET";
		this.timeout = options.timeout ?? 0;
		this.multipartBody = options.multipartBody;
		this.formData = options.formData;
		this.disableKeepAlive = options.disableKeepAlive ?? false;
		this.proxySettings = options.proxySettings;
		this.streamResponseStatusCodes = options.streamResponseStatusCodes;
		this.withCredentials = options.withCredentials ?? false;
		this.abortSignal = options.abortSignal;
		this.onUploadProgress = options.onUploadProgress;
		this.onDownloadProgress = options.onDownloadProgress;
		this.requestId = options.requestId || randomUUID();
		this.allowInsecureConnection = options.allowInsecureConnection ?? false;
		this.enableBrowserStreams = options.enableBrowserStreams ?? false;
		this.requestOverrides = options.requestOverrides;
		this.authSchemes = options.authSchemes;
	}
};
/**
* Creates a new pipeline request with the given options.
* This method is to allow for the easy setting of default values and not required.
* @param options - The options to create the request with.
*/
function createPipelineRequest$1(options) {
	return new PipelineRequestImpl(options);
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/pipeline.js
var ValidPhaseNames = /* @__PURE__ */ new Set([
	"Deserialize",
	"Serialize",
	"Retry",
	"Sign"
]);
/**
* A private implementation of Pipeline.
* Do not export this class from the package.
* @internal
*/
var HttpPipeline = class HttpPipeline {
	_policies = [];
	_orderedPolicies;
	constructor(policies) {
		this._policies = policies?.slice(0) ?? [];
		this._orderedPolicies = void 0;
	}
	addPolicy(policy, options = {}) {
		if (options.phase && options.afterPhase) throw new Error("Policies inside a phase cannot specify afterPhase.");
		if (options.phase && !ValidPhaseNames.has(options.phase)) throw new Error(`Invalid phase name: ${options.phase}`);
		if (options.afterPhase && !ValidPhaseNames.has(options.afterPhase)) throw new Error(`Invalid afterPhase name: ${options.afterPhase}`);
		this._policies.push({
			policy,
			options
		});
		this._orderedPolicies = void 0;
	}
	removePolicy(options) {
		const removedPolicies = [];
		this._policies = this._policies.filter((policyDescriptor) => {
			if (options.name && policyDescriptor.policy.name === options.name || options.phase && policyDescriptor.options.phase === options.phase) {
				removedPolicies.push(policyDescriptor.policy);
				return false;
			} else return true;
		});
		this._orderedPolicies = void 0;
		return removedPolicies;
	}
	sendRequest(httpClient, request) {
		return this.getOrderedPolicies().reduceRight((next, policy) => {
			return (req) => {
				return policy.sendRequest(req, next);
			};
		}, (req) => httpClient.sendRequest(req))(request);
	}
	getOrderedPolicies() {
		if (!this._orderedPolicies) this._orderedPolicies = this.orderPolicies();
		return this._orderedPolicies;
	}
	clone() {
		return new HttpPipeline(this._policies);
	}
	static create() {
		return new HttpPipeline();
	}
	orderPolicies() {
		/**
		* The goal of this method is to reliably order pipeline policies
		* based on their declared requirements when they were added.
		*
		* Order is first determined by phase:
		*
		* 1. Serialize Phase
		* 2. Policies not in a phase
		* 3. Deserialize Phase
		* 4. Retry Phase
		* 5. Sign Phase
		*
		* Within each phase, policies are executed in the order
		* they were added unless they were specified to execute
		* before/after other policies or after a particular phase.
		*
		* To determine the final order, we will walk the policy list
		* in phase order multiple times until all dependencies are
		* satisfied.
		*
		* `afterPolicies` are the set of policies that must be
		* executed before a given policy. This requirement is
		* considered satisfied when each of the listed policies
		* have been scheduled.
		*
		* `beforePolicies` are the set of policies that must be
		* executed after a given policy. Since this dependency
		* can be expressed by converting it into a equivalent
		* `afterPolicies` declarations, they are normalized
		* into that form for simplicity.
		*
		* An `afterPhase` dependency is considered satisfied when all
		* policies in that phase have scheduled.
		*
		*/
		const result = [];
		const policyMap = /* @__PURE__ */ new Map();
		function createPhase(name) {
			return {
				name,
				policies: /* @__PURE__ */ new Set(),
				hasRun: false,
				hasAfterPolicies: false
			};
		}
		const serializePhase = createPhase("Serialize");
		const noPhase = createPhase("None");
		const deserializePhase = createPhase("Deserialize");
		const retryPhase = createPhase("Retry");
		const signPhase = createPhase("Sign");
		const orderedPhases = [
			serializePhase,
			noPhase,
			deserializePhase,
			retryPhase,
			signPhase
		];
		function getPhase(phase) {
			if (phase === "Retry") return retryPhase;
			else if (phase === "Serialize") return serializePhase;
			else if (phase === "Deserialize") return deserializePhase;
			else if (phase === "Sign") return signPhase;
			else return noPhase;
		}
		for (const descriptor of this._policies) {
			const policy = descriptor.policy;
			const options = descriptor.options;
			const policyName = policy.name;
			if (policyMap.has(policyName)) throw new Error("Duplicate policy names not allowed in pipeline");
			const node = {
				policy,
				dependsOn: /* @__PURE__ */ new Set(),
				dependants: /* @__PURE__ */ new Set()
			};
			if (options.afterPhase) {
				node.afterPhase = getPhase(options.afterPhase);
				node.afterPhase.hasAfterPolicies = true;
			}
			policyMap.set(policyName, node);
			getPhase(options.phase).policies.add(node);
		}
		for (const descriptor of this._policies) {
			const { policy, options } = descriptor;
			const policyName = policy.name;
			const node = policyMap.get(policyName);
			if (!node) throw new Error(`Missing node for policy ${policyName}`);
			if (options.afterPolicies) for (const afterPolicyName of options.afterPolicies) {
				const afterNode = policyMap.get(afterPolicyName);
				if (afterNode) {
					node.dependsOn.add(afterNode);
					afterNode.dependants.add(node);
				}
			}
			if (options.beforePolicies) for (const beforePolicyName of options.beforePolicies) {
				const beforeNode = policyMap.get(beforePolicyName);
				if (beforeNode) {
					beforeNode.dependsOn.add(node);
					node.dependants.add(beforeNode);
				}
			}
		}
		function walkPhase(phase) {
			phase.hasRun = true;
			for (const node of phase.policies) {
				if (node.afterPhase && (!node.afterPhase.hasRun || node.afterPhase.policies.size)) continue;
				if (node.dependsOn.size === 0) {
					result.push(node.policy);
					for (const dependant of node.dependants) dependant.dependsOn.delete(node);
					policyMap.delete(node.policy.name);
					phase.policies.delete(node);
				}
			}
		}
		function walkPhases() {
			for (const phase of orderedPhases) {
				walkPhase(phase);
				if (phase.policies.size > 0 && phase !== noPhase) {
					if (!noPhase.hasRun) walkPhase(noPhase);
					return;
				}
				if (phase.hasAfterPolicies) walkPhase(noPhase);
			}
		}
		let iteration = 0;
		while (policyMap.size > 0) {
			iteration++;
			const initialResultLength = result.length;
			walkPhases();
			if (result.length <= initialResultLength && iteration > 1) throw new Error("Cannot satisfy policy dependencies due to requirements cycle.");
		}
		return result;
	}
};
/**
* Creates a totally empty pipeline.
* Useful for testing or creating a custom one.
*/
function createEmptyPipeline$1() {
	return HttpPipeline.create();
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/log.js
var logger$3 = createClientLogger("ts-http-runtime");
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/nodeHttpClient.js
var DEFAULT_TLS_SETTINGS = {};
function isReadableStream(body) {
	return body && typeof body.pipe === "function";
}
function isStreamComplete(stream) {
	if (stream.readable === false) return Promise.resolve();
	return new Promise((resolve) => {
		const handler = () => {
			resolve();
			stream.removeListener("close", handler);
			stream.removeListener("end", handler);
			stream.removeListener("error", handler);
		};
		stream.on("close", handler);
		stream.on("end", handler);
		stream.on("error", handler);
	});
}
function isArrayBuffer(body) {
	return body && typeof body.byteLength === "number";
}
var ReportTransform = class extends Transform {
	loadedBytes = 0;
	progressCallback;
	_transform(chunk, _encoding, callback) {
		this.push(chunk);
		this.loadedBytes += chunk.length;
		try {
			this.progressCallback({ loadedBytes: this.loadedBytes });
			callback();
		} catch (e) {
			callback(e);
		}
	}
	constructor(progressCallback) {
		super();
		this.progressCallback = progressCallback;
	}
};
/**
* A HttpClient implementation that uses Node's "https" module to send HTTPS requests.
* @internal
*/
var NodeHttpClient = class {
	cachedHttpAgent;
	cachedHttpsAgents = /* @__PURE__ */ new WeakMap();
	/**
	* Makes a request over an underlying transport layer and returns the response.
	* @param request - The request to be made.
	*/
	async sendRequest(request) {
		const abortController = new AbortController();
		let abortListener;
		if (request.abortSignal) {
			if (request.abortSignal.aborted) throw new AbortError("The operation was aborted. Request has already been canceled.");
			abortListener = (event) => {
				if (event.type === "abort") abortController.abort();
			};
			request.abortSignal.addEventListener("abort", abortListener);
		}
		let timeoutId;
		if (request.timeout > 0) timeoutId = setTimeout(() => {
			const sanitizer = new Sanitizer();
			logger$3.info(`request to '${sanitizer.sanitizeUrl(request.url)}' timed out. canceling...`);
			abortController.abort();
		}, request.timeout);
		const acceptEncoding = request.headers.get("Accept-Encoding");
		const shouldDecompress = acceptEncoding?.includes("gzip") || acceptEncoding?.includes("deflate");
		let body = typeof request.body === "function" ? request.body() : request.body;
		if (body && !request.headers.has("Content-Length")) {
			const bodyLength = getBodyLength(body);
			if (bodyLength !== null) request.headers.set("Content-Length", bodyLength);
		}
		let responseStream;
		try {
			if (body && request.onUploadProgress) {
				const onUploadProgress = request.onUploadProgress;
				const uploadReportStream = new ReportTransform(onUploadProgress);
				uploadReportStream.on("error", (e) => {
					logger$3.error("Error in upload progress", e);
				});
				if (isReadableStream(body)) body.pipe(uploadReportStream);
				else uploadReportStream.end(body);
				body = uploadReportStream;
			}
			const res = await this.makeRequest(request, abortController, body);
			if (timeoutId !== void 0) clearTimeout(timeoutId);
			const headers = getResponseHeaders(res);
			const response = {
				status: res.statusCode ?? 0,
				headers,
				request
			};
			if (request.method === "HEAD") {
				res.resume();
				return response;
			}
			responseStream = shouldDecompress ? getDecodedResponseStream(res, headers) : res;
			const onDownloadProgress = request.onDownloadProgress;
			if (onDownloadProgress) {
				const downloadReportStream = new ReportTransform(onDownloadProgress);
				downloadReportStream.on("error", (e) => {
					logger$3.error("Error in download progress", e);
				});
				responseStream.pipe(downloadReportStream);
				responseStream = downloadReportStream;
			}
			if (request.streamResponseStatusCodes?.has(Number.POSITIVE_INFINITY) || request.streamResponseStatusCodes?.has(response.status)) response.readableStreamBody = responseStream;
			else response.bodyAsText = await streamToText(responseStream);
			return response;
		} finally {
			if (request.abortSignal && abortListener) {
				let uploadStreamDone = Promise.resolve();
				if (isReadableStream(body)) uploadStreamDone = isStreamComplete(body);
				let downloadStreamDone = Promise.resolve();
				if (isReadableStream(responseStream)) downloadStreamDone = isStreamComplete(responseStream);
				Promise.all([uploadStreamDone, downloadStreamDone]).then(() => {
					if (abortListener) request.abortSignal?.removeEventListener("abort", abortListener);
				}).catch((e) => {
					logger$3.warning("Error when cleaning up abortListener on httpRequest", e);
				});
			}
		}
	}
	makeRequest(request, abortController, body) {
		const url = new URL(request.url);
		const isInsecure = url.protocol !== "https:";
		if (isInsecure && !request.allowInsecureConnection) throw new Error(`Cannot connect to ${request.url} while allowInsecureConnection is false.`);
		const options = {
			agent: request.agent ?? this.getOrCreateAgent(request, isInsecure),
			hostname: url.hostname,
			path: `${url.pathname}${url.search}`,
			port: url.port,
			method: request.method,
			headers: request.headers.toJSON({ preserveCase: true }),
			...request.requestOverrides
		};
		return new Promise((resolve, reject) => {
			const req = isInsecure ? nodeHTTP.request(options, resolve) : nodeHTTPS.request(options, resolve);
			req.once("error", (err) => {
				reject(new RestError(err.message, {
					code: err.code ?? RestError.REQUEST_SEND_ERROR,
					request
				}));
			});
			abortController.signal.addEventListener("abort", () => {
				const abortError = new AbortError("The operation was aborted. Rejecting from abort signal callback while making request.");
				req.destroy(abortError);
				reject(abortError);
			});
			if (body && isReadableStream(body)) body.pipe(req);
			else if (body) {
				if (typeof body === "string" || Buffer.isBuffer(body)) req.end(body);
				else if (isArrayBuffer(body)) req.end(ArrayBuffer.isView(body) ? Buffer.from(body.buffer, body.byteOffset, body.byteLength) : Buffer.from(body));
				else {
					logger$3.error("Unrecognized body type", body);
					reject(new RestError("Unrecognized body type"));
				}
			} else req.end();
		});
	}
	getOrCreateAgent(request, isInsecure) {
		const disableKeepAlive = request.disableKeepAlive;
		if (isInsecure) {
			if (disableKeepAlive) return nodeHTTP.globalAgent;
			if (!this.cachedHttpAgent) this.cachedHttpAgent = new nodeHTTP.Agent({ keepAlive: true });
			return this.cachedHttpAgent;
		} else {
			if (disableKeepAlive && !request.tlsSettings) return nodeHTTPS.globalAgent;
			const tlsSettings = request.tlsSettings ?? DEFAULT_TLS_SETTINGS;
			let agent = this.cachedHttpsAgents.get(tlsSettings);
			if (agent && agent.options.keepAlive === !disableKeepAlive) return agent;
			logger$3.info("No cached TLS Agent exist, creating a new Agent");
			agent = new nodeHTTPS.Agent({
				keepAlive: !disableKeepAlive,
				...tlsSettings
			});
			this.cachedHttpsAgents.set(tlsSettings, agent);
			return agent;
		}
	}
};
function getResponseHeaders(res) {
	const headers = createHttpHeaders();
	for (const header of Object.keys(res.headers)) {
		const value = res.headers[header];
		if (Array.isArray(value)) {
			if (value.length > 0) headers.set(header, value[0]);
		} else if (value) headers.set(header, value);
	}
	return headers;
}
function getDecodedResponseStream(stream, headers) {
	const contentEncoding = headers.get("Content-Encoding");
	if (contentEncoding === "gzip") {
		const unzip = zlib.createGunzip();
		stream.pipe(unzip);
		return unzip;
	} else if (contentEncoding === "deflate") {
		const inflate = zlib.createInflate();
		stream.pipe(inflate);
		return inflate;
	}
	return stream;
}
function streamToText(stream) {
	return new Promise((resolve, reject) => {
		const buffer = [];
		stream.on("data", (chunk) => {
			if (Buffer.isBuffer(chunk)) buffer.push(chunk);
			else buffer.push(Buffer.from(chunk));
		});
		stream.on("end", () => {
			resolve(Buffer.concat(buffer).toString("utf8"));
		});
		stream.on("error", (e) => {
			if (e && e?.name === "AbortError") reject(e);
			else reject(new RestError(`Error reading response as text: ${e.message}`, { code: RestError.PARSE_ERROR }));
		});
	});
}
/** @internal */
function getBodyLength(body) {
	if (!body) return 0;
	else if (Buffer.isBuffer(body)) return body.length;
	else if (isReadableStream(body)) return null;
	else if (isArrayBuffer(body)) return body.byteLength;
	else if (typeof body === "string") return Buffer.from(body).length;
	else return null;
}
/**
* Create a new HttpClient instance for the NodeJS environment.
* @internal
*/
function createNodeHttpClient() {
	return new NodeHttpClient();
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/defaultHttpClient.js
/**
* Create the correct HttpClient for the current environment.
*/
function createDefaultHttpClient$1() {
	return createNodeHttpClient();
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/policies/logPolicy.js
/**
* The programmatic identifier of the logPolicy.
*/
var logPolicyName = "logPolicy";
/**
* A policy that logs all requests and responses.
* @param options - Options to configure logPolicy.
*/
function logPolicy$1(options = {}) {
	const logger = options.logger ?? logger$3.info;
	const sanitizer = new Sanitizer({
		additionalAllowedHeaderNames: options.additionalAllowedHeaderNames,
		additionalAllowedQueryParameters: options.additionalAllowedQueryParameters
	});
	return {
		name: logPolicyName,
		async sendRequest(request, next) {
			if (!logger.enabled) return next(request);
			logger(`Request: ${sanitizer.sanitize(request)}`);
			const response = await next(request);
			logger(`Response status code: ${response.status}`);
			logger(`Headers: ${sanitizer.sanitize({ headers: response.headers })}`);
			return response;
		}
	};
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/util/helpers.js
var StandardAbortMessage = "The operation was aborted.";
/**
* A wrapper for setTimeout that resolves a promise after delayInMs milliseconds.
* @param delayInMs - The number of milliseconds to be delayed.
* @param value - The value to be resolved with after a timeout of t milliseconds.
* @param options - The options for delay - currently abort options
*                  - abortSignal - The abortSignal associated with containing operation.
*                  - abortErrorMsg - The abort error message associated with containing operation.
* @returns Resolved promise
*/
function delay(delayInMs, value, options) {
	return new Promise((resolve, reject) => {
		let timer = void 0;
		let onAborted = void 0;
		const rejectOnAbort = () => {
			return reject(new AbortError(options?.abortErrorMsg ? options?.abortErrorMsg : StandardAbortMessage));
		};
		const removeListeners = () => {
			if (options?.abortSignal && onAborted) options.abortSignal.removeEventListener("abort", onAborted);
		};
		onAborted = () => {
			if (timer) clearTimeout(timer);
			removeListeners();
			return rejectOnAbort();
		};
		if (options?.abortSignal && options.abortSignal.aborted) return rejectOnAbort();
		timer = setTimeout(() => {
			removeListeners();
			resolve(value);
		}, delayInMs);
		if (options?.abortSignal) options.abortSignal.addEventListener("abort", onAborted);
	});
}
/**
* @internal
* @returns the parsed value or undefined if the parsed value is invalid.
*/
function parseHeaderValueAsNumber(response, headerName) {
	const value = response.headers.get(headerName);
	if (!value) return;
	const valueAsNum = Number(value);
	if (Number.isNaN(valueAsNum)) return;
	return valueAsNum;
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/retryStrategies/throttlingRetryStrategy.js
/**
* The header that comes back from services representing
* the amount of time (minimum) to wait to retry (in seconds or timestamp after which we can retry).
*/
var RetryAfterHeader = "Retry-After";
/**
* The headers that come back from services representing
* the amount of time (minimum) to wait to retry.
*
* "retry-after-ms", "x-ms-retry-after-ms" : milliseconds
* "Retry-After" : seconds or timestamp
*/
var AllRetryAfterHeaders = [
	"retry-after-ms",
	"x-ms-retry-after-ms",
	RetryAfterHeader
];
/**
* A response is a throttling retry response if it has a throttling status code (429 or 503),
* as long as one of the [ "Retry-After" or "retry-after-ms" or "x-ms-retry-after-ms" ] headers has a valid value.
*
* Returns the `retryAfterInMs` value if the response is a throttling retry response.
* If not throttling retry response, returns `undefined`.
*
* @internal
*/
function getRetryAfterInMs(response) {
	if (!(response && [429, 503].includes(response.status))) return void 0;
	try {
		for (const header of AllRetryAfterHeaders) {
			const retryAfterValue = parseHeaderValueAsNumber(response, header);
			if (retryAfterValue === 0 || retryAfterValue) return retryAfterValue * (header === RetryAfterHeader ? 1e3 : 1);
		}
		const retryAfterHeader = response.headers.get(RetryAfterHeader);
		if (!retryAfterHeader) return;
		const diff = Date.parse(retryAfterHeader) - Date.now();
		return Number.isFinite(diff) ? Math.max(0, diff) : void 0;
	} catch {
		return;
	}
}
/**
* A response is a retry response if it has a throttling status code (429 or 503),
* as long as one of the [ "Retry-After" or "retry-after-ms" or "x-ms-retry-after-ms" ] headers has a valid value.
*/
function isThrottlingRetryResponse(response) {
	return Number.isFinite(getRetryAfterInMs(response));
}
function throttlingRetryStrategy() {
	return {
		name: "throttlingRetryStrategy",
		retry({ response }) {
			const retryAfterInMs = getRetryAfterInMs(response);
			if (!Number.isFinite(retryAfterInMs)) return { skipStrategy: true };
			return { retryAfterInMs };
		}
	};
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/retryStrategies/exponentialRetryStrategy.js
var DEFAULT_CLIENT_RETRY_INTERVAL = 1e3;
var DEFAULT_CLIENT_MAX_RETRY_INTERVAL = 64e3;
/**
* A retry strategy that retries with an exponentially increasing delay in these two cases:
* - When there are errors in the underlying transport layer (e.g. DNS lookup failures).
* - Or otherwise if the outgoing request fails (408, greater or equal than 500, except for 501 and 505).
*/
function exponentialRetryStrategy(options = {}) {
	const retryInterval = options.retryDelayInMs ?? DEFAULT_CLIENT_RETRY_INTERVAL;
	const maxRetryInterval = options.maxRetryDelayInMs ?? DEFAULT_CLIENT_MAX_RETRY_INTERVAL;
	return {
		name: "exponentialRetryStrategy",
		retry({ retryCount, response, responseError }) {
			const matchedSystemError = isSystemError(responseError);
			const ignoreSystemErrors = matchedSystemError && options.ignoreSystemErrors;
			const isExponential = isExponentialRetryResponse(response);
			const ignoreExponentialResponse = isExponential && options.ignoreHttpStatusCodes;
			if (response && (isThrottlingRetryResponse(response) || !isExponential) || ignoreExponentialResponse || ignoreSystemErrors) return { skipStrategy: true };
			if (responseError && !matchedSystemError && !isExponential) return { errorToThrow: responseError };
			return calculateRetryDelay(retryCount, {
				retryDelayInMs: retryInterval,
				maxRetryDelayInMs: maxRetryInterval
			});
		}
	};
}
/**
* A response is a retry response if it has status codes:
* - 408, or
* - Greater or equal than 500, except for 501 and 505.
*/
function isExponentialRetryResponse(response) {
	return Boolean(response && response.status !== void 0 && (response.status >= 500 || response.status === 408) && response.status !== 501 && response.status !== 505);
}
/**
* Determines whether an error from a pipeline response was triggered in the network layer.
*/
function isSystemError(err) {
	if (!err) return false;
	return err.code === "ETIMEDOUT" || err.code === "ESOCKETTIMEDOUT" || err.code === "ECONNREFUSED" || err.code === "ECONNRESET" || err.code === "ENOENT" || err.code === "ENOTFOUND";
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/policies/retryPolicy.js
var retryPolicyLogger = createClientLogger("ts-http-runtime retryPolicy");
/**
* The programmatic identifier of the retryPolicy.
*/
var retryPolicyName = "retryPolicy";
/**
* retryPolicy is a generic policy to enable retrying requests when certain conditions are met
*/
function retryPolicy(strategies, options = { maxRetries: 3 }) {
	const logger = options.logger || retryPolicyLogger;
	return {
		name: retryPolicyName,
		async sendRequest(request, next) {
			let response;
			let responseError;
			let retryCount = -1;
			retryRequest: while (true) {
				retryCount += 1;
				response = void 0;
				responseError = void 0;
				try {
					logger.info(`Retry ${retryCount}: Attempting to send request`, request.requestId);
					response = await next(request);
					logger.info(`Retry ${retryCount}: Received a response from request`, request.requestId);
				} catch (e) {
					logger.error(`Retry ${retryCount}: Received an error from request`, request.requestId);
					if (!isRestError(e)) throw e;
					responseError = e;
					response = e.response;
				}
				if (request.abortSignal?.aborted) {
					logger.error(`Retry ${retryCount}: Request aborted.`);
					throw new AbortError();
				}
				if (retryCount >= (options.maxRetries ?? 3)) {
					logger.info(`Retry ${retryCount}: Maximum retries reached. Returning the last received response, or throwing the last received error.`);
					if (responseError) throw responseError;
					else if (response) return response;
					else throw new Error("Maximum retries reached with no response or error to throw");
				}
				logger.info(`Retry ${retryCount}: Processing ${strategies.length} retry strategies.`);
				strategiesLoop: for (const strategy of strategies) {
					const strategyLogger = strategy.logger || logger;
					strategyLogger.info(`Retry ${retryCount}: Processing retry strategy ${strategy.name}.`);
					const modifiers = strategy.retry({
						retryCount,
						response,
						responseError
					});
					if (modifiers.skipStrategy) {
						strategyLogger.info(`Retry ${retryCount}: Skipped.`);
						continue strategiesLoop;
					}
					const { errorToThrow, retryAfterInMs, redirectTo } = modifiers;
					if (errorToThrow) {
						strategyLogger.error(`Retry ${retryCount}: Retry strategy ${strategy.name} throws error:`, errorToThrow);
						throw errorToThrow;
					}
					if (retryAfterInMs || retryAfterInMs === 0) {
						strategyLogger.info(`Retry ${retryCount}: Retry strategy ${strategy.name} retries after ${retryAfterInMs}`);
						await delay(retryAfterInMs, void 0, { abortSignal: request.abortSignal });
						continue retryRequest;
					}
					if (redirectTo) {
						strategyLogger.info(`Retry ${retryCount}: Retry strategy ${strategy.name} redirects to ${redirectTo}`);
						request.url = redirectTo;
						continue retryRequest;
					}
				}
				if (responseError) {
					logger.info(`None of the retry strategies could work with the received error. Throwing it.`);
					throw responseError;
				}
				if (response) {
					logger.info(`None of the retry strategies could work with the received response. Returning it.`);
					return response;
				}
			}
		}
	};
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/policies/defaultRetryPolicy.js
/**
* Name of the {@link defaultRetryPolicy}
*/
var defaultRetryPolicyName = "defaultRetryPolicy";
/**
* A policy that retries according to three strategies:
* - When the server sends a 429 response with a Retry-After header.
* - When there are errors in the underlying transport layer (e.g. DNS lookup failures).
* - Or otherwise if the outgoing request fails, it will retry with an exponentially increasing delay.
*/
function defaultRetryPolicy$1(options = {}) {
	return {
		name: defaultRetryPolicyName,
		sendRequest: retryPolicy([throttlingRetryStrategy(), exponentialRetryStrategy(options)], { maxRetries: options.maxRetries ?? 3 }).sendRequest
	};
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/formData.js
/**
* If the request body is a native FormData, convert it to our FormDataMap
* representation and clear the body. Node.js's HTTP stack doesn't handle
* FormData natively, so the pipeline must serialize it later.
*
* @internal
*/
function convertBodyToFormDataMap(body) {
	if (typeof FormData !== "undefined" && body instanceof FormData) {
		const formDataMap = {};
		for (const [key, value] of body.entries()) {
			const existing = formDataMap[key];
			if (Array.isArray(existing)) existing.push(value);
			else formDataMap[key] = existing !== void 0 ? [existing, value] : [value];
		}
		return formDataMap;
	}
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/policies/formDataPolicy.js
/**
* The programmatic identifier of the formDataPolicy.
*/
var formDataPolicyName = "formDataPolicy";
/**
* A policy that encodes FormData on the request into the body.
*/
function formDataPolicy$1() {
	return {
		name: formDataPolicyName,
		async sendRequest(request, next) {
			const converted = convertBodyToFormDataMap(request.body);
			if (converted) {
				request.formData = converted;
				request.body = void 0;
			}
			if (request.formData) {
				const contentType = request.headers.get("Content-Type");
				if (contentType && contentType.indexOf("application/x-www-form-urlencoded") !== -1) request.body = wwwFormUrlEncode(request.formData);
				else await prepareFormData(request.formData, request);
				request.formData = void 0;
			}
			return next(request);
		}
	};
}
function wwwFormUrlEncode(formData) {
	const urlSearchParams = new URLSearchParams();
	for (const [key, value] of Object.entries(formData)) if (Array.isArray(value)) for (const subValue of value) urlSearchParams.append(key, subValue.toString());
	else urlSearchParams.append(key, value.toString());
	return urlSearchParams.toString();
}
async function prepareFormData(formData, request) {
	const contentType = request.headers.get("Content-Type");
	if (contentType && !contentType.startsWith("multipart/form-data")) return;
	request.headers.set("Content-Type", contentType ?? "multipart/form-data");
	const parts = [];
	for (const [fieldName, values] of Object.entries(formData)) for (const value of Array.isArray(values) ? values : [values]) if (typeof value === "string") parts.push({
		headers: createHttpHeaders({ "Content-Disposition": `form-data; name="${fieldName}"` }),
		body: stringToUint8Array(value, "utf-8")
	});
	else if (value === void 0 || value === null || typeof value !== "object") throw new Error(`Unexpected value for key ${fieldName}: ${value}. Value should be serialized to string first.`);
	else {
		const fileName = value.name || "blob";
		const headers = createHttpHeaders();
		headers.set("Content-Disposition", `form-data; name="${fieldName}"; filename="${fileName}"`);
		headers.set("Content-Type", value.type || "application/octet-stream");
		parts.push({
			headers,
			body: value
		});
	}
	request.multipartBody = { parts };
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/policies/agentPolicy.js
/**
* Name of the Agent Policy
*/
var agentPolicyName = "agentPolicy";
/**
* Gets a pipeline policy that sets http.agent
*/
function agentPolicy$1(agent) {
	return {
		name: agentPolicyName,
		sendRequest: async (req, next) => {
			if (!req.agent) req.agent = agent;
			return next(req);
		}
	};
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/policies/tlsPolicy.js
/**
* Name of the TLS Policy
*/
var tlsPolicyName = "tlsPolicy";
/**
* Gets a pipeline policy that adds the client certificate to the HttpClient agent for authentication.
*/
function tlsPolicy$1(tlsSettings) {
	return {
		name: tlsPolicyName,
		sendRequest: async (req, next) => {
			if (!req.tlsSettings) req.tlsSettings = tlsSettings;
			return next(req);
		}
	};
}
//#endregion
//#region node_modules/ms/index.js
var require_ms = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Helpers.
	*/
	var s = 1e3;
	var m = s * 60;
	var h = m * 60;
	var d = h * 24;
	var w = d * 7;
	var y = d * 365.25;
	/**
	* Parse or format the given `val`.
	*
	* Options:
	*
	*  - `long` verbose formatting [false]
	*
	* @param {String|Number} val
	* @param {Object} [options]
	* @throws {Error} throw an error if val is not a non-empty string or a number
	* @return {String|Number}
	* @api public
	*/
	module.exports = function(val, options) {
		options = options || {};
		var type = typeof val;
		if (type === "string" && val.length > 0) return parse(val);
		else if (type === "number" && isFinite(val)) return options.long ? fmtLong(val) : fmtShort(val);
		throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(val));
	};
	/**
	* Parse the given `str` and return milliseconds.
	*
	* @param {String} str
	* @return {Number}
	* @api private
	*/
	function parse(str) {
		str = String(str);
		if (str.length > 100) return;
		var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(str);
		if (!match) return;
		var n = parseFloat(match[1]);
		switch ((match[2] || "ms").toLowerCase()) {
			case "years":
			case "year":
			case "yrs":
			case "yr":
			case "y": return n * y;
			case "weeks":
			case "week":
			case "w": return n * w;
			case "days":
			case "day":
			case "d": return n * d;
			case "hours":
			case "hour":
			case "hrs":
			case "hr":
			case "h": return n * h;
			case "minutes":
			case "minute":
			case "mins":
			case "min":
			case "m": return n * m;
			case "seconds":
			case "second":
			case "secs":
			case "sec":
			case "s": return n * s;
			case "milliseconds":
			case "millisecond":
			case "msecs":
			case "msec":
			case "ms": return n;
			default: return;
		}
	}
	/**
	* Short format for `ms`.
	*
	* @param {Number} ms
	* @return {String}
	* @api private
	*/
	function fmtShort(ms) {
		var msAbs = Math.abs(ms);
		if (msAbs >= d) return Math.round(ms / d) + "d";
		if (msAbs >= h) return Math.round(ms / h) + "h";
		if (msAbs >= m) return Math.round(ms / m) + "m";
		if (msAbs >= s) return Math.round(ms / s) + "s";
		return ms + "ms";
	}
	/**
	* Long format for `ms`.
	*
	* @param {Number} ms
	* @return {String}
	* @api private
	*/
	function fmtLong(ms) {
		var msAbs = Math.abs(ms);
		if (msAbs >= d) return plural(ms, msAbs, d, "day");
		if (msAbs >= h) return plural(ms, msAbs, h, "hour");
		if (msAbs >= m) return plural(ms, msAbs, m, "minute");
		if (msAbs >= s) return plural(ms, msAbs, s, "second");
		return ms + " ms";
	}
	/**
	* Pluralization helper.
	*/
	function plural(ms, msAbs, n, name) {
		var isPlural = msAbs >= n * 1.5;
		return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
	}
}));
//#endregion
//#region node_modules/debug/src/common.js
var require_common = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* This is the common logic for both the Node.js and web browser
	* implementations of `debug()`.
	*/
	function setup(env) {
		createDebug.debug = createDebug;
		createDebug.default = createDebug;
		createDebug.coerce = coerce;
		createDebug.disable = disable;
		createDebug.enable = enable;
		createDebug.enabled = enabled;
		createDebug.humanize = require_ms();
		createDebug.destroy = destroy;
		Object.keys(env).forEach((key) => {
			createDebug[key] = env[key];
		});
		/**
		* The currently active debug mode names, and names to skip.
		*/
		createDebug.names = [];
		createDebug.skips = [];
		/**
		* Map of special "%n" handling functions, for the debug "format" argument.
		*
		* Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
		*/
		createDebug.formatters = {};
		/**
		* Selects a color for a debug namespace
		* @param {String} namespace The namespace string for the debug instance to be colored
		* @return {Number|String} An ANSI color code for the given namespace
		* @api private
		*/
		function selectColor(namespace) {
			let hash = 0;
			for (let i = 0; i < namespace.length; i++) {
				hash = (hash << 5) - hash + namespace.charCodeAt(i);
				hash |= 0;
			}
			return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
		}
		createDebug.selectColor = selectColor;
		/**
		* Create a debugger with the given `namespace`.
		*
		* @param {String} namespace
		* @return {Function}
		* @api public
		*/
		function createDebug(namespace) {
			let prevTime;
			let enableOverride = null;
			let namespacesCache;
			let enabledCache;
			function debug(...args) {
				if (!debug.enabled) return;
				const self = debug;
				const curr = Number(/* @__PURE__ */ new Date());
				self.diff = curr - (prevTime || curr);
				self.prev = prevTime;
				self.curr = curr;
				prevTime = curr;
				args[0] = createDebug.coerce(args[0]);
				if (typeof args[0] !== "string") args.unshift("%O");
				let index = 0;
				args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
					if (match === "%%") return "%";
					index++;
					const formatter = createDebug.formatters[format];
					if (typeof formatter === "function") {
						const val = args[index];
						match = formatter.call(self, val);
						args.splice(index, 1);
						index--;
					}
					return match;
				});
				createDebug.formatArgs.call(self, args);
				(self.log || createDebug.log).apply(self, args);
			}
			debug.namespace = namespace;
			debug.useColors = createDebug.useColors();
			debug.color = createDebug.selectColor(namespace);
			debug.extend = extend;
			debug.destroy = createDebug.destroy;
			Object.defineProperty(debug, "enabled", {
				enumerable: true,
				configurable: false,
				get: () => {
					if (enableOverride !== null) return enableOverride;
					if (namespacesCache !== createDebug.namespaces) {
						namespacesCache = createDebug.namespaces;
						enabledCache = createDebug.enabled(namespace);
					}
					return enabledCache;
				},
				set: (v) => {
					enableOverride = v;
				}
			});
			if (typeof createDebug.init === "function") createDebug.init(debug);
			return debug;
		}
		function extend(namespace, delimiter) {
			const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
			newDebug.log = this.log;
			return newDebug;
		}
		/**
		* Enables a debug mode by namespaces. This can include modes
		* separated by a colon and wildcards.
		*
		* @param {String} namespaces
		* @api public
		*/
		function enable(namespaces) {
			createDebug.save(namespaces);
			createDebug.namespaces = namespaces;
			createDebug.names = [];
			createDebug.skips = [];
			const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
			for (const ns of split) if (ns[0] === "-") createDebug.skips.push(ns.slice(1));
			else createDebug.names.push(ns);
		}
		/**
		* Checks if the given string matches a namespace template, honoring
		* asterisks as wildcards.
		*
		* @param {String} search
		* @param {String} template
		* @return {Boolean}
		*/
		function matchesTemplate(search, template) {
			let searchIndex = 0;
			let templateIndex = 0;
			let starIndex = -1;
			let matchIndex = 0;
			while (searchIndex < search.length) if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
				if (template[templateIndex] === "*") {
					starIndex = templateIndex;
					matchIndex = searchIndex;
					templateIndex++;
				} else {
					searchIndex++;
					templateIndex++;
				}
			} else if (starIndex !== -1) {
				templateIndex = starIndex + 1;
				matchIndex++;
				searchIndex = matchIndex;
			} else return false;
			while (templateIndex < template.length && template[templateIndex] === "*") templateIndex++;
			return templateIndex === template.length;
		}
		/**
		* Disable debug output.
		*
		* @return {String} namespaces
		* @api public
		*/
		function disable() {
			const namespaces = [...createDebug.names, ...createDebug.skips.map((namespace) => "-" + namespace)].join(",");
			createDebug.enable("");
			return namespaces;
		}
		/**
		* Returns true if the given mode name is enabled, false otherwise.
		*
		* @param {String} name
		* @return {Boolean}
		* @api public
		*/
		function enabled(name) {
			for (const skip of createDebug.skips) if (matchesTemplate(name, skip)) return false;
			for (const ns of createDebug.names) if (matchesTemplate(name, ns)) return true;
			return false;
		}
		/**
		* Coerce `val`.
		*
		* @param {Mixed} val
		* @return {Mixed}
		* @api private
		*/
		function coerce(val) {
			if (val instanceof Error) return val.stack || val.message;
			return val;
		}
		/**
		* XXX DO NOT USE. This is a temporary stub function.
		* XXX It WILL be removed in the next major release.
		*/
		function destroy() {
			console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
		}
		createDebug.enable(createDebug.load());
		return createDebug;
	}
	module.exports = setup;
}));
//#endregion
//#region node_modules/debug/src/browser.js
var require_browser = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* This is the web browser implementation of `debug()`.
	*/
	exports.formatArgs = formatArgs;
	exports.save = save;
	exports.load = load;
	exports.useColors = useColors;
	exports.storage = localstorage();
	exports.destroy = (() => {
		let warned = false;
		return () => {
			if (!warned) {
				warned = true;
				console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
			}
		};
	})();
	/**
	* Colors.
	*/
	exports.colors = [
		"#0000CC",
		"#0000FF",
		"#0033CC",
		"#0033FF",
		"#0066CC",
		"#0066FF",
		"#0099CC",
		"#0099FF",
		"#00CC00",
		"#00CC33",
		"#00CC66",
		"#00CC99",
		"#00CCCC",
		"#00CCFF",
		"#3300CC",
		"#3300FF",
		"#3333CC",
		"#3333FF",
		"#3366CC",
		"#3366FF",
		"#3399CC",
		"#3399FF",
		"#33CC00",
		"#33CC33",
		"#33CC66",
		"#33CC99",
		"#33CCCC",
		"#33CCFF",
		"#6600CC",
		"#6600FF",
		"#6633CC",
		"#6633FF",
		"#66CC00",
		"#66CC33",
		"#9900CC",
		"#9900FF",
		"#9933CC",
		"#9933FF",
		"#99CC00",
		"#99CC33",
		"#CC0000",
		"#CC0033",
		"#CC0066",
		"#CC0099",
		"#CC00CC",
		"#CC00FF",
		"#CC3300",
		"#CC3333",
		"#CC3366",
		"#CC3399",
		"#CC33CC",
		"#CC33FF",
		"#CC6600",
		"#CC6633",
		"#CC9900",
		"#CC9933",
		"#CCCC00",
		"#CCCC33",
		"#FF0000",
		"#FF0033",
		"#FF0066",
		"#FF0099",
		"#FF00CC",
		"#FF00FF",
		"#FF3300",
		"#FF3333",
		"#FF3366",
		"#FF3399",
		"#FF33CC",
		"#FF33FF",
		"#FF6600",
		"#FF6633",
		"#FF9900",
		"#FF9933",
		"#FFCC00",
		"#FFCC33"
	];
	/**
	* Currently only WebKit-based Web Inspectors, Firefox >= v31,
	* and the Firebug extension (any Firefox version) are known
	* to support "%c" CSS customizations.
	*
	* TODO: add a `localStorage` variable to explicitly enable/disable colors
	*/
	function useColors() {
		if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) return true;
		if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) return false;
		let m;
		return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
	}
	/**
	* Colorize log arguments if enabled.
	*
	* @api public
	*/
	function formatArgs(args) {
		args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
		if (!this.useColors) return;
		const c = "color: " + this.color;
		args.splice(1, 0, c, "color: inherit");
		let index = 0;
		let lastC = 0;
		args[0].replace(/%[a-zA-Z%]/g, (match) => {
			if (match === "%%") return;
			index++;
			if (match === "%c") lastC = index;
		});
		args.splice(lastC, 0, c);
	}
	/**
	* Invokes `console.debug()` when available.
	* No-op when `console.debug` is not a "function".
	* If `console.debug` is not available, falls back
	* to `console.log`.
	*
	* @api public
	*/
	exports.log = console.debug || console.log || (() => {});
	/**
	* Save `namespaces`.
	*
	* @param {String} namespaces
	* @api private
	*/
	function save(namespaces) {
		try {
			if (namespaces) exports.storage.setItem("debug", namespaces);
			else exports.storage.removeItem("debug");
		} catch (error) {}
	}
	/**
	* Load `namespaces`.
	*
	* @return {String} returns the previously persisted debug modes
	* @api private
	*/
	function load() {
		let r;
		try {
			r = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
		} catch (error) {}
		if (!r && typeof process !== "undefined" && "env" in process) r = process.env.DEBUG;
		return r;
	}
	/**
	* Localstorage attempts to return the localstorage.
	*
	* This is necessary because safari throws
	* when a user disables cookies/localstorage
	* and you attempt to access it.
	*
	* @return {LocalStorage}
	* @api private
	*/
	function localstorage() {
		try {
			return localStorage;
		} catch (error) {}
	}
	module.exports = require_common()(exports);
	var { formatters } = module.exports;
	/**
	* Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
	*/
	formatters.j = function(v) {
		try {
			return JSON.stringify(v);
		} catch (error) {
			return "[UnexpectedJSONParseError]: " + error.message;
		}
	};
}));
//#endregion
//#region node_modules/debug/src/node.js
var require_node = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Module dependencies.
	*/
	var tty = __require("tty");
	var util = __require("util");
	/**
	* This is the Node.js implementation of `debug()`.
	*/
	exports.init = init;
	exports.log = log;
	exports.formatArgs = formatArgs;
	exports.save = save;
	exports.load = load;
	exports.useColors = useColors;
	exports.destroy = util.deprecate(() => {}, "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
	/**
	* Colors.
	*/
	exports.colors = [
		6,
		2,
		3,
		4,
		5,
		1
	];
	try {
		const supportsColor = __require("supports-color");
		if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) exports.colors = [
			20,
			21,
			26,
			27,
			32,
			33,
			38,
			39,
			40,
			41,
			42,
			43,
			44,
			45,
			56,
			57,
			62,
			63,
			68,
			69,
			74,
			75,
			76,
			77,
			78,
			79,
			80,
			81,
			92,
			93,
			98,
			99,
			112,
			113,
			128,
			129,
			134,
			135,
			148,
			149,
			160,
			161,
			162,
			163,
			164,
			165,
			166,
			167,
			168,
			169,
			170,
			171,
			172,
			173,
			178,
			179,
			184,
			185,
			196,
			197,
			198,
			199,
			200,
			201,
			202,
			203,
			204,
			205,
			206,
			207,
			208,
			209,
			214,
			215,
			220,
			221
		];
	} catch (error) {}
	/**
	* Build up the default `inspectOpts` object from the environment variables.
	*
	*   $ DEBUG_COLORS=no DEBUG_DEPTH=10 DEBUG_SHOW_HIDDEN=enabled node script.js
	*/
	exports.inspectOpts = Object.keys(process.env).filter((key) => {
		return /^debug_/i.test(key);
	}).reduce((obj, key) => {
		const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
			return k.toUpperCase();
		});
		let val = process.env[key];
		if (/^(yes|on|true|enabled)$/i.test(val)) val = true;
		else if (/^(no|off|false|disabled)$/i.test(val)) val = false;
		else if (val === "null") val = null;
		else val = Number(val);
		obj[prop] = val;
		return obj;
	}, {});
	/**
	* Is stdout a TTY? Colored output is enabled when `true`.
	*/
	function useColors() {
		return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(process.stderr.fd);
	}
	/**
	* Adds ANSI color escape codes if enabled.
	*
	* @api public
	*/
	function formatArgs(args) {
		const { namespace: name, useColors } = this;
		if (useColors) {
			const c = this.color;
			const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
			const prefix = `  ${colorCode};1m${name} \u001B[0m`;
			args[0] = prefix + args[0].split("\n").join("\n" + prefix);
			args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
		} else args[0] = getDate() + name + " " + args[0];
	}
	function getDate() {
		if (exports.inspectOpts.hideDate) return "";
		return (/* @__PURE__ */ new Date()).toISOString() + " ";
	}
	/**
	* Invokes `util.formatWithOptions()` with the specified arguments and writes to stderr.
	*/
	function log(...args) {
		return process.stderr.write(util.formatWithOptions(exports.inspectOpts, ...args) + "\n");
	}
	/**
	* Save `namespaces`.
	*
	* @param {String} namespaces
	* @api private
	*/
	function save(namespaces) {
		if (namespaces) process.env.DEBUG = namespaces;
		else delete process.env.DEBUG;
	}
	/**
	* Load `namespaces`.
	*
	* @return {String} returns the previously persisted debug modes
	* @api private
	*/
	function load() {
		return process.env.DEBUG;
	}
	/**
	* Init logic for `debug` instances.
	*
	* Create a new `inspectOpts` object in case `useColors` is set
	* differently for a particular `debug` instance.
	*/
	function init(debug) {
		debug.inspectOpts = {};
		const keys = Object.keys(exports.inspectOpts);
		for (let i = 0; i < keys.length; i++) debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
	}
	module.exports = require_common()(exports);
	var { formatters } = module.exports;
	/**
	* Map %o to `util.inspect()`, all on a single line.
	*/
	formatters.o = function(v) {
		this.inspectOpts.colors = this.useColors;
		return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
	};
	/**
	* Map %O to `util.inspect()`, allowing multiple lines if needed.
	*/
	formatters.O = function(v) {
		this.inspectOpts.colors = this.useColors;
		return util.inspect(v, this.inspectOpts);
	};
}));
//#endregion
//#region node_modules/debug/src/index.js
var require_src = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Detect Electron renderer / nwjs process, which is node, but we should
	* treat as a browser.
	*/
	if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) module.exports = require_browser();
	else module.exports = require_node();
}));
//#endregion
//#region node_modules/agent-base/dist/helpers.js
var require_helpers = /* @__PURE__ */ __commonJSMin(((exports) => {
	var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		var desc = Object.getOwnPropertyDescriptor(m, k);
		if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
			enumerable: true,
			get: function() {
				return m[k];
			}
		};
		Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		o[k2] = m[k];
	}));
	var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
		Object.defineProperty(o, "default", {
			enumerable: true,
			value: v
		});
	}) : function(o, v) {
		o["default"] = v;
	});
	var __importStar = exports && exports.__importStar || function(mod) {
		if (mod && mod.__esModule) return mod;
		var result = {};
		if (mod != null) {
			for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
		}
		__setModuleDefault(result, mod);
		return result;
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.req = exports.json = exports.toBuffer = void 0;
	var http$1 = __importStar(__require("http"));
	var https = __importStar(__require("https"));
	async function toBuffer(stream) {
		let length = 0;
		const chunks = [];
		for await (const chunk of stream) {
			length += chunk.length;
			chunks.push(chunk);
		}
		return Buffer.concat(chunks, length);
	}
	exports.toBuffer = toBuffer;
	async function json(stream) {
		const str = (await toBuffer(stream)).toString("utf8");
		try {
			return JSON.parse(str);
		} catch (_err) {
			const err = _err;
			err.message += ` (input: ${str})`;
			throw err;
		}
	}
	exports.json = json;
	function req(url, opts = {}) {
		const req = ((typeof url === "string" ? url : url.href).startsWith("https:") ? https : http$1).request(url, opts);
		const promise = new Promise((resolve, reject) => {
			req.once("response", resolve).once("error", reject).end();
		});
		req.then = promise.then.bind(promise);
		return req;
	}
	exports.req = req;
}));
//#endregion
//#region node_modules/agent-base/dist/index.js
var require_dist$2 = /* @__PURE__ */ __commonJSMin(((exports) => {
	var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		var desc = Object.getOwnPropertyDescriptor(m, k);
		if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
			enumerable: true,
			get: function() {
				return m[k];
			}
		};
		Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		o[k2] = m[k];
	}));
	var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
		Object.defineProperty(o, "default", {
			enumerable: true,
			value: v
		});
	}) : function(o, v) {
		o["default"] = v;
	});
	var __importStar = exports && exports.__importStar || function(mod) {
		if (mod && mod.__esModule) return mod;
		var result = {};
		if (mod != null) {
			for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
		}
		__setModuleDefault(result, mod);
		return result;
	};
	var __exportStar = exports && exports.__exportStar || function(m, exports$1) {
		for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports$1, p)) __createBinding(exports$1, m, p);
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Agent = void 0;
	var net$2 = __importStar(__require("net"));
	var http = __importStar(__require("http"));
	var https_1 = __require("https");
	__exportStar(require_helpers(), exports);
	var INTERNAL = Symbol("AgentBaseInternalState");
	var Agent = class extends http.Agent {
		constructor(opts) {
			super(opts);
			this[INTERNAL] = {};
		}
		/**
		* Determine whether this is an `http` or `https` request.
		*/
		isSecureEndpoint(options) {
			if (options) {
				if (typeof options.secureEndpoint === "boolean") return options.secureEndpoint;
				if (typeof options.protocol === "string") return options.protocol === "https:";
			}
			const { stack } = /* @__PURE__ */ new Error();
			if (typeof stack !== "string") return false;
			return stack.split("\n").some((l) => l.indexOf("(https.js:") !== -1 || l.indexOf("node:https:") !== -1);
		}
		incrementSockets(name) {
			if (this.maxSockets === Infinity && this.maxTotalSockets === Infinity) return null;
			if (!this.sockets[name]) this.sockets[name] = [];
			const fakeSocket = new net$2.Socket({ writable: false });
			this.sockets[name].push(fakeSocket);
			this.totalSocketCount++;
			return fakeSocket;
		}
		decrementSockets(name, socket) {
			if (!this.sockets[name] || socket === null) return;
			const sockets = this.sockets[name];
			const index = sockets.indexOf(socket);
			if (index !== -1) {
				sockets.splice(index, 1);
				this.totalSocketCount--;
				if (sockets.length === 0) delete this.sockets[name];
			}
		}
		getName(options) {
			if (this.isSecureEndpoint(options)) return https_1.Agent.prototype.getName.call(this, options);
			return super.getName(options);
		}
		createSocket(req, options, cb) {
			const connectOpts = {
				...options,
				secureEndpoint: this.isSecureEndpoint(options)
			};
			const name = this.getName(connectOpts);
			const fakeSocket = this.incrementSockets(name);
			Promise.resolve().then(() => this.connect(req, connectOpts)).then((socket) => {
				this.decrementSockets(name, fakeSocket);
				if (socket instanceof http.Agent) try {
					return socket.addRequest(req, connectOpts);
				} catch (err) {
					return cb(err);
				}
				this[INTERNAL].currentSocket = socket;
				super.createSocket(req, options, cb);
			}, (err) => {
				this.decrementSockets(name, fakeSocket);
				cb(err);
			});
		}
		createConnection() {
			const socket = this[INTERNAL].currentSocket;
			this[INTERNAL].currentSocket = void 0;
			if (!socket) throw new Error("No socket was returned in the `connect()` function");
			return socket;
		}
		get defaultPort() {
			return this[INTERNAL].defaultPort ?? (this.protocol === "https:" ? 443 : 80);
		}
		set defaultPort(v) {
			if (this[INTERNAL]) this[INTERNAL].defaultPort = v;
		}
		get protocol() {
			return this[INTERNAL].protocol ?? (this.isSecureEndpoint() ? "https:" : "http:");
		}
		set protocol(v) {
			if (this[INTERNAL]) this[INTERNAL].protocol = v;
		}
	};
	exports.Agent = Agent;
}));
//#endregion
//#region node_modules/https-proxy-agent/dist/parse-proxy-response.js
var require_parse_proxy_response = /* @__PURE__ */ __commonJSMin(((exports) => {
	var __importDefault = exports && exports.__importDefault || function(mod) {
		return mod && mod.__esModule ? mod : { "default": mod };
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.parseProxyResponse = void 0;
	var debug = (0, __importDefault(require_src()).default)("https-proxy-agent:parse-proxy-response");
	function parseProxyResponse(socket) {
		return new Promise((resolve, reject) => {
			let buffersLength = 0;
			const buffers = [];
			function read() {
				const b = socket.read();
				if (b) ondata(b);
				else socket.once("readable", read);
			}
			function cleanup() {
				socket.removeListener("end", onend);
				socket.removeListener("error", onerror);
				socket.removeListener("readable", read);
			}
			function onend() {
				cleanup();
				debug("onend");
				reject(/* @__PURE__ */ new Error("Proxy connection ended before receiving CONNECT response"));
			}
			function onerror(err) {
				cleanup();
				debug("onerror %o", err);
				reject(err);
			}
			function ondata(b) {
				buffers.push(b);
				buffersLength += b.length;
				const buffered = Buffer.concat(buffers, buffersLength);
				const endOfHeaders = buffered.indexOf("\r\n\r\n");
				if (endOfHeaders === -1) {
					debug("have not received end of HTTP headers yet...");
					read();
					return;
				}
				const headerParts = buffered.slice(0, endOfHeaders).toString("ascii").split("\r\n");
				const firstLine = headerParts.shift();
				if (!firstLine) {
					socket.destroy();
					return reject(/* @__PURE__ */ new Error("No header received from proxy CONNECT response"));
				}
				const firstLineParts = firstLine.split(" ");
				const statusCode = +firstLineParts[1];
				const statusText = firstLineParts.slice(2).join(" ");
				const headers = {};
				for (const header of headerParts) {
					if (!header) continue;
					const firstColon = header.indexOf(":");
					if (firstColon === -1) {
						socket.destroy();
						return reject(/* @__PURE__ */ new Error(`Invalid header from proxy CONNECT response: "${header}"`));
					}
					const key = header.slice(0, firstColon).toLowerCase();
					const value = header.slice(firstColon + 1).trimStart();
					const current = headers[key];
					if (typeof current === "string") headers[key] = [current, value];
					else if (Array.isArray(current)) current.push(value);
					else headers[key] = value;
				}
				debug("got proxy server response: %o %o", firstLine, headers);
				cleanup();
				resolve({
					connect: {
						statusCode,
						statusText,
						headers
					},
					buffered
				});
			}
			socket.on("error", onerror);
			socket.on("end", onend);
			read();
		});
	}
	exports.parseProxyResponse = parseProxyResponse;
}));
//#endregion
//#region node_modules/https-proxy-agent/dist/index.js
var require_dist$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
	var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		var desc = Object.getOwnPropertyDescriptor(m, k);
		if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
			enumerable: true,
			get: function() {
				return m[k];
			}
		};
		Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		o[k2] = m[k];
	}));
	var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
		Object.defineProperty(o, "default", {
			enumerable: true,
			value: v
		});
	}) : function(o, v) {
		o["default"] = v;
	});
	var __importStar = exports && exports.__importStar || function(mod) {
		if (mod && mod.__esModule) return mod;
		var result = {};
		if (mod != null) {
			for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
		}
		__setModuleDefault(result, mod);
		return result;
	};
	var __importDefault = exports && exports.__importDefault || function(mod) {
		return mod && mod.__esModule ? mod : { "default": mod };
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.HttpsProxyAgent = void 0;
	var net$1 = __importStar(__require("net"));
	var tls$1 = __importStar(__require("tls"));
	var assert_1 = __importDefault(__require("assert"));
	var debug_1 = __importDefault(require_src());
	var agent_base_1 = require_dist$2();
	var url_1$1 = __require("url");
	var parse_proxy_response_1 = require_parse_proxy_response();
	var debug = (0, debug_1.default)("https-proxy-agent");
	var setServernameFromNonIpHost = (options) => {
		if (options.servername === void 0 && options.host && !net$1.isIP(options.host)) return {
			...options,
			servername: options.host
		};
		return options;
	};
	/**
	* The `HttpsProxyAgent` implements an HTTP Agent subclass that connects to
	* the specified "HTTP(s) proxy server" in order to proxy HTTPS requests.
	*
	* Outgoing HTTP requests are first tunneled through the proxy server using the
	* `CONNECT` HTTP request method to establish a connection to the proxy server,
	* and then the proxy server connects to the destination target and issues the
	* HTTP request from the proxy server.
	*
	* `https:` requests have their socket connection upgraded to TLS once
	* the connection to the proxy server has been established.
	*/
	var HttpsProxyAgent = class extends agent_base_1.Agent {
		constructor(proxy, opts) {
			super(opts);
			this.options = { path: void 0 };
			this.proxy = typeof proxy === "string" ? new url_1$1.URL(proxy) : proxy;
			this.proxyHeaders = opts?.headers ?? {};
			debug("Creating new HttpsProxyAgent instance: %o", this.proxy.href);
			const host = (this.proxy.hostname || this.proxy.host).replace(/^\[|\]$/g, "");
			const port = this.proxy.port ? parseInt(this.proxy.port, 10) : this.proxy.protocol === "https:" ? 443 : 80;
			this.connectOpts = {
				ALPNProtocols: ["http/1.1"],
				...opts ? omit(opts, "headers") : null,
				host,
				port
			};
		}
		/**
		* Called when the node-core HTTP client library is creating a
		* new HTTP request.
		*/
		async connect(req, opts) {
			const { proxy } = this;
			if (!opts.host) throw new TypeError("No \"host\" provided");
			let socket;
			if (proxy.protocol === "https:") {
				debug("Creating `tls.Socket`: %o", this.connectOpts);
				socket = tls$1.connect(setServernameFromNonIpHost(this.connectOpts));
			} else {
				debug("Creating `net.Socket`: %o", this.connectOpts);
				socket = net$1.connect(this.connectOpts);
			}
			const headers = typeof this.proxyHeaders === "function" ? this.proxyHeaders() : { ...this.proxyHeaders };
			const host = net$1.isIPv6(opts.host) ? `[${opts.host}]` : opts.host;
			let payload = `CONNECT ${host}:${opts.port} HTTP/1.1\r\n`;
			if (proxy.username || proxy.password) {
				const auth = `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`;
				headers["Proxy-Authorization"] = `Basic ${Buffer.from(auth).toString("base64")}`;
			}
			headers.Host = `${host}:${opts.port}`;
			if (!headers["Proxy-Connection"]) headers["Proxy-Connection"] = this.keepAlive ? "Keep-Alive" : "close";
			for (const name of Object.keys(headers)) payload += `${name}: ${headers[name]}\r\n`;
			const proxyResponsePromise = (0, parse_proxy_response_1.parseProxyResponse)(socket);
			socket.write(`${payload}\r\n`);
			const { connect, buffered } = await proxyResponsePromise;
			req.emit("proxyConnect", connect);
			this.emit("proxyConnect", connect, req);
			if (connect.statusCode === 200) {
				req.once("socket", resume);
				if (opts.secureEndpoint) {
					debug("Upgrading socket connection to TLS");
					return tls$1.connect({
						...omit(setServernameFromNonIpHost(opts), "host", "path", "port"),
						socket
					});
				}
				return socket;
			}
			socket.destroy();
			const fakeSocket = new net$1.Socket({ writable: false });
			fakeSocket.readable = true;
			req.once("socket", (s) => {
				debug("Replaying proxy buffer for failed request");
				(0, assert_1.default)(s.listenerCount("data") > 0);
				s.push(buffered);
				s.push(null);
			});
			return fakeSocket;
		}
	};
	HttpsProxyAgent.protocols = ["http", "https"];
	exports.HttpsProxyAgent = HttpsProxyAgent;
	function resume(socket) {
		socket.resume();
	}
	function omit(obj, ...keys) {
		const ret = {};
		let key;
		for (key in obj) if (!keys.includes(key)) ret[key] = obj[key];
		return ret;
	}
}));
//#endregion
//#region node_modules/http-proxy-agent/dist/index.js
var require_dist = /* @__PURE__ */ __commonJSMin(((exports) => {
	var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		var desc = Object.getOwnPropertyDescriptor(m, k);
		if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
			enumerable: true,
			get: function() {
				return m[k];
			}
		};
		Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		o[k2] = m[k];
	}));
	var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
		Object.defineProperty(o, "default", {
			enumerable: true,
			value: v
		});
	}) : function(o, v) {
		o["default"] = v;
	});
	var __importStar = exports && exports.__importStar || function(mod) {
		if (mod && mod.__esModule) return mod;
		var result = {};
		if (mod != null) {
			for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
		}
		__setModuleDefault(result, mod);
		return result;
	};
	var __importDefault = exports && exports.__importDefault || function(mod) {
		return mod && mod.__esModule ? mod : { "default": mod };
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.HttpProxyAgent = void 0;
	var net = __importStar(__require("net"));
	var tls = __importStar(__require("tls"));
	var debug_1 = __importDefault(require_src());
	var events_1 = __require("events");
	var agent_base_1 = require_dist$2();
	var url_1 = __require("url");
	var debug = (0, debug_1.default)("http-proxy-agent");
	/**
	* The `HttpProxyAgent` implements an HTTP Agent subclass that connects
	* to the specified "HTTP proxy server" in order to proxy HTTP requests.
	*/
	var HttpProxyAgent = class extends agent_base_1.Agent {
		constructor(proxy, opts) {
			super(opts);
			this.proxy = typeof proxy === "string" ? new url_1.URL(proxy) : proxy;
			this.proxyHeaders = opts?.headers ?? {};
			debug("Creating new HttpProxyAgent instance: %o", this.proxy.href);
			const host = (this.proxy.hostname || this.proxy.host).replace(/^\[|\]$/g, "");
			const port = this.proxy.port ? parseInt(this.proxy.port, 10) : this.proxy.protocol === "https:" ? 443 : 80;
			this.connectOpts = {
				...opts ? omit(opts, "headers") : null,
				host,
				port
			};
		}
		addRequest(req, opts) {
			req._header = null;
			this.setRequestProps(req, opts);
			super.addRequest(req, opts);
		}
		setRequestProps(req, opts) {
			const { proxy } = this;
			const base = `${opts.secureEndpoint ? "https:" : "http:"}//${req.getHeader("host") || "localhost"}`;
			const url = new url_1.URL(req.path, base);
			if (opts.port !== 80) url.port = String(opts.port);
			req.path = String(url);
			const headers = typeof this.proxyHeaders === "function" ? this.proxyHeaders() : { ...this.proxyHeaders };
			if (proxy.username || proxy.password) {
				const auth = `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`;
				headers["Proxy-Authorization"] = `Basic ${Buffer.from(auth).toString("base64")}`;
			}
			if (!headers["Proxy-Connection"]) headers["Proxy-Connection"] = this.keepAlive ? "Keep-Alive" : "close";
			for (const name of Object.keys(headers)) {
				const value = headers[name];
				if (value) req.setHeader(name, value);
			}
		}
		async connect(req, opts) {
			req._header = null;
			if (!req.path.includes("://")) this.setRequestProps(req, opts);
			let first;
			let endOfHeaders;
			debug("Regenerating stored HTTP header string for request");
			req._implicitHeader();
			if (req.outputData && req.outputData.length > 0) {
				debug("Patching connection write() output buffer with updated header");
				first = req.outputData[0].data;
				endOfHeaders = first.indexOf("\r\n\r\n") + 4;
				req.outputData[0].data = req._header + first.substring(endOfHeaders);
				debug("Output buffer: %o", req.outputData[0].data);
			}
			let socket;
			if (this.proxy.protocol === "https:") {
				debug("Creating `tls.Socket`: %o", this.connectOpts);
				socket = tls.connect(this.connectOpts);
			} else {
				debug("Creating `net.Socket`: %o", this.connectOpts);
				socket = net.connect(this.connectOpts);
			}
			await (0, events_1.once)(socket, "connect");
			return socket;
		}
	};
	HttpProxyAgent.protocols = ["http", "https"];
	exports.HttpProxyAgent = HttpProxyAgent;
	function omit(obj, ...keys) {
		const ret = {};
		let key;
		for (key in obj) if (!keys.includes(key)) ret[key] = obj[key];
		return ret;
	}
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/policies/proxyPolicy.js
var import_dist = require_dist$1();
var import_dist$1 = require_dist();
var HTTPS_PROXY = "HTTPS_PROXY";
var HTTP_PROXY = "HTTP_PROXY";
var ALL_PROXY = "ALL_PROXY";
var NO_PROXY = "NO_PROXY";
/**
* The programmatic identifier of the proxyPolicy.
*/
var proxyPolicyName = "proxyPolicy";
/**
* Stores the patterns specified in NO_PROXY environment variable.
* @internal
*/
var globalNoProxyList = [];
var noProxyListLoaded = false;
/** A cache of whether a host should bypass the proxy. */
var globalBypassedMap = /* @__PURE__ */ new Map();
function getEnvironmentValue(name) {
	if (process.env[name]) return process.env[name];
	else if (process.env[name.toLowerCase()]) return process.env[name.toLowerCase()];
}
function loadEnvironmentProxyValue() {
	if (!process) return;
	const httpsProxy = getEnvironmentValue(HTTPS_PROXY);
	const allProxy = getEnvironmentValue(ALL_PROXY);
	const httpProxy = getEnvironmentValue(HTTP_PROXY);
	return httpsProxy || allProxy || httpProxy;
}
/**
* Check whether the host of a given `uri` matches any pattern in the no proxy list.
* If there's a match, any request sent to the same host shouldn't have the proxy settings set.
* This implementation is a port of https://github.com/Azure/azure-sdk-for-net/blob/8cca811371159e527159c7eb65602477898683e2/sdk/core/Azure.Core/src/Pipeline/Internal/HttpEnvironmentProxy.cs#L210
*/
function isBypassed(uri, noProxyList, bypassedMap) {
	if (noProxyList.length === 0) return false;
	const host = new URL(uri).hostname;
	if (bypassedMap?.has(host)) return bypassedMap.get(host);
	let isBypassedFlag = false;
	for (const pattern of noProxyList) if (pattern[0] === ".") {
		if (host.endsWith(pattern)) isBypassedFlag = true;
		else if (host.length === pattern.length - 1 && host === pattern.slice(1)) isBypassedFlag = true;
	} else if (host === pattern) isBypassedFlag = true;
	bypassedMap?.set(host, isBypassedFlag);
	return isBypassedFlag;
}
function loadNoProxy() {
	const noProxy = getEnvironmentValue(NO_PROXY);
	noProxyListLoaded = true;
	if (noProxy) return noProxy.split(",").map((item) => item.trim()).filter((item) => item.length);
	return [];
}
/**
* This method attempts to parse a proxy URL from the environment
* variables `HTTPS_PROXY` or `HTTP_PROXY`.
*/
function getDefaultProxySettingsInternal() {
	const envProxy = loadEnvironmentProxyValue();
	return envProxy ? new URL(envProxy) : void 0;
}
function getUrlFromProxySettings(settings) {
	let parsedProxyUrl;
	try {
		parsedProxyUrl = new URL(settings.host);
	} catch {
		throw new Error(`Expecting a valid host string in proxy settings, but found "${settings.host}".`);
	}
	parsedProxyUrl.port = String(settings.port);
	if (settings.username) parsedProxyUrl.username = settings.username;
	if (settings.password) parsedProxyUrl.password = settings.password;
	return parsedProxyUrl;
}
function setProxyAgentOnRequest(request, cachedAgents, proxyUrl) {
	if (request.agent) return;
	const isInsecure = new URL(request.url).protocol !== "https:";
	if (request.tlsSettings) logger$3.warning("TLS settings are not supported in combination with custom Proxy, certificates provided to the client will be ignored.");
	if (isInsecure) {
		if (!cachedAgents.httpProxyAgent) cachedAgents.httpProxyAgent = new import_dist$1.HttpProxyAgent(proxyUrl);
		request.agent = cachedAgents.httpProxyAgent;
	} else {
		if (!cachedAgents.httpsProxyAgent) cachedAgents.httpsProxyAgent = new import_dist.HttpsProxyAgent(proxyUrl);
		request.agent = cachedAgents.httpsProxyAgent;
	}
}
/**
* A policy that allows one to apply proxy settings to all requests.
* If not passed static settings, they will be retrieved from the HTTPS_PROXY
* or HTTP_PROXY environment variables.
* @param proxySettings - ProxySettings to use on each request.
* @param options - additional settings, for example, custom NO_PROXY patterns
*/
function proxyPolicy$1(proxySettings, options) {
	if (!noProxyListLoaded) globalNoProxyList.push(...loadNoProxy());
	const defaultProxy = proxySettings ? getUrlFromProxySettings(proxySettings) : getDefaultProxySettingsInternal();
	const cachedAgents = {};
	return {
		name: proxyPolicyName,
		async sendRequest(request, next) {
			if (!request.proxySettings && defaultProxy && !isBypassed(request.url, options?.customNoProxyList ?? globalNoProxyList, options?.customNoProxyList ? void 0 : globalBypassedMap)) setProxyAgentOnRequest(request, cachedAgents, defaultProxy);
			else if (request.proxySettings) setProxyAgentOnRequest(request, cachedAgents, getUrlFromProxySettings(request.proxySettings));
			return next(request);
		}
	};
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/policies/decompressResponsePolicy.js
/**
* The programmatic identifier of the decompressResponsePolicy.
*/
var decompressResponsePolicyName = "decompressResponsePolicy";
/**
* A policy to enable response decompression according to Accept-Encoding header
* https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding
*/
function decompressResponsePolicy$1() {
	return {
		name: decompressResponsePolicyName,
		async sendRequest(request, next) {
			if (request.method !== "HEAD") request.headers.set("Accept-Encoding", "gzip,deflate");
			return next(request);
		}
	};
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/policies/redirectPolicy.js
/**
* The programmatic identifier of the redirectPolicy.
*/
var redirectPolicyName = "redirectPolicy";
/**
* Methods that are allowed to follow redirects 301 and 302
*/
var allowedRedirect = ["GET", "HEAD"];
/**
* A policy to follow Location headers from the server in order
* to support server-side redirection.
* In the browser, this policy is not used.
* @param options - Options to control policy behavior.
*/
function redirectPolicy$1(options = {}) {
	const { maxRetries = 20, allowCrossOriginRedirects = false } = options;
	return {
		name: redirectPolicyName,
		async sendRequest(request, next) {
			return handleRedirect(next, await next(request), maxRetries, allowCrossOriginRedirects);
		}
	};
}
async function handleRedirect(next, response, maxRetries, allowCrossOriginRedirects, currentRetries = 0) {
	const { request, status, headers } = response;
	const locationHeader = headers.get("location");
	if (locationHeader && (status === 300 || status === 301 && allowedRedirect.includes(request.method) || status === 302 && allowedRedirect.includes(request.method) || status === 303 && request.method === "POST" || status === 307) && currentRetries < maxRetries) {
		const url = new URL(locationHeader, request.url);
		if (!allowCrossOriginRedirects) {
			const originalUrl = new URL(request.url);
			if (url.origin !== originalUrl.origin) {
				logger$3.verbose(`Skipping cross-origin redirect from ${originalUrl.origin} to ${url.origin}.`);
				return response;
			}
		}
		request.url = url.toString();
		if (status === 303) {
			request.method = "GET";
			request.headers.delete("Content-Length");
			delete request.body;
		}
		request.headers.delete("Authorization");
		return handleRedirect(next, await next(request), maxRetries, allowCrossOriginRedirects, currentRetries + 1);
	}
	return response;
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/util/typeGuards.js
function isBlob(x) {
	return x instanceof Blob;
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/util/concat.js
async function* streamAsyncIterator() {
	const reader = this.getReader();
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) return;
			yield value;
		}
	} finally {
		reader.releaseLock();
	}
}
function makeAsyncIterable(webStream) {
	if (!webStream[Symbol.asyncIterator]) webStream[Symbol.asyncIterator] = streamAsyncIterator.bind(webStream);
	if (!webStream.values) webStream.values = streamAsyncIterator.bind(webStream);
}
function ensureNodeStream(stream) {
	if (stream instanceof ReadableStream) {
		makeAsyncIterable(stream);
		return Readable$1.fromWeb(stream);
	} else return stream;
}
function toStream(source) {
	if (source instanceof Uint8Array) return Readable$1.from(Buffer.from(source));
	else if (isBlob(source)) return ensureNodeStream(source.stream());
	else return ensureNodeStream(source);
}
/**
* Utility function that concatenates a set of binary inputs into one combined output.
*
* @param sources - array of sources for the concatenation
* @returns - in Node, a (() =\> NodeJS.ReadableStream) which, when read, produces a concatenation of all the inputs.
*           In browser, returns a `Blob` representing all the concatenated inputs.
*
* @internal
*/
async function concat(sources) {
	return function() {
		const streams = sources.map((x) => typeof x === "function" ? x() : x).map(toStream);
		return Readable$1.from((async function* () {
			for (const stream of streams) for await (const chunk of stream) yield chunk;
		})());
	};
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/policies/multipartPolicy.js
function generateBoundary() {
	return `----AzSDKFormBoundary${randomUUID()}`;
}
function encodeHeaders(headers) {
	let result = "";
	for (const [key, value] of headers) result += `${key}: ${value}\r\n`;
	return result;
}
function getLength(source) {
	if (source instanceof Uint8Array) return source.byteLength;
	else if (isBlob(source)) return source.size === -1 ? void 0 : source.size;
	else return;
}
function getTotalLength(sources) {
	let total = 0;
	for (const source of sources) {
		const partLength = getLength(source);
		if (partLength === void 0) return;
		else total += partLength;
	}
	return total;
}
async function buildRequestBody(request, parts, boundary) {
	const sources = [
		stringToUint8Array(`--${boundary}`, "utf-8"),
		...parts.flatMap((part) => [
			stringToUint8Array("\r\n", "utf-8"),
			stringToUint8Array(encodeHeaders(part.headers), "utf-8"),
			stringToUint8Array("\r\n", "utf-8"),
			part.body,
			stringToUint8Array(`\r\n--${boundary}`, "utf-8")
		]),
		stringToUint8Array("--\r\n\r\n", "utf-8")
	];
	const contentLength = getTotalLength(sources);
	if (contentLength) request.headers.set("Content-Length", contentLength);
	request.body = await concat(sources);
}
/**
* Name of multipart policy
*/
var multipartPolicyName$1 = "multipartPolicy";
var maxBoundaryLength = 70;
var validBoundaryCharacters = /* @__PURE__ */ new Set(`abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'()+,-./:=?`);
function assertValidBoundary(boundary) {
	if (boundary.length > maxBoundaryLength) throw new Error(`Multipart boundary "${boundary}" exceeds maximum length of 70 characters`);
	if (Array.from(boundary).some((x) => !validBoundaryCharacters.has(x))) throw new Error(`Multipart boundary "${boundary}" contains invalid characters`);
}
/**
* Pipeline policy for multipart requests
*/
function multipartPolicy$1() {
	return {
		name: multipartPolicyName$1,
		async sendRequest(request, next) {
			if (!request.multipartBody) return next(request);
			if (request.body) throw new Error("multipartBody and regular body cannot be set at the same time");
			let boundary = request.multipartBody.boundary;
			const contentTypeHeader = request.headers.get("Content-Type") ?? "multipart/mixed";
			const parsedHeader = contentTypeHeader.match(/^(multipart\/[^ ;]+)(?:; *boundary=(.+))?$/);
			if (!parsedHeader) throw new Error(`Got multipart request body, but content-type header was not multipart: ${contentTypeHeader}`);
			const [, contentType, parsedBoundary] = parsedHeader;
			if (parsedBoundary && boundary && parsedBoundary !== boundary) throw new Error(`Multipart boundary was specified as ${parsedBoundary} in the header, but got ${boundary} in the request body`);
			boundary ??= parsedBoundary;
			if (boundary) assertValidBoundary(boundary);
			else boundary = generateBoundary();
			request.headers.set("Content-Type", `${contentType}; boundary=${boundary}`);
			await buildRequestBody(request, request.multipartBody.parts, boundary);
			request.multipartBody = void 0;
			return next(request);
		}
	};
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/pipeline.js
/**
* Creates a totally empty pipeline.
* Useful for testing or creating a custom one.
*/
function createEmptyPipeline() {
	return createEmptyPipeline$1();
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/policies/logPolicy.js
/**
* A policy that logs all requests and responses.
* @param options - Options to configure logPolicy.
*/
function logPolicy(options = {}) {
	return logPolicy$1({
		logger: logger$4.info,
		...options
	});
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/policies/redirectPolicy.js
/**
* A policy to follow Location headers from the server in order
* to support server-side redirection.
* In the browser, this policy is not used.
* @param options - Options to control policy behavior.
*/
function redirectPolicy(options = {}) {
	return redirectPolicy$1(options);
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/util/userAgentPlatform.js
/**
* @internal
*/
function getHeaderName() {
	return "User-Agent";
}
/**
* @internal
*/
async function setPlatformSpecificData(map) {
	if (process$1 && process$1.versions) {
		const osInfo = `${os.type()} ${os.release()}; ${os.arch()}`;
		if (process$1.versions.bun) map.set("Bun", `${process$1.versions.bun} (${osInfo})`);
		else if (process$1.versions.deno) map.set("Deno", `${process$1.versions.deno} (${osInfo})`);
		else if (process$1.versions.node) map.set("Node", `${process$1.versions.node} (${osInfo})`);
	}
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/constants.js
var SDK_VERSION = "1.25.0";
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/util/userAgent.js
function getUserAgentString(telemetryInfo) {
	const parts = [];
	for (const [key, value] of telemetryInfo) {
		const token = value ? `${key}/${value}` : key;
		parts.push(token);
	}
	return parts.join(" ");
}
/**
* @internal
*/
function getUserAgentHeaderName() {
	return getHeaderName();
}
/**
* @internal
*/
async function getUserAgentValue(prefix) {
	const runtimeInfo = /* @__PURE__ */ new Map();
	runtimeInfo.set("core-rest-pipeline", SDK_VERSION);
	await setPlatformSpecificData(runtimeInfo);
	const defaultAgent = getUserAgentString(runtimeInfo);
	return prefix ? `${prefix} ${defaultAgent}` : defaultAgent;
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/policies/userAgentPolicy.js
var UserAgentHeaderName = getUserAgentHeaderName();
/**
* The programmatic identifier of the userAgentPolicy.
*/
var userAgentPolicyName = "userAgentPolicy";
/**
* A policy that sets the User-Agent header (or equivalent) to reflect
* the library version.
* @param options - Options to customize the user agent value.
*/
function userAgentPolicy(options = {}) {
	const userAgentValue = getUserAgentValue(options.userAgentPrefix);
	return {
		name: userAgentPolicyName,
		async sendRequest(request, next) {
			if (!request.headers.has(UserAgentHeaderName)) request.headers.set(UserAgentHeaderName, await userAgentValue);
			return next(request);
		}
	};
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/util/file.js
/**
* Private symbol used as key on objects created using createFile containing the
* original source of the file object.
*
* This is used in Node to access the original Node stream without using Blob#stream, which
* returns a web stream. This is done to avoid a couple of bugs to do with Blob#stream and
* Readable#to/fromWeb in Node versions we support:
* - https://github.com/nodejs/node/issues/42694 (fixed in Node 18.14)
* - https://github.com/nodejs/node/issues/48916 (fixed in Node 20.6)
*
* Once these versions are no longer supported, we may be able to stop doing this.
*
* @internal
*/
var rawContent = Symbol("rawContent");
/**
* Type guard to check if a given object is a blob-like object with a raw content property.
*/
function hasRawContent(x) {
	return typeof x[rawContent] === "function";
}
/**
* Extract the raw content from a given blob-like object. If the input was created using createFile
* or createFileFromStream, the exact content passed into createFile/createFileFromStream will be used.
* For true instances of Blob and File, returns the actual blob.
*
* @internal
*/
function getRawContent(blob) {
	if (hasRawContent(blob)) return blob[rawContent]();
	else return blob;
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/policies/multipartPolicy.js
/**
* Name of multipart policy
*/
var multipartPolicyName = multipartPolicyName$1;
/**
* Pipeline policy for multipart requests
*/
function multipartPolicy() {
	const tspPolicy = multipartPolicy$1();
	return {
		name: multipartPolicyName,
		sendRequest: async (request, next) => {
			if (request.multipartBody) {
				for (const part of request.multipartBody.parts) if (hasRawContent(part.body)) part.body = getRawContent(part.body);
			}
			return tspPolicy.sendRequest(request, next);
		}
	};
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/policies/decompressResponsePolicy.js
/**
* A policy to enable response decompression according to Accept-Encoding header
* https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding
*/
function decompressResponsePolicy() {
	return decompressResponsePolicy$1();
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/policies/defaultRetryPolicy.js
/**
* A policy that retries according to three strategies:
* - When the server sends a 429 response with a Retry-After header.
* - When there are errors in the underlying transport layer (e.g. DNS lookup failures).
* - Or otherwise if the outgoing request fails, it will retry with an exponentially increasing delay.
*/
function defaultRetryPolicy(options = {}) {
	return defaultRetryPolicy$1(options);
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/policies/formDataPolicy.js
/**
* A policy that encodes FormData on the request into the body.
*/
function formDataPolicy() {
	return formDataPolicy$1();
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/policies/proxyPolicy.js
/**
* A policy that allows one to apply proxy settings to all requests.
* If not passed static settings, they will be retrieved from the HTTPS_PROXY
* or HTTP_PROXY environment variables.
* @param proxySettings - ProxySettings to use on each request.
* @param options - additional settings, for example, custom NO_PROXY patterns
*/
function proxyPolicy(proxySettings, options) {
	return proxyPolicy$1(proxySettings, options);
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/policies/setClientRequestIdPolicy.js
/**
* The programmatic identifier of the setClientRequestIdPolicy.
*/
var setClientRequestIdPolicyName = "setClientRequestIdPolicy";
/**
* Each PipelineRequest gets a unique id upon creation.
* This policy passes that unique id along via an HTTP header to enable better
* telemetry and tracing.
* @param requestIdHeaderName - The name of the header to pass the request ID to.
*/
function setClientRequestIdPolicy(requestIdHeaderName = "x-ms-client-request-id") {
	return {
		name: setClientRequestIdPolicyName,
		async sendRequest(request, next) {
			if (!request.headers.has(requestIdHeaderName)) request.headers.set(requestIdHeaderName, request.requestId);
			return next(request);
		}
	};
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/policies/agentPolicy.js
/**
* Gets a pipeline policy that sets http.agent
*/
function agentPolicy(agent) {
	return agentPolicy$1(agent);
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/policies/tlsPolicy.js
/**
* Gets a pipeline policy that adds the client certificate to the HttpClient agent for authentication.
*/
function tlsPolicy(tlsSettings) {
	return tlsPolicy$1(tlsSettings);
}
//#endregion
//#region node_modules/@azure/core-tracing/dist/esm/tracingContext.js
/** @internal */
var knownContextKeys = {
	span: Symbol.for("@azure/core-tracing span"),
	namespace: Symbol.for("@azure/core-tracing namespace")
};
/**
* Creates a new {@link TracingContext} with the given options.
* @param options - A set of known keys that may be set on the context.
* @returns A new {@link TracingContext} with the given options.
*
* @internal
*/
function createTracingContext(options = {}) {
	let context = new TracingContextImpl(options.parentContext);
	if (options.span) context = context.setValue(knownContextKeys.span, options.span);
	if (options.namespace) context = context.setValue(knownContextKeys.namespace, options.namespace);
	return context;
}
/** @internal */
var TracingContextImpl = class TracingContextImpl {
	_contextMap;
	constructor(initialContext) {
		this._contextMap = initialContext instanceof TracingContextImpl ? new Map(initialContext._contextMap) : /* @__PURE__ */ new Map();
	}
	setValue(key, value) {
		const newContext = new TracingContextImpl(this);
		newContext._contextMap.set(key, value);
		return newContext;
	}
	getValue(key) {
		return this._contextMap.get(key);
	}
	deleteValue(key) {
		const newContext = new TracingContextImpl(this);
		newContext._contextMap.delete(key);
		return newContext;
	}
};
/**
* Defines the shared state between CJS and ESM by re-exporting the CJS state.
*/
var state$1 = (/* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.state = void 0;
	/**
	* @internal
	*
	* Holds the singleton instrumenter, to be shared across CJS and ESM imports.
	*/
	exports.state = { instrumenterImplementation: void 0 };
})))().state;
//#endregion
//#region node_modules/@azure/core-tracing/dist/esm/instrumenter.js
function createDefaultTracingSpan() {
	return {
		end: () => {},
		isRecording: () => false,
		recordException: () => {},
		setAttribute: () => {},
		setStatus: () => {},
		addEvent: () => {}
	};
}
function createDefaultInstrumenter() {
	return {
		createRequestHeaders: () => {
			return {};
		},
		parseTraceparentHeader: () => {},
		startSpan: (_name, spanOptions) => {
			return {
				span: createDefaultTracingSpan(),
				tracingContext: createTracingContext({ parentContext: spanOptions.tracingContext })
			};
		},
		withContext(_context, callback, ...callbackArgs) {
			return callback(...callbackArgs);
		}
	};
}
/**
* Gets the currently set instrumenter, a No-Op instrumenter by default.
*
* @returns The currently set instrumenter
*/
function getInstrumenter() {
	if (!state$1.instrumenterImplementation) state$1.instrumenterImplementation = createDefaultInstrumenter();
	return state$1.instrumenterImplementation;
}
//#endregion
//#region node_modules/@azure/core-tracing/dist/esm/tracingClient.js
/**
* Creates a new tracing client.
*
* @param options - Options used to configure the tracing client.
* @returns - An instance of {@link TracingClient}.
*/
function createTracingClient(options) {
	const { namespace, packageName, packageVersion } = options;
	function startSpan(name, operationOptions, spanOptions) {
		const startSpanResult = getInstrumenter().startSpan(name, {
			...spanOptions,
			packageName,
			packageVersion,
			tracingContext: operationOptions?.tracingOptions?.tracingContext
		});
		let tracingContext = startSpanResult.tracingContext;
		const span = startSpanResult.span;
		if (!tracingContext.getValue(knownContextKeys.namespace)) tracingContext = tracingContext.setValue(knownContextKeys.namespace, namespace);
		span.setAttribute("az.namespace", tracingContext.getValue(knownContextKeys.namespace));
		return {
			span,
			updatedOptions: Object.assign({}, operationOptions, { tracingOptions: {
				...operationOptions?.tracingOptions,
				tracingContext
			} })
		};
	}
	async function withSpan(name, operationOptions, callback, spanOptions) {
		const { span, updatedOptions } = startSpan(name, operationOptions, spanOptions);
		try {
			const result = await withContext(updatedOptions.tracingOptions.tracingContext, () => callback(updatedOptions, span));
			span.setStatus({ status: "success" });
			return result;
		} catch (err) {
			span.setStatus({
				status: "error",
				error: err
			});
			throw err;
		} finally {
			span.end();
		}
	}
	function withContext(context, callback, ...callbackArgs) {
		return getInstrumenter().withContext(context, callback, ...callbackArgs);
	}
	/**
	* Parses a traceparent header value into a span identifier.
	*
	* @param traceparentHeader - The traceparent header to parse.
	* @returns An implementation-specific identifier for the span.
	*/
	function parseTraceparentHeader(traceparentHeader) {
		return getInstrumenter().parseTraceparentHeader(traceparentHeader);
	}
	/**
	* Creates a set of request headers to propagate tracing information to a backend.
	*
	* @param tracingContext - The context containing the span to serialize.
	* @returns The set of headers to add to a request.
	*/
	function createRequestHeaders(tracingContext) {
		return getInstrumenter().createRequestHeaders(tracingContext);
	}
	return {
		startSpan,
		withSpan,
		withContext,
		parseTraceparentHeader,
		createRequestHeaders
	};
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/policies/tracingPolicy.js
/**
* The programmatic identifier of the tracingPolicy.
*/
var tracingPolicyName = "tracingPolicy";
/**
* A simple policy to create OpenTelemetry Spans for each request made by the pipeline
* that has SpanOptions with a parent.
* Requests made without a parent Span will not be recorded.
* @param options - Options to configure the telemetry logged by the tracing policy.
*/
function tracingPolicy(options = {}) {
	const userAgentPromise = getUserAgentValue(options.userAgentPrefix);
	const sanitizer = new Sanitizer({ additionalAllowedQueryParameters: options.additionalAllowedQueryParameters });
	const tracingClient = tryCreateTracingClient();
	return {
		name: tracingPolicyName,
		async sendRequest(request, next) {
			if (!tracingClient) return next(request);
			const userAgent = await userAgentPromise;
			const spanAttributes = {
				"http.url": sanitizer.sanitizeUrl(request.url),
				"http.method": request.method,
				"http.user_agent": userAgent,
				requestId: request.requestId
			};
			if (userAgent) spanAttributes["http.user_agent"] = userAgent;
			const { span, tracingContext } = tryCreateSpan(tracingClient, request, spanAttributes) ?? {};
			if (!span || !tracingContext) return next(request);
			try {
				const response = await tracingClient.withContext(tracingContext, next, request);
				tryProcessResponse(span, response);
				return response;
			} catch (err) {
				tryProcessError(span, err);
				throw err;
			}
		}
	};
}
function tryCreateTracingClient() {
	try {
		return createTracingClient({
			namespace: "",
			packageName: "@azure/core-rest-pipeline",
			packageVersion: SDK_VERSION
		});
	} catch (e) {
		logger$4.warning(`Error when creating the TracingClient: ${getErrorMessage(e)}`);
		return;
	}
}
function tryCreateSpan(tracingClient, request, spanAttributes) {
	try {
		const { span, updatedOptions } = tracingClient.startSpan(`HTTP ${request.method}`, { tracingOptions: request.tracingOptions }, {
			spanKind: "client",
			spanAttributes
		});
		if (!span.isRecording()) {
			span.end();
			return;
		}
		const headers = tracingClient.createRequestHeaders(updatedOptions.tracingOptions.tracingContext);
		for (const [key, value] of Object.entries(headers)) request.headers.set(key, value);
		return {
			span,
			tracingContext: updatedOptions.tracingOptions.tracingContext
		};
	} catch (e) {
		logger$4.warning(`Skipping creating a tracing span due to an error: ${getErrorMessage(e)}`);
		return;
	}
}
function tryProcessError(span, error) {
	try {
		span.setStatus({
			status: "error",
			error: isError(error) ? error : void 0
		});
		if (isRestError$1(error) && error.statusCode) span.setAttribute("http.status_code", error.statusCode);
		span.end();
	} catch (e) {
		logger$4.warning(`Skipping tracing span processing due to an error: ${getErrorMessage(e)}`);
	}
}
function tryProcessResponse(span, response) {
	try {
		span.setAttribute("http.status_code", response.status);
		const serviceRequestId = response.headers.get("x-ms-request-id");
		if (serviceRequestId) span.setAttribute("serviceRequestId", serviceRequestId);
		if (response.status >= 400) span.setStatus({ status: "error" });
		span.end();
	} catch (e) {
		logger$4.warning(`Skipping tracing span processing due to an error: ${getErrorMessage(e)}`);
	}
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/util/wrapAbortSignal.js
/**
* Creates a native AbortSignal which reflects the state of the provided AbortSignalLike.
* If the AbortSignalLike is already a native AbortSignal, it is returned as is.
* @param abortSignalLike - The AbortSignalLike to wrap.
* @returns - An object containing the native AbortSignal and an optional cleanup function. The cleanup function should be called when the AbortSignal is no longer needed.
*/
function wrapAbortSignalLike(abortSignalLike) {
	if (abortSignalLike instanceof AbortSignal) return { abortSignal: abortSignalLike };
	if (abortSignalLike.aborted) return { abortSignal: AbortSignal.abort("reason" in abortSignalLike ? abortSignalLike.reason : void 0) };
	const controller = new AbortController();
	let needsCleanup = true;
	function cleanup() {
		if (needsCleanup) {
			abortSignalLike.removeEventListener("abort", listener);
			needsCleanup = false;
		}
	}
	function listener() {
		controller.abort("reason" in abortSignalLike ? abortSignalLike.reason : void 0);
		cleanup();
	}
	abortSignalLike.addEventListener("abort", listener);
	return {
		abortSignal: controller.signal,
		cleanup
	};
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/policies/wrapAbortSignalLikePolicy.js
var wrapAbortSignalLikePolicyName = "wrapAbortSignalLikePolicy";
/**
* Policy that ensure that any AbortSignalLike is wrapped in a native AbortSignal for processing by the pipeline.
* Since the ts-http-runtime expects a native AbortSignal, this policy is used to ensure that any AbortSignalLike is wrapped in a native AbortSignal.
*
* @returns - created policy
*/
function wrapAbortSignalLikePolicy() {
	return {
		name: wrapAbortSignalLikePolicyName,
		sendRequest: async (request, next) => {
			if (!request.abortSignal) return next(request);
			const { abortSignal, cleanup } = wrapAbortSignalLike(request.abortSignal);
			request.abortSignal = abortSignal;
			try {
				return await next(request);
			} finally {
				cleanup?.();
			}
		}
	};
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/createPipelineFromOptions.js
/**
* Create a new pipeline with a default set of customizable policies.
* @param options - Options to configure a custom pipeline.
*/
function createPipelineFromOptions(options) {
	const pipeline = createEmptyPipeline();
	if (isNodeLike) {
		if (options.agent) pipeline.addPolicy(agentPolicy(options.agent));
		if (options.tlsOptions) pipeline.addPolicy(tlsPolicy(options.tlsOptions));
		pipeline.addPolicy(proxyPolicy(options.proxyOptions));
		pipeline.addPolicy(decompressResponsePolicy());
	}
	pipeline.addPolicy(wrapAbortSignalLikePolicy());
	pipeline.addPolicy(formDataPolicy(), { beforePolicies: [multipartPolicyName] });
	pipeline.addPolicy(userAgentPolicy(options.userAgentOptions));
	pipeline.addPolicy(setClientRequestIdPolicy(options.telemetryOptions?.clientRequestIdHeaderName));
	pipeline.addPolicy(multipartPolicy(), { afterPhase: "Deserialize" });
	pipeline.addPolicy(defaultRetryPolicy(options.retryOptions), { phase: "Retry" });
	pipeline.addPolicy(tracingPolicy({
		...options.userAgentOptions,
		...options.loggingOptions
	}), { afterPhase: "Retry" });
	if (isNodeLike) pipeline.addPolicy(redirectPolicy(options.redirectOptions), { afterPhase: "Retry" });
	pipeline.addPolicy(logPolicy(options.loggingOptions), { afterPhase: "Sign" });
	return pipeline;
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/defaultHttpClient.js
/**
* Create the correct HttpClient for the current environment.
*/
function createDefaultHttpClient() {
	const client = createDefaultHttpClient$1();
	return { async sendRequest(request) {
		const { abortSignal, cleanup } = request.abortSignal ? wrapAbortSignalLike(request.abortSignal) : {};
		try {
			request.abortSignal = abortSignal;
			return await client.sendRequest(request);
		} finally {
			cleanup?.();
		}
	} };
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/pipelineRequest.js
/**
* Creates a new pipeline request with the given options.
* This method is to allow for the easy setting of default values and not required.
* @param options - The options to create the request with.
*/
function createPipelineRequest(options) {
	return createPipelineRequest$1(options);
}
//#endregion
//#region node_modules/@azure/core-client/dist/esm/base64.js
/**
* Encodes a byte array in base64 format.
* @param value - the Uint8Array to encode
* @internal
*/
function encodeByteArray(value) {
	return uint8ArrayToString(value, "base64");
}
/**
* Decodes a base64 string into a byte array.
* @param value - the base64 string to decode
* @internal
*/
function decodeString(value) {
	return stringToUint8Array$1(value, "base64");
}
//#endregion
//#region node_modules/@azure/core-client/dist/esm/utils.js
/**
* A type guard for a primitive response body.
* @param value - Value to test
*
* @internal
*/
function isPrimitiveBody(value, mapperTypeName) {
	return mapperTypeName !== "Composite" && mapperTypeName !== "Dictionary" && (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || mapperTypeName?.match(/^(Date|DateTime|DateTimeRfc1123|UnixTime|ByteArray|Base64Url)$/i) !== null || value === void 0 || value === null);
}
var validateISODuration = /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;
/**
* Returns true if the given string is in ISO 8601 format.
* @param value - The value to be validated for ISO 8601 duration format.
* @internal
*/
function isDuration(value) {
	return validateISODuration.test(value);
}
var validUuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i;
/**
* Returns true if the provided uuid is valid.
*
* @param uuid - The uuid that needs to be validated.
*
* @internal
*/
function isValidUuid(uuid) {
	return validUuidRegex.test(uuid);
}
/**
* Maps the response as follows:
* - wraps the response body if needed (typically if its type is primitive).
* - returns null if the combination of the headers and the body is empty.
* - otherwise, returns the combination of the headers and the body.
*
* @param responseObject - a representation of the parsed response
* @returns the response that will be returned to the user which can be null and/or wrapped
*
* @internal
*/
function handleNullableResponseAndWrappableBody(responseObject) {
	const combinedHeadersAndBody = {
		...responseObject.headers,
		...responseObject.body
	};
	if (responseObject.hasNullableType && Object.getOwnPropertyNames(combinedHeadersAndBody).length === 0) return responseObject.shouldWrapBody ? { body: null } : null;
	else return responseObject.shouldWrapBody ? {
		...responseObject.headers,
		body: responseObject.body
	} : combinedHeadersAndBody;
}
/**
* Take a `FullOperationResponse` and turn it into a flat
* response object to hand back to the consumer.
* @param fullResponse - The processed response from the operation request
* @param responseSpec - The response map from the OperationSpec
*
* @internal
*/
function flattenResponse(fullResponse, responseSpec) {
	const parsedHeaders = fullResponse.parsedHeaders;
	if (fullResponse.request.method === "HEAD") return {
		...parsedHeaders,
		body: fullResponse.parsedBody
	};
	const bodyMapper = responseSpec && responseSpec.bodyMapper;
	const isNullable = Boolean(bodyMapper?.nullable);
	const expectedBodyTypeName = bodyMapper?.type.name;
	/** If the body is asked for, we look at the expected body type to handle it */
	if (expectedBodyTypeName === "Stream") return {
		...parsedHeaders,
		blobBody: fullResponse.blobBody,
		readableStreamBody: fullResponse.readableStreamBody
	};
	const modelProperties = expectedBodyTypeName === "Composite" && bodyMapper.type.modelProperties || {};
	const isPageableResponse = Object.keys(modelProperties).some((k) => modelProperties[k].serializedName === "");
	if (expectedBodyTypeName === "Sequence" || isPageableResponse) {
		const arrayResponse = fullResponse.parsedBody ?? [];
		for (const key of Object.keys(modelProperties)) if (modelProperties[key].serializedName) arrayResponse[key] = fullResponse.parsedBody?.[key];
		if (parsedHeaders) for (const key of Object.keys(parsedHeaders)) arrayResponse[key] = parsedHeaders[key];
		return isNullable && !fullResponse.parsedBody && !parsedHeaders && Object.getOwnPropertyNames(modelProperties).length === 0 ? null : arrayResponse;
	}
	return handleNullableResponseAndWrappableBody({
		body: fullResponse.parsedBody,
		headers: parsedHeaders,
		hasNullableType: isNullable,
		shouldWrapBody: isPrimitiveBody(fullResponse.parsedBody, expectedBodyTypeName)
	});
}
//#endregion
//#region node_modules/@azure/core-client/dist/esm/serializer.js
var SerializerImpl = class {
	modelMappers;
	isXML;
	constructor(modelMappers = {}, isXML = false) {
		this.modelMappers = modelMappers;
		this.isXML = isXML;
	}
	/**
	* @deprecated Removing the constraints validation on client side.
	*/
	validateConstraints(mapper, value, objectName) {
		const failValidation = (constraintName, constraintValue) => {
			throw new Error(`"${objectName}" with value "${value}" should satisfy the constraint "${constraintName}": ${constraintValue}.`);
		};
		if (mapper.constraints && value !== void 0 && value !== null) {
			const { ExclusiveMaximum, ExclusiveMinimum, InclusiveMaximum, InclusiveMinimum, MaxItems, MaxLength, MinItems, MinLength, MultipleOf, Pattern, UniqueItems } = mapper.constraints;
			if (ExclusiveMaximum !== void 0 && value >= ExclusiveMaximum) failValidation("ExclusiveMaximum", ExclusiveMaximum);
			if (ExclusiveMinimum !== void 0 && value <= ExclusiveMinimum) failValidation("ExclusiveMinimum", ExclusiveMinimum);
			if (InclusiveMaximum !== void 0 && value > InclusiveMaximum) failValidation("InclusiveMaximum", InclusiveMaximum);
			if (InclusiveMinimum !== void 0 && value < InclusiveMinimum) failValidation("InclusiveMinimum", InclusiveMinimum);
			if (MaxItems !== void 0 && value.length > MaxItems) failValidation("MaxItems", MaxItems);
			if (MaxLength !== void 0 && value.length > MaxLength) failValidation("MaxLength", MaxLength);
			if (MinItems !== void 0 && value.length < MinItems) failValidation("MinItems", MinItems);
			if (MinLength !== void 0 && value.length < MinLength) failValidation("MinLength", MinLength);
			if (MultipleOf !== void 0 && value % MultipleOf !== 0) failValidation("MultipleOf", MultipleOf);
			if (Pattern) {
				const pattern = typeof Pattern === "string" ? new RegExp(Pattern) : Pattern;
				if (typeof value !== "string" || value.match(pattern) === null) failValidation("Pattern", Pattern);
			}
			if (UniqueItems && value.some((item, i, ar) => ar.indexOf(item) !== i)) failValidation("UniqueItems", UniqueItems);
		}
	}
	/**
	* Serialize the given object based on its metadata defined in the mapper
	*
	* @param mapper - The mapper which defines the metadata of the serializable object
	*
	* @param object - A valid Javascript object to be serialized
	*
	* @param objectName - Name of the serialized object
	*
	* @param options - additional options to serialization
	*
	* @returns A valid serialized Javascript object
	*/
	serialize(mapper, object, objectName, options = { xml: {} }) {
		const updatedOptions = { xml: {
			rootName: options.xml.rootName ?? "",
			includeRoot: options.xml.includeRoot ?? false,
			xmlCharKey: options.xml.xmlCharKey ?? "_"
		} };
		let payload = {};
		const mapperType = mapper.type.name;
		if (!objectName) objectName = mapper.serializedName;
		if (mapperType.match(/^Sequence$/i) !== null) payload = [];
		if (mapper.isConstant) object = mapper.defaultValue;
		const { required, nullable } = mapper;
		if (required && nullable && object === void 0) throw new Error(`${objectName} cannot be undefined.`);
		if (required && !nullable && (object === void 0 || object === null)) throw new Error(`${objectName} cannot be null or undefined.`);
		if (!required && nullable === false && object === null) throw new Error(`${objectName} cannot be null.`);
		if (object === void 0 || object === null) payload = object;
		else if (mapperType.match(/^any$/i) !== null) payload = object;
		else if (mapperType.match(/^(Number|String|Boolean|Object|Stream|Uuid)$/i) !== null) payload = serializeBasicTypes(mapperType, objectName, object);
		else if (mapperType.match(/^Enum$/i) !== null) payload = serializeEnumType(objectName, mapper.type.allowedValues, object);
		else if (mapperType.match(/^(Date|DateTime|TimeSpan|DateTimeRfc1123|UnixTime)$/i) !== null) payload = serializeDateTypes(mapperType, object, objectName);
		else if (mapperType.match(/^ByteArray$/i) !== null) payload = serializeByteArrayType(objectName, object);
		else if (mapperType.match(/^Base64Url$/i) !== null) payload = serializeBase64UrlType(objectName, object);
		else if (mapperType.match(/^Sequence$/i) !== null) payload = serializeSequenceType(this, mapper, object, objectName, Boolean(this.isXML), updatedOptions);
		else if (mapperType.match(/^Dictionary$/i) !== null) payload = serializeDictionaryType(this, mapper, object, objectName, Boolean(this.isXML), updatedOptions);
		else if (mapperType.match(/^Composite$/i) !== null) payload = serializeCompositeType(this, mapper, object, objectName, Boolean(this.isXML), updatedOptions);
		return payload;
	}
	/**
	* Deserialize the given object based on its metadata defined in the mapper
	*
	* @param mapper - The mapper which defines the metadata of the serializable object
	*
	* @param responseBody - A valid Javascript entity to be deserialized
	*
	* @param objectName - Name of the deserialized object
	*
	* @param options - Controls behavior of XML parser and builder.
	*
	* @returns A valid deserialized Javascript object
	*/
	deserialize(mapper, responseBody, objectName, options = { xml: {} }) {
		const updatedOptions = {
			xml: {
				rootName: options.xml.rootName ?? "",
				includeRoot: options.xml.includeRoot ?? false,
				xmlCharKey: options.xml.xmlCharKey ?? "_"
			},
			ignoreUnknownProperties: options.ignoreUnknownProperties ?? false
		};
		if (responseBody === void 0 || responseBody === null) {
			if (this.isXML && mapper.type.name === "Sequence" && !mapper.xmlIsWrapped) responseBody = [];
			if (mapper.defaultValue !== void 0) responseBody = mapper.defaultValue;
			return responseBody;
		}
		let payload;
		const mapperType = mapper.type.name;
		if (!objectName) objectName = mapper.serializedName;
		if (mapperType.match(/^Composite$/i) !== null) payload = deserializeCompositeType(this, mapper, responseBody, objectName, updatedOptions);
		else {
			if (this.isXML) {
				const xmlCharKey = updatedOptions.xml.xmlCharKey;
				/**
				* If the mapper specifies this as a non-composite type value but the responseBody contains
				* both header ("$" i.e., XML_ATTRKEY) and body ("#" i.e., XML_CHARKEY) properties,
				* then just reduce the responseBody value to the body ("#" i.e., XML_CHARKEY) property.
				*/
				if (responseBody["$"] !== void 0 && responseBody[xmlCharKey] !== void 0) responseBody = responseBody[xmlCharKey];
			}
			if (mapperType.match(/^Number$/i) !== null) {
				payload = parseFloat(responseBody);
				if (isNaN(payload)) payload = responseBody;
			} else if (mapperType.match(/^Boolean$/i) !== null) {
				if (responseBody === "true") payload = true;
				else if (responseBody === "false") payload = false;
				else payload = responseBody;
			} else if (mapperType.match(/^(String|Enum|Object|Stream|Uuid|TimeSpan|any)$/i) !== null) payload = responseBody;
			else if (mapperType.match(/^(Date|DateTime|DateTimeRfc1123)$/i) !== null) payload = new Date(responseBody);
			else if (mapperType.match(/^UnixTime$/i) !== null) payload = unixTimeToDate(responseBody);
			else if (mapperType.match(/^ByteArray$/i) !== null) payload = decodeString(responseBody);
			else if (mapperType.match(/^Base64Url$/i) !== null) payload = base64UrlToByteArray(responseBody);
			else if (mapperType.match(/^Sequence$/i) !== null) payload = deserializeSequenceType(this, mapper, responseBody, objectName, updatedOptions);
			else if (mapperType.match(/^Dictionary$/i) !== null) payload = deserializeDictionaryType(this, mapper, responseBody, objectName, updatedOptions);
		}
		if (mapper.isConstant) payload = mapper.defaultValue;
		return payload;
	}
};
/**
* Method that creates and returns a Serializer.
* @param modelMappers - Known models to map
* @param isXML - If XML should be supported
*/
function createSerializer(modelMappers = {}, isXML = false) {
	return new SerializerImpl(modelMappers, isXML);
}
function trimEnd(str, ch) {
	let len = str.length;
	while (len - 1 >= 0 && str[len - 1] === ch) --len;
	return str.substr(0, len);
}
function bufferToBase64Url(buffer) {
	if (!buffer) return;
	if (!(buffer instanceof Uint8Array)) throw new Error(`Please provide an input of type Uint8Array for converting to Base64Url.`);
	return trimEnd(encodeByteArray(buffer), "=").replace(/\+/g, "-").replace(/\//g, "_");
}
function base64UrlToByteArray(str) {
	if (!str) return;
	if (str && typeof str.valueOf() !== "string") throw new Error("Please provide an input of type string for converting to Uint8Array");
	str = str.replace(/-/g, "+").replace(/_/g, "/");
	return decodeString(str);
}
function splitSerializeName(prop) {
	const classes = [];
	let partialclass = "";
	if (prop) {
		const subwords = prop.split(".");
		for (const item of subwords) if (item.charAt(item.length - 1) === "\\") partialclass += item.substr(0, item.length - 1) + ".";
		else {
			partialclass += item;
			classes.push(partialclass);
			partialclass = "";
		}
	}
	return classes;
}
function dateToUnixTime(d) {
	if (!d) return;
	if (typeof d.valueOf() === "string") d = new Date(d);
	return Math.floor(d.getTime() / 1e3);
}
function unixTimeToDate(n) {
	if (!n) return;
	return /* @__PURE__ */ new Date(n * 1e3);
}
function serializeBasicTypes(typeName, objectName, value) {
	if (value !== null && value !== void 0) {
		if (typeName.match(/^Number$/i) !== null) {
			if (typeof value !== "number") throw new Error(`${objectName} with value ${value} must be of type number.`);
		} else if (typeName.match(/^String$/i) !== null) {
			if (typeof value.valueOf() !== "string") throw new Error(`${objectName} with value "${value}" must be of type string.`);
		} else if (typeName.match(/^Uuid$/i) !== null) {
			if (!(typeof value.valueOf() === "string" && isValidUuid(value))) throw new Error(`${objectName} with value "${value}" must be of type string and a valid uuid.`);
		} else if (typeName.match(/^Boolean$/i) !== null) {
			if (typeof value !== "boolean") throw new Error(`${objectName} with value ${value} must be of type boolean.`);
		} else if (typeName.match(/^Stream$/i) !== null) {
			const objectType = typeof value;
			if (objectType !== "string" && typeof value.pipe !== "function" && typeof value.tee !== "function" && !(value instanceof ArrayBuffer) && !ArrayBuffer.isView(value) && !((typeof Blob === "function" || typeof Blob === "object") && value instanceof Blob) && objectType !== "function") throw new Error(`${objectName} must be a string, Blob, ArrayBuffer, ArrayBufferView, ReadableStream, or () => ReadableStream.`);
		}
	}
	return value;
}
function serializeEnumType(objectName, allowedValues, value) {
	if (!allowedValues) throw new Error(`Please provide a set of allowedValues to validate ${objectName} as an Enum Type.`);
	if (!allowedValues.some((item) => {
		if (typeof item.valueOf() === "string") return item.toLowerCase() === value.toLowerCase();
		return item === value;
	})) throw new Error(`${value} is not a valid value for ${objectName}. The valid values are: ${JSON.stringify(allowedValues)}.`);
	return value;
}
function serializeByteArrayType(objectName, value) {
	if (value !== void 0 && value !== null) {
		if (!(value instanceof Uint8Array)) throw new Error(`${objectName} must be of type Uint8Array.`);
		value = encodeByteArray(value);
	}
	return value;
}
function serializeBase64UrlType(objectName, value) {
	if (value !== void 0 && value !== null) {
		if (!(value instanceof Uint8Array)) throw new Error(`${objectName} must be of type Uint8Array.`);
		value = bufferToBase64Url(value);
	}
	return value;
}
function serializeDateTypes(typeName, value, objectName) {
	if (value !== void 0 && value !== null) {
		if (typeName.match(/^Date$/i) !== null) {
			if (!(value instanceof Date || typeof value.valueOf() === "string" && !isNaN(Date.parse(value)))) throw new Error(`${objectName} must be an instanceof Date or a string in ISO8601 format.`);
			value = value instanceof Date ? value.toISOString().substring(0, 10) : new Date(value).toISOString().substring(0, 10);
		} else if (typeName.match(/^DateTime$/i) !== null) {
			if (!(value instanceof Date || typeof value.valueOf() === "string" && !isNaN(Date.parse(value)))) throw new Error(`${objectName} must be an instanceof Date or a string in ISO8601 format.`);
			value = value instanceof Date ? value.toISOString() : new Date(value).toISOString();
		} else if (typeName.match(/^DateTimeRfc1123$/i) !== null) {
			if (!(value instanceof Date || typeof value.valueOf() === "string" && !isNaN(Date.parse(value)))) throw new Error(`${objectName} must be an instanceof Date or a string in RFC-1123 format.`);
			value = value instanceof Date ? value.toUTCString() : new Date(value).toUTCString();
		} else if (typeName.match(/^UnixTime$/i) !== null) {
			if (!(value instanceof Date || typeof value.valueOf() === "string" && !isNaN(Date.parse(value)))) throw new Error(`${objectName} must be an instanceof Date or a string in RFC-1123/ISO8601 format for it to be serialized in UnixTime/Epoch format.`);
			value = dateToUnixTime(value);
		} else if (typeName.match(/^TimeSpan$/i) !== null) {
			if (!isDuration(value)) throw new Error(`${objectName} must be a string in ISO 8601 format. Instead was "${value}".`);
		}
	}
	return value;
}
function serializeSequenceType(serializer, mapper, object, objectName, isXml, options) {
	if (!Array.isArray(object)) throw new Error(`${objectName} must be of type Array.`);
	let elementType = mapper.type.element;
	if (!elementType || typeof elementType !== "object") throw new Error(`"element" metadata for an Array must be defined in the mapper and it must be of type "object" in ${objectName}.`);
	if (elementType.type.name === "Composite" && elementType.type.className) elementType = serializer.modelMappers[elementType.type.className] ?? elementType;
	const tempArray = [];
	for (let i = 0; i < object.length; i++) {
		const serializedValue = serializer.serialize(elementType, object[i], objectName, options);
		if (isXml && elementType.xmlNamespace) {
			const xmlnsKey = elementType.xmlNamespacePrefix ? `xmlns:${elementType.xmlNamespacePrefix}` : "xmlns";
			if (elementType.type.name === "Composite") {
				tempArray[i] = { ...serializedValue };
				tempArray[i]["$"] = { [xmlnsKey]: elementType.xmlNamespace };
			} else {
				tempArray[i] = {};
				tempArray[i][options.xml.xmlCharKey] = serializedValue;
				tempArray[i]["$"] = { [xmlnsKey]: elementType.xmlNamespace };
			}
		} else tempArray[i] = serializedValue;
	}
	return tempArray;
}
function serializeDictionaryType(serializer, mapper, object, objectName, isXml, options) {
	if (typeof object !== "object") throw new Error(`${objectName} must be of type object.`);
	const valueType = mapper.type.value;
	if (!valueType || typeof valueType !== "object") throw new Error(`"value" metadata for a Dictionary must be defined in the mapper and it must of type "object" in ${objectName}.`);
	const tempDictionary = {};
	for (const key of Object.keys(object)) tempDictionary[key] = getXmlObjectValue(valueType, serializer.serialize(valueType, object[key], objectName, options), isXml, options);
	if (isXml && mapper.xmlNamespace) {
		const xmlnsKey = mapper.xmlNamespacePrefix ? `xmlns:${mapper.xmlNamespacePrefix}` : "xmlns";
		const result = tempDictionary;
		result["$"] = { [xmlnsKey]: mapper.xmlNamespace };
		return result;
	}
	return tempDictionary;
}
/**
* Resolves the additionalProperties property from a referenced mapper
* @param serializer - the serializer containing the entire set of mappers
* @param mapper - the composite mapper to resolve
* @param objectName - name of the object being serialized
*/
function resolveAdditionalProperties(serializer, mapper, objectName) {
	const additionalProperties = mapper.type.additionalProperties;
	if (!additionalProperties && mapper.type.className) return resolveReferencedMapper(serializer, mapper, objectName)?.type.additionalProperties;
	return additionalProperties;
}
/**
* Finds the mapper referenced by className
* @param serializer - the serializer containing the entire set of mappers
* @param mapper - the composite mapper to resolve
* @param objectName - name of the object being serialized
*/
function resolveReferencedMapper(serializer, mapper, objectName) {
	const className = mapper.type.className;
	if (!className) throw new Error(`Class name for model "${objectName}" is not provided in the mapper "${JSON.stringify(mapper, void 0, 2)}".`);
	return serializer.modelMappers[className];
}
/**
* Resolves a composite mapper's modelProperties.
* @param serializer - the serializer containing the entire set of mappers
* @param mapper - the composite mapper to resolve
*/
function resolveModelProperties(serializer, mapper, objectName) {
	let modelProps = mapper.type.modelProperties;
	if (!modelProps) {
		const modelMapper = resolveReferencedMapper(serializer, mapper, objectName);
		if (!modelMapper) throw new Error(`mapper() cannot be null or undefined for model "${mapper.type.className}".`);
		modelProps = modelMapper?.type.modelProperties;
		if (!modelProps) throw new Error(`modelProperties cannot be null or undefined in the mapper "${JSON.stringify(modelMapper)}" of type "${mapper.type.className}" for object "${objectName}".`);
	}
	return modelProps;
}
function serializeCompositeType(serializer, mapper, object, objectName, isXml, options) {
	if (getPolymorphicDiscriminatorRecursively(serializer, mapper)) mapper = getPolymorphicMapper(serializer, mapper, object, "clientName");
	if (object !== void 0 && object !== null) {
		const payload = {};
		const modelProps = resolveModelProperties(serializer, mapper, objectName);
		for (const key of Object.keys(modelProps)) {
			const propertyMapper = modelProps[key];
			if (propertyMapper.readOnly) continue;
			let propName;
			let parentObject = payload;
			if (serializer.isXML) {
				if (propertyMapper.xmlIsWrapped) propName = propertyMapper.xmlName;
				else propName = propertyMapper.xmlElementName || propertyMapper.xmlName;
			} else {
				const paths = splitSerializeName(propertyMapper.serializedName);
				propName = paths.pop();
				for (const pathName of paths) {
					const childObject = parentObject[pathName];
					if ((childObject === void 0 || childObject === null) && (object[key] !== void 0 && object[key] !== null || propertyMapper.defaultValue !== void 0)) parentObject[pathName] = {};
					parentObject = parentObject[pathName];
				}
			}
			if (parentObject !== void 0 && parentObject !== null) {
				if (isXml && mapper.xmlNamespace) {
					const xmlnsKey = mapper.xmlNamespacePrefix ? `xmlns:${mapper.xmlNamespacePrefix}` : "xmlns";
					parentObject["$"] = {
						...parentObject["$"],
						[xmlnsKey]: mapper.xmlNamespace
					};
				}
				const propertyObjectName = propertyMapper.serializedName !== "" ? objectName + "." + propertyMapper.serializedName : objectName;
				let toSerialize = object[key];
				const polymorphicDiscriminator = getPolymorphicDiscriminatorRecursively(serializer, mapper);
				if (polymorphicDiscriminator && polymorphicDiscriminator.clientName === key && (toSerialize === void 0 || toSerialize === null)) toSerialize = mapper.serializedName;
				const serializedValue = serializer.serialize(propertyMapper, toSerialize, propertyObjectName, options);
				if (serializedValue !== void 0 && propName !== void 0 && propName !== null) {
					const value = getXmlObjectValue(propertyMapper, serializedValue, isXml, options);
					if (isXml && propertyMapper.xmlIsAttribute) {
						parentObject["$"] = parentObject["$"] || {};
						parentObject["$"][propName] = serializedValue;
					} else if (isXml && propertyMapper.xmlIsWrapped) parentObject[propName] = { [propertyMapper.xmlElementName]: value };
					else parentObject[propName] = value;
				}
			}
		}
		const additionalPropertiesMapper = resolveAdditionalProperties(serializer, mapper, objectName);
		if (additionalPropertiesMapper) {
			const propNames = Object.keys(modelProps);
			for (const clientPropName of Object.keys(object)) if (propNames.every((pn) => pn !== clientPropName)) Object.defineProperty(payload, clientPropName, {
				value: serializer.serialize(additionalPropertiesMapper, object[clientPropName], objectName + "[\"" + clientPropName + "\"]", options),
				enumerable: true,
				configurable: true,
				writable: true
			});
		}
		return payload;
	}
	return object;
}
function getXmlObjectValue(propertyMapper, serializedValue, isXml, options) {
	if (!isXml || !propertyMapper.xmlNamespace) return serializedValue;
	const xmlNamespace = { [propertyMapper.xmlNamespacePrefix ? `xmlns:${propertyMapper.xmlNamespacePrefix}` : "xmlns"]: propertyMapper.xmlNamespace };
	if (["Composite"].includes(propertyMapper.type.name)) {
		if (serializedValue["$"]) return serializedValue;
		else {
			const result = { ...serializedValue };
			result["$"] = xmlNamespace;
			return result;
		}
	}
	const result = {};
	result[options.xml.xmlCharKey] = serializedValue;
	result["$"] = xmlNamespace;
	return result;
}
function isSpecialXmlProperty(propertyName, options) {
	return ["$", options.xml.xmlCharKey].includes(propertyName);
}
function deserializeCompositeType(serializer, mapper, responseBody, objectName, options) {
	const xmlCharKey = options.xml.xmlCharKey ?? "_";
	if (getPolymorphicDiscriminatorRecursively(serializer, mapper)) mapper = getPolymorphicMapper(serializer, mapper, responseBody, "serializedName");
	const modelProps = resolveModelProperties(serializer, mapper, objectName);
	let instance = {};
	const handledPropertyNames = [];
	for (const key of Object.keys(modelProps)) {
		const propertyMapper = modelProps[key];
		const paths = splitSerializeName(modelProps[key].serializedName);
		handledPropertyNames.push(paths[0]);
		const { serializedName, xmlName, xmlElementName } = propertyMapper;
		let propertyObjectName = objectName;
		if (serializedName !== "" && serializedName !== void 0) propertyObjectName = objectName + "." + serializedName;
		const headerCollectionPrefix = propertyMapper.headerCollectionPrefix;
		if (headerCollectionPrefix) {
			const dictionary = {};
			for (const headerKey of Object.keys(responseBody)) {
				if (headerKey.startsWith(headerCollectionPrefix)) dictionary[headerKey.substring(headerCollectionPrefix.length)] = serializer.deserialize(propertyMapper.type.value, responseBody[headerKey], propertyObjectName, options);
				handledPropertyNames.push(headerKey);
			}
			instance[key] = dictionary;
		} else if (serializer.isXML) {
			if (propertyMapper.xmlIsAttribute && responseBody["$"]) instance[key] = serializer.deserialize(propertyMapper, responseBody["$"][xmlName], propertyObjectName, options);
			else if (propertyMapper.xmlIsMsText) {
				if (responseBody[xmlCharKey] !== void 0) instance[key] = responseBody[xmlCharKey];
				else if (typeof responseBody === "string") instance[key] = responseBody;
			} else {
				const propertyName = xmlElementName || xmlName || serializedName;
				if (propertyMapper.xmlIsWrapped) {
					const elementList = responseBody[xmlName]?.[xmlElementName] ?? [];
					Object.defineProperty(instance, key, {
						value: serializer.deserialize(propertyMapper, elementList, propertyObjectName, options),
						enumerable: true,
						configurable: true,
						writable: true
					});
					handledPropertyNames.push(xmlName);
				} else {
					const property = responseBody[propertyName];
					instance[key] = serializer.deserialize(propertyMapper, property, propertyObjectName, options);
					handledPropertyNames.push(propertyName);
				}
			}
		} else {
			let propertyInstance;
			let res = responseBody;
			let steps = 0;
			for (const item of paths) {
				if (!res) break;
				steps++;
				res = res[item];
			}
			if (res === null && steps < paths.length) res = void 0;
			propertyInstance = res;
			const polymorphicDiscriminator = mapper.type.polymorphicDiscriminator;
			if (polymorphicDiscriminator && key === polymorphicDiscriminator.clientName && (propertyInstance === void 0 || propertyInstance === null)) propertyInstance = mapper.serializedName;
			let serializedValue;
			if (Array.isArray(responseBody[key]) && modelProps[key].serializedName === "") {
				propertyInstance = responseBody[key];
				const arrayInstance = serializer.deserialize(propertyMapper, propertyInstance, propertyObjectName, options);
				for (const [k, v] of Object.entries(instance)) if (!Object.prototype.hasOwnProperty.call(arrayInstance, k)) arrayInstance[k] = v;
				instance = arrayInstance;
			} else if (propertyInstance !== void 0 || propertyMapper.defaultValue !== void 0) {
				serializedValue = serializer.deserialize(propertyMapper, propertyInstance, propertyObjectName, options);
				instance[key] = serializedValue;
			}
		}
	}
	const additionalPropertiesMapper = mapper.type.additionalProperties;
	if (additionalPropertiesMapper) {
		const isAdditionalProperty = (responsePropName) => {
			for (const clientPropName of Object.keys(modelProps)) if (splitSerializeName(modelProps[clientPropName].serializedName)[0] === responsePropName) return false;
			return true;
		};
		for (const responsePropName of Object.keys(responseBody)) if (isAdditionalProperty(responsePropName)) {
			const deserializedValue = serializer.deserialize(additionalPropertiesMapper, responseBody[responsePropName], objectName + "[\"" + responsePropName + "\"]", options);
			Object.defineProperty(instance, responsePropName, {
				value: deserializedValue,
				enumerable: true,
				configurable: true,
				writable: true
			});
		}
	} else if (responseBody && !options.ignoreUnknownProperties) {
		for (const key of Object.keys(responseBody)) if (instance[key] === void 0 && !handledPropertyNames.includes(key) && !isSpecialXmlProperty(key, options)) Object.defineProperty(instance, key, {
			value: responseBody[key],
			enumerable: true,
			configurable: true,
			writable: true
		});
	}
	return instance;
}
function deserializeDictionaryType(serializer, mapper, responseBody, objectName, options) {
	const value = mapper.type.value;
	if (!value || typeof value !== "object") throw new Error(`"value" metadata for a Dictionary must be defined in the mapper and it must of type "object" in ${objectName}`);
	if (responseBody) {
		const tempDictionary = {};
		for (const key of Object.keys(responseBody)) tempDictionary[key] = serializer.deserialize(value, responseBody[key], objectName, options);
		return tempDictionary;
	}
	return responseBody;
}
function deserializeSequenceType(serializer, mapper, responseBody, objectName, options) {
	let element = mapper.type.element;
	if (!element || typeof element !== "object") throw new Error(`"element" metadata for an Array must be defined in the mapper and it must be of type "object" in ${objectName}`);
	if (responseBody) {
		if (!Array.isArray(responseBody)) responseBody = [responseBody];
		if (element.type.name === "Composite" && element.type.className) element = serializer.modelMappers[element.type.className] ?? element;
		const tempArray = [];
		for (let i = 0; i < responseBody.length; i++) tempArray[i] = serializer.deserialize(element, responseBody[i], `${objectName}[${i}]`, options);
		return tempArray;
	}
	return responseBody;
}
function getIndexDiscriminator(discriminators, discriminatorValue, typeName) {
	const typeNamesToCheck = [typeName];
	while (typeNamesToCheck.length) {
		const currentName = typeNamesToCheck.shift();
		const indexDiscriminator = discriminatorValue === currentName ? discriminatorValue : currentName + "." + discriminatorValue;
		if (Object.prototype.hasOwnProperty.call(discriminators, indexDiscriminator)) return discriminators[indexDiscriminator];
		else for (const [name, mapper] of Object.entries(discriminators)) if (name.startsWith(currentName + ".") && mapper.type.uberParent === currentName && mapper.type.className) typeNamesToCheck.push(mapper.type.className);
	}
}
function getPolymorphicMapper(serializer, mapper, object, polymorphicPropertyName) {
	const polymorphicDiscriminator = getPolymorphicDiscriminatorRecursively(serializer, mapper);
	if (polymorphicDiscriminator) {
		let discriminatorName = polymorphicDiscriminator[polymorphicPropertyName];
		if (discriminatorName) {
			if (polymorphicPropertyName === "serializedName") discriminatorName = discriminatorName.replace(/\\/gi, "");
			const discriminatorValue = object[discriminatorName];
			const typeName = mapper.type.uberParent ?? mapper.type.className;
			if (typeof discriminatorValue === "string" && typeName) {
				const polymorphicMapper = getIndexDiscriminator(serializer.modelMappers.discriminators, discriminatorValue, typeName);
				if (polymorphicMapper) mapper = polymorphicMapper;
			}
		}
	}
	return mapper;
}
function getPolymorphicDiscriminatorRecursively(serializer, mapper) {
	return mapper.type.polymorphicDiscriminator || getPolymorphicDiscriminatorSafely(serializer, mapper.type.uberParent) || getPolymorphicDiscriminatorSafely(serializer, mapper.type.className);
}
function getPolymorphicDiscriminatorSafely(serializer, typeName) {
	return typeName && serializer.modelMappers[typeName] && serializer.modelMappers[typeName].type.polymorphicDiscriminator;
}
/**
* Known types of Mappers
*/
var MapperTypeNames = {
	Base64Url: "Base64Url",
	Boolean: "Boolean",
	ByteArray: "ByteArray",
	Composite: "Composite",
	Date: "Date",
	DateTime: "DateTime",
	DateTimeRfc1123: "DateTimeRfc1123",
	Dictionary: "Dictionary",
	Enum: "Enum",
	Number: "Number",
	Object: "Object",
	Sequence: "Sequence",
	String: "String",
	Stream: "Stream",
	TimeSpan: "TimeSpan",
	UnixTime: "UnixTime"
};
/**
* Defines the shared state between CJS and ESM by re-exporting the CJS state.
*/
var state = (/* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.state = void 0;
	/**
	* Holds the singleton operationRequestMap, to be shared across CJS and ESM imports.
	*/
	exports.state = { operationRequestMap: /* @__PURE__ */ new WeakMap() };
})))().state;
//#endregion
//#region node_modules/@azure/core-client/dist/esm/operationHelpers.js
/**
* @internal
* Retrieves the value to use for a given operation argument
* @param operationArguments - The arguments passed from the generated client
* @param parameter - The parameter description
* @param fallbackObject - If something isn't found in the arguments bag, look here.
*  Generally used to look at the service client properties.
*/
function getOperationArgumentValueFromParameter(operationArguments, parameter, fallbackObject) {
	let parameterPath = parameter.parameterPath;
	const parameterMapper = parameter.mapper;
	let value;
	if (typeof parameterPath === "string") parameterPath = [parameterPath];
	if (Array.isArray(parameterPath)) {
		if (parameterPath.length > 0) {
			if (parameterMapper.isConstant) value = parameterMapper.defaultValue;
			else {
				let propertySearchResult = getPropertyFromParameterPath(operationArguments, parameterPath);
				if (!propertySearchResult.propertyFound && fallbackObject) propertySearchResult = getPropertyFromParameterPath(fallbackObject, parameterPath);
				let useDefaultValue = false;
				if (!propertySearchResult.propertyFound) useDefaultValue = parameterMapper.required || parameterPath[0] === "options" && parameterPath.length === 2;
				value = useDefaultValue ? parameterMapper.defaultValue : propertySearchResult.propertyValue;
			}
		}
	} else {
		if (parameterMapper.required) value = {};
		for (const [propertyName, propertyPath] of Object.entries(parameterPath)) {
			const propertyMapper = parameterMapper.type.modelProperties[propertyName];
			const propertyValue = getOperationArgumentValueFromParameter(operationArguments, {
				parameterPath: propertyPath,
				mapper: propertyMapper
			}, fallbackObject);
			if (propertyValue !== void 0) {
				if (!value) value = {};
				Object.defineProperty(value, propertyName, {
					value: propertyValue,
					enumerable: true,
					configurable: true,
					writable: true
				});
			}
		}
	}
	return value;
}
function getPropertyFromParameterPath(parent, parameterPath) {
	const result = { propertyFound: false };
	let i = 0;
	for (; i < parameterPath.length; ++i) {
		const parameterPathPart = parameterPath[i];
		if (parent && parameterPathPart in parent) parent = parent[parameterPathPart];
		else break;
	}
	if (i === parameterPath.length) {
		result.propertyValue = parent;
		result.propertyFound = true;
	}
	return result;
}
var originalRequestSymbol = Symbol.for("@azure/core-client original request");
function hasOriginalRequest(request) {
	return originalRequestSymbol in request;
}
function getOperationRequestInfo(request) {
	if (hasOriginalRequest(request)) return getOperationRequestInfo(request[originalRequestSymbol]);
	let info = state.operationRequestMap.get(request);
	if (!info) {
		info = {};
		state.operationRequestMap.set(request, info);
	}
	return info;
}
//#endregion
//#region node_modules/@azure/core-client/dist/esm/deserializationPolicy.js
var defaultJsonContentTypes = ["application/json", "text/json"];
var defaultXmlContentTypes = ["application/xml", "application/atom+xml"];
/**
* The programmatic identifier of the deserializationPolicy.
*/
var deserializationPolicyName = "deserializationPolicy";
/**
* This policy handles parsing out responses according to OperationSpecs on the request.
*/
function deserializationPolicy(options = {}) {
	const jsonContentTypes = options.expectedContentTypes?.json ?? defaultJsonContentTypes;
	const xmlContentTypes = options.expectedContentTypes?.xml ?? defaultXmlContentTypes;
	const parseXML = options.parseXML;
	const serializerOptions = options.serializerOptions;
	const updatedOptions = { xml: {
		rootName: serializerOptions?.xml.rootName ?? "",
		includeRoot: serializerOptions?.xml.includeRoot ?? false,
		xmlCharKey: serializerOptions?.xml.xmlCharKey ?? "_"
	} };
	return {
		name: deserializationPolicyName,
		async sendRequest(request, next) {
			const response = await next(request);
			return deserializeResponseBody(jsonContentTypes, xmlContentTypes, response, updatedOptions, parseXML);
		}
	};
}
function getOperationResponseMap(parsedResponse) {
	let result;
	const request = parsedResponse.request;
	const operationInfo = getOperationRequestInfo(request);
	const operationSpec = operationInfo?.operationSpec;
	if (operationSpec) {
		if (!operationInfo?.operationResponseGetter) result = operationSpec.responses[parsedResponse.status];
		else result = operationInfo?.operationResponseGetter(operationSpec, parsedResponse);
	}
	return result;
}
function shouldDeserializeResponse(parsedResponse) {
	const request = parsedResponse.request;
	const shouldDeserialize = getOperationRequestInfo(request)?.shouldDeserialize;
	let result;
	if (shouldDeserialize === void 0) result = true;
	else if (typeof shouldDeserialize === "boolean") result = shouldDeserialize;
	else result = shouldDeserialize(parsedResponse);
	return result;
}
async function deserializeResponseBody(jsonContentTypes, xmlContentTypes, response, options, parseXML) {
	const parsedResponse = await parse(jsonContentTypes, xmlContentTypes, response, options, parseXML);
	if (!shouldDeserializeResponse(parsedResponse)) return parsedResponse;
	const operationSpec = getOperationRequestInfo(parsedResponse.request)?.operationSpec;
	if (!operationSpec || !operationSpec.responses) return parsedResponse;
	const responseSpec = getOperationResponseMap(parsedResponse);
	const { error, shouldReturnResponse } = handleErrorResponse(parsedResponse, operationSpec, responseSpec, options);
	if (error) throw error;
	else if (shouldReturnResponse) return parsedResponse;
	if (responseSpec) {
		if (responseSpec.bodyMapper) {
			let valueToDeserialize = parsedResponse.parsedBody;
			if (operationSpec.isXML && responseSpec.bodyMapper.type.name === MapperTypeNames.Sequence) valueToDeserialize = typeof valueToDeserialize === "object" ? valueToDeserialize[responseSpec.bodyMapper.xmlElementName] : [];
			try {
				parsedResponse.parsedBody = operationSpec.serializer.deserialize(responseSpec.bodyMapper, valueToDeserialize, "operationRes.parsedBody", options);
			} catch (deserializeError) {
				throw new RestError$1(`Error ${deserializeError} occurred in deserializing the responseBody - ${parsedResponse.bodyAsText}`, {
					statusCode: parsedResponse.status,
					request: parsedResponse.request,
					response: parsedResponse
				});
			}
		} else if (operationSpec.httpMethod === "HEAD") parsedResponse.parsedBody = response.status >= 200 && response.status < 300;
		if (responseSpec.headersMapper) parsedResponse.parsedHeaders = operationSpec.serializer.deserialize(responseSpec.headersMapper, parsedResponse.headers.toJSON(), "operationRes.parsedHeaders", {
			xml: {},
			ignoreUnknownProperties: true
		});
	}
	return parsedResponse;
}
function isOperationSpecEmpty(operationSpec) {
	const expectedStatusCodes = Object.keys(operationSpec.responses);
	return expectedStatusCodes.length === 0 || expectedStatusCodes.length === 1 && expectedStatusCodes[0] === "default";
}
function handleErrorResponse(parsedResponse, operationSpec, responseSpec, options) {
	const isSuccessByStatus = 200 <= parsedResponse.status && parsedResponse.status < 300;
	if (isOperationSpecEmpty(operationSpec) ? isSuccessByStatus : !!responseSpec) {
		if (responseSpec) {
			if (!responseSpec.isError) return {
				error: null,
				shouldReturnResponse: false
			};
		} else return {
			error: null,
			shouldReturnResponse: false
		};
	}
	const errorResponseSpec = responseSpec ?? operationSpec.responses.default;
	const initialErrorMessage = parsedResponse.request.streamResponseStatusCodes?.has(parsedResponse.status) ? `Unexpected status code: ${parsedResponse.status}` : parsedResponse.bodyAsText;
	const error = new RestError$1(initialErrorMessage, {
		statusCode: parsedResponse.status,
		request: parsedResponse.request,
		response: parsedResponse
	});
	if (!errorResponseSpec && !(parsedResponse.parsedBody?.error?.code && parsedResponse.parsedBody?.error?.message)) throw error;
	const defaultBodyMapper = errorResponseSpec?.bodyMapper;
	const defaultHeadersMapper = errorResponseSpec?.headersMapper;
	try {
		if (parsedResponse.parsedBody) {
			const parsedBody = parsedResponse.parsedBody;
			let deserializedError;
			if (defaultBodyMapper) {
				let valueToDeserialize = parsedBody;
				if (operationSpec.isXML && defaultBodyMapper.type.name === MapperTypeNames.Sequence) {
					valueToDeserialize = [];
					const elementName = defaultBodyMapper.xmlElementName;
					if (typeof parsedBody === "object" && elementName) valueToDeserialize = parsedBody[elementName];
				}
				deserializedError = operationSpec.serializer.deserialize(defaultBodyMapper, valueToDeserialize, "error.response.parsedBody", options);
			}
			const internalError = parsedBody.error || deserializedError || parsedBody;
			error.code = internalError.code;
			if (internalError.message) error.message = internalError.message;
			if (defaultBodyMapper) error.response.parsedBody = deserializedError;
		}
		if (parsedResponse.headers && defaultHeadersMapper) error.response.parsedHeaders = operationSpec.serializer.deserialize(defaultHeadersMapper, parsedResponse.headers.toJSON(), "operationRes.parsedHeaders");
	} catch (defaultError) {
		error.message = `Error "${defaultError.message}" occurred in deserializing the responseBody - "${parsedResponse.bodyAsText}" for the default response.`;
	}
	return {
		error,
		shouldReturnResponse: false
	};
}
async function parse(jsonContentTypes, xmlContentTypes, operationResponse, opts, parseXML) {
	if (!operationResponse.request.streamResponseStatusCodes?.has(operationResponse.status) && operationResponse.bodyAsText) {
		const text = operationResponse.bodyAsText;
		const contentType = operationResponse.headers.get("Content-Type") || "";
		const contentComponents = !contentType ? [] : contentType.split(";").map((component) => component.toLowerCase());
		try {
			if (contentComponents.length === 0 || contentComponents.some((component) => jsonContentTypes.indexOf(component) !== -1)) {
				operationResponse.parsedBody = JSON.parse(text);
				return operationResponse;
			} else if (contentComponents.some((component) => xmlContentTypes.indexOf(component) !== -1)) {
				if (!parseXML) throw new Error("Parsing XML not supported.");
				operationResponse.parsedBody = await parseXML(text, opts.xml);
				return operationResponse;
			}
		} catch (err) {
			const msg = `Error "${err}" occurred while parsing the response body - ${operationResponse.bodyAsText}.`;
			const errCode = err.code || RestError$1.PARSE_ERROR;
			throw new RestError$1(msg, {
				code: errCode,
				statusCode: operationResponse.status,
				request: operationResponse.request,
				response: operationResponse
			});
		}
	}
	return operationResponse;
}
//#endregion
//#region node_modules/@azure/core-client/dist/esm/interfaceHelpers.js
/**
* Gets the list of status codes for streaming responses.
* @internal
*/
function getStreamingResponseStatusCodes(operationSpec) {
	const result = /* @__PURE__ */ new Set();
	for (const [statusCode, operationResponse] of Object.entries(operationSpec.responses)) if (operationResponse.bodyMapper && operationResponse.bodyMapper.type.name === MapperTypeNames.Stream) result.add(Number(statusCode));
	return result;
}
/**
* Get the path to this parameter's value as a dotted string (a.b.c).
* @param parameter - The parameter to get the path string for.
* @returns The path to this parameter's value as a dotted string.
* @internal
*/
function getPathStringFromParameter(parameter) {
	const { parameterPath, mapper } = parameter;
	let result;
	if (typeof parameterPath === "string") result = parameterPath;
	else if (Array.isArray(parameterPath)) result = parameterPath.join(".");
	else result = mapper.serializedName;
	return result;
}
//#endregion
//#region node_modules/@azure/core-client/dist/esm/serializationPolicy.js
/**
* The programmatic identifier of the serializationPolicy.
*/
var serializationPolicyName = "serializationPolicy";
/**
* This policy handles assembling the request body and headers using
* an OperationSpec and OperationArguments on the request.
*/
function serializationPolicy(options = {}) {
	const stringifyXML = options.stringifyXML;
	return {
		name: serializationPolicyName,
		sendRequest(request, next) {
			const operationInfo = getOperationRequestInfo(request);
			const operationSpec = operationInfo?.operationSpec;
			const operationArguments = operationInfo?.operationArguments;
			if (operationSpec && operationArguments) {
				serializeHeaders(request, operationArguments, operationSpec);
				serializeRequestBody(request, operationArguments, operationSpec, stringifyXML);
			}
			return next(request);
		}
	};
}
/**
* @internal
*/
function serializeHeaders(request, operationArguments, operationSpec) {
	if (operationSpec.headerParameters) for (const headerParameter of operationSpec.headerParameters) {
		let headerValue = getOperationArgumentValueFromParameter(operationArguments, headerParameter);
		if (headerValue !== null && headerValue !== void 0 || headerParameter.mapper.required) {
			headerValue = operationSpec.serializer.serialize(headerParameter.mapper, headerValue, getPathStringFromParameter(headerParameter));
			const headerCollectionPrefix = headerParameter.mapper.headerCollectionPrefix;
			if (headerCollectionPrefix) for (const key of Object.keys(headerValue)) request.headers.set(headerCollectionPrefix + key, headerValue[key]);
			else request.headers.set(headerParameter.mapper.serializedName || getPathStringFromParameter(headerParameter), headerValue);
		}
	}
	const customHeaders = operationArguments.options?.requestOptions?.customHeaders;
	if (customHeaders) for (const customHeaderName of Object.keys(customHeaders)) request.headers.set(customHeaderName, customHeaders[customHeaderName]);
}
/**
* @internal
*/
function serializeRequestBody(request, operationArguments, operationSpec, stringifyXML = function() {
	throw new Error("XML serialization unsupported!");
}) {
	const serializerOptions = operationArguments.options?.serializerOptions;
	const updatedOptions = { xml: {
		rootName: serializerOptions?.xml.rootName ?? "",
		includeRoot: serializerOptions?.xml.includeRoot ?? false,
		xmlCharKey: serializerOptions?.xml.xmlCharKey ?? "_"
	} };
	const xmlCharKey = updatedOptions.xml.xmlCharKey;
	if (operationSpec.requestBody && operationSpec.requestBody.mapper) {
		request.body = getOperationArgumentValueFromParameter(operationArguments, operationSpec.requestBody);
		const bodyMapper = operationSpec.requestBody.mapper;
		const { required, serializedName, xmlName, xmlElementName, xmlNamespace, xmlNamespacePrefix, nullable } = bodyMapper;
		const typeName = bodyMapper.type.name;
		try {
			if (request.body !== void 0 && request.body !== null || nullable && request.body === null || required) {
				const requestBodyParameterPathString = getPathStringFromParameter(operationSpec.requestBody);
				request.body = operationSpec.serializer.serialize(bodyMapper, request.body, requestBodyParameterPathString, updatedOptions);
				const isStream = typeName === MapperTypeNames.Stream;
				if (operationSpec.isXML) {
					const xmlnsKey = xmlNamespacePrefix ? `xmlns:${xmlNamespacePrefix}` : "xmlns";
					const value = getXmlValueWithNamespace(xmlNamespace, xmlnsKey, typeName, request.body, updatedOptions);
					if (typeName === MapperTypeNames.Sequence) request.body = stringifyXML(prepareXMLRootList(value, xmlElementName || xmlName || serializedName, xmlnsKey, xmlNamespace), {
						rootName: xmlName || serializedName,
						xmlCharKey
					});
					else if (!isStream) request.body = stringifyXML(value, {
						rootName: xmlName || serializedName,
						xmlCharKey
					});
				} else if (typeName === MapperTypeNames.String && (operationSpec.contentType?.match("text/plain") || operationSpec.mediaType === "text")) return;
				else if (!isStream) request.body = JSON.stringify(request.body);
			}
		} catch (error) {
			throw new Error(`Error "${error.message}" occurred in serializing the payload - ${JSON.stringify(serializedName, void 0, "  ")}.`);
		}
	} else if (operationSpec.formDataParameters && operationSpec.formDataParameters.length > 0) {
		request.formData = {};
		for (const formDataParameter of operationSpec.formDataParameters) {
			const formDataParameterValue = getOperationArgumentValueFromParameter(operationArguments, formDataParameter);
			if (formDataParameterValue !== void 0 && formDataParameterValue !== null) {
				const formDataParameterPropertyName = formDataParameter.mapper.serializedName || getPathStringFromParameter(formDataParameter);
				request.formData[formDataParameterPropertyName] = operationSpec.serializer.serialize(formDataParameter.mapper, formDataParameterValue, getPathStringFromParameter(formDataParameter), updatedOptions);
			}
		}
	}
}
/**
* Adds an xml namespace to the xml serialized object if needed, otherwise it just returns the value itself
*/
function getXmlValueWithNamespace(xmlNamespace, xmlnsKey, typeName, serializedValue, options) {
	if (xmlNamespace && ![
		"Composite",
		"Sequence",
		"Dictionary"
	].includes(typeName)) {
		const result = {};
		result[options.xml.xmlCharKey] = serializedValue;
		result["$"] = { [xmlnsKey]: xmlNamespace };
		return result;
	}
	return serializedValue;
}
function prepareXMLRootList(obj, elementName, xmlNamespaceKey, xmlNamespace) {
	if (!Array.isArray(obj)) obj = [obj];
	if (!xmlNamespaceKey || !xmlNamespace) return { [elementName]: obj };
	const result = { [elementName]: obj };
	result["$"] = { [xmlNamespaceKey]: xmlNamespace };
	return result;
}
//#endregion
//#region node_modules/@azure/core-client/dist/esm/pipeline.js
/**
* Creates a new Pipeline for use with a Service Client.
* Adds in deserializationPolicy by default.
* Also adds in bearerTokenAuthenticationPolicy if passed a TokenCredential.
* @param options - Options to customize the created pipeline.
*/
function createClientPipeline(options = {}) {
	const pipeline = createPipelineFromOptions(options ?? {});
	if (options.credentialOptions) pipeline.addPolicy(bearerTokenAuthenticationPolicy({
		credential: options.credentialOptions.credential,
		scopes: options.credentialOptions.credentialScopes
	}));
	pipeline.addPolicy(serializationPolicy(options.serializationOptions), { phase: "Serialize" });
	pipeline.addPolicy(deserializationPolicy(options.deserializationOptions), { phase: "Deserialize" });
	return pipeline;
}
//#endregion
//#region node_modules/@azure/core-client/dist/esm/httpClientCache.js
var cachedHttpClient;
function getCachedDefaultHttpClient() {
	if (!cachedHttpClient) cachedHttpClient = createDefaultHttpClient();
	return cachedHttpClient;
}
//#endregion
//#region node_modules/@azure/core-client/dist/esm/urlHelpers.js
var CollectionFormatToDelimiterMap = {
	CSV: ",",
	SSV: " ",
	Multi: "Multi",
	TSV: "	",
	Pipes: "|"
};
function getRequestUrl(baseUri, operationSpec, operationArguments, fallbackObject) {
	const urlReplacements = calculateUrlReplacements(operationSpec, operationArguments, fallbackObject);
	let isAbsolutePath = false;
	let requestUrl = replaceAll(baseUri, urlReplacements);
	if (operationSpec.path) {
		let path = replaceAll(operationSpec.path, urlReplacements);
		if (operationSpec.path === "/{nextLink}" && path.startsWith("/")) path = path.substring(1);
		if (isAbsoluteUrl(path)) {
			requestUrl = path;
			isAbsolutePath = true;
		} else requestUrl = appendPath(requestUrl, path);
	}
	const { queryParams, sequenceParams } = calculateQueryParameters(operationSpec, operationArguments, fallbackObject);
	/**
	* Notice that this call sets the `noOverwrite` parameter to true if the `requestUrl`
	* is an absolute path. This ensures that existing query parameter values in `requestUrl`
	* do not get overwritten. On the other hand when `requestUrl` is not absolute path, it
	* is still being built so there is nothing to overwrite.
	*/
	requestUrl = appendQueryParams(requestUrl, queryParams, sequenceParams, isAbsolutePath);
	return requestUrl;
}
function replaceAll(input, replacements) {
	let result = input;
	for (const [searchValue, replaceValue] of replacements) result = result.split(searchValue).join(replaceValue);
	return result;
}
function calculateUrlReplacements(operationSpec, operationArguments, fallbackObject) {
	const result = /* @__PURE__ */ new Map();
	if (operationSpec.urlParameters?.length) for (const urlParameter of operationSpec.urlParameters) {
		let urlParameterValue = getOperationArgumentValueFromParameter(operationArguments, urlParameter, fallbackObject);
		const parameterPathString = getPathStringFromParameter(urlParameter);
		urlParameterValue = operationSpec.serializer.serialize(urlParameter.mapper, urlParameterValue, parameterPathString);
		if (!urlParameter.skipEncoding) urlParameterValue = encodeURIComponent(urlParameterValue);
		result.set(`{${urlParameter.mapper.serializedName || parameterPathString}}`, urlParameterValue);
	}
	return result;
}
function isAbsoluteUrl(url) {
	return url.includes("://");
}
function appendPath(url, pathToAppend) {
	if (!pathToAppend) return url;
	const parsedUrl = new URL(url);
	let newPath = parsedUrl.pathname;
	if (!newPath.endsWith("/")) newPath = `${newPath}/`;
	if (pathToAppend.startsWith("/")) pathToAppend = pathToAppend.substring(1);
	const searchStart = pathToAppend.indexOf("?");
	if (searchStart !== -1) {
		const path = pathToAppend.substring(0, searchStart);
		const search = pathToAppend.substring(searchStart + 1);
		newPath = newPath + path;
		if (search) parsedUrl.search = parsedUrl.search ? `${parsedUrl.search}&${search}` : search;
	} else newPath = newPath + pathToAppend;
	Object.assign(parsedUrl, { pathname: newPath });
	return parsedUrl.toString();
}
function calculateQueryParameters(operationSpec, operationArguments, fallbackObject) {
	const result = /* @__PURE__ */ new Map();
	const sequenceParams = /* @__PURE__ */ new Set();
	if (operationSpec.queryParameters?.length) for (const queryParameter of operationSpec.queryParameters) {
		if (queryParameter.mapper.type.name === "Sequence" && queryParameter.mapper.serializedName) sequenceParams.add(queryParameter.mapper.serializedName);
		let queryParameterValue = getOperationArgumentValueFromParameter(operationArguments, queryParameter, fallbackObject);
		if (queryParameterValue !== void 0 && queryParameterValue !== null || queryParameter.mapper.required) {
			queryParameterValue = operationSpec.serializer.serialize(queryParameter.mapper, queryParameterValue, getPathStringFromParameter(queryParameter));
			const delimiter = queryParameter.collectionFormat ? CollectionFormatToDelimiterMap[queryParameter.collectionFormat] : "";
			if (Array.isArray(queryParameterValue)) queryParameterValue = queryParameterValue.map((item) => {
				if (item === null || item === void 0) return "";
				return item;
			});
			if (queryParameter.collectionFormat === "Multi" && queryParameterValue.length === 0) continue;
			else if (Array.isArray(queryParameterValue) && (queryParameter.collectionFormat === "SSV" || queryParameter.collectionFormat === "TSV")) queryParameterValue = queryParameterValue.join(delimiter);
			if (!queryParameter.skipEncoding) {
				if (Array.isArray(queryParameterValue)) queryParameterValue = queryParameterValue.map((item) => {
					return encodeURIComponent(item);
				});
				else queryParameterValue = encodeURIComponent(queryParameterValue);
			}
			if (Array.isArray(queryParameterValue) && (queryParameter.collectionFormat === "CSV" || queryParameter.collectionFormat === "Pipes")) queryParameterValue = queryParameterValue.join(delimiter);
			result.set(queryParameter.mapper.serializedName || getPathStringFromParameter(queryParameter), queryParameterValue);
		}
	}
	return {
		queryParams: result,
		sequenceParams
	};
}
function simpleParseQueryParams(queryString) {
	const result = /* @__PURE__ */ new Map();
	if (!queryString || queryString[0] !== "?") return result;
	queryString = queryString.slice(1);
	const pairs = queryString.split("&");
	for (const pair of pairs) {
		const [name, value] = pair.split("=", 2);
		const existingValue = result.get(name);
		if (existingValue) {
			if (Array.isArray(existingValue)) existingValue.push(value);
			else result.set(name, [existingValue, value]);
		} else result.set(name, value);
	}
	return result;
}
/** @internal */
function appendQueryParams(url, queryParams, sequenceParams, noOverwrite = false) {
	if (queryParams.size === 0) return url;
	const parsedUrl = new URL(url);
	const combinedParams = simpleParseQueryParams(parsedUrl.search);
	for (const [name, value] of queryParams) {
		const existingValue = combinedParams.get(name);
		if (Array.isArray(existingValue)) {
			if (Array.isArray(value)) {
				existingValue.push(...value);
				const valueSet = new Set(existingValue);
				combinedParams.set(name, Array.from(valueSet));
			} else existingValue.push(value);
		} else if (existingValue) {
			if (Array.isArray(value)) value.unshift(existingValue);
			else if (sequenceParams.has(name)) combinedParams.set(name, [existingValue, value]);
			if (!noOverwrite) combinedParams.set(name, value);
		} else combinedParams.set(name, value);
	}
	const searchPieces = [];
	for (const [name, value] of combinedParams) if (typeof value === "string") searchPieces.push(`${name}=${value}`);
	else if (Array.isArray(value)) for (const subValue of value) searchPieces.push(`${name}=${subValue}`);
	else searchPieces.push(`${name}=${value}`);
	parsedUrl.search = searchPieces.length ? `?${searchPieces.join("&")}` : "";
	return parsedUrl.toString();
}
//#endregion
//#region node_modules/@azure/core-client/dist/esm/log.js
var logger$2 = createClientLogger$1("core-client");
//#endregion
//#region node_modules/@azure/core-client/dist/esm/serviceClient.js
/**
* Initializes a new instance of the ServiceClient.
*/
var ServiceClient = class {
	/**
	* If specified, this is the base URI that requests will be made against for this ServiceClient.
	* If it is not specified, then all OperationSpecs must contain a baseUrl property.
	*/
	_endpoint;
	/**
	* The default request content type for the service.
	* Used if no requestContentType is present on an OperationSpec.
	*/
	_requestContentType;
	/**
	* Set to true if the request is sent over HTTP instead of HTTPS
	*/
	_allowInsecureConnection;
	/**
	* The HTTP client that will be used to send requests.
	*/
	_httpClient;
	/**
	* The pipeline used by this client to make requests
	*/
	pipeline;
	/**
	* The ServiceClient constructor
	* @param options - The service client options that govern the behavior of the client.
	*/
	constructor(options = {}) {
		this._requestContentType = options.requestContentType;
		this._endpoint = options.endpoint ?? options.baseUri;
		if (options.baseUri) logger$2.warning("The baseUri option for SDK Clients has been deprecated, please use endpoint instead.");
		this._allowInsecureConnection = options.allowInsecureConnection;
		this._httpClient = options.httpClient || getCachedDefaultHttpClient();
		this.pipeline = options.pipeline || createDefaultPipeline(options);
		if (options.additionalPolicies?.length) for (const { policy, position } of options.additionalPolicies) {
			const afterPhase = position === "perRetry" ? "Sign" : void 0;
			this.pipeline.addPolicy(policy, { afterPhase });
		}
	}
	/**
	* Send the provided httpRequest.
	*/
	sendRequest(request) {
		return this.pipeline.sendRequest(this._httpClient, request);
	}
	/**
	* Send an HTTP request that is populated using the provided OperationSpec.
	* @typeParam T - The typed result of the request, based on the OperationSpec.
	* @param operationArguments - The arguments that the HTTP request's templated values will be populated from.
	* @param operationSpec - The OperationSpec to use to populate the httpRequest.
	*/
	async sendOperationRequest(operationArguments, operationSpec) {
		const endpoint = operationSpec.baseUrl || this._endpoint;
		if (!endpoint) throw new Error("If operationSpec.baseUrl is not specified, then the ServiceClient must have a endpoint string property that contains the base URL to use.");
		const request = createPipelineRequest({ url: getRequestUrl(endpoint, operationSpec, operationArguments, this) });
		request.method = operationSpec.httpMethod;
		const operationInfo = getOperationRequestInfo(request);
		operationInfo.operationSpec = operationSpec;
		operationInfo.operationArguments = operationArguments;
		const contentType = operationSpec.contentType || this._requestContentType;
		if (contentType && operationSpec.requestBody) request.headers.set("Content-Type", contentType);
		const options = operationArguments.options;
		if (options) {
			const requestOptions = options.requestOptions;
			if (requestOptions) {
				if (requestOptions.timeout) request.timeout = requestOptions.timeout;
				if (requestOptions.onUploadProgress) request.onUploadProgress = requestOptions.onUploadProgress;
				if (requestOptions.onDownloadProgress) request.onDownloadProgress = requestOptions.onDownloadProgress;
				if (requestOptions.shouldDeserialize !== void 0) operationInfo.shouldDeserialize = requestOptions.shouldDeserialize;
				if (requestOptions.allowInsecureConnection) request.allowInsecureConnection = true;
			}
			if (options.abortSignal) request.abortSignal = options.abortSignal;
			if (options.tracingOptions) request.tracingOptions = options.tracingOptions;
		}
		if (this._allowInsecureConnection) request.allowInsecureConnection = true;
		if (request.streamResponseStatusCodes === void 0) request.streamResponseStatusCodes = getStreamingResponseStatusCodes(operationSpec);
		try {
			const rawResponse = await this.sendRequest(request);
			const flatResponse = flattenResponse(rawResponse, operationSpec.responses[rawResponse.status]);
			if (options?.onResponse) options.onResponse(rawResponse, flatResponse);
			return flatResponse;
		} catch (error) {
			if (typeof error === "object" && error?.response) {
				const rawResponse = error.response;
				const flatResponse = flattenResponse(rawResponse, operationSpec.responses[error.statusCode] || operationSpec.responses["default"]);
				error.details = flatResponse;
				if (options?.onResponse) options.onResponse(rawResponse, flatResponse, error);
			}
			throw error;
		}
	}
};
function createDefaultPipeline(options) {
	const credentialScopes = getCredentialScopes(options);
	const credentialOptions = options.credential && credentialScopes ? {
		credentialScopes,
		credential: options.credential
	} : void 0;
	return createClientPipeline({
		...options,
		credentialOptions
	});
}
function getCredentialScopes(options) {
	if (options.credentialScopes) return options.credentialScopes;
	if (options.endpoint) return `${options.endpoint}/.default`;
	if (options.baseUri) return `${options.baseUri}/.default`;
	if (options.credential) throw new Error(`When using credentials, the ServiceClientOptions must contain either a endpoint or a credentialScopes. Unable to create a bearerTokenAuthenticationPolicy`);
}
//#endregion
//#region node_modules/@azure/communication-email/dist/esm/generated/src/models/mappers.js
var mappers_exports = /* @__PURE__ */ __exportAll({
	EmailAddress: () => EmailAddress,
	EmailAttachment: () => EmailAttachment,
	EmailContent: () => EmailContent,
	EmailGetSendResultExceptionHeaders: () => EmailGetSendResultExceptionHeaders,
	EmailGetSendResultHeaders: () => EmailGetSendResultHeaders,
	EmailMessage: () => EmailMessage,
	EmailRecipients: () => EmailRecipients,
	EmailSendExceptionHeaders: () => EmailSendExceptionHeaders,
	EmailSendHeaders: () => EmailSendHeaders,
	EmailSendResult: () => EmailSendResult,
	ErrorAdditionalInfo: () => ErrorAdditionalInfo,
	ErrorDetail: () => ErrorDetail,
	ErrorResponse: () => ErrorResponse
});
var EmailSendResult = { type: {
	name: "Composite",
	className: "EmailSendResult",
	modelProperties: {
		id: {
			serializedName: "id",
			required: true,
			type: { name: "String" }
		},
		status: {
			serializedName: "status",
			required: true,
			type: { name: "String" }
		},
		error: {
			serializedName: "error",
			type: {
				name: "Composite",
				className: "ErrorDetail"
			}
		}
	}
} };
var ErrorDetail = { type: {
	name: "Composite",
	className: "ErrorDetail",
	modelProperties: {
		code: {
			serializedName: "code",
			readOnly: true,
			type: { name: "String" }
		},
		message: {
			serializedName: "message",
			readOnly: true,
			type: { name: "String" }
		},
		target: {
			serializedName: "target",
			readOnly: true,
			type: { name: "String" }
		},
		details: {
			serializedName: "details",
			readOnly: true,
			type: {
				name: "Sequence",
				element: { type: {
					name: "Composite",
					className: "ErrorDetail"
				} }
			}
		},
		additionalInfo: {
			serializedName: "additionalInfo",
			readOnly: true,
			type: {
				name: "Sequence",
				element: { type: {
					name: "Composite",
					className: "ErrorAdditionalInfo"
				} }
			}
		}
	}
} };
var ErrorAdditionalInfo = { type: {
	name: "Composite",
	className: "ErrorAdditionalInfo",
	modelProperties: {
		type: {
			serializedName: "type",
			readOnly: true,
			type: { name: "String" }
		},
		info: {
			serializedName: "info",
			readOnly: true,
			type: {
				name: "Dictionary",
				value: { type: { name: "any" } }
			}
		}
	}
} };
var ErrorResponse = { type: {
	name: "Composite",
	className: "ErrorResponse",
	modelProperties: { error: {
		serializedName: "error",
		type: {
			name: "Composite",
			className: "ErrorDetail"
		}
	} }
} };
var EmailMessage = { type: {
	name: "Composite",
	className: "EmailMessage",
	modelProperties: {
		headers: {
			serializedName: "headers",
			type: {
				name: "Dictionary",
				value: { type: { name: "String" } }
			}
		},
		senderAddress: {
			serializedName: "senderAddress",
			required: true,
			type: { name: "String" }
		},
		content: {
			serializedName: "content",
			type: {
				name: "Composite",
				className: "EmailContent"
			}
		},
		recipients: {
			serializedName: "recipients",
			type: {
				name: "Composite",
				className: "EmailRecipients"
			}
		},
		attachments: {
			serializedName: "attachments",
			type: {
				name: "Sequence",
				element: { type: {
					name: "Composite",
					className: "EmailAttachment"
				} }
			}
		},
		replyTo: {
			serializedName: "replyTo",
			type: {
				name: "Sequence",
				element: { type: {
					name: "Composite",
					className: "EmailAddress"
				} }
			}
		},
		disableUserEngagementTracking: {
			serializedName: "userEngagementTrackingDisabled",
			type: { name: "Boolean" }
		}
	}
} };
var EmailContent = { type: {
	name: "Composite",
	className: "EmailContent",
	modelProperties: {
		subject: {
			serializedName: "subject",
			required: true,
			type: { name: "String" }
		},
		plainText: {
			serializedName: "plainText",
			type: { name: "String" }
		},
		html: {
			serializedName: "html",
			type: { name: "String" }
		}
	}
} };
var EmailRecipients = { type: {
	name: "Composite",
	className: "EmailRecipients",
	modelProperties: {
		to: {
			serializedName: "to",
			type: {
				name: "Sequence",
				element: { type: {
					name: "Composite",
					className: "EmailAddress"
				} }
			}
		},
		cc: {
			serializedName: "cc",
			type: {
				name: "Sequence",
				element: { type: {
					name: "Composite",
					className: "EmailAddress"
				} }
			}
		},
		bcc: {
			serializedName: "bcc",
			type: {
				name: "Sequence",
				element: { type: {
					name: "Composite",
					className: "EmailAddress"
				} }
			}
		}
	}
} };
var EmailAddress = { type: {
	name: "Composite",
	className: "EmailAddress",
	modelProperties: {
		address: {
			serializedName: "address",
			required: true,
			type: { name: "String" }
		},
		displayName: {
			serializedName: "displayName",
			type: { name: "String" }
		}
	}
} };
var EmailAttachment = { type: {
	name: "Composite",
	className: "EmailAttachment",
	modelProperties: {
		name: {
			serializedName: "name",
			required: true,
			type: { name: "String" }
		},
		contentType: {
			serializedName: "contentType",
			required: true,
			type: { name: "String" }
		},
		contentInBase64: {
			serializedName: "contentInBase64",
			required: true,
			type: { name: "String" }
		},
		contentId: {
			serializedName: "contentId",
			type: { name: "String" }
		}
	}
} };
var EmailGetSendResultHeaders = { type: {
	name: "Composite",
	className: "EmailGetSendResultHeaders",
	modelProperties: { retryAfter: {
		serializedName: "retry-after",
		type: { name: "Number" }
	} }
} };
var EmailGetSendResultExceptionHeaders = { type: {
	name: "Composite",
	className: "EmailGetSendResultExceptionHeaders",
	modelProperties: { xMsErrorCode: {
		serializedName: "x-ms-error-code",
		type: { name: "String" }
	} }
} };
var EmailSendHeaders = { type: {
	name: "Composite",
	className: "EmailSendHeaders",
	modelProperties: {
		operationLocation: {
			serializedName: "operation-location",
			type: { name: "String" }
		},
		retryAfter: {
			serializedName: "retry-after",
			type: { name: "Number" }
		}
	}
} };
var EmailSendExceptionHeaders = { type: {
	name: "Composite",
	className: "EmailSendExceptionHeaders",
	modelProperties: { xMsErrorCode: {
		serializedName: "x-ms-error-code",
		type: { name: "String" }
	} }
} };
//#endregion
//#region node_modules/@azure/communication-email/dist/esm/generated/src/models/parameters.js
var accept = {
	parameterPath: "accept",
	mapper: {
		defaultValue: "application/json",
		isConstant: true,
		serializedName: "Accept",
		type: { name: "String" }
	}
};
var endpoint = {
	parameterPath: "endpoint",
	mapper: {
		serializedName: "endpoint",
		required: true,
		type: { name: "String" }
	},
	skipEncoding: true
};
var operationId = {
	parameterPath: "operationId",
	mapper: {
		serializedName: "operationId",
		required: true,
		type: { name: "String" }
	}
};
var apiVersion = {
	parameterPath: "apiVersion",
	mapper: {
		defaultValue: "2025-09-01",
		isConstant: true,
		serializedName: "api-version",
		type: { name: "String" }
	}
};
var contentType = {
	parameterPath: ["options", "contentType"],
	mapper: {
		defaultValue: "application/json",
		isConstant: true,
		serializedName: "Content-Type",
		type: { name: "String" }
	}
};
var message = {
	parameterPath: "message",
	mapper: EmailMessage
};
var operationId1 = {
	parameterPath: ["options", "operationId"],
	mapper: {
		serializedName: "Operation-Id",
		type: { name: "Uuid" }
	}
};
var clientRequestId = {
	parameterPath: ["options", "clientRequestId"],
	mapper: {
		serializedName: "x-ms-client-request-id",
		type: { name: "Uuid" }
	}
};
//#endregion
//#region node_modules/@azure/core-lro/dist/esm/logger.js
/**
* The `@azure/logger` configuration for this package.
* @internal
*/
var logger$1 = createClientLogger$1("core-lro");
//#endregion
//#region node_modules/@azure/core-lro/dist/esm/poller/constants.js
/**
* The default time interval to wait before sending the next polling request.
*/
var POLL_INTERVAL_IN_MS = 2e3;
/**
* The closed set of terminal states.
*/
var terminalStates = [
	"succeeded",
	"canceled",
	"failed"
];
//#endregion
//#region node_modules/@azure/core-lro/dist/esm/poller/operation.js
/**
* Deserializes the state
*/
function deserializeState(serializedState) {
	try {
		return JSON.parse(serializedState).state;
	} catch (e) {
		throw new Error(`Unable to deserialize input state: ${serializedState}`);
	}
}
function setStateError(inputs) {
	const { state, stateProxy, isOperationError } = inputs;
	return (error) => {
		if (isOperationError(error)) {
			stateProxy.setError(state, error);
			stateProxy.setFailed(state);
		}
		throw error;
	};
}
function appendReadableErrorMessage(currentMessage, innerMessage) {
	let message = currentMessage;
	if (message.slice(-1) !== ".") message = message + ".";
	return message + " " + innerMessage;
}
function simplifyError(err) {
	let message = err.message;
	let code = err.code;
	let curErr = err;
	while (curErr.innererror) {
		curErr = curErr.innererror;
		code = curErr.code;
		message = appendReadableErrorMessage(message, curErr.message);
	}
	return {
		code,
		message
	};
}
function processOperationStatus(result) {
	const { state, stateProxy, status, isDone, processResult, getError, response, setErrorAsResult } = result;
	switch (status) {
		case "succeeded":
			stateProxy.setSucceeded(state);
			break;
		case "failed": {
			const err = getError === null || getError === void 0 ? void 0 : getError(response);
			let postfix = "";
			if (err) {
				const { code, message } = simplifyError(err);
				postfix = `. ${code}. ${message}`;
			}
			const errStr = `The long-running operation has failed${postfix}`;
			stateProxy.setError(state, new Error(errStr));
			stateProxy.setFailed(state);
			logger$1.warning(errStr);
			break;
		}
		case "canceled": stateProxy.setCanceled(state);
	}
	if ((isDone === null || isDone === void 0 ? void 0 : isDone(response, state)) || isDone === void 0 && ["succeeded", "canceled"].concat(setErrorAsResult ? [] : ["failed"]).includes(status)) stateProxy.setResult(state, buildResult({
		response,
		state,
		processResult
	}));
}
function buildResult(inputs) {
	const { processResult, response, state } = inputs;
	return processResult ? processResult(response, state) : response;
}
/**
* Initiates the long-running operation.
*/
async function initOperation(inputs) {
	const { init, stateProxy, processResult, getOperationStatus, withOperationLocation, setErrorAsResult } = inputs;
	const { operationLocation, resourceLocation, metadata, response } = await init();
	if (operationLocation) withOperationLocation === null || withOperationLocation === void 0 || withOperationLocation(operationLocation, false);
	const config = {
		metadata,
		operationLocation,
		resourceLocation
	};
	logger$1.verbose(`LRO: Operation description:`, config);
	const state = stateProxy.initState(config);
	processOperationStatus({
		state,
		status: getOperationStatus({
			response,
			state,
			operationLocation
		}),
		stateProxy,
		response,
		setErrorAsResult,
		processResult
	});
	return state;
}
async function pollOperationHelper(inputs) {
	const { poll, state, stateProxy, operationLocation, getOperationStatus, getResourceLocation, isOperationError, options } = inputs;
	const response = await poll(operationLocation, options).catch(setStateError({
		state,
		stateProxy,
		isOperationError
	}));
	const status = getOperationStatus(response, state);
	logger$1.verbose(`LRO: Status:\n\tPolling from: ${state.config.operationLocation}\n\tOperation status: ${status}\n\tPolling status: ${terminalStates.includes(status) ? "Stopped" : "Running"}`);
	if (status === "succeeded") {
		const resourceLocation = getResourceLocation(response, state);
		if (resourceLocation !== void 0) return {
			response: await poll(resourceLocation).catch(setStateError({
				state,
				stateProxy,
				isOperationError
			})),
			status
		};
	}
	return {
		response,
		status
	};
}
/** Polls the long-running operation. */
async function pollOperation(inputs) {
	const { poll, state, stateProxy, options, getOperationStatus, getResourceLocation, getOperationLocation, isOperationError, withOperationLocation, getPollingInterval, processResult, getError, updateState, setDelay, isDone, setErrorAsResult } = inputs;
	const { operationLocation } = state.config;
	if (operationLocation !== void 0) {
		const { response, status } = await pollOperationHelper({
			poll,
			getOperationStatus,
			state,
			stateProxy,
			operationLocation,
			getResourceLocation,
			isOperationError,
			options
		});
		processOperationStatus({
			status,
			response,
			state,
			stateProxy,
			isDone,
			processResult,
			getError,
			setErrorAsResult
		});
		if (!terminalStates.includes(status)) {
			const intervalInMs = getPollingInterval === null || getPollingInterval === void 0 ? void 0 : getPollingInterval(response);
			if (intervalInMs) setDelay(intervalInMs);
			const location = getOperationLocation === null || getOperationLocation === void 0 ? void 0 : getOperationLocation(response, state);
			if (location !== void 0) {
				const isUpdated = operationLocation !== location;
				state.config.operationLocation = location;
				withOperationLocation === null || withOperationLocation === void 0 || withOperationLocation(location, isUpdated);
			} else withOperationLocation === null || withOperationLocation === void 0 || withOperationLocation(operationLocation, false);
		}
		updateState === null || updateState === void 0 || updateState(state, response);
	}
}
//#endregion
//#region node_modules/@azure/core-lro/dist/esm/http/operation.js
function getOperationLocationPollingUrl(inputs) {
	const { azureAsyncOperation, operationLocation } = inputs;
	return operationLocation !== null && operationLocation !== void 0 ? operationLocation : azureAsyncOperation;
}
function getLocationHeader(rawResponse) {
	return rawResponse.headers["location"];
}
function getOperationLocationHeader(rawResponse) {
	return rawResponse.headers["operation-location"];
}
function getAzureAsyncOperationHeader(rawResponse) {
	return rawResponse.headers["azure-asyncoperation"];
}
function findResourceLocation(inputs) {
	var _a;
	const { location, requestMethod, requestPath, resourceLocationConfig } = inputs;
	switch (requestMethod) {
		case "PUT": return requestPath;
		case "DELETE": return;
		case "PATCH": return (_a = getDefault()) !== null && _a !== void 0 ? _a : requestPath;
		default: return getDefault();
	}
	function getDefault() {
		switch (resourceLocationConfig) {
			case "azure-async-operation": return;
			case "original-uri": return requestPath;
			default: return location;
		}
	}
}
function inferLroMode(inputs) {
	const { rawResponse, requestMethod, requestPath, resourceLocationConfig } = inputs;
	const pollingUrl = getOperationLocationPollingUrl({
		operationLocation: getOperationLocationHeader(rawResponse),
		azureAsyncOperation: getAzureAsyncOperationHeader(rawResponse)
	});
	const location = getLocationHeader(rawResponse);
	const normalizedRequestMethod = requestMethod === null || requestMethod === void 0 ? void 0 : requestMethod.toLocaleUpperCase();
	if (pollingUrl !== void 0) return {
		mode: "OperationLocation",
		operationLocation: pollingUrl,
		resourceLocation: findResourceLocation({
			requestMethod: normalizedRequestMethod,
			location,
			requestPath,
			resourceLocationConfig
		})
	};
	else if (location !== void 0) return {
		mode: "ResourceLocation",
		operationLocation: location
	};
	else if (normalizedRequestMethod === "PUT" && requestPath) return {
		mode: "Body",
		operationLocation: requestPath
	};
	else return;
}
function transformStatus(inputs) {
	const { status, statusCode } = inputs;
	if (typeof status !== "string" && status !== void 0) throw new Error(`Polling was unsuccessful. Expected status to have a string value or no value but it has instead: ${status}. This doesn't necessarily indicate the operation has failed. Check your Azure subscription or resource status for more information.`);
	switch (status === null || status === void 0 ? void 0 : status.toLocaleLowerCase()) {
		case void 0: return toOperationStatus(statusCode);
		case "succeeded": return "succeeded";
		case "failed": return "failed";
		case "running":
		case "accepted":
		case "started":
		case "canceling":
		case "cancelling": return "running";
		case "canceled":
		case "cancelled": return "canceled";
		default:
			logger$1.verbose(`LRO: unrecognized operation status: ${status}`);
			return status;
	}
}
function getStatus(rawResponse) {
	var _a;
	const { status } = (_a = rawResponse.body) !== null && _a !== void 0 ? _a : {};
	return transformStatus({
		status,
		statusCode: rawResponse.statusCode
	});
}
function getProvisioningState(rawResponse) {
	var _a, _b;
	const { properties, provisioningState } = (_a = rawResponse.body) !== null && _a !== void 0 ? _a : {};
	return transformStatus({
		status: (_b = properties === null || properties === void 0 ? void 0 : properties.provisioningState) !== null && _b !== void 0 ? _b : provisioningState,
		statusCode: rawResponse.statusCode
	});
}
function toOperationStatus(statusCode) {
	if (statusCode === 202) return "running";
	else if (statusCode < 300) return "succeeded";
	else return "failed";
}
function parseRetryAfter({ rawResponse }) {
	const retryAfter = rawResponse.headers["retry-after"];
	if (retryAfter !== void 0) {
		const retryAfterInSeconds = parseInt(retryAfter);
		return isNaN(retryAfterInSeconds) ? calculatePollingIntervalFromDate(new Date(retryAfter)) : retryAfterInSeconds * 1e3;
	}
}
function getErrorFromResponse(response) {
	const error = accessBodyProperty(response, "error");
	if (!error) {
		logger$1.warning(`The long-running operation failed but there is no error property in the response's body`);
		return;
	}
	if (!error.code || !error.message) {
		logger$1.warning(`The long-running operation failed but the error property in the response's body doesn't contain code or message`);
		return;
	}
	return error;
}
function calculatePollingIntervalFromDate(retryAfterDate) {
	const timeNow = Math.floor((/* @__PURE__ */ new Date()).getTime());
	const retryAfterTime = retryAfterDate.getTime();
	if (timeNow < retryAfterTime) return retryAfterTime - timeNow;
}
function getStatusFromInitialResponse(inputs) {
	const { response, state, operationLocation } = inputs;
	function helper() {
		var _a;
		switch ((_a = state.config.metadata) === null || _a === void 0 ? void 0 : _a["mode"]) {
			case void 0: return toOperationStatus(response.rawResponse.statusCode);
			case "Body": return getOperationStatus(response, state);
			default: return "running";
		}
	}
	const status = helper();
	return status === "running" && operationLocation === void 0 ? "succeeded" : status;
}
function getOperationLocation({ rawResponse }, state) {
	var _a;
	switch ((_a = state.config.metadata) === null || _a === void 0 ? void 0 : _a["mode"]) {
		case "OperationLocation": return getOperationLocationPollingUrl({
			operationLocation: getOperationLocationHeader(rawResponse),
			azureAsyncOperation: getAzureAsyncOperationHeader(rawResponse)
		});
		case "ResourceLocation": return getLocationHeader(rawResponse);
		default: return;
	}
}
function getOperationStatus({ rawResponse }, state) {
	var _a;
	const mode = (_a = state.config.metadata) === null || _a === void 0 ? void 0 : _a["mode"];
	switch (mode) {
		case "OperationLocation": return getStatus(rawResponse);
		case "ResourceLocation": return toOperationStatus(rawResponse.statusCode);
		case "Body": return getProvisioningState(rawResponse);
		default: throw new Error(`Internal error: Unexpected operation mode: ${mode}`);
	}
}
function accessBodyProperty({ flatResponse, rawResponse }, prop) {
	var _a, _b;
	return (_a = flatResponse === null || flatResponse === void 0 ? void 0 : flatResponse[prop]) !== null && _a !== void 0 ? _a : (_b = rawResponse.body) === null || _b === void 0 ? void 0 : _b[prop];
}
function getResourceLocation(res, state) {
	const loc = accessBodyProperty(res, "resourceLocation");
	if (loc && typeof loc === "string") state.config.resourceLocation = loc;
	return state.config.resourceLocation;
}
function isOperationError(e) {
	return e.name === "RestError";
}
//#endregion
//#region node_modules/@azure/core-lro/dist/esm/poller/poller.js
var createStateProxy = () => ({
	/**
	* The state at this point is created to be of type OperationState<TResult>.
	* It will be updated later to be of type TState when the
	* customer-provided callback, `updateState`, is called during polling.
	*/
	initState: (config) => ({
		status: "running",
		config
	}),
	setCanceled: (state) => state.status = "canceled",
	setError: (state, error) => state.error = error,
	setResult: (state, result) => state.result = result,
	setRunning: (state) => state.status = "running",
	setSucceeded: (state) => state.status = "succeeded",
	setFailed: (state) => state.status = "failed",
	getError: (state) => state.error,
	getResult: (state) => state.result,
	isCanceled: (state) => state.status === "canceled",
	isFailed: (state) => state.status === "failed",
	isRunning: (state) => state.status === "running",
	isSucceeded: (state) => state.status === "succeeded"
});
/**
* Returns a poller factory.
*/
function buildCreatePoller(inputs) {
	const { getOperationLocation, getStatusFromInitialResponse, getStatusFromPollResponse, isOperationError, getResourceLocation, getPollingInterval, getError, resolveOnUnsuccessful } = inputs;
	return async ({ init, poll }, options) => {
		const { processResult, updateState, withOperationLocation: withOperationLocationCallback, intervalInMs = POLL_INTERVAL_IN_MS, restoreFrom } = options || {};
		const stateProxy = createStateProxy();
		const withOperationLocation = withOperationLocationCallback ? (() => {
			let called = false;
			return (operationLocation, isUpdated) => {
				if (isUpdated) withOperationLocationCallback(operationLocation);
				else if (!called) withOperationLocationCallback(operationLocation);
				called = true;
			};
		})() : void 0;
		const state = restoreFrom ? deserializeState(restoreFrom) : await initOperation({
			init,
			stateProxy,
			processResult,
			getOperationStatus: getStatusFromInitialResponse,
			withOperationLocation,
			setErrorAsResult: !resolveOnUnsuccessful
		});
		let resultPromise;
		const abortController = new AbortController();
		const handlers = /* @__PURE__ */ new Map();
		const handleProgressEvents = async () => handlers.forEach((h) => h(state));
		const cancelErrMsg = "Operation was canceled";
		let currentPollIntervalInMs = intervalInMs;
		const poller = {
			getOperationState: () => state,
			getResult: () => state.result,
			isDone: () => [
				"succeeded",
				"failed",
				"canceled"
			].includes(state.status),
			isStopped: () => resultPromise === void 0,
			stopPolling: () => {
				abortController.abort();
			},
			toString: () => JSON.stringify({ state }),
			onProgress: (callback) => {
				const s = Symbol();
				handlers.set(s, callback);
				return () => handlers.delete(s);
			},
			pollUntilDone: (pollOptions) => resultPromise !== null && resultPromise !== void 0 ? resultPromise : resultPromise = (async () => {
				const { abortSignal: inputAbortSignal } = pollOptions || {};
				function abortListener() {
					abortController.abort();
				}
				const abortSignal = abortController.signal;
				if (inputAbortSignal === null || inputAbortSignal === void 0 ? void 0 : inputAbortSignal.aborted) abortController.abort();
				else if (!abortSignal.aborted) inputAbortSignal === null || inputAbortSignal === void 0 || inputAbortSignal.addEventListener("abort", abortListener, { once: true });
				try {
					if (!poller.isDone()) {
						await poller.poll({ abortSignal });
						while (!poller.isDone()) {
							await delay$1(currentPollIntervalInMs, { abortSignal });
							await poller.poll({ abortSignal });
						}
					}
				} finally {
					inputAbortSignal === null || inputAbortSignal === void 0 || inputAbortSignal.removeEventListener("abort", abortListener);
				}
				if (resolveOnUnsuccessful) return poller.getResult();
				else switch (state.status) {
					case "succeeded": return poller.getResult();
					case "canceled": throw new Error(cancelErrMsg);
					case "failed": throw state.error;
					case "notStarted":
					case "running": throw new Error(`Polling completed without succeeding or failing`);
				}
			})().finally(() => {
				resultPromise = void 0;
			}),
			async poll(pollOptions) {
				if (resolveOnUnsuccessful) {
					if (poller.isDone()) return;
				} else switch (state.status) {
					case "succeeded": return;
					case "canceled": throw new Error(cancelErrMsg);
					case "failed": throw state.error;
				}
				await pollOperation({
					poll,
					state,
					stateProxy,
					getOperationLocation,
					isOperationError,
					withOperationLocation,
					getPollingInterval,
					getOperationStatus: getStatusFromPollResponse,
					getResourceLocation,
					processResult,
					getError,
					updateState,
					options: pollOptions,
					setDelay: (pollIntervalInMs) => {
						currentPollIntervalInMs = pollIntervalInMs;
					},
					setErrorAsResult: !resolveOnUnsuccessful
				});
				await handleProgressEvents();
				if (!resolveOnUnsuccessful) switch (state.status) {
					case "canceled": throw new Error(cancelErrMsg);
					case "failed": throw state.error;
				}
			}
		};
		return poller;
	};
}
//#endregion
//#region node_modules/@azure/core-lro/dist/esm/http/poller.js
/**
* Creates a poller that can be used to poll a long-running operation.
* @param lro - Description of the long-running operation
* @param options - options to configure the poller
* @returns an initialized poller
*/
async function createHttpPoller(lro, options) {
	const { resourceLocationConfig, intervalInMs, processResult, restoreFrom, updateState, withOperationLocation, resolveOnUnsuccessful = false } = options || {};
	return buildCreatePoller({
		getStatusFromInitialResponse,
		getStatusFromPollResponse: getOperationStatus,
		isOperationError,
		getOperationLocation,
		getResourceLocation,
		getPollingInterval: parseRetryAfter,
		getError: getErrorFromResponse,
		resolveOnUnsuccessful
	})({
		init: async () => {
			const response = await lro.sendInitialRequest();
			const config = inferLroMode({
				rawResponse: response.rawResponse,
				requestPath: lro.requestPath,
				requestMethod: lro.requestMethod,
				resourceLocationConfig
			});
			return Object.assign({
				response,
				operationLocation: config === null || config === void 0 ? void 0 : config.operationLocation,
				resourceLocation: config === null || config === void 0 ? void 0 : config.resourceLocation
			}, (config === null || config === void 0 ? void 0 : config.mode) ? { metadata: { mode: config.mode } } : {});
		},
		poll: lro.sendPollRequest
	}, {
		intervalInMs,
		withOperationLocation,
		restoreFrom,
		updateState,
		processResult: processResult ? ({ flatResponse }, state) => processResult(flatResponse, state) : ({ flatResponse }) => flatResponse
	});
}
//#endregion
//#region node_modules/@azure/communication-email/dist/esm/generated/src/lroImpl.js
function createLroSpec(inputs) {
	const { args, spec, sendOperationFn } = inputs;
	return {
		requestMethod: spec.httpMethod,
		requestPath: spec.path,
		sendInitialRequest: () => sendOperationFn(args, spec),
		sendPollRequest: (path, options) => {
			const { requestBody, ...restSpec } = spec;
			return sendOperationFn(args, {
				...restSpec,
				httpMethod: "GET",
				path,
				abortSignal: options?.abortSignal
			});
		}
	};
}
//#endregion
//#region node_modules/@azure/communication-email/dist/esm/generated/src/operations/email.js
/** Class containing Email operations. */
var EmailImpl = class {
	client;
	/**
	* Initialize a new instance of the class Email class.
	* @param client Reference to the service client
	*/
	constructor(client) {
		this.client = client;
	}
	/**
	* Gets the status of the email send operation.
	* @param operationId ID of the long running operation (GUID) returned from a previous call to send
	*                    email
	* @param options The options parameters.
	*/
	getSendResult(operationId, options) {
		return this.client.sendOperationRequest({
			operationId,
			options
		}, getSendResultOperationSpec);
	}
	/**
	* Queues an email message to be sent to one or more recipients
	* @param message Message payload for sending an email
	* @param options The options parameters.
	*/
	async beginSend(message, options) {
		const directSendOperation = async (args, spec) => {
			return this.client.sendOperationRequest(args, spec);
		};
		const sendOperationFn = async (args, spec) => {
			let currentRawResponse = void 0;
			const providedCallback = args.options?.onResponse;
			const callback = (rawResponse, flatResponse) => {
				currentRawResponse = rawResponse;
				providedCallback?.(rawResponse, flatResponse);
			};
			const updatedArgs = {
				...args,
				options: {
					...args.options,
					onResponse: callback
				}
			};
			return {
				flatResponse: await directSendOperation(updatedArgs, spec),
				rawResponse: {
					statusCode: currentRawResponse.status,
					body: currentRawResponse.parsedBody,
					headers: currentRawResponse.headers.toJSON()
				}
			};
		};
		const poller = await createHttpPoller(createLroSpec({
			sendOperationFn,
			args: {
				message,
				options
			},
			spec: sendOperationSpec
		}), {
			restoreFrom: options?.resumeFrom,
			intervalInMs: options?.updateIntervalInMs,
			resourceLocationConfig: "azure-async-operation"
		});
		await poller.poll();
		return poller;
	}
	/**
	* Queues an email message to be sent to one or more recipients
	* @param message Message payload for sending an email
	* @param options The options parameters.
	*/
	async beginSendAndWait(message, options) {
		return (await this.beginSend(message, options)).pollUntilDone();
	}
};
var serializer = createSerializer(mappers_exports, false);
var getSendResultOperationSpec = {
	path: "/emails/operations/{operationId}",
	httpMethod: "GET",
	responses: {
		200: {
			bodyMapper: EmailSendResult,
			headersMapper: EmailGetSendResultHeaders
		},
		default: {
			bodyMapper: ErrorResponse,
			headersMapper: EmailGetSendResultExceptionHeaders
		}
	},
	queryParameters: [apiVersion],
	urlParameters: [endpoint, operationId],
	headerParameters: [accept],
	serializer
};
var sendOperationSpec = {
	path: "/emails:send",
	httpMethod: "POST",
	responses: {
		200: {
			bodyMapper: EmailSendResult,
			headersMapper: EmailSendHeaders
		},
		201: {
			bodyMapper: EmailSendResult,
			headersMapper: EmailSendHeaders
		},
		202: {
			bodyMapper: EmailSendResult,
			headersMapper: EmailSendHeaders
		},
		204: {
			bodyMapper: EmailSendResult,
			headersMapper: EmailSendHeaders
		},
		default: {
			bodyMapper: ErrorResponse,
			headersMapper: EmailSendExceptionHeaders
		}
	},
	requestBody: message,
	queryParameters: [apiVersion],
	urlParameters: [endpoint],
	headerParameters: [
		accept,
		contentType,
		operationId1,
		clientRequestId
	],
	mediaType: "json",
	serializer
};
//#endregion
//#region node_modules/@azure/communication-email/dist/esm/generated/src/emailRestApiClient.js
var EmailRestApiClient = class extends ServiceClient {
	endpoint;
	apiVersion;
	/**
	* Initializes a new instance of the EmailRestApiClient class.
	* @param endpoint The communication resource, for example https://my-resource.communication.azure.com
	* @param options The parameter options
	*/
	constructor(endpoint, options) {
		if (endpoint === void 0) throw new Error("'endpoint' cannot be null");
		if (!options) options = {};
		const defaults = { requestContentType: "application/json; charset=utf-8" };
		const packageDetails = `azsdk-js-communication-email/1.1.0`;
		const userAgentPrefix = options.userAgentOptions && options.userAgentOptions.userAgentPrefix ? `${options.userAgentOptions.userAgentPrefix} ${packageDetails}` : `${packageDetails}`;
		const optionsWithDefaults = {
			...defaults,
			...options,
			userAgentOptions: { userAgentPrefix },
			endpoint: options.endpoint ?? options.baseUri ?? "{endpoint}"
		};
		super(optionsWithDefaults);
		this.endpoint = endpoint;
		this.apiVersion = options.apiVersion || "2025-09-01";
		this.email = new EmailImpl(this);
		this.addCustomApiVersionPolicy(options.apiVersion);
	}
	/** A function that adds a policy that sets the api-version (or equivalent) to reflect the library version. */
	addCustomApiVersionPolicy(apiVersion) {
		if (!apiVersion) return;
		this.pipeline.addPolicy({
			name: "CustomApiVersionPolicy",
			async sendRequest(request, next) {
				const param = request.url.split("?");
				if (param.length > 1) {
					const newParams = param[1].split("&").map((item) => {
						if (item.indexOf("api-version") > -1) return "api-version=" + apiVersion;
						else return item;
					});
					request.url = param[0] + "?" + newParams.join("&");
				}
				return next(request);
			}
		});
	}
	email;
};
//#endregion
//#region node_modules/@azure/communication-email/dist/esm/logger.js
/**
* The \@azure/logger configuration for this package.
*/
var logger = createClientLogger$1("communication-email");
//#endregion
//#region node_modules/@azure/communication-email/dist/esm/emailClient.js
/**
* Checks whether the type of a value is EmailClientOptions or not.
*
* @param options - The value being checked.
*/
var isEmailClientOptions = (options) => !!options && !isTokenCredential(options) && !isKeyCredential(options);
/**
*  The Email service client.
*/
var EmailClient = class {
	generatedClient;
	constructor(connectionStringOrUrl, credentialOrOptions, maybeOptions = {}) {
		const { url, credential } = parseClientArguments(connectionStringOrUrl, credentialOrOptions);
		const internalPipelineOptions = {
			...isEmailClientOptions(credentialOrOptions) ? credentialOrOptions : maybeOptions,
			loggingOptions: { logger: logger.info }
		};
		const authPolicy = createCommunicationAuthPolicy(credential);
		this.generatedClient = new EmailRestApiClient(url, internalPipelineOptions);
		this.generatedClient.pipeline.addPolicy(authPolicy);
	}
	/**
	* Queues an email message to be sent to one or more recipients
	* @param message - Message payload for sending an email
	* @param options - The options parameters.
	*/
	beginSend(message, options) {
		return this.generatedClient.email.beginSend(message, options);
	}
};
//#endregion
//#region node_modules/@azure/communication-email/dist/esm/generated/src/models/index.js
/** Known values of {@link EmailSendStatus} that the service accepts. */
var KnownEmailSendStatus;
(function(KnownEmailSendStatus) {
	/** NotStarted */
	KnownEmailSendStatus["NotStarted"] = "NotStarted";
	/** Running */
	KnownEmailSendStatus["Running"] = "Running";
	/** Succeeded */
	KnownEmailSendStatus["Succeeded"] = "Succeeded";
	/** Failed */
	KnownEmailSendStatus["Failed"] = "Failed";
	/** Canceled */
	KnownEmailSendStatus["Canceled"] = "Canceled";
})(KnownEmailSendStatus || (KnownEmailSendStatus = {}));
//#endregion
export { EmailClient as n, KnownEmailSendStatus as t };
