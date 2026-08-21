import { o as getBackendHeaders, s as getBackendUrl } from "./auth-BJoGqJUw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/dashboard-data-Ew9HtBiW.js
async function fetchDashboardData(workspace) {
	async function fetchFromBackend(path) {
		try {
			const res = await fetch(getBackendUrl(path), {
				headers: getBackendHeaders(void 0, workspace),
				cache: "no-store"
			});
			if (!res.ok) return [];
			return res.json();
		} catch {
			return [];
		}
	}
	const [videos, jobs, stats] = await Promise.all([
		fetchFromBackend("/v1/videos"),
		fetchFromBackend("/v1/jobs"),
		fetchFromBackend("/v1/stats")
	]);
	return {
		videos: Array.isArray(videos) ? videos : [],
		jobs: Array.isArray(jobs) ? jobs : [],
		stats: Array.isArray(stats) ? {
			total_videos: 0,
			total_chunks: 0,
			total_storage_bytes: 0
		} : stats
	};
}
//#endregion
export { fetchDashboardData };
