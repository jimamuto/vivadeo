import { t as AbortError } from "../azure__abort-controller.mjs";
import { createHash, createHmac } from "node:crypto";
import { EOL } from "node:os";
import process from "node:process";
import util, { inspect } from "node:util";
//#region node_modules/@azure/core-auth/dist/esm/azureKeyCredential.js
/**
* A static-key-based credential that supports updating
* the underlying key value.
*/
var AzureKeyCredential = class {
	_key;
	/**
	* The value of the key to be used in authentication
	*/
	get key() {
		return this._key;
	}
	/**
	* Create an instance of an AzureKeyCredential for use
	* with a service client.
	*
	* @param key - The initial value of the key to use in authentication
	*/
	constructor(key) {
		if (!key) throw new Error("key must be a non-empty string");
		this._key = key;
	}
	/**
	* Change the value of the key.
	*
	* Updates will take effect upon the next request after
	* updating the key value.
	*
	* @param newKey - The new key value to be used
	*/
	update(newKey) {
		this._key = newKey;
	}
};
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/util/object.js
/**
* Helper to determine when an input is a generic JS object.
* @returns true when input is an object type that is not null, Array, RegExp, or Date.
*/
function isObject(input) {
	return typeof input === "object" && input !== null && !Array.isArray(input) && !(input instanceof RegExp) && !(input instanceof Date);
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/util/error.js
/**
* Typeguard for an error object shape (has name and message)
* @param e - Something caught by a catch clause.
*/
function isError$1(e) {
	if (isObject(e)) {
		const hasName = typeof e.name === "string";
		const hasMessage = typeof e.message === "string";
		return hasName && hasMessage;
	}
	return false;
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/util/sha256.js
/**
* Generates a SHA-256 HMAC signature.
* @param key - The HMAC key represented as a base64 string, used to generate the cryptographic HMAC hash.
* @param stringToSign - The data to be signed.
* @param encoding - The textual encoding to use for the returned HMAC digest.
*/
async function computeSha256Hmac$1(key, stringToSign, encoding) {
	const decodedKey = Buffer.from(key, "base64");
	return createHmac("sha256", decodedKey).update(stringToSign).digest(encoding);
}
/**
* Generates a SHA-256 hash.
* @param content - The data to be included in the hash.
* @param encoding - The textual encoding to use for the returned hash.
*/
async function computeSha256Hash$1(content, encoding) {
	return createHash("sha256").update(content).digest(encoding);
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/env.js
/**
* Returns the value of the specified environment variable.
*
* @internal
*/
function getEnvironmentVariable(name) {
	return process.env[name];
}
typeof process.versions.deno === "string" && process.versions.deno.length;
typeof process.versions.bun === "string" && process.versions.bun.length;
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/util/bytesEncoding.js
/**
* The helper that transforms bytes with specific character encoding into string
* @param bytes - the uint8array bytes
* @param format - the format we use to encode the byte
* @returns a string of the encoded string
*/
function uint8ArrayToString$1(bytes, format) {
	return Buffer.from(bytes).toString(format);
}
/**
* The helper that transforms string to specific character encoded bytes array.
* @param value - the string to be converted
* @param format - the format we use to decode the value
* @returns a uint8array
*/
function stringToUint8Array$1(value, format) {
	return Buffer.from(value, format);
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/util/sanitizer.js
var RedactedString = "REDACTED";
var defaultAllowedHeaderNames = [
	"x-ms-client-request-id",
	"x-ms-return-client-request-id",
	"x-ms-useragent",
	"x-ms-correlation-request-id",
	"x-ms-request-id",
	"client-request-id",
	"ms-cv",
	"return-client-request-id",
	"traceparent",
	"Access-Control-Allow-Credentials",
	"Access-Control-Allow-Headers",
	"Access-Control-Allow-Methods",
	"Access-Control-Allow-Origin",
	"Access-Control-Expose-Headers",
	"Access-Control-Max-Age",
	"Access-Control-Request-Headers",
	"Access-Control-Request-Method",
	"Origin",
	"Accept",
	"Accept-Encoding",
	"Cache-Control",
	"Connection",
	"Content-Length",
	"Content-Type",
	"Date",
	"ETag",
	"Expires",
	"If-Match",
	"If-Modified-Since",
	"If-None-Match",
	"If-Unmodified-Since",
	"Last-Modified",
	"Pragma",
	"Request-Id",
	"Retry-After",
	"Server",
	"Transfer-Encoding",
	"User-Agent",
	"WWW-Authenticate"
];
var defaultAllowedQueryParameters = ["api-version"];
/**
* A utility class to sanitize objects for logging.
*/
var Sanitizer = class {
	allowedHeaderNames;
	allowedQueryParameters;
	constructor({ additionalAllowedHeaderNames: allowedHeaderNames = [], additionalAllowedQueryParameters: allowedQueryParameters = [] } = {}) {
		allowedHeaderNames = defaultAllowedHeaderNames.concat(allowedHeaderNames);
		allowedQueryParameters = defaultAllowedQueryParameters.concat(allowedQueryParameters);
		this.allowedHeaderNames = new Set(allowedHeaderNames.map((n) => n.toLowerCase()));
		this.allowedQueryParameters = new Set(allowedQueryParameters.map((p) => p.toLowerCase()));
	}
	/**
	* Sanitizes an object for logging.
	* @param obj - The object to sanitize
	* @returns - The sanitized object as a string
	*/
	sanitize(obj) {
		const seen = /* @__PURE__ */ new Set();
		return JSON.stringify(obj, (key, value) => {
			if (value instanceof Error) return {
				...value,
				name: value.name,
				message: value.message
			};
			if (key === "headers" && isObject(value)) return this.sanitizeHeaders(value);
			else if (key === "url" && typeof value === "string") return this.sanitizeUrl(value);
			else if (key === "query" && isObject(value)) return this.sanitizeQuery(value);
			else if (key === "body") return;
			else if (key === "response") return;
			else if (key === "operationSpec") return;
			else if (Array.isArray(value) || isObject(value)) {
				if (seen.has(value)) return "[Circular]";
				seen.add(value);
			}
			return value;
		}, 2);
	}
	/**
	* Sanitizes a URL for logging.
	* @param value - The URL to sanitize
	* @returns - The sanitized URL as a string
	*/
	sanitizeUrl(value) {
		if (typeof value !== "string" || value === null || value === "") return value;
		const url = new URL(value);
		if (!url.search) return value;
		for (const [key] of url.searchParams) if (!this.allowedQueryParameters.has(key.toLowerCase())) url.searchParams.set(key, RedactedString);
		return url.toString();
	}
	sanitizeHeaders(obj) {
		const sanitized = {};
		for (const key of Object.keys(obj)) if (this.allowedHeaderNames.has(key.toLowerCase())) sanitized[key] = obj[key];
		else sanitized[key] = RedactedString;
		return sanitized;
	}
	sanitizeQuery(value) {
		if (typeof value !== "object" || value === null) return value;
		const sanitized = {};
		for (const k of Object.keys(value)) if (this.allowedQueryParameters.has(k.toLowerCase())) sanitized[k] = value[k];
		else sanitized[k] = RedactedString;
		return sanitized;
	}
};
//#endregion
//#region node_modules/@azure/core-util/dist/esm/createAbortablePromise.js
/**
* Creates an abortable promise.
* @param buildPromise - A function that takes the resolve and reject functions as parameters.
* @param options - The options for the abortable promise.
* @returns A promise that can be aborted.
*/
function createAbortablePromise(buildPromise, options) {
	const { cleanupBeforeAbort, abortSignal, abortErrorMsg } = options ?? {};
	return new Promise((resolve, reject) => {
		function rejectOnAbort() {
			reject(new AbortError(abortErrorMsg ?? "The operation was aborted."));
		}
		function removeListeners() {
			abortSignal?.removeEventListener("abort", onAbort);
		}
		function onAbort() {
			cleanupBeforeAbort?.();
			removeListeners();
			rejectOnAbort();
		}
		if (abortSignal?.aborted) return rejectOnAbort();
		try {
			buildPromise((x) => {
				removeListeners();
				resolve(x);
			}, (x) => {
				removeListeners();
				reject(x);
			});
		} catch (err) {
			reject(err);
		}
		abortSignal?.addEventListener("abort", onAbort);
	});
}
//#endregion
//#region node_modules/@azure/core-util/dist/esm/delay.js
var StandardAbortMessage = "The delay was aborted.";
/**
* A wrapper for setTimeout that resolves a promise after timeInMs milliseconds.
* @param timeInMs - The number of milliseconds to be delayed.
* @param options - The options for delay - currently abort options
* @returns Promise that is resolved after timeInMs
*/
function delay(timeInMs, options) {
	let token;
	const { abortSignal, abortErrorMsg } = options ?? {};
	return createAbortablePromise((resolve) => {
		token = setTimeout(resolve, timeInMs);
	}, {
		cleanupBeforeAbort: () => clearTimeout(token),
		abortSignal,
		abortErrorMsg: abortErrorMsg ?? StandardAbortMessage
	});
}
//#endregion
//#region node_modules/@azure/core-util/dist/esm/error.js
/**
* Given what is thought to be an error object, return the message if possible.
* If the message is missing, returns a stringified version of the input.
* @param e - Something thrown from a try block
* @returns The error message or a string of the input
*/
function getErrorMessage(e) {
	if (isError$1(e)) return e.message;
	else {
		let stringified;
		try {
			if (typeof e === "object" && e) stringified = JSON.stringify(e);
			else stringified = String(e);
		} catch (err) {
			stringified = "[unable to stringify input]";
		}
		return `Unknown error ${stringified}`;
	}
}
//#endregion
//#region node_modules/@azure/core-util/dist/esm/index.js
/**
* Generates a SHA-256 hash.
*
* @param content - The data to be included in the hash.
*
* @param encoding - The textual encoding to use for the returned hash.
*/
function computeSha256Hash(content, encoding) {
	return computeSha256Hash$1(content, encoding);
}
/**
* Generates a SHA-256 HMAC signature.
*
* @param key - The HMAC key represented as a base64 string, used to generate the cryptographic HMAC hash.
*
* @param stringToSign - The data to be signed.
*
* @param encoding - The textual encoding to use for the returned HMAC digest.
*/
function computeSha256Hmac(key, stringToSign, encoding) {
	return computeSha256Hmac$1(key, stringToSign, encoding);
}
/**
* Typeguard for an error object shape (has name and message)
*
* @param e - Something caught by a catch clause.
*/
function isError(e) {
	return isError$1(e);
}
/**
* A constant that indicates whether the environment the code is running is a Node.js compatible environment.
*/
var isNodeLike = true;
/**
* The helper that transforms bytes with specific character encoding into string
* @param bytes - the uint8array bytes
* @param format - the format we use to encode the byte
* @returns a string of the encoded string
*/
function uint8ArrayToString(bytes, format) {
	return uint8ArrayToString$1(bytes, format);
}
/**
* The helper that transforms string to specific character encoded bytes array.
* @param value - the string to be converted
* @param format - the format we use to decode the value
* @returns a uint8array
*/
function stringToUint8Array(value, format) {
	return stringToUint8Array$1(value, format);
}
//#endregion
//#region node_modules/@azure/core-auth/dist/esm/tokenCredential.js
/**
* Tests an object to determine whether it implements TokenCredential.
*
* @param credential - The assumed TokenCredential to be tested.
*/
function isTokenCredential(credential) {
	const castCredential = credential;
	return castCredential && typeof castCredential.getToken === "function" && (castCredential.signRequest === void 0 || castCredential.getToken.length > 0);
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/logger/log.js
function log(message, ...args) {
	process.stderr.write(`${util.format(message, ...args)}${EOL}`);
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/logger/debug.js
var debugEnvVariable = getEnvironmentVariable("DEBUG");
var enabledString;
var enabledNamespaces = [];
var skippedNamespaces = [];
var debuggers = [];
if (debugEnvVariable) enable(debugEnvVariable);
var debugObj = Object.assign((namespace) => {
	return createDebugger(namespace);
}, {
	enable,
	enabled,
	disable,
	log
});
function enable(namespaces) {
	enabledString = namespaces;
	enabledNamespaces = [];
	skippedNamespaces = [];
	const namespaceList = namespaces.split(",").map((ns) => ns.trim());
	for (const ns of namespaceList) if (ns.startsWith("-")) skippedNamespaces.push(ns.substring(1));
	else enabledNamespaces.push(ns);
	for (const instance of debuggers) instance.enabled = enabled(instance.namespace);
}
function enabled(namespace) {
	if (namespace.endsWith("*")) return true;
	for (const skipped of skippedNamespaces) if (namespaceMatches(namespace, skipped)) return false;
	for (const enabledNamespace of enabledNamespaces) if (namespaceMatches(namespace, enabledNamespace)) return true;
	return false;
}
/**
* Given a namespace, check if it matches a pattern.
* Patterns only have a single wildcard character which is *.
* The behavior of * is that it matches zero or more other characters.
*/
function namespaceMatches(namespace, patternToMatch) {
	if (patternToMatch.indexOf("*") === -1) return namespace === patternToMatch;
	let pattern = patternToMatch;
	if (patternToMatch.indexOf("**") !== -1) {
		const patternParts = [];
		let lastCharacter = "";
		for (const character of patternToMatch) if (character === "*" && lastCharacter === "*") continue;
		else {
			lastCharacter = character;
			patternParts.push(character);
		}
		pattern = patternParts.join("");
	}
	let namespaceIndex = 0;
	let patternIndex = 0;
	const patternLength = pattern.length;
	const namespaceLength = namespace.length;
	let lastWildcard = -1;
	let lastWildcardNamespace = -1;
	while (namespaceIndex < namespaceLength && patternIndex < patternLength) if (pattern[patternIndex] === "*") {
		lastWildcard = patternIndex;
		patternIndex++;
		if (patternIndex === patternLength) return true;
		while (namespace[namespaceIndex] !== pattern[patternIndex]) {
			namespaceIndex++;
			if (namespaceIndex === namespaceLength) return false;
		}
		lastWildcardNamespace = namespaceIndex;
		namespaceIndex++;
		patternIndex++;
		continue;
	} else if (pattern[patternIndex] === namespace[namespaceIndex]) {
		patternIndex++;
		namespaceIndex++;
	} else if (lastWildcard >= 0) {
		patternIndex = lastWildcard + 1;
		namespaceIndex = lastWildcardNamespace + 1;
		if (namespaceIndex === namespaceLength) return false;
		while (namespace[namespaceIndex] !== pattern[patternIndex]) {
			namespaceIndex++;
			if (namespaceIndex === namespaceLength) return false;
		}
		lastWildcardNamespace = namespaceIndex;
		namespaceIndex++;
		patternIndex++;
		continue;
	} else return false;
	const namespaceDone = namespaceIndex === namespace.length;
	const patternDone = patternIndex === pattern.length;
	const trailingWildCard = patternIndex === pattern.length - 1 && pattern[patternIndex] === "*";
	return namespaceDone && (patternDone || trailingWildCard);
}
function disable() {
	const result = enabledString || "";
	enable("");
	return result;
}
function createDebugger(namespace) {
	const newDebugger = Object.assign(debug, {
		enabled: enabled(namespace),
		destroy,
		log: debugObj.log,
		namespace,
		extend
	});
	function debug(...args) {
		if (!newDebugger.enabled) return;
		if (args.length > 0) args[0] = `${namespace} ${args[0]}`;
		newDebugger.log(...args);
	}
	debuggers.push(newDebugger);
	return newDebugger;
}
function destroy() {
	const index = debuggers.indexOf(this);
	if (index >= 0) {
		debuggers.splice(index, 1);
		return true;
	}
	return false;
}
function extend(namespace) {
	const newDebugger = createDebugger(`${this.namespace}:${namespace}`);
	newDebugger.log = this.log;
	return newDebugger;
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/logger/logger.js
var TYPESPEC_RUNTIME_LOG_LEVELS = [
	"verbose",
	"info",
	"warning",
	"error"
];
var levelMap = {
	verbose: 400,
	info: 300,
	warning: 200,
	error: 100
};
function patchLogMethod(parent, child) {
	child.log = (...args) => {
		parent.log(...args);
	};
}
function isTypeSpecRuntimeLogLevel(level) {
	return TYPESPEC_RUNTIME_LOG_LEVELS.includes(level);
}
/**
* Creates a logger context base on the provided options.
* @param options - The options for creating a logger context.
* @returns The logger context.
*/
function createLoggerContext(options) {
	const registeredLoggers = /* @__PURE__ */ new Set();
	const logLevelFromEnv = getEnvironmentVariable(options.logLevelEnvVarName);
	let logLevel;
	const clientLogger = debugObj(options.namespace);
	clientLogger.log = (...args) => {
		debugObj.log(...args);
	};
	function contextSetLogLevel(level) {
		if (level && !isTypeSpecRuntimeLogLevel(level)) throw new Error(`Unknown log level '${level}'. Acceptable values: ${TYPESPEC_RUNTIME_LOG_LEVELS.join(",")}`);
		logLevel = level;
		const enabledNamespaces = [];
		for (const logger of registeredLoggers) if (shouldEnable(logger)) enabledNamespaces.push(logger.namespace);
		debugObj.enable(enabledNamespaces.join(","));
	}
	if (logLevelFromEnv) {
		if (isTypeSpecRuntimeLogLevel(logLevelFromEnv)) contextSetLogLevel(logLevelFromEnv);
		else console.error(`${options.logLevelEnvVarName} set to unknown log level '${logLevelFromEnv}'; logging is not enabled. Acceptable values: ${TYPESPEC_RUNTIME_LOG_LEVELS.join(", ")}.`);
	}
	function shouldEnable(logger) {
		return Boolean(logLevel && levelMap[logger.level] <= levelMap[logLevel]);
	}
	function createLogger(parent, level) {
		const logger = Object.assign(parent.extend(level), { level });
		patchLogMethod(parent, logger);
		if (shouldEnable(logger)) {
			const enabledNamespaces = debugObj.disable();
			debugObj.enable(enabledNamespaces + "," + logger.namespace);
		}
		registeredLoggers.add(logger);
		return logger;
	}
	function contextGetLogLevel() {
		return logLevel;
	}
	function contextCreateClientLogger(namespace) {
		const clientRootLogger = clientLogger.extend(namespace);
		patchLogMethod(clientLogger, clientRootLogger);
		return {
			error: createLogger(clientRootLogger, "error"),
			warning: createLogger(clientRootLogger, "warning"),
			info: createLogger(clientRootLogger, "info"),
			verbose: createLogger(clientRootLogger, "verbose")
		};
	}
	return {
		setLogLevel: contextSetLogLevel,
		getLogLevel: contextGetLogLevel,
		createClientLogger: contextCreateClientLogger,
		logger: clientLogger
	};
}
var context$1 = createLoggerContext({
	logLevelEnvVarName: "TYPESPEC_RUNTIME_LOG_LEVEL",
	namespace: "typeSpecRuntime"
});
context$1.logger;
/**
* Creates a logger for use by the SDKs that inherits from `TypeSpecRuntimeLogger`.
* @param namespace - The name of the SDK package.
* @hidden
*/
function createClientLogger$1(namespace) {
	return context$1.createClientLogger(namespace);
}
//#endregion
//#region node_modules/@azure/logger/dist/esm/index.js
var context = createLoggerContext({
	logLevelEnvVarName: "AZURE_LOG_LEVEL",
	namespace: "azure"
});
context.logger;
/**
* Creates a logger for use by the Azure SDKs that inherits from `AzureLogger`.
* @param namespace - The name of the SDK package.
* @hidden
*/
function createClientLogger(namespace) {
	return context.createClientLogger(namespace);
}
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/util/inspect.js
var custom = inspect.custom;
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/esm/restError.js
var errorSanitizer = new Sanitizer();
/**
* A custom error type for failed pipeline requests.
*/
var RestError$1 = class RestError$1 extends Error {
	/**
	* Something went wrong when making the request.
	* This means the actual request failed for some reason,
	* such as a DNS issue or the connection being lost.
	*/
	static REQUEST_SEND_ERROR = "REQUEST_SEND_ERROR";
	/**
	* This means that parsing the response from the server failed.
	* It may have been malformed.
	*/
	static PARSE_ERROR = "PARSE_ERROR";
	/**
	* The code of the error itself (use statics on RestError if possible.)
	*/
	code;
	/**
	* The HTTP status code of the request (if applicable.)
	*/
	statusCode;
	/**
	* The request that was made.
	* This property is non-enumerable.
	*/
	request;
	/**
	* The response received (if any.)
	* This property is non-enumerable.
	*/
	response;
	/**
	* Bonus property set by the throw site.
	*/
	details;
	constructor(message, options = {}) {
		super(message);
		this.name = "RestError";
		this.code = options.code;
		this.statusCode = options.statusCode;
		Object.defineProperty(this, "request", {
			value: options.request,
			enumerable: false
		});
		Object.defineProperty(this, "response", {
			value: options.response,
			enumerable: false
		});
		const agent = this.request?.agent ? {
			maxFreeSockets: this.request.agent.maxFreeSockets,
			maxSockets: this.request.agent.maxSockets
		} : void 0;
		Object.defineProperty(this, custom, {
			value: () => {
				return `RestError: ${this.message} \n ${errorSanitizer.sanitize({
					...this,
					request: {
						...this.request,
						agent
					},
					response: this.response
				})}`;
			},
			enumerable: false
		});
		Object.setPrototypeOf(this, RestError$1.prototype);
	}
};
/**
* Typeguard for RestError
* @param e - Something caught by a catch clause.
*/
function isRestError$1(e) {
	if (e instanceof RestError$1) return true;
	return isError$1(e) && e.name === "RestError";
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/log.js
var logger = createClientLogger("core-rest-pipeline");
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/restError.js
/**
* A custom error type for failed pipeline requests.
*/
var RestError = RestError$1;
/**
* Typeguard for RestError
* @param e - Something caught by a catch clause.
*/
function isRestError(e) {
	return isRestError$1(e);
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/util/tokenCycler.js
var DEFAULT_CYCLER_OPTIONS = {
	forcedRefreshWindowInMs: 1e3,
	retryIntervalInMs: 3e3,
	refreshWindowInMs: 12e4
};
/**
* Converts an an unreliable access token getter (which may resolve with null)
* into an AccessTokenGetter by retrying the unreliable getter in a regular
* interval.
*
* @param getAccessToken - A function that produces a promise of an access token that may fail by returning null.
* @param retryIntervalInMs - The time (in milliseconds) to wait between retry attempts.
* @param refreshTimeout - The timestamp after which the refresh attempt will fail, throwing an exception.
* @returns - A promise that, if it resolves, will resolve with an access token.
*/
async function beginRefresh(getAccessToken, retryIntervalInMs, refreshTimeout) {
	async function tryGetAccessToken() {
		if (Date.now() < refreshTimeout) try {
			return await getAccessToken();
		} catch {
			return null;
		}
		else {
			const finalToken = await getAccessToken();
			if (finalToken === null) throw new Error("Failed to refresh access token.");
			return finalToken;
		}
	}
	let token = await tryGetAccessToken();
	while (token === null) {
		await delay(retryIntervalInMs);
		token = await tryGetAccessToken();
	}
	return token;
}
/**
* Creates a token cycler from a credential, scopes, and optional settings.
*
* A token cycler represents a way to reliably retrieve a valid access token
* from a TokenCredential. It will handle initializing the token, refreshing it
* when it nears expiration, and synchronizes refresh attempts to avoid
* concurrency hazards.
*
* @param credential - the underlying TokenCredential that provides the access
* token
* @param tokenCyclerOptions - optionally override default settings for the cycler
*
* @returns - a function that reliably produces a valid access token
*/
function createTokenCycler(credential, tokenCyclerOptions) {
	let refreshWorker = null;
	let token = null;
	let tenantId;
	const options = {
		...DEFAULT_CYCLER_OPTIONS,
		...tokenCyclerOptions
	};
	/**
	* This little holder defines several predicates that we use to construct
	* the rules of refreshing the token.
	*/
	const cycler = {
		/**
		* Produces true if a refresh job is currently in progress.
		*/
		get isRefreshing() {
			return refreshWorker !== null;
		},
		/**
		* Produces true if the cycler SHOULD refresh (we are within the refresh
		* window and not already refreshing)
		*/
		get shouldRefresh() {
			if (token === null) return true;
			if (cycler.isRefreshing) return false;
			if (token.refreshAfterTimestamp && token.refreshAfterTimestamp < Date.now()) return true;
			return token.expiresOnTimestamp - options.refreshWindowInMs < Date.now();
		},
		/**
		* Produces true if the cycler MUST refresh (null or nearly-expired
		* token).
		*/
		get mustRefresh() {
			return token === null || token.expiresOnTimestamp - options.forcedRefreshWindowInMs < Date.now();
		}
	};
	/**
	* Starts a refresh job or returns the existing job if one is already
	* running.
	*/
	function refresh(scopes, getTokenOptions) {
		if (!cycler.isRefreshing) {
			const tryGetAccessToken = () => credential.getToken(scopes, getTokenOptions);
			refreshWorker = beginRefresh(tryGetAccessToken, options.retryIntervalInMs, token?.expiresOnTimestamp ?? Date.now()).then((_token) => {
				refreshWorker = null;
				token = _token;
				tenantId = getTokenOptions.tenantId;
				return token;
			}).catch((reason) => {
				refreshWorker = null;
				token = null;
				tenantId = void 0;
				throw reason;
			});
		}
		return refreshWorker;
	}
	return async (scopes, tokenOptions) => {
		const hasClaimChallenge = Boolean(tokenOptions.claims);
		const tenantIdChanged = tenantId !== tokenOptions.tenantId;
		if (hasClaimChallenge) token = null;
		if (tenantIdChanged || hasClaimChallenge || cycler.mustRefresh) return refresh(scopes, tokenOptions);
		if (cycler.shouldRefresh) refresh(scopes, tokenOptions);
		return token;
	};
}
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/esm/policies/bearerTokenAuthenticationPolicy.js
/**
* The programmatic identifier of the bearerTokenAuthenticationPolicy.
*/
var bearerTokenAuthenticationPolicyName = "bearerTokenAuthenticationPolicy";
/**
* Try to send the given request.
*
* When a response is received, returns a tuple of the response received and, if the response was received
* inside a thrown RestError, the RestError that was thrown.
*
* Otherwise, if an error was thrown while sending the request that did not provide an underlying response, it
* will be rethrown.
*/
async function trySendRequest(request, next) {
	try {
		return [await next(request), void 0];
	} catch (e) {
		if (isRestError(e) && e.response) return [e.response, e];
		else throw e;
	}
}
/**
* Default authorize request handler
*/
async function defaultAuthorizeRequest(options) {
	const { scopes, getAccessToken, request } = options;
	const accessToken = await getAccessToken(scopes, {
		abortSignal: request.abortSignal,
		tracingOptions: request.tracingOptions,
		enableCae: true
	});
	if (accessToken) options.request.headers.set("Authorization", `Bearer ${accessToken.token}`);
}
/**
* We will retrieve the challenge only if the response status code was 401,
* and if the response contained the header "WWW-Authenticate" with a non-empty value.
*/
function isChallengeResponse(response) {
	return response.status === 401 && response.headers.has("WWW-Authenticate");
}
/**
* Re-authorize the request for CAE challenge.
* The response containing the challenge is `options.response`.
* If this method returns true, the underlying request will be sent once again.
*/
async function authorizeRequestOnCaeChallenge(onChallengeOptions, caeClaims) {
	const { scopes } = onChallengeOptions;
	const accessToken = await onChallengeOptions.getAccessToken(scopes, {
		enableCae: true,
		claims: caeClaims
	});
	if (!accessToken) return false;
	onChallengeOptions.request.headers.set("Authorization", `${accessToken.tokenType ?? "Bearer"} ${accessToken.token}`);
	return true;
}
/**
* A policy that can request a token from a TokenCredential implementation and
* then apply it to the Authorization header of a request as a Bearer token.
*/
function bearerTokenAuthenticationPolicy(options) {
	const { credential, scopes, challengeCallbacks } = options;
	const logger$1 = options.logger || logger;
	const callbacks = {
		authorizeRequest: challengeCallbacks?.authorizeRequest?.bind(challengeCallbacks) ?? defaultAuthorizeRequest,
		authorizeRequestOnChallenge: challengeCallbacks?.authorizeRequestOnChallenge?.bind(challengeCallbacks)
	};
	const getAccessToken = credential ? createTokenCycler(credential) : () => Promise.resolve(null);
	return {
		name: bearerTokenAuthenticationPolicyName,
		/**
		* If there's no challenge parameter:
		* - It will try to retrieve the token using the cache, or the credential's getToken.
		* - Then it will try the next policy with or without the retrieved token.
		*
		* It uses the challenge parameters to:
		* - Skip a first attempt to get the token from the credential if there's no cached token,
		*   since it expects the token to be retrievable only after the challenge.
		* - Prepare the outgoing request if the `prepareRequest` method has been provided.
		* - Send an initial request to receive the challenge if it fails.
		* - Process a challenge if the response contains it.
		* - Retrieve a token with the challenge information, then re-send the request.
		*/
		async sendRequest(request, next) {
			if (!request.url.toLowerCase().startsWith("https://")) throw new Error("Bearer token authentication is not permitted for non-TLS protected (non-https) URLs.");
			await callbacks.authorizeRequest({
				scopes: Array.isArray(scopes) ? scopes : [scopes],
				request,
				getAccessToken,
				logger: logger$1
			});
			let response;
			let error;
			let shouldSendRequest;
			[response, error] = await trySendRequest(request, next);
			if (isChallengeResponse(response)) {
				let claims = getCaeChallengeClaims(response.headers.get("WWW-Authenticate"));
				if (claims) {
					let parsedClaim;
					try {
						parsedClaim = atob(claims);
					} catch (e) {
						logger$1.warning(`The WWW-Authenticate header contains "claims" that cannot be parsed. Unable to perform the Continuous Access Evaluation authentication flow. Unparsable claims: ${claims}`);
						return response;
					}
					shouldSendRequest = await authorizeRequestOnCaeChallenge({
						scopes: Array.isArray(scopes) ? scopes : [scopes],
						response,
						request,
						getAccessToken,
						logger: logger$1
					}, parsedClaim);
					if (shouldSendRequest) [response, error] = await trySendRequest(request, next);
				} else if (callbacks.authorizeRequestOnChallenge) {
					shouldSendRequest = await callbacks.authorizeRequestOnChallenge({
						scopes: Array.isArray(scopes) ? scopes : [scopes],
						request,
						response,
						getAccessToken,
						logger: logger$1
					});
					if (shouldSendRequest) [response, error] = await trySendRequest(request, next);
					if (isChallengeResponse(response)) {
						claims = getCaeChallengeClaims(response.headers.get("WWW-Authenticate") ?? "");
						if (claims) {
							let parsedClaim;
							try {
								parsedClaim = atob(claims);
							} catch (e) {
								logger$1.warning(`The WWW-Authenticate header contains "claims" that cannot be parsed. Unable to perform the Continuous Access Evaluation authentication flow. Unparsable claims: ${claims}`);
								return response;
							}
							shouldSendRequest = await authorizeRequestOnCaeChallenge({
								scopes: Array.isArray(scopes) ? scopes : [scopes],
								response,
								request,
								getAccessToken,
								logger: logger$1
							}, parsedClaim);
							if (shouldSendRequest) [response, error] = await trySendRequest(request, next);
						}
					}
				}
			}
			if (error) throw error;
			else return response;
		}
	};
}
/**
* Converts: `Bearer a="b", c="d", Pop e="f", g="h"`.
* Into: `[ { scheme: 'Bearer', params: { a: 'b', c: 'd' } }, { scheme: 'Pop', params: { e: 'f', g: 'h' } } ]`.
*
* @internal
*/
function parseChallenges(challenges) {
	const challengeRegex = /(\w+)\s+((?:\w+=(?:"[^"]*"|[^,]*),?\s*)+)/g;
	const paramRegex = /(\w+)="([^"]*)"/g;
	const parsedChallenges = [];
	let match;
	while ((match = challengeRegex.exec(challenges)) !== null) {
		const scheme = match[1];
		const paramsString = match[2];
		const params = {};
		let paramMatch;
		while ((paramMatch = paramRegex.exec(paramsString)) !== null) params[paramMatch[1]] = paramMatch[2];
		parsedChallenges.push({
			scheme,
			params
		});
	}
	return parsedChallenges;
}
/**
* Parse a pipeline response and look for a CAE challenge with "Bearer" scheme
* Return the value in the header without parsing the challenge
* @internal
*/
function getCaeChallengeClaims(challenges) {
	if (!challenges) return;
	return parseChallenges(challenges).find((x) => x.scheme === "Bearer" && x.params.claims && x.params.error === "insufficient_claims")?.params.claims;
}
//#endregion
//#region node_modules/@azure/communication-common/dist/esm/credential/communicationAccessKeyCredentialPolicy.js
/**
* CommunicationKeyCredentialPolicy provides a means of signing requests made through
* the SmsClient.
*/
var communicationAccessKeyCredentialPolicy = "CommunicationAccessKeyCredentialPolicy";
/**
* Creates an HTTP pipeline policy to authenticate a request using a `KeyCredential`.
* @hidden
*
* @param credential - The key credential.
*/
function createCommunicationAccessKeyCredentialPolicy(credential) {
	return {
		name: communicationAccessKeyCredentialPolicy,
		async sendRequest(request, next) {
			const verb = request.method.toUpperCase();
			const utcNow = (/* @__PURE__ */ new Date()).toUTCString();
			const contentHash = await computeSha256Hash(request.body?.toString() || "", "base64");
			const dateHeader = "x-ms-date";
			const signedHeaders = `${dateHeader};host;x-ms-content-sha256`;
			const url = new URL(request.url);
			const query = url.searchParams.toString();
			const stringToSign = `${verb}\n${query ? `${url.pathname}?${query}` : url.pathname}\n${utcNow};${url.host};${contentHash}`;
			const signature = await computeSha256Hmac(credential.key, stringToSign, "base64");
			request.headers.set("Host", url.host);
			request.headers.set(dateHeader, utcNow);
			request.headers.set("x-ms-content-sha256", contentHash);
			request.headers.set("Authorization", `HMAC-SHA256 SignedHeaders=${signedHeaders}&Signature=${signature}`);
			return next(request);
		}
	};
}
//#endregion
//#region node_modules/@azure/communication-common/dist/esm/credential/communicationAuthPolicy.js
/**
* Creates a pipeline policy to authenticate request based
* on the credential passed in.
* @hidden
*
* @param credential - The KeyCredential or TokenCredential.
*/
function createCommunicationAuthPolicy(credential) {
	if (isTokenCredential(credential)) return bearerTokenAuthenticationPolicy({
		credential,
		scopes: ["https://communication.azure.com//.default"]
	});
	else return createCommunicationAccessKeyCredentialPolicy(credential);
}
//#endregion
//#region node_modules/@azure/communication-common/dist/esm/credential/connectionString.js
var CONNECTION_STRING_REGEX = /endpoint=(.*);accesskey=(.*)/i;
var tryParseConnectionString = (s) => {
	const match = s.match(CONNECTION_STRING_REGEX);
	if (match?.[1] && match[2]) return {
		endpoint: match[1],
		credential: new AzureKeyCredential(match[2])
	};
};
/**
* Returns an EndpointCredential to easily access properties of the connection string.
* @hidden
*
* @param connectionString - The connection string to parse
* @returns Object to access the endpoint and the credentials
*/
var parseConnectionString = (connectionString) => {
	const parsedConnectionString = tryParseConnectionString(connectionString);
	if (parsedConnectionString) return parsedConnectionString;
	else throw new Error(`Invalid connection string ${connectionString}`);
};
//#endregion
//#region node_modules/@azure/communication-common/dist/esm/credential/clientArguments.js
var isValidEndpoint = (host) => {
	const url = new URL(host);
	return !!url.protocol?.match(/^http[s]?/) && url.host !== void 0 && url.host !== "" && (url.pathname === void 0 || url.pathname === "" || url.pathname === "/");
};
var assertValidEndpoint = (host) => {
	if (!isValidEndpoint(host)) throw new Error(`Invalid endpoint url ${host}`);
};
/**
* Checks whether a value is a KeyCredential.
*
* @param credential - The credential being checked.
*/
var isKeyCredential = (credential) => {
	const castCredential = credential;
	return castCredential && typeof castCredential.key === "string" && castCredential.getToken === void 0;
};
/**
* Parses arguments passed to a communication client.
* @hidden
*/
var parseClientArguments = (connectionStringOrUrl, credentialOrOptions) => {
	if (isKeyCredential(credentialOrOptions) || isTokenCredential(credentialOrOptions)) {
		assertValidEndpoint(connectionStringOrUrl);
		return {
			url: connectionStringOrUrl,
			credential: credentialOrOptions
		};
	} else {
		const { endpoint: host, credential } = parseConnectionString(connectionStringOrUrl);
		assertValidEndpoint(host);
		return {
			url: host,
			credential
		};
	}
};
//#endregion
export { getErrorMessage as _, RestError as a, stringToUint8Array$1 as b, RestError$1 as c, createClientLogger$1 as d, isTokenCredential as f, uint8ArrayToString as g, stringToUint8Array as h, bearerTokenAuthenticationPolicy as i, isRestError$1 as l, isNodeLike as m, parseClientArguments as n, isRestError as o, isError as p, createCommunicationAuthPolicy as r, logger as s, isKeyCredential as t, createClientLogger as u, delay as v, Sanitizer as y };
