"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { appendActivity, readActivityLog, type ActivityEntry } from "@/lib/activity-log";
import { useWorkspacePermissions } from "@/lib/workspace-permissions";
import { MascotScout } from "@/components/mascot-scout";
import type { Job, Video } from "./dashboard-data";

type FetchStatus = { state: "idle" | "loading" | "ok" | "error"; message?: string };

function StatusLine({ status }: { status: FetchStatus }) {
  if (status.state === "idle") return null;
  const color = status.state === "ok" ? "var(--accent)" : status.state === "error" ? "var(--danger)" : "inherit";
  return <p className="muted" style={{ marginTop: 10, color }}>{status.state === "loading" ? "Working..." : status.message}</p>;
}

async function proxyPost<T>(path: string, body: BodyInit, json = true) {
  const res = await fetch(`/api/proxy${path}`, {
    method: "POST",
    body,
    ...(json ? { headers: { "Content-Type": "application/json" } } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? JSON.stringify(data));
  return data as T;
}

function statusTone(status: string) {
  if (status === "succeeded" || status === "ready") return "good";
  if (status === "failed" || status === "canceled") return "bad";
  if (status === "running" || status === "processing") return "live";
  return "idle";
}

function sourceLabel(sourceType: string) {
  return sourceType.replace(/_/g, " ");
}

const HISTORY_JOB_LABELS: Record<string, string> = {
  ingest_uploaded_object: "Video upload",
  ingest_url: "Video import",
  ingest_local_path: "Local video import",
  trim_clip: "Clip export",
};

function jobLabel(kind: string) {
  return HISTORY_JOB_LABELS[kind] || kind.replace(/_/g, " ");
}

function jobStatusLabel(status: string) {
  if (status === "succeeded") return "Completed";
  if (status === "running") return "Processing";
  if (status === "queued") return "Waiting";
  return status;
}

export function fmt(seconds: number | null): string {
  if (seconds == null) return "-";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function fmtDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}

function fmtBytes(bytes: number) {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function JobStages({ job }: { job: Job }) {
  const stages = ["queued", "chunking", "embedding", "indexing", "ready"];
  const activeIndex =
    job.status === "failed"
      ? Math.max(0, stages.indexOf(job.message?.toLowerCase().includes("embed") ? "embedding" : "chunking"))
      : job.status === "succeeded"
        ? stages.length - 1
        : Math.max(0, Math.min(stages.length - 2, Math.floor((job.progress ?? 0) * (stages.length - 1))));

  return (
    <div className="job-stage-list" aria-label="Job stages">
      {stages.map((stage, index) => {
        const state = job.status === "failed" && index === activeIndex ? "failed" : index < activeIndex ? "done" : index === activeIndex ? "active" : "pending";
        return (
          <div key={stage} className={`job-stage job-stage-${state}`}>
            <strong>{stage}</strong>
          </div>
        );
      })}
    </div>
  );
}

export function IngestPanel({ workspace = "default-workspace", videos: initialVideos = [], jobs: initialJobs = [] }: { workspace?: string; videos?: Video[]; jobs?: Job[] }) {
  const router = useRouter();
  const permissions = useWorkspacePermissions(workspace);
  const fileRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const [fileStatus, setFileStatus] = useState<FetchStatus>({ state: "idle" });
  const [urlStatus, setUrlStatus] = useState<FetchStatus>({ state: "idle" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [ingestMode, setIngestMode] = useState<"file" | "youtube">("file");
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [videos, setVideos] = useState(initialVideos);
  const [jobs, setJobs] = useState(initialJobs);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [interruptedJobs, setInterruptedJobs] = useState<Job[]>(initialJobs.filter((job) => ["failed", "canceled"].includes(job.status)));
  const [recoveryStatus, setRecoveryStatus] = useState<FetchStatus>({ state: "idle" });

  useEffect(() => {
    let active = true;
    async function refreshIngests() {
      try {
        const [videoResponse, jobResponse] = await Promise.all([fetch("/api/proxy/v1/videos"), fetch("/api/proxy/v1/jobs")]);
        if (!videoResponse.ok || !jobResponse.ok || !active) return;
        const nextVideos = (await videoResponse.json()) as Video[];
        const payload = (await jobResponse.json()) as Job[];
        setVideos(nextVideos);
        setJobs(payload);
        setInterruptedJobs(
          payload.filter(
            (job) =>
              ["ingest_uploaded_object", "ingest_url", "ingest_local_path"].includes(job.kind) &&
              ["failed", "canceled"].includes(job.status),
          ),
        );
      } catch {
        return;
      }
    }
    const timer = window.setInterval(() => void refreshIngests(), 4000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const latestJobByVideo = useMemo(() => {
    const ordered = [...jobs].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
    return new Map(ordered.filter((job) => job.video_id).map((job) => [job.video_id!, job] as const));
  }, [jobs]);

  const ingestRows = useMemo(() => videos.map((video) => {
    const job = latestJobByVideo.get(video.id);
    const status = job?.status === "succeeded" ? "ready" : job?.status || video.status;
    return { video, job, status };
  }).filter(({ video, status }) => {
    if (statusFilter !== "all" && (statusFilter === "processing" ? !["queued", "running", "processing"].includes(status) : status !== statusFilter)) return false;
    const needle = query.trim().toLowerCase();
    return !needle || `${video.filename} ${video.source_uri}`.toLowerCase().includes(needle);
  }), [videos, latestJobByVideo, query, statusFilter]);

  const ingestCounts = useMemo(() => ({
    all: videos.length,
    processing: videos.filter((video) => ["queued", "running", "processing"].includes(latestJobByVideo.get(video.id)?.status || video.status)).length,
    ready: videos.filter((video) => (latestJobByVideo.get(video.id)?.status === "succeeded" ? "ready" : latestJobByVideo.get(video.id)?.status || video.status) === "ready").length,
    failed: videos.filter((video) => ["failed", "canceled"].includes(latestJobByVideo.get(video.id)?.status || video.status)).length,
  }), [videos, latestJobByVideo]);

  function validateFile(file: File | undefined) {
    if (!file) return "Please select a file.";
    const sizeLimitMb = 512;
    if (!file.type.startsWith("video/")) return "Only video uploads are supported right now.";
    if (file.size > sizeLimitMb * 1024 * 1024) return `File is larger than ${sizeLimitMb} MB. Use a smaller source or URL ingest.`;
    return null;
  }

  function syncSelectedFile(file: File | undefined) {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setSelectedFile(file || null);
    setFilePreviewUrl(file ? URL.createObjectURL(file) : null);
    const validationError = validateFile(file);
    if (validationError) setFileStatus({ state: "error", message: validationError });
    else setFileStatus({ state: "idle" });
  }

  function bindDroppedFile(file: File | undefined) {
    if (!fileRef.current || !file) {
      syncSelectedFile(undefined);
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
    if (validationError) return setFileStatus({ state: "error", message: validationError });
    setFileStatus({ state: "loading" });
    try {
      const fd = new FormData();
      fd.append("file", file!);
      fd.append("transcribe", "true");
      const job = await proxyPost<Job>("/v1/videos/upload", fd, false);
      appendActivity(workspace, "ingest.queued", file!.name);
      setJobs((current) => [job, ...current]);
      setIsUploadDrawerOpen(false);
      router.refresh();
      if (fileRef.current) fileRef.current.value = "";
      syncSelectedFile(undefined);
    } catch (e: unknown) {
      setFileStatus({ state: "error", message: `Upload failed: ${(e as Error).message}` });
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const url = urlRef.current?.value?.trim();
    if (!url) return setUrlStatus({ state: "error", message: "Please enter a URL." });
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        setUrlStatus({ state: "error", message: "Only http and https URLs are supported." });
        return;
      }
      if (!parsed.hostname.includes(".")) {
        setUrlStatus({ state: "error", message: "URL must include a valid host." });
        return;
      }
    } catch {
      setUrlStatus({ state: "error", message: "Enter a valid URL." });
      return;
    }
    setUrlStatus({ state: "loading" });
    try {
      const job = await proxyPost<Job>("/v1/videos/url", JSON.stringify({ url, transcribe: true }));
      appendActivity(workspace, "ingest.queued", url);
      setJobs((current) => [job, ...current]);
      setIsUploadDrawerOpen(false);
      router.refresh();
      if (urlRef.current) urlRef.current.value = "";
    } catch (e: unknown) {
      setUrlStatus({ state: "error", message: `Failed: ${(e as Error).message}` });
    }
  }

  async function retryInterruptedJob(jobId: string) {
    setRecoveryStatus({ state: "loading" });
    try {
      const job = await proxyPost<Job>(`/v1/jobs/${jobId}/retry`, "");
      setInterruptedJobs((current) => current.filter((item) => item.id !== jobId));
      setRecoveryStatus({ state: "ok", message: "Interrupted ingest re-queued." });
      setJobs((current) => [job, ...current.filter((item) => item.id !== jobId)]);
    } catch (cause) {
      setRecoveryStatus({
        state: "error",
        message: cause instanceof Error ? cause.message : "Retry failed",
      });
    }
  }

  return (
    <section className="ingest-registry">
      <header className="ingest-registry-head">
        <div><h1>Videos</h1><p>Track every source as it moves from upload to searchable video evidence.</p></div>
      </header>
      <div className="ingest-status-bar">
        <nav className="ingest-status-tabs" aria-label="Filter videos by processing status">
          {([ ["all", "All", ingestCounts.all], ["processing", "Processing", ingestCounts.processing], ["ready", "Ready", ingestCounts.ready], ["failed", "Needs attention", ingestCounts.failed] ] as const).map(([value, label, count]) => <button key={value} type="button" className={statusFilter === value ? "is-active" : ""} onClick={() => setStatusFilter(value)}>{label} <span>{count}</span></button>)}
        </nav>
        <button type="button" className="button ingest-add-button" onClick={() => setIsUploadDrawerOpen(true)} disabled={!permissions.canEdit}>＋ Add videos</button>
      </div>
      <div className="ingest-registry-tools"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search videos…" aria-label="Search uploaded videos" /><span>{ingestRows.length} shown</span></div>
      <div className="ingest-registry-table-wrap">
        <table className="ingest-registry-table">
          <thead><tr><th>File</th><th>Added</th><th>Status</th><th>Progress</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {ingestRows.map(({ video, job, status }) => {
              const isWorking = ["queued", "running", "processing"].includes(status);
              const progress = status === "ready" ? 100 : Math.round((job?.progress || 0) * 100);
              return <tr key={video.id}>
                <td data-label="File"><div className="ingest-file-identity"><span aria-hidden="true">▶</span><div><strong>{video.filename}</strong><small>{sourceLabel(video.source_type)} · {video.duration ? fmt(video.duration) : "Duration pending"}</small></div></div></td>
                <td data-label="Added"><time dateTime={video.created_at}>{fmtDate(video.created_at)}</time></td>
                <td data-label="Status"><span className={`ingest-status ingest-status-${statusTone(status)}`}><i aria-hidden="true" />{status === "ready" || status === "succeeded" ? "Ready" : status === "running" || status === "processing" ? "Processing" : status === "queued" ? "Queued" : status === "canceled" ? "Canceled" : status === "failed" ? "Failed" : status}</span></td>
                <td data-label="Progress"><div className="ingest-row-progress"><span><i style={{ width: `${progress}%` }} /></span><small>{isWorking ? `${progress}%` : job?.message || (status === "ready" ? "Searchable" : "Waiting")}</small></div></td>
                <td data-label="Actions"><div className="ingest-row-actions">{status === "ready" || status === "succeeded" ? <Link href={`/search?video_ids=${encodeURIComponent(video.id)}`} aria-label={`Start a new search with ${video.filename}`}>Search</Link> : null}{!job ? <Link href={`/dashboard/library?video_id=${encodeURIComponent(video.id)}`} aria-label={`Open ${video.filename} in the library`}>Open</Link> : null}{["failed", "canceled"].includes(status) && job ? <button type="button" onClick={() => void retryInterruptedJob(job.id)} disabled={!permissions.canEdit}>Retry</button> : null}</div></td>
              </tr>;
            })}
            {ingestRows.length === 0 ? <tr><td colSpan={5}><div className="ingest-registry-empty"><MascotScout size="small" motion="look" /><strong>{videos.length ? "No videos match this view" : "Your first video starts here"}</strong><p>{videos.length ? "Try another status or search term." : "Add a file or video link to begin building searchable evidence."}</p><button type="button" className="button-secondary" onClick={() => setIsUploadDrawerOpen(true)}>Add video</button></div></td></tr> : null}
          </tbody>
        </table>
      </div>
      <input ref={fileRef} id="file" name="file" type="file" accept="video/*" onChange={(event) => syncSelectedFile(event.target.files?.[0])} />
      {isUploadDrawerOpen ? (
        <div className="chat-settings-overlay ingest-drawer-layer" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) setIsUploadDrawerOpen(false); }}>
          <aside className="chat-settings-drawer ingest-upload-drawer" role="dialog" aria-modal="true" aria-labelledby="ingest-drawer-title">
            <header><div><h2 id="ingest-drawer-title">Add videos</h2><p>Upload a local file or add a video link.</p></div><button type="button" className="chat-model-close" aria-label="Close upload drawer" onClick={() => setIsUploadDrawerOpen(false)}>×</button></header>
            <div className="chat-settings-body ingest-drawer-body">
              <div className="ingest-mode-switch" role="tablist" aria-label="Video source"><button type="button" className={ingestMode === "file" ? "is-active" : ""} onClick={() => setIngestMode("file")} role="tab" aria-selected={ingestMode === "file"}>Upload file</button><button type="button" className={ingestMode === "youtube" ? "is-active" : ""} onClick={() => setIngestMode("youtube")} role="tab" aria-selected={ingestMode === "youtube"}>Video link</button></div>
              {ingestMode === "file" ? <button type="button" className={`ingest-drawer-dropzone${isDragActive ? " is-active" : ""}`} onClick={() => fileRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setIsDragActive(true); }} onDragOver={(event) => { event.preventDefault(); setIsDragActive(true); }} onDragLeave={(event) => { event.preventDefault(); setIsDragActive(false); }} onDrop={(event) => { event.preventDefault(); setIsDragActive(false); bindDroppedFile(event.dataTransfer.files?.[0]); }}><span className="ingest-drawer-upload-icon" aria-hidden="true">↑</span><strong>{selectedFile ? selectedFile.name : isDragActive ? "Drop video to add it" : "Click or drag video to upload"}</strong><span>{selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · ${selectedFile.type || "Video file"}` : "Video files up to 512 MB"}</span></button> : <form className="ingest-url-form" id="ingest-url-form" onSubmit={handleSubmit}><label htmlFor="url">Video URL</label><input ref={urlRef} id="url" name="url" placeholder="https://…" /><p>Confirm you have permission to use this source.</p><StatusLine status={urlStatus} /></form>}
              <StatusLine status={fileStatus} />
            </div>
            <footer><button type="button" className="button-secondary" onClick={() => setIsUploadDrawerOpen(false)}>Cancel</button>{ingestMode === "file" ? <button type="button" onClick={handleUpload} disabled={!selectedFile || fileStatus.state === "loading" || !permissions.canEdit}>{fileStatus.state === "loading" ? "Uploading…" : "Upload video"}</button> : <button type="submit" form="ingest-url-form" disabled={urlStatus.state === "loading" || !permissions.canEdit}>{urlStatus.state === "loading" ? "Adding…" : "Add link"}</button>}</footer>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

export function JobsPanel({ jobs, videos, referenceTime }: { jobs: Job[]; videos: Video[]; referenceTime: string }) {
  const permissions = useWorkspacePermissions();
  const [items, setItems] = useState(jobs);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyKind, setHistoryKind] = useState("all");
  const [historyStatus, setHistoryStatus] = useState("all");
  const [historyRange, setHistoryRange] = useState("30");
  const [historySort, setHistorySort] = useState<"newest" | "oldest" | "status">("newest");

  useEffect(() => setItems(jobs), [jobs]);

  const videoNames = useMemo(() => new Map(videos.map((video) => [video.id, video.filename])), [videos]);
  const historyItems = items.filter((job) => job.kind in HISTORY_JOB_LABELS);
  const jobKinds = [...new Set(historyItems.map((job) => job.kind))].sort();
  const query = historyQuery.trim().toLowerCase();
  const cutoff = historyRange === "all" ? 0 : new Date(referenceTime).getTime() - Number(historyRange) * 86_400_000;
  const visibleItems = [...historyItems]
    .filter((job) => {
      const source = job.video_id ? videoNames.get(job.video_id) || "" : "";
      return (!query || `${job.kind} ${job.status} ${job.message || ""} ${source}`.toLowerCase().includes(query))
        && (historyKind === "all" || job.kind === historyKind)
        && (historyStatus === "all" || job.status === historyStatus)
        && (!cutoff || new Date(job.created_at).getTime() >= cutoff);
    })
    .sort((a, b) => {
      if (historySort === "status") return a.status.localeCompare(b.status);
      const direction = historySort === "newest" ? -1 : 1;
      return direction * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

  async function updateJob(jobId: string, action: "retry" | "cancel") {
    setNotice(null);
    setError(null);
    try {
      const nextJob = await proxyPost<Job>(`/v1/jobs/${jobId}/${action}`, "");
      setItems((current) => current.map((job) => (job.id === jobId ? { ...job, ...nextJob } : job)));
      setNotice(action === "retry" ? "Retry queued." : "Job canceled.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unknown error");
    }
  }

  return (
    <section className="job-history-page">
      <header className="job-history-heading">
        <div>
          <h1>Job history</h1>
          <p>Track video uploads, imports, and processing outcomes for this workspace.</p>
        </div>
        <span>{visibleItems.length} {visibleItems.length === 1 ? "job" : "jobs"}</span>
      </header>

      <div className="history-toolbar">
        <label className="history-search" htmlFor="job-history-search">
          <span className="sr-only">Search jobs</span>
          <input id="job-history-search" type="search" placeholder="Search jobs or sources" value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} />
        </label>
        <label>
          <span className="sr-only">Job type</span>
          <select value={historyKind} onChange={(event) => setHistoryKind(event.target.value)}>
            <option value="all">All job types</option>
            {jobKinds.map((kind) => <option key={kind} value={kind}>{jobLabel(kind)}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Status</span>
          <select value={historyStatus} onChange={(event) => setHistoryStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="queued">Waiting</option>
            <option value="running">Processing</option>
            <option value="succeeded">Completed</option>
            <option value="failed">Failed</option>
            <option value="canceled">Canceled</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Date range</span>
          <select value={historyRange} onChange={(event) => setHistoryRange(event.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Sort jobs</span>
          <select value={historySort} onChange={(event) => setHistorySort(event.target.value as typeof historySort)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="status">Status</option>
          </select>
        </label>
      </div>

      {error ? <p className="notice notice-bad">{error}</p> : null}
      {notice ? <p className="notice notice-good">{notice}</p> : null}
      {historyItems.length === 0 ? <p className="history-empty">No processing history yet. Video uploads and imports will appear here.</p> : visibleItems.length === 0 ? <p className="history-empty">No jobs match these filters.</p> : (
        <div className="job-history-table-wrap">
          <table className="job-history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Job</th>
                <th>Source</th>
                <th>Progress</th>
                <th>Status</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((job) => {
                const source = job.video_id ? videoNames.get(job.video_id) : null;
                const progress = Math.round((job.progress ?? 0) * 100);
                return (
                  <tr key={job.id}>
                    <td data-label="Date"><time dateTime={job.created_at}>{fmtDate(job.created_at)}</time></td>
                    <td data-label="Job">
                      <strong>{jobLabel(job.kind)}</strong>
                      <span>{job.message || "Waiting for an update"}</span>
                    </td>
                    <td data-label="Source">{source || (job.video_id ? `Video ${job.video_id.slice(0, 8)}` : "Workspace")}</td>
                    <td data-label="Progress">
                      <span className="history-progress-value">{progress}%</span>
                      <span className="history-progress-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></span>
                    </td>
                    <td data-label="Status"><span className={`job-status job-status-${statusTone(job.status)}`}><i aria-hidden="true" />{jobStatusLabel(job.status)}</span></td>
                    <td className="history-actions">
                      <details>
                        <summary aria-label={`Actions for ${jobLabel(job.kind)}`}>•••</summary>
                        <div>
                          <Link href={`/jobs?job=${encodeURIComponent(job.id)}`}>View details</Link>
                          {job.video_id ? <Link href={`/dashboard/library?video_id=${encodeURIComponent(job.video_id)}`}>Open in Library</Link> : null}
                          {job.status === "queued" || job.status === "running" ? <button type="button" disabled={isPending || !permissions.canEdit} onClick={() => startTransition(() => updateJob(job.id, "cancel"))}>Cancel job</button> : null}
                          {job.status === "failed" || job.status === "canceled" ? <button type="button" disabled={isPending || !permissions.canEdit} onClick={() => startTransition(() => updateJob(job.id, "retry"))}>Retry job</button> : null}
                        </div>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

type LibraryFolder = { id: string; name: string; position: number };

function LibraryFolderMenu({
  folders,
  value,
  label,
  placeholder,
  onChange,
  disabled = false,
}: {
  folders: LibraryFolder[];
  value?: string;
  label?: string;
  placeholder?: string;
  onChange: (folderId: string) => void;
  disabled?: boolean;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const currentName = value === undefined ? placeholder || "Move to…" : folders.find((folder) => folder.id === value)?.name || "Unorganized";

  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      if (menuRef.current?.open && !menuRef.current.contains(event.target as Node)) menuRef.current.open = false;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menuRef.current?.open) {
        menuRef.current.open = false;
        menuRef.current.querySelector<HTMLElement>("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const choose = (folderId: string) => {
    onChange(folderId);
    if (menuRef.current) menuRef.current.open = false;
  };

  return (
    <details className="library-folder-menu" ref={menuRef} data-disabled={disabled || undefined}>
      <summary aria-label={label || `Move video from ${currentName}`} aria-disabled={disabled} tabIndex={disabled ? -1 : 0} onClick={(event) => { if (disabled) event.preventDefault(); }}>{currentName}<span aria-hidden="true">⌄</span></summary>
      <div role="menu" aria-label="Choose folder">
        <button type="button" role="menuitemradio" aria-checked={value === ""} onClick={() => choose("")}><span>Unorganized</span>{value === "" ? <b aria-hidden="true">✓</b> : null}</button>
        {folders.map((folder) => <button key={folder.id} type="button" role="menuitemradio" aria-checked={value === folder.id} onClick={() => choose(folder.id)}><span>{folder.name}</span>{value === folder.id ? <b aria-hidden="true">✓</b> : null}</button>)}
      </div>
    </details>
  );
}

export function LibraryPanel({ videos, jobs: _jobs, initialVideoId = "", initialStartTime, initialView = "all", initialFolder = "" }: { videos: Video[]; jobs: Job[]; initialVideoId?: string; initialStartTime?: number; initialView?: string; initialFolder?: string }) {
  const router = useRouter();
  const permissions = useWorkspacePermissions();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState(videos);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState(initialView === "folders" || initialView === "unorganized" ? initialView : initialView === "folder" && initialFolder ? initialFolder : "all");
  const [folderDraft, setFolderDraft] = useState("");
  const [editingFolderId, setEditingFolderId] = useState("");
  const [editingFolderName, setEditingFolderName] = useState("");
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [actionStatus, setActionStatus] = useState<FetchStatus>({ state: "idle" });
  const [draggedVideoId, setDraggedVideoId] = useState<string | null>(null);
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(initialVideoId || "");
  const [viewOpen, setViewOpen] = useState(false);
  const [folderPickerId, setFolderPickerId] = useState("");
  const [pickerVideoIds, setPickerVideoIds] = useState<string[]>([]);

  useEffect(() => {
    setItems(videos);
  }, [videos]);

  useEffect(() => {
    setActiveFolder(initialView === "folders" || initialView === "unorganized" ? initialView : initialView === "folder" && initialFolder ? initialFolder : "all");
  }, [initialView, initialFolder]);

  useEffect(() => {
    let active = true;
    void fetch("/api/proxy/v1/library/folders", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Folder lookup failed (${response.status})`);
        return response.json() as Promise<LibraryFolder[]>;
      })
      .then((payload) => { if (active) setFolders(payload); })
      .catch((cause) => { if (active) setActionStatus({ state: "error", message: cause instanceof Error ? cause.message : "Folders could not be loaded." }); });
    return () => { active = false; };
  }, []);

  const filteredVideos = useMemo(() => {
    return items.filter((video) => {
      if (activeFolder === "unorganized" && video.collection) return false;
      if (activeFolder !== "all" && activeFolder !== "unorganized" && video.collection !== activeFolder) return false;
      if (!query.trim()) return true;
      const haystack = video.filename.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });
  }, [items, query, activeFolder]);

  const selectedVideo = items.find((video) => video.id === selectedId) ?? null;
  const selectedMediaUrl = selectedVideo?.object_key
    ? `/api/proxy/v1/media/${selectedVideo.object_key.split("/").map(encodeURIComponent).join("/")}`
    : null;
  const folderName = (folderId?: string | null) => folders.find((folder) => folder.id === folderId)?.name || "Unorganized";
  const unorganizedCount = items.filter((video) => !video.collection).length;

  function openLibrarySection(section: "all" | "folders" | "unorganized" | "folder", folder?: LibraryFolder) {
    const next = section === "folder" && folder ? folder.id : section;
    setActiveFolder(next);
    setSelectedVideoIds([]);
    setQuery("");
    const params = new URLSearchParams();
    if (section !== "all") params.set("view", section);
    if (folder) {
      params.set("folder", folder.id);
      params.set("folder_name", folder.name);
    }
    router.replace(`/dashboard/library${params.size ? `?${params.toString()}` : ""}` as any, { scroll: false });
  }

  useEffect(() => {
    if (!viewOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setViewOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [viewOpen]);

  useEffect(() => {
    const player = document.querySelector<HTMLVideoElement>(".library-view-dialog video");
    if (!player || initialStartTime === undefined || !selectedVideo) return;
    const seek = () => { player.currentTime = Math.min(initialStartTime, player.duration || initialStartTime); };
    if (player.readyState >= 1) seek();
    else player.addEventListener("loadedmetadata", seek, { once: true });
    return () => player.removeEventListener("loadedmetadata", seek);
  }, [initialStartTime, selectedVideo?.id]);

  async function reorderVideo(videoId: string, targetId: string) {
    if (videoId === targetId) return;
    const ordered = [...items];
    const from = ordered.findIndex((video) => video.id === videoId);
    const to = ordered.findIndex((video) => video.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    setItems(ordered);
    await Promise.all(ordered.map((video, position) => updateLibraryMetadata(video, { position })));
  }

  async function updateLibraryMetadata(video: Video, changes: { filename?: string; collection?: string; labels?: string[]; position?: number }) {
    const payload = {
      ...(changes.filename !== undefined ? { filename: changes.filename } : {}),
      ...(changes.collection !== undefined ? { collection: changes.collection } : {}),
      ...(changes.labels !== undefined ? { labels: changes.labels } : {}),
      ...(changes.position !== undefined ? { position: changes.position } : {}),
    };
    const response = await fetch(`/api/proxy/v1/videos/${video.id}/library`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { detail?: string };
      setActionStatus({ state: "error", message: payload.detail || "Video could not be updated." });
      return;
    }
    const updated = (await response.json()) as Video;
    setItems((current) => current.map((item) => (item.id === video.id ? { ...item, ...updated } : item)));
    setActionStatus({ state: "ok", message: "Library updated." });
  }

  async function moveSelected(folderId: string) {
    await Promise.all(selectedVideoIds.map((videoId) => {
      const video = items.find((item) => item.id === videoId);
      return video ? updateLibraryMetadata(video, { collection: folderId }) : Promise.resolve();
    }));
    setSelectedVideoIds([]);
  }

  async function deleteVideo(videoId: string) {
    const video = items.find((item) => item.id === videoId);
    if (!video || !window.confirm(`Delete “${video.filename}”? This cannot be undone.`)) return;
    setActionStatus({ state: "loading" });
    try {
      const response = await fetch(`/api/proxy/v1/videos/${videoId}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`Delete failed (${response.status})`);
      setItems((current) => current.filter((item) => item.id !== videoId));
      setSelectedVideoIds((current) => current.filter((id) => id !== videoId));
      if (selectedId === videoId) { setSelectedId(""); setViewOpen(false); }
      setActionStatus({ state: "ok", message: "Video deleted." });
    } catch (cause) {
      setActionStatus({ state: "error", message: cause instanceof Error ? cause.message : "Delete failed." });
    }
  }

  async function createFolder(event: FormEvent) {
    event.preventDefault();
    if (!folderDraft.trim()) return setActionStatus({ state: "error", message: "Enter a folder name first." });
    const response = await fetch("/api/proxy/v1/library/folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: folderDraft }) });
    const payload = await response.json().catch(() => ({})) as LibraryFolder & { detail?: string };
    if (!response.ok) return setActionStatus({ state: "error", message: payload.detail || "Folder could not be created." });
    setFolders((current) => [...current, payload]);
    setFolderDraft("");
    openLibrarySection("folder", payload);
  }

  function openFolderPicker(folderId: string) {
    setFolderPickerId(folderId);
    setPickerVideoIds([]);
  }

  async function addVideosToFolder() {
    const folderId = folderPickerId;
    if (!folderId || !pickerVideoIds.length) return;
    await Promise.all(pickerVideoIds.map((videoId) => {
      const video = items.find((item) => item.id === videoId);
      return video ? updateLibraryMetadata(video, { collection: folderId }) : Promise.resolve();
    }));
    setFolderPickerId("");
    setPickerVideoIds([]);
  }

  async function saveFolderName(folder: LibraryFolder) {
    const name = editingFolderName.trim();
    if (!name || name === folder.name) { setEditingFolderId(""); return; }
    const response = await fetch(`/api/proxy/v1/library/folders/${folder.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const payload = await response.json().catch(() => ({})) as LibraryFolder & { detail?: string };
    if (!response.ok) return setActionStatus({ state: "error", message: payload.detail || "Folder could not be renamed." });
    setFolders((current) => current.map((item) => item.id === folder.id ? payload : item));
    setEditingFolderId("");
  }

  async function deleteFolder(folder: LibraryFolder) {
    if (!window.confirm(`Delete “${folder.name}”? Its videos will move to Unorganized.`)) return;
    const response = await fetch(`/api/proxy/v1/library/folders/${folder.id}`, { method: "DELETE" });
    if (!response.ok) return setActionStatus({ state: "error", message: "Folder could not be deleted." });
    setFolders((current) => current.filter((item) => item.id !== folder.id));
    setItems((current) => current.map((video) => video.collection === folder.id ? { ...video, collection: null } : video));
    if (activeFolder === folder.id) openLibrarySection("unorganized");
  }

  async function reorderFolder(folderId: string, targetId: string) {
    if (folderId === targetId) return;
    const ordered = [...folders];
    const from = ordered.findIndex((folder) => folder.id === folderId);
    const to = ordered.findIndex((folder) => folder.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    const positioned = ordered.map((folder, position) => ({ ...folder, position }));
    setFolders(positioned);
    const response = await fetch("/api/proxy/v1/library/folder-order", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folder_ids: positioned.map((folder) => folder.id) }) });
    if (!response.ok) setActionStatus({ state: "error", message: "Folder order could not be saved." });
  }

  return (
    <section className="library-workbench library-manager">
      <article className="card dashboard-panel library-list-panel">
        <header className="library-page-head">
          <div><h1>Library</h1><p>Organize and revisit your workspace videos.</p></div>
        </header>
        <nav className="library-section-nav" aria-label="Library sections">
          <Link href="/dashboard/library" className={activeFolder === "all" ? "is-active" : ""} onClick={() => { setActiveFolder("all"); setQuery(""); setSelectedVideoIds([]); }}><span>All videos</span><small>{items.length}</small></Link>
          <Link href="/dashboard/library?view=folders" className={activeFolder === "folders" || (!(["all", "unorganized"].includes(activeFolder))) ? "is-active" : ""} onClick={() => { setActiveFolder("folders"); setQuery(""); setSelectedVideoIds([]); }}><span>Folders</span><small>{folders.length}</small></Link>
          <Link href="/dashboard/library?view=unorganized" className={activeFolder === "unorganized" ? "is-active" : ""} onClick={() => { setActiveFolder("unorganized"); setQuery(""); setSelectedVideoIds([]); }} onDragOver={(event) => event.preventDefault()} onDrop={() => { const video = items.find((item) => item.id === draggedVideoId); if (video) void updateLibraryMetadata(video, { collection: "" }); setDraggedVideoId(null); }}><span>Unorganized</span><small>{unorganizedCount}</small></Link>
          <Link href={"/dashboard/ingest" as any} className="button library-add-videos">＋ Add videos</Link>
        </nav>

        {activeFolder === "folders" ? <section className="library-folders-section" aria-labelledby="library-folders-title">
          <header><div><h2 id="library-folders-title">Folders</h2><p>Create folders, change their order, or open one to arrange its videos.</p></div>{permissions.canEdit ? <form className="library-folder-create" onSubmit={(event) => void createFolder(event)}><input value={folderDraft} onChange={(event) => { setFolderDraft(event.target.value); if (actionStatus.state === "error") setActionStatus({ state: "idle" }); }} placeholder="Folder name" aria-label="New folder name" /><button type="submit">Create folder</button></form> : null}</header>
          <StatusLine status={actionStatus} />
          <div className="library-folder-board">
            {folders.length ? folders.map((folder) => <article key={folder.id} className="library-folder-row" draggable={permissions.canEdit && editingFolderId !== folder.id} onDragStart={() => { setDraggedFolderId(folder.id); setDraggedVideoId(null); }} onDragEnd={() => setDraggedFolderId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => { const video = items.find((item) => item.id === draggedVideoId); if (video) void updateLibraryMetadata(video, { collection: folder.id }); else if (draggedFolderId) void reorderFolder(draggedFolderId, folder.id); setDraggedVideoId(null); setDraggedFolderId(null); }}>
              {editingFolderId === folder.id ? <input value={editingFolderName} autoFocus aria-label={`Rename ${folder.name}`} onChange={(event) => setEditingFolderName(event.target.value)} onBlur={() => void saveFolderName(folder)} onKeyDown={(event) => { if (event.key === "Enter") void saveFolderName(folder); if (event.key === "Escape") setEditingFolderId(""); }} /> : <Link href={`/dashboard/library?view=folder&folder=${encodeURIComponent(folder.id)}&folder_name=${encodeURIComponent(folder.name)}`} onClick={() => { setActiveFolder(folder.id); setQuery(""); setSelectedVideoIds([]); }}><span>{folder.name}</span><small>{items.filter((video) => video.collection === folder.id).length} videos</small></Link>}
              {permissions.canEdit && editingFolderId !== folder.id ? <details><summary aria-label={`Folder actions for ${folder.name}`}>•••</summary><div><button type="button" onClick={() => openFolderPicker(folder.id)}>Add existing videos</button><button type="button" onClick={() => { setEditingFolderId(folder.id); setEditingFolderName(folder.name); }}>Rename</button><button type="button" onClick={() => void deleteFolder(folder)}>Delete</button></div></details> : null}
            </article>) : <div className="library-empty-state"><MascotScout size="medium" motion="look" /><h3>No folders yet</h3><p>Create a folder when you are ready to organize related videos.</p></div>}
          </div>
        </section> : <div className="library-content-panel">
            <div className="library-content-toolbar">
              <div><h2>{activeFolder === "all" ? "All videos" : activeFolder === "unorganized" ? "Unorganized" : folderName(activeFolder)}</h2><span>{filteredVideos.length} {filteredVideos.length === 1 ? "video" : "videos"}</span></div>
              <div className="library-content-tools">{!(["all", "unorganized"].includes(activeFolder)) && permissions.canEdit ? <button type="button" className="button-secondary" onClick={() => openFolderPicker(activeFolder)}>Add existing videos</button> : null}<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search videos…" aria-label="Search library" /></div>
            </div>
            {selectedVideoIds.length ? <div className="library-selection-bar"><span>{selectedVideoIds.length} selected</span>{folders.length ? <LibraryFolderMenu folders={folders} label="Move selected videos" onChange={(folderId) => void moveSelected(folderId)} disabled={!permissions.canEdit} /> : null}<Link className="button-secondary" href={`/search?video_ids=${encodeURIComponent(selectedVideoIds.join(","))}`}>Search</Link><button type="button" onClick={() => setSelectedVideoIds([])}>Clear</button></div> : null}
            <StatusLine status={actionStatus} />
            {filteredVideos.length === 0 ? <div className="library-empty-state"><MascotScout size="medium" motion="look" /><h3>{items.length ? "No videos here" : "Your library is empty"}</h3><p>{items.length ? "Choose existing videos to add to this folder." : "Add a video to begin building your workspace library."}</p>{!items.length ? <Link href={"/dashboard/ingest" as any} className="button">Add videos</Link> : !(["all", "unorganized"].includes(activeFolder)) && permissions.canEdit ? <button type="button" className="button" onClick={() => openFolderPicker(activeFolder)}>Add existing videos</button> : null}</div> : <div className="library-card-grid">
            {filteredVideos.map((video) => {
              const thumbnailUrl = video.thumbnail_object_key ? `/api/proxy/v1/media/${video.thumbnail_object_key.split("/").map(encodeURIComponent).join("/")}` : null;
              return <article key={video.id} className="library-media-card" draggable={permissions.canEdit} onDragStart={() => { setDraggedVideoId(video.id); setDraggedFolderId(null); }} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedVideoId) void reorderVideo(draggedVideoId, video.id); setDraggedVideoId(null); }} onDragEnd={() => setDraggedVideoId(null)}>
                <button type="button" className="library-media-preview" onClick={() => { setSelectedId(video.id); setViewOpen(true); }} aria-label={`View ${video.filename}`}>{thumbnailUrl ? <img src={thumbnailUrl} alt="" loading="lazy" decoding="async" /> : <span>Preview unavailable</span>}<span className="library-play-mark" aria-hidden="true">▶</span></button>
                <label className="library-card-select"><input type="checkbox" aria-label={`Select ${video.filename}`} checked={selectedVideoIds.includes(video.id)} onChange={(event) => setSelectedVideoIds((current) => event.target.checked ? [...new Set([...current, video.id])] : current.filter((id) => id !== video.id))} /></label>
                <div className="library-media-card-body"><div><input className="library-media-title" value={video.filename} aria-label={`Rename ${video.filename}`} disabled={!permissions.canEdit} onChange={(event) => setItems((current) => current.map((item) => item.id === video.id ? { ...item, filename: event.target.value } : item))} onBlur={(event) => { const filename = event.target.value.trim(); if (filename) void updateLibraryMetadata(video, { filename }); else setItems((current) => current.map((item) => item.id === video.id ? { ...item, filename: video.filename } : item)); }} /><p>{fmt(video.duration)} · {folderName(video.collection)}</p></div>{video.status !== "ready" ? <span className={`job-status job-status-${statusTone(video.status)}`}>{video.status}</span> : null}</div>
                <div className="library-card-actions"><button type="button" className="library-delete-action library-trash-action" aria-label={`Delete ${video.filename}`} title="Delete video" onClick={() => void deleteVideo(video.id)} disabled={!permissions.canEdit}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" /></svg></button></div>
              </article>;
            })}
            </div>}
          </div>}
      </article>

      {viewOpen && selectedVideo ? <div className="library-view-overlay" onPointerDown={(event) => { if (event.target === event.currentTarget) setViewOpen(false); }}><section className="library-view-dialog" role="dialog" aria-modal="true" aria-labelledby="library-view-title"><header><div><h2 id="library-view-title">{selectedVideo.filename}</h2><p>{fmt(selectedVideo.duration)} · {folderName(selectedVideo.collection)}</p></div><button type="button" autoFocus onClick={() => setViewOpen(false)} aria-label="Close video viewer">×</button></header>{selectedMediaUrl ? <video src={selectedMediaUrl} controls autoPlay preload="metadata" /> : <div className="library-view-unavailable">Preview unavailable</div>}<footer><Link className="button" href={`/search?video_ids=${encodeURIComponent(selectedVideo.id)}`}>Search this video</Link>{folders.length ? <LibraryFolderMenu folders={folders} value={selectedVideo.collection || ""} label="Move video to folder" onChange={(folderId) => void updateLibraryMetadata(selectedVideo, { collection: folderId })} disabled={!permissions.canEdit} /> : null}<button type="button" className="button-secondary library-delete-action" onClick={() => void deleteVideo(selectedVideo.id)} disabled={!permissions.canEdit}>Delete</button></footer></section></div> : null}
      {folderPickerId ? <div className="library-folder-picker-overlay" onPointerDown={(event) => { if (event.target === event.currentTarget) setFolderPickerId(""); }}><section className="library-folder-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="folder-picker-title"><header><div><h2 id="folder-picker-title">Add existing videos</h2><p>Choose videos for {folderName(folderPickerId)}.</p></div><button type="button" onClick={() => setFolderPickerId("")} aria-label="Close video picker">×</button></header><div className="library-folder-picker-list">{items.filter((video) => video.collection !== folderPickerId).map((video) => <label key={video.id}><input type="checkbox" checked={pickerVideoIds.includes(video.id)} onChange={(event) => setPickerVideoIds((current) => event.target.checked ? [...current, video.id] : current.filter((id) => id !== video.id))} />{video.thumbnail_object_key ? <img src={`/api/proxy/v1/media/${video.thumbnail_object_key.split("/").map(encodeURIComponent).join("/")}`} alt="" /> : <span aria-hidden="true">▶</span>}<strong>{video.filename}</strong><small>{folderName(video.collection)}</small></label>)}</div><footer><button type="button" className="button-secondary" onClick={() => setFolderPickerId("")}>Cancel</button><button type="button" className="button" disabled={!pickerVideoIds.length} onClick={() => void addVideosToFolder()}>Add {pickerVideoIds.length || ""} {pickerVideoIds.length === 1 ? "video" : "videos"}</button></footer></section></div> : null}
    </section>
  );
}

export function WorkspacePanel({
  activeWorkspace,
  stats,
}: {
  activeWorkspace: string;
  stats: { total_videos: number; total_chunks: number; total_storage_bytes: number };
}) {
  const permissions = useWorkspacePermissions(activeWorkspace);
  const [members, setMembers] = useState<Array<{ id: string; userId: string; role: string; user?: { name?: string | null; email?: string | null } }>>([]);
  const [invites, setInvites] = useState<Array<{ id: string; email: string; role: string; status: string; expiresAt: string }>>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [status, setStatus] = useState<FetchStatus>({ state: "idle" });
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [roleOverrides, setRoleOverrides] = useState<{ workspace_roles?: Record<string, string>; invite_roles?: Record<string, string> }>({});

  async function loadWorkspaceData() {
    try {
      const [membersResponse, invitesResponse, settingsResponse] = await Promise.all([
        fetch(`/api/auth/organization/list-members?organizationId=${encodeURIComponent(activeWorkspace)}`),
        fetch(`/api/auth/organization/list-invitations?organizationId=${encodeURIComponent(activeWorkspace)}`),
        fetch("/api/proxy/v1/settings"),
      ]);
      if (membersResponse.ok) {
        const payload = (await membersResponse.json()) as { members: Array<{ id: string; userId: string; role: string; user?: { name?: string | null; email?: string | null } }>; total: number };
        setMembers(payload.members);
      }
      if (invitesResponse.ok) {
        const payload = (await invitesResponse.json()) as Array<{ id: string; email: string; role: string; status: string; expiresAt: string }>;
        setInvites(payload);
      }
      if (settingsResponse.ok) {
        const payload = (await settingsResponse.json()) as { settings?: { workspace_roles?: Record<string, string>; invite_roles?: Record<string, string> } };
        setRoleOverrides(payload.settings || {});
      }
    } catch {
      return;
    }
    setActivity(readActivityLog().filter((entry) => entry.workspace === activeWorkspace));
  }

  useEffect(() => {
    void loadWorkspaceData();
  }, [activeWorkspace]);

  async function inviteMember(e: FormEvent) {
    e.preventDefault();
    setStatus({ state: "loading" });
    try {
      const response = await fetch("/api/workspace/invite-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, organizationId: activeWorkspace }),
      });
      if (!response.ok) throw new Error(`Invite failed (${response.status})`);
      setEmail("");
      appendActivity(activeWorkspace, "workspace.invite_sent", `${email} as ${role}`);
      setStatus({ state: "ok", message: "Invite sent." });
      await loadWorkspaceData();
    } catch (cause) {
      setStatus({ state: "error", message: cause instanceof Error ? cause.message : "Invite failed" });
    }
  }

  async function updateRole(memberId: string, nextRole: string) {
    setStatus({ state: "loading" });
    try {
      const response = await fetch("/api/workspace/update-member-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role: nextRole, organizationId: activeWorkspace, email: members.find((member) => member.id === memberId)?.user?.email }),
      });
      if (!response.ok) throw new Error(`Role update failed (${response.status})`);
      appendActivity(activeWorkspace, "workspace.role_updated", `${memberId} -> ${nextRole}`);
      setStatus({ state: "ok", message: "Member role updated." });
      await loadWorkspaceData();
    } catch (cause) {
      setStatus({ state: "error", message: cause instanceof Error ? cause.message : "Role update failed" });
    }
  }

  async function cancelInvite(invitationId: string) {
    setStatus({ state: "loading" });
    try {
      const response = await fetch("/api/workspace/cancel-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, organizationId: activeWorkspace, email: invites.find((invite) => invite.id === invitationId)?.email }),
      });
      if (!response.ok) throw new Error(`Cancel failed (${response.status})`);
      appendActivity(activeWorkspace, "workspace.invite_canceled", invitationId);
      setStatus({ state: "ok", message: "Invite canceled." });
      await loadWorkspaceData();
    } catch (cause) {
      setStatus({ state: "error", message: cause instanceof Error ? cause.message : "Cancel failed" });
    }
  }

  return (
    <section className="card dashboard-panel workspace-management-panel">
      <form className="form workspace-switch-card" action="/api/workspace/select" method="post">
        <div className="field">
          <label htmlFor="workspace">Workspace ID</label>
          <select id="workspace" name="workspace" defaultValue={activeWorkspace}>
            <option value="default-workspace">Default workspace</option>
            <option value="northwind">Northwind</option>
            <option value="contoso">Contoso</option>
            <option value="acme">Acme</option>
          </select>
        </div>
        <button className="button-secondary" type="submit">Switch workspace</button>
      </form>
      <div className="detail-grid workspace-stat-grid">
        <article className="detail-card">
          <span>Workspace videos</span>
          <strong>{stats.total_videos}</strong>
        </article>
        <article className="detail-card">
          <span>Searchable chunks</span>
          <strong>{stats.total_chunks}</strong>
        </article>
        <article className="detail-card">
          <span>Storage used</span>
          <strong>{fmtBytes(stats.total_storage_bytes)}</strong>
        </article>
      </div>
      {!permissions.canManageWorkspace ? <p className="muted">Current role: {permissions.role}. Only owners and admins can manage invites and workspace roles.</p> : null}
      <form className="form workspace-invite-card" onSubmit={inviteMember}>
        <div className="field">
          <label htmlFor="invite_email">Invite by email</label>
          <input id="invite_email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teammate@example.com" />
        </div>
        <div className="field">
          <label htmlFor="invite_role">Role</label>
          <select id="invite_role" value={role} onChange={(event) => setRole(event.target.value)} disabled={!permissions.canManageWorkspace}>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </select>
        </div>
        <button className="button" type="submit" disabled={!permissions.canManageWorkspace}>Send invite</button>
        <StatusLine status={status} />
      </form>
      <div className="dashboard-stack workspace-members-card">
        <div className="dashboard-panel-head">
          <h3>Members</h3>
        </div>
        {members.length === 0 ? <p className="muted">No member data loaded.</p> : (
          <div className="job-history-list">
            {members.map((member) => (
              <article key={member.id} className="detail-card">
                <span>{member.user?.email || member.userId}</span>
                <strong>{member.user?.name || "Workspace member"}</strong>
                <div className="dashboard-panel-links">
                  <select value={roleOverrides.workspace_roles?.[member.user?.email || ""] || (member.role === "member" ? "editor" : member.role)} onChange={(event) => updateRole(member.id, event.target.value)} disabled={!permissions.canManageWorkspace}>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <div className="dashboard-stack workspace-invites-card">
        <div className="dashboard-panel-head">
          <h3>Pending invites</h3>
        </div>
        {invites.length === 0 ? <p className="muted">No pending invites.</p> : (
          <div className="job-history-list">
            {invites.map((invite) => (
              <article key={invite.id} className="detail-card">
                <span>{invite.email}</span>
                <strong>{roleOverrides.invite_roles?.[invite.email] || invite.role}</strong>
                <p className="muted">Status {invite.status} • Expires {fmtDate(invite.expiresAt)}</p>
                <div className="dashboard-panel-links">
                  <button type="button" className="button-secondary" onClick={() => cancelInvite(invite.id)} disabled={!permissions.canManageWorkspace}>Cancel invite</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <div className="dashboard-stack workspace-activity-card">
        <div className="dashboard-panel-head">
          <h3>Workspace activity</h3>
        </div>
        {activity.length === 0 ? <p className="muted">No activity logged yet.</p> : (
          <div className="job-history-list">
            {activity.map((entry) => (
              <article key={entry.id} className="detail-card">
                <span>{entry.action}</span>
                <strong>{entry.detail}</strong>
                <p className="muted">{fmtDate(entry.created_at)}</p>
              </article>
            ))}
          </div>
        )}
      </div>
      <div className="dashboard-panel-links workspace-actions">
        <Link href={"/dashboard/library" as any} className="button-secondary">Open library</Link>
        <Link href="/settings" className="button-secondary">Open settings</Link>
      </div>
    </section>
  );
}
