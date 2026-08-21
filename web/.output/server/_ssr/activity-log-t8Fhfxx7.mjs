//#region node_modules/.nitro/vite/services/ssr/assets/activity-log-t8Fhfxx7.js
var ACTIVITY_LOG_KEY = "vivadeo.activity-log";
function readActivityLog() {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(ACTIVITY_LOG_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}
function writeActivityLog(entries) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(entries));
}
function appendActivity(workspace, action, detail) {
	const entry = {
		id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		workspace,
		action,
		detail,
		created_at: (/* @__PURE__ */ new Date()).toISOString()
	};
	writeActivityLog([entry, ...readActivityLog()].slice(0, 100));
	return entry;
}
//#endregion
export { readActivityLog as n, appendActivity as t };
