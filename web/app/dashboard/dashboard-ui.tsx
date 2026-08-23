"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { appendActivity, readActivityLog, type ActivityEntry } from "@/lib/activity-log";
import { readSavedClips, writeSavedClips, type SavedClip } from "@/lib/clip-registry";
import { readVideoLabels, writeVideoLabels } from "@/lib/video-labels";
import { useWorkspacePermissions } from "@/lib/workspace-permissions";
import type { Job, Video, VideoChunk } from "./dashboard-data";

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

export function fmt(seconds: number | null): string {
  if (seconds == null) return "-";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function fmtDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
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

export function IngestPanel({ workspace = "default-workspace" }: { workspace?: string }) {
  const router = useRouter();
  const permissions = useWorkspacePermissions(workspace);
  const fileRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const [fileStatus, setFileStatus] = useState<FetchStatus>({ state: "idle" });
  const [urlStatus, setUrlStatus] = useState<FetchStatus>({ state: "idle" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [ingestMode, setIngestMode] = useState<"file" | "youtube">("file");
  const [transcribe, setTranscribe] = useState(true);
  const [isDragActive, setIsDragActive] = useState(false);
  const [interruptedJobs, setInterruptedJobs] = useState<Job[]>([]);
  const [recoveryStatus, setRecoveryStatus] = useState<FetchStatus>({ state: "idle" });

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/proxy/v1/jobs");
        if (!response.ok) return;
        const payload = (await response.json()) as Job[];
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
    })();
  }, []);

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
      fd.append("transcribe", String(transcribe));
      const job = await proxyPost<Job>("/v1/videos/upload", fd, false);
      appendActivity(workspace, "ingest.queued", file!.name);
      router.push(`/jobs?job=${encodeURIComponent(job.id)}`);
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
      const job = await proxyPost<Job>("/v1/videos/url", JSON.stringify({ url, transcribe }));
      appendActivity(workspace, "ingest.queued", url);
      router.push(`/jobs?job=${encodeURIComponent(job.id)}`);
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
      router.push(`/jobs?job=${encodeURIComponent(job.id)}`);
    } catch (cause) {
      setRecoveryStatus({
        state: "error",
        message: cause instanceof Error ? cause.message : "Retry failed",
      });
    }
  }

  return (
    <section className="dashboard-module-grid dashboard-module-grid-ingest">
      <article className="card dash-stack ingest-source-panel">
        <div className="ingest-source-head">
          <div className="ingest-mode-switch" role="tablist" aria-label="Ingest source">
            <button type="button" className={ingestMode === "file" ? "is-active" : ""} onClick={() => setIngestMode("file")} role="tab" aria-selected={ingestMode === "file"}>Upload file</button>
            <button type="button" className={ingestMode === "youtube" ? "is-active" : ""} onClick={() => setIngestMode("youtube")} role="tab" aria-selected={ingestMode === "youtube"}>YouTube link</button>
          </div>
        </div>
        <label className="ingest-transcription-toggle"><input type="checkbox" checked={transcribe} onChange={(event) => setTranscribe(event.target.checked)} /> Transcribe audio for text search</label>
        {ingestMode === "file" ? (
          <div className="form">
            <div className="field">
              <label htmlFor="file">Video file</label>
              {selectedFile && filePreviewUrl ? (
                <div className="ingest-file-card">
                  <video className="ingest-file-preview" src={filePreviewUrl} controls preload="metadata" />
                  <div className="ingest-file-metadata">
                    <strong>{selectedFile.name}</strong>
                    <span>{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                    <span>{selectedFile.type || "Video file"}</span>
                  </div>
                  <button type="button" className="button-secondary" onClick={() => fileRef.current?.click()}>Choose another file</button>
                </div>
              ) : (
                <button
                  type="button"
                  className={`ingest-dropzone${isDragActive ? " is-active" : ""}`}
                  onClick={() => fileRef.current?.click()}
                  onDragEnter={(event) => { event.preventDefault(); setIsDragActive(true); }}
                  onDragOver={(event) => { event.preventDefault(); setIsDragActive(true); }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    const nextTarget = event.relatedTarget;
                    if (!nextTarget || !(event.currentTarget as HTMLElement).contains(nextTarget as Node)) setIsDragActive(false);
                  }}
                  onDrop={(event) => { event.preventDefault(); setIsDragActive(false); bindDroppedFile(event.dataTransfer.files?.[0]); }}
                >
                  <strong>{isDragActive ? "Drop video to upload" : "Drop video here"}</strong>
                  <span>Or click to choose a local source file.</span>
                </button>
              )}
              <input ref={fileRef} id="file" name="file" type="file" accept="video/*" onChange={(event) => syncSelectedFile(event.target.files?.[0])} />
            </div>
            {!permissions.isLoading && !permissions.canEdit ? <p className="muted">Viewer role cannot upload or queue ingest jobs.</p> : null}
            <button className="button" onClick={handleUpload} disabled={fileStatus.state === "loading" || !permissions.canEdit}>Upload video</button>
            <StatusLine status={fileStatus} />
          </div>
        ) : (
          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="url">YouTube URL</label>
              <input ref={urlRef} id="url" name="url" placeholder="https://youtu.be/..." />
            </div>
            <p className="muted">Confirm you have permission to use the source.</p>
            <button className="button" type="submit" disabled={urlStatus.state === "loading" || !permissions.canEdit}>Queue video</button>
            <StatusLine status={urlStatus} />
          </form>
        )}
      </article>
      {interruptedJobs.length > 0 ? <details className="card dash-stack dash-expandable ingest-history-panel">
        <summary className="ingest-history-summary">
        <div>
          <h3>Interrupted ingests</h3>
          <p className="muted">Retry failed or canceled ingests.</p>
        </div>
        <div className="ingest-history-meta">
          <span className="pill">{interruptedJobs.length} queued for recovery</span>
          <span className="pill">{recoveryStatus.state === "loading" ? "Working" : "Tap to expand"}</span>
        </div>
        </summary>
        <StatusLine status={recoveryStatus} />
        {interruptedJobs.length === 0 ? (
          <p className="muted">No interrupted ingests found.</p>
        ) : (
          <div className="job-history-list ingest-history-list">
            {interruptedJobs.map((job) => (
              <article key={job.id} className="detail-card">
                <span>{job.kind.replace(/_/g, " ")}</span>
                <strong>{job.message || job.status}</strong>
                <p className="muted">{job.status} • {job.video_id || "No video id"}</p>
                <div className="dashboard-panel-links">
                  <button type="button" className="button-secondary" onClick={() => void retryInterruptedJob(job.id)} disabled={!permissions.canEdit}>Retry ingest</button>
                  <Link href={`/jobs?job=${encodeURIComponent(job.id)}`} className="button-secondary">Open job</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </details> : null}
    </section>
  );
}

export function JobsPanel({ jobs }: { jobs: Job[]; }) {
  const permissions = useWorkspacePermissions();
  const [items, setItems] = useState(jobs);
  const [selectedId, setSelectedId] = useState(jobs[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [retryNote, setRetryNote] = useState<string | null>(null);
  const [cancelNote, setCancelNote] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<Array<{ at: string; message: string }>>([]);
  const [deadLetterEntries, setDeadLetterEntries] = useState<
    Array<{ id: string; chunk_id: string; source_uri: string; start_time: number; end_time: number; error: string; attempts: number }>
  >([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(jobs);
    setSelectedId((current) => (current && jobs.some((job) => job.id === current) ? current : jobs[0]?.id ?? ""));
  }, [jobs]);

  useEffect(() => {
    if (!selectedId) return;
    setTimeline([]);
    const stream = new EventSource(`/api/job-events/${selectedId}`);
    stream.addEventListener("job", (event) => {
      const nextJob = JSON.parse((event as MessageEvent<string>).data) as Job;
      setItems((current) => current.map((job) => (job.id === nextJob.id ? { ...job, ...nextJob } : job)));
      setTimeline((current) => {
        const nextMessage = nextJob.message || nextJob.status;
        if (current[0]?.message === nextMessage) return current;
        return [{ at: new Date().toISOString(), message: nextMessage }, ...current].slice(0, 12);
      });
      if (nextJob.status === "succeeded" || nextJob.status === "failed" || nextJob.status === "canceled") {
        stream.close();
      }
    });
    stream.addEventListener("error", () => {
      stream.close();
    });
    return () => {
      stream.close();
    };
  }, [selectedId]);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/proxy/v1/jobs/dead-letter");
        if (!response.ok) return;
        const payload = (await response.json()) as Array<{ id: string; chunk_id: string; source_uri: string; start_time: number; end_time: number; error: string; attempts: number }>;
        setDeadLetterEntries(payload);
      } catch {
        return;
      }
    })();
  }, []);

  const [historyQuery, setHistoryQuery] = useState("");
  const [historySort, setHistorySort] = useState<"newest" | "oldest" | "status">("newest");
  const visibleItems = [...items]
    .filter((job) => `${job.kind} ${job.status} ${job.message || ""}`.toLowerCase().includes(historyQuery.toLowerCase()))
    .sort((a, b) => {
      if (historySort === "status") return a.status.localeCompare(b.status);
      const direction = historySort === "newest" ? -1 : 1;
      return direction * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });
  const selectedJob = items.find((job) => job.id === selectedId) ?? items[0] ?? null;

  async function retryJob(jobId: string) {
    setRetryNote(null);
    setCancelNote(null);
    setError(null);
    try {
      const nextJob = await proxyPost<Job>(`/v1/jobs/${jobId}/retry`, "");
      setItems((current) => current.map((job) => (job.id === jobId ? { ...job, ...nextJob } : job)));
      setRetryNote("Retry queued.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unknown error");
    }
  }

  async function cancelJob(jobId: string) {
    setRetryNote(null);
    setCancelNote(null);
    setError(null);
    try {
      const nextJob = await proxyPost<Job>(`/v1/jobs/${jobId}/cancel`, "");
      setItems((current) => current.map((job) => (job.id === jobId ? { ...job, ...nextJob } : job)));
      setCancelNote("Job canceled.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unknown error");
    }
  }

  return (
    <section className="dashboard-split-panel job-history-only">
      <article className="card dashboard-panel">
        <div className="dashboard-panel-head">
          <h2>Job history</h2>
        </div>
        <div className="history-toolbar">
          <label className="sr-only" htmlFor="job-history-search">Search jobs</label>
          <input id="job-history-search" type="search" placeholder="Search" value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} />
          <label className="sr-only" htmlFor="job-history-sort">Sort jobs</label>
          <select id="job-history-sort" value={historySort} onChange={(event) => setHistorySort(event.target.value as typeof historySort)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="status">Status</option>
          </select>
        </div>
        {items.length === 0 ? <p className="muted">No jobs yet.</p> : visibleItems.length === 0 ? <p className="muted">No matching jobs.</p> : (
          <div className="job-history-list">
            {visibleItems.map((job) => (
              <button
                key={job.id}
                type="button"
                className="job-history-item"
              >
                <div>
                  <strong>{job.kind.replace(/_/g, " ")}</strong>
                  <p>{job.message || "No worker message yet."}</p>
                </div>
                <div className="job-history-meta">
                  <span className={`job-status job-status-${statusTone(job.status)}`}>{job.status}</span>
                  <span>{Math.round((job.progress ?? 0) * 100)}%</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </article>

      <article className="card dashboard-panel">
        <div className="dashboard-panel-head">
          <h2>Job detail</h2>
        </div>
        {error ? <p className="notice notice-bad">{error}</p> : null}
        {!selectedJob ? <p className="muted">Select job to inspect details.</p> : (
          <div className="job-card">
            <div className="job-card-head">
              <div>
                <p className="eyebrow">Job {selectedJob.id.slice(0, 8)}</p>
                <h3>{selectedJob.kind.replace(/_/g, " ")}</h3>
              </div>
              <span className={`job-status job-status-${statusTone(selectedJob.status)}`}>{selectedJob.status}</span>
            </div>

            <div className="job-progress" aria-label="Job progress">
              <div className="job-progress-track">
                <div className="job-progress-fill" style={{ width: `${Math.max(0, Math.min(1, selectedJob.progress ?? 0)) * 100}%` }} />
              </div>
              <div className="job-progress-meta">
                <span>{Math.round((selectedJob.progress ?? 0) * 100)}%</span>
                <span>{selectedJob.message || "Waiting for worker"}</span>
              </div>
            </div>

            <JobStages job={selectedJob} />

            <div className="detail-grid">
              <article className="detail-card">
                <span>Video ID</span>
                <strong>{selectedJob.video_id || "-"}</strong>
              </article>
              <article className="detail-card">
                <span>Clip ID</span>
                <strong>{selectedJob.clip_id || "-"}</strong>
              </article>
              <article className="detail-card">
                <span>Queued</span>
                <strong>{fmtDate(selectedJob.created_at)}</strong>
              </article>
              <article className="detail-card">
                <span>Updated</span>
                <strong>{fmtDate(selectedJob.updated_at)}</strong>
              </article>
            </div>

            {timeline.length > 0 ? (
              <div className="dashboard-stack">
                <h3>Worker timeline</h3>
                <div className="job-history-list">
                  {timeline.map((entry) => (
                    <article key={`${entry.at}-${entry.message}`} className="detail-card">
                      <span>{entry.message}</span>
                      <strong>{new Date(entry.at).toLocaleTimeString()}</strong>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
            {selectedJob.error ? <p className="notice notice-bad">Failure reason: {selectedJob.error}</p> : null}
            {selectedJob.status === "queued" || selectedJob.status === "running" ? (
              <button
                className="button-secondary"
                type="button"
                onClick={() => startTransition(() => cancelJob(selectedJob.id))}
                disabled={isPending || !permissions.canEdit}
              >
                Cancel job
              </button>
            ) : null}
            {selectedJob.status === "failed" ? (
              <button
                className="button"
                type="button"
                onClick={() => startTransition(() => retryJob(selectedJob.id))}
                disabled={isPending || !permissions.canEdit}
              >
                Retry failed job
              </button>
            ) : null}
            {cancelNote ? <p className="notice notice-good">{cancelNote}</p> : null}
            {retryNote ? <p className="notice notice-good">{retryNote}</p> : null}
            {deadLetterEntries.length > 0 ? (
              <div className="dashboard-stack">
                <h3>Dead-letter queue</h3>
                <div className="job-history-list">
                  {deadLetterEntries.map((entry) => (
                    <article key={entry.id} className="detail-card">
                      <span>{entry.chunk_id}</span>
                      <strong>{fmt(entry.start_time)} - {fmt(entry.end_time)}</strong>
                      <p className="muted">{entry.source_uri}</p>
                      <p className="muted">{entry.error}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </article>
    </section>
  );
}

export function LibraryPanel({ videos, jobs, initialVideoId = "", initialStartTime }: { videos: Video[]; jobs: Job[]; initialVideoId?: string; initialStartTime?: number }) {
  const permissions = useWorkspacePermissions();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState(videos);
  const [selectedId, setSelectedId] = useState(initialVideoId || videos[0]?.id || "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [savedClips, setSavedClips] = useState<SavedClip[]>([]);
  const [editingClipId, setEditingClipId] = useState("");
  const [videoLabels, setVideoLabels] = useState<Record<string, string[]>>({});
  const [labelDraft, setLabelDraft] = useState("");
  const [chunks, setChunks] = useState<VideoChunk[]>([]);
  const [chunksStatus, setChunksStatus] = useState<FetchStatus>({ state: "idle" });
  const [actionStatus, setActionStatus] = useState<FetchStatus>({ state: "idle" });
  const [draggedVideoId, setDraggedVideoId] = useState<string | null>(null);
  const detailPlayerRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setSavedClips(readSavedClips());
    setVideoLabels(readVideoLabels());
  }, []);

  useEffect(() => {
    setItems(videos);
  }, [videos]);

  const filteredVideos = useMemo(() => {
    return items.filter((video) => {
      if (statusFilter !== "all" && video.status !== statusFilter) return false;
      if (collectionFilter !== "all" && (video.collection || "Unsorted") !== collectionFilter) return false;
      if (!query.trim()) return true;
      const haystack = `${video.filename} ${video.source_uri} ${video.id}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });
  }, [items, query, statusFilter, collectionFilter]);

  const collections = useMemo(
    () => ["all", ...new Set(items.map((video) => video.collection || "Unsorted"))],
    [items],
  );

  useEffect(() => {
    setSelectedId((current) => (current && filteredVideos.some((video) => video.id === current) ? current : filteredVideos[0]?.id ?? ""));
  }, [filteredVideos]);

  const selectedVideo = filteredVideos.find((video) => video.id === selectedId) ?? filteredVideos[0] ?? null;

  const latestJobByVideo = useMemo(() => {
    return new Map(jobs.map((job) => [job.video_id, job] as const));
  }, [jobs]);

  const clipsForSelectedVideo = savedClips.filter((clip) => clip.video_id === selectedVideo?.id);
  const labelsForSelectedVideo = selectedVideo ? (videoLabels[selectedVideo.id] || []) : [];
  const selectedMediaUrl = selectedVideo?.object_key
    ? `/api/proxy/v1/media/${selectedVideo.object_key.split("/").map(encodeURIComponent).join("/")}`
    : null;

  useEffect(() => {
    const player = detailPlayerRef.current;
    if (!player || initialStartTime === undefined || !selectedVideo) return;
    const seek = () => { player.currentTime = Math.min(initialStartTime, player.duration || initialStartTime); };
    if (player.readyState >= 1) seek();
    else player.addEventListener("loadedmetadata", seek, { once: true });
    return () => player.removeEventListener("loadedmetadata", seek);
  }, [initialStartTime, selectedVideo?.id]);

  useEffect(() => {
    if (!selectedVideo) {
      setChunks([]);
      setChunksStatus({ state: "idle" });
      return;
    }
    let mounted = true;
    setChunksStatus({ state: "loading" });
    void (async () => {
      try {
        const response = await fetch(`/api/proxy/v1/videos/${selectedVideo.id}/chunks`);
        if (!response.ok) throw new Error(`Chunk lookup failed (${response.status})`);
        const payload = (await response.json()) as VideoChunk[];
        if (!mounted) return;
        setChunks(payload);
        setChunksStatus({ state: "ok", message: payload.length ? `Loaded ${payload.length} chunks.` : "No chunks yet." });
      } catch (cause) {
        if (!mounted) return;
        setChunks([]);
        setChunksStatus({
          state: "error",
          message: cause instanceof Error ? cause.message : "Chunk lookup failed.",
        });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedVideo]);

  function updateSavedClip(clipId: string, field: "name" | "notes" | "collection", value: string) {
    setSavedClips((current) => {
      const next = current.map((clip) => (clip.id === clipId ? { ...clip, [field]: value } : clip));
      writeSavedClips(next);
      return next;
    });
  }

  function addLabel() {
    if (!selectedVideo || !labelDraft.trim()) return;
    const next = {
      ...videoLabels,
      [selectedVideo.id]: [...new Set([...(videoLabels[selectedVideo.id] || []), labelDraft.trim()])],
    };
    setVideoLabels(next);
    writeVideoLabels(next);
    setLabelDraft("");
  }

  function removeLabel(label: string) {
    if (!selectedVideo) return;
    const next = {
      ...videoLabels,
      [selectedVideo.id]: (videoLabels[selectedVideo.id] || []).filter((item) => item !== label),
    };
    setVideoLabels(next);
    writeVideoLabels(next);
  }

  async function reorderVideo(videoId: string, targetId: string) {
    if (videoId === targetId) return;
    const ordered = [...items];
    const from = ordered.findIndex((video) => video.id === videoId);
    const to = ordered.findIndex((video) => video.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    setItems(ordered);
    for (const [position, video] of ordered.entries()) {
      await updateLibraryMetadata(video, { position });
    }
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
    if (!response.ok) return;
    const updated = (await response.json()) as Video;
    setItems((current) => current.map((item) => (item.id === video.id ? { ...item, ...updated } : item)));
  }

  async function runBulkAction(action: "archive" | "reindex" | "delete") {
    for (const videoId of selectedVideoIds) await runVideoAction(videoId, action);
    setSelectedVideoIds([]);
  }

  async function runVideoAction(videoId: string, action: "archive" | "reindex" | "delete") {
    setActionStatus({ state: "loading" });
    try {
      const response = await fetch(`/api/proxy/v1/videos/${videoId}${action === "delete" ? "" : `/${action}`}`, {
        method: action === "delete" ? "DELETE" : "POST",
      });
      if (!response.ok) throw new Error(`${action} failed (${response.status})`);

      if (action === "archive") {
        const nextVideo = (await response.json()) as Video;
        setItems((current) => current.map((video) => (video.id === videoId ? nextVideo : video)));
        setActionStatus({ state: "ok", message: "Video archived." });
      }
      if (action === "reindex") {
        setItems((current) => current.map((video) => (video.id === videoId ? { ...video, status: "queued", error: null } : video)));
        setActionStatus({ state: "ok", message: "Reindex queued." });
      }
      if (action === "delete") {
        setItems((current) => current.filter((video) => video.id !== videoId));
        setSavedClips((current) => {
          const next = current.filter((clip) => clip.video_id !== videoId);
          writeSavedClips(next);
          return next;
        });
        setActionStatus({ state: "ok", message: "Video deleted." });
      }
    } catch (cause) {
      setActionStatus({ state: "error", message: cause instanceof Error ? cause.message : `${action} failed` });
    }
  }

  return (
    <section className="dashboard-split-panel library-workbench">
      <article className="card dashboard-panel library-list-panel">
        <div className="dashboard-panel-head library-panel-head">
          <span className="pill">{filteredVideos.length} videos</span>
        </div>
        <div className="library-toolbar">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search library"
            aria-label="Search library"
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter library by status">
            <option value="all">All statuses</option>
            <option value="ready">Ready</option>
            <option value="queued">Queued</option>
            <option value="failed">Failed</option>
          </select>
          <select value={collectionFilter} onChange={(event) => setCollectionFilter(event.target.value)} aria-label="Filter library by collection">
            {collections.map((collection) => <option key={collection} value={collection}>{collection === "all" ? "All collections" : collection}</option>)}
          </select>
        </div>
        <div className="library-bulk-toolbar">
          <label><input type="checkbox" checked={filteredVideos.length > 0 && filteredVideos.every((video) => selectedVideoIds.includes(video.id))} onChange={(event) => setSelectedVideoIds(event.target.checked ? filteredVideos.map((video) => video.id) : [])} /> Select visible</label>
          <span>{selectedVideoIds.length} selected</span>
          <button type="button" className="button-secondary" onClick={() => void runBulkAction("archive")} disabled={!selectedVideoIds.length || !permissions.canEdit}>Archive</button>
          <button type="button" className="button-secondary" onClick={() => void runBulkAction("reindex")} disabled={!selectedVideoIds.length || !permissions.canEdit}>Reindex</button>
          <button type="button" className="button-secondary" onClick={() => void runBulkAction("delete")} disabled={!selectedVideoIds.length || !permissions.canEdit}>Delete</button>
          {selectedVideoIds.length > 0 ? <Link className="button-secondary" href={`/search?video_ids=${encodeURIComponent(selectedVideoIds.join(","))}`}>Use in search</Link> : null}
        </div>
        {filteredVideos.length === 0 ? (
          <div className="empty-state">
            <h3>No videos yet</h3>
            <p className="muted">Upload a video to get started.</p>
            <Link href={"/dashboard/ingest" as any} className="button">Open ingest</Link>
          </div>
        ) : (
          <div className="library-list">
            {filteredVideos.map((video) => {
              const mediaUrl = video.object_key
                ? `/api/proxy/v1/media/${video.object_key.split("/").map(encodeURIComponent).join("/")}`
                : null;
              return (
                <article
                  key={video.id}
                  className="library-item library-video-card"
                  draggable={permissions.canEdit}
                  onDragStart={() => setDraggedVideoId(video.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggedVideoId) void reorderVideo(draggedVideoId, video.id);
                    setDraggedVideoId(null);
                  }}
                  onDragEnd={() => setDraggedVideoId(null)}
                >
                  {mediaUrl ? <video className="library-video-preview" src={mediaUrl} controls preload="metadata" /> : <div className="library-video-placeholder">Preview unavailable</div>}
                  <div className="library-video-card-body">
                    <label className="library-video-select"><input type="checkbox" checked={selectedVideoIds.includes(video.id)} onChange={(event) => setSelectedVideoIds((current) => event.target.checked ? [...new Set([...current, video.id])] : current.filter((id) => id !== video.id))} /> Select</label>
                    <div className="library-video-card-head">
                      <div>
                        <input
                          className="library-video-title"
                          defaultValue={video.filename}
                          aria-label={`Rename ${video.filename}`}
                          onBlur={(event) => void updateLibraryMetadata(video, { filename: event.target.value })}
                        />
                        <p>{sourceLabel(video.source_type)} • {fmt(video.duration)}</p>
                        <p className="muted">{latestJobByVideo.get(video.id)?.transcribe === false ? "Text search skipped" : "Transcript enabled"}</p>
                      </div>
                      <span className={`job-status job-status-${statusTone(video.status)}`}>{video.status}</span>
                    </div>
                    <p className="muted">{fmtDate(video.created_at)}</p>
                    <div className="library-video-card-fields">
                      <input
                        defaultValue={video.collection || ""}
                        placeholder="Collection"
                        aria-label={`Collection for ${video.filename}`}
                        onBlur={(event) => void updateLibraryMetadata(video, { collection: event.target.value })}
                      />
                      <input
                        defaultValue={(video.labels || []).join(", ")}
                        placeholder="Labels"
                        aria-label={`Labels for ${video.filename}`}
                        onBlur={(event) => void updateLibraryMetadata(video, { labels: event.target.value.split(",") })}
                      />
                    </div>
                    <div className="dashboard-panel-links">
                      <button type="button" className="button-secondary" onClick={() => void runVideoAction(video.id, "archive")} disabled={!permissions.canEdit}>Archive</button>
                      <button type="button" className="button-secondary" onClick={() => void runVideoAction(video.id, "reindex")} disabled={!permissions.canEdit}>Reindex</button>
                      <button type="button" className="button-secondary" onClick={() => void runVideoAction(video.id, "delete")} disabled={!permissions.canEdit}>Delete</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </article>

      <article className="card dashboard-panel library-detail-panel">
        <div className="dashboard-panel-head library-panel-head">
          <div>
            <h2>Video detail</h2>
          </div>
          {selectedVideo ? <span className={`job-status job-status-${statusTone(selectedVideo.status)}`}>{selectedVideo.status}</span> : null}
        </div>
        <StatusLine status={actionStatus} />
        {!selectedVideo ? <p className="muted">Select video to inspect details.</p> : (
          <div className="dashboard-stack library-detail-body">
            <div className="library-detail-hero">
              <div>
                <p className="eyebrow">Selected source</p>
                <h3>{selectedVideo.filename}</h3>
                <p className="muted detail-wrap">{selectedVideo.source_uri}</p>
              </div>
              <div className="library-detail-stats" aria-label="Selected video summary">
                <span>{fmt(selectedVideo.duration)} duration</span>
                <span>{chunks.length} chunks</span>
              </div>
            </div>
            {selectedMediaUrl ? (
              <video ref={detailPlayerRef} className="library-detail-player" src={selectedMediaUrl} controls preload="metadata" />
            ) : null}
            <div className="detail-grid">
              <article className="detail-card">
                <span>Duration</span>
                <strong>{fmt(selectedVideo.duration)}</strong>
              </article>
              <article className="detail-card">
                <span>Uploaded</span>
                <strong>{fmtDate(selectedVideo.created_at)}</strong>
              </article>
              <article className="detail-card">
                <span>Source type</span>
                <strong>{sourceLabel(selectedVideo.source_type)}</strong>
              </article>
              <article className="detail-card">
                <span>Chunks</span>
                <strong>{chunks.length}</strong>
              </article>
            </div>
            <article className="detail-card">
              <span>Source URI</span>
              <strong className="detail-wrap">{selectedVideo.source_uri}</strong>
            </article>
            <article className="detail-card">
              <span>Labels</span>
              <strong>{labelsForSelectedVideo.length > 0 ? labelsForSelectedVideo.join(", ") : "No labels yet"}</strong>
            </article>
            {selectedVideo.error ? <p className="notice notice-bad">Video error: {selectedVideo.error}</p> : null}
            {latestJobByVideo.get(selectedVideo.id) ? (
              <article className="detail-card">
                <span>Latest job</span>
                <strong>{latestJobByVideo.get(selectedVideo.id)?.message || latestJobByVideo.get(selectedVideo.id)?.kind}</strong>
              </article>
            ) : null}
            <div className="dashboard-panel-links">
              <button type="button" className="button-secondary" onClick={() => void runVideoAction(selectedVideo.id, "archive")} disabled={!permissions.canEdit}>Archive</button>
              <button type="button" className="button-secondary" onClick={() => void runVideoAction(selectedVideo.id, "reindex")} disabled={!permissions.canEdit}>Reindex</button>
              <button type="button" className="button-secondary" onClick={() => void runVideoAction(selectedVideo.id, "delete")} disabled={!permissions.canEdit}>Delete</button>
            </div>
            <div className="dashboard-panel-links">
              <input value={labelDraft} onChange={(event) => setLabelDraft(event.target.value)} placeholder="Add label" aria-label="Add label" />
              <button type="button" className="button-secondary" onClick={addLabel} disabled={!permissions.canEdit}>Add label</button>
            </div>
            {labelsForSelectedVideo.length > 0 ? (
              <div className="dashboard-panel-links">
                {labelsForSelectedVideo.map((label) => (
                  <button key={label} type="button" className="pill pill-button" onClick={() => removeLabel(label)} disabled={!permissions.canEdit}>{label}</button>
                ))}
              </div>
            ) : null}
            <details className="chunk-browser-panel" open>
              <summary className="chunk-browser-summary">
                <div>
                  <h3>Chunk browser</h3>
                </div>
                <span className="pill">{chunks.length} chunks</span>
              </summary>
              <StatusLine status={chunksStatus} />
              {chunks.length > 0 ? (
                <div className="job-history-list chunk-browser-list">
                  {chunks.map((chunk) => (
                    <article key={chunk.id} className="detail-card">
                      <span>Chunk {fmt(chunk.start_time)} - {fmt(chunk.end_time)}</span>
                      <strong>{Math.max(0, chunk.end_time - chunk.start_time).toFixed(1)}s span</strong>
                      <p className="muted">{chunk.embedding_backend} • {chunk.embedding_model}</p>
                    </article>
                  ))}
                </div>
              ) : chunksStatus.state === "ok" ? (
                <p className="muted">No indexed chunks yet for this video.</p>
              ) : null}
            </details>
            {clipsForSelectedVideo.length > 0 ? (
              <div className="dashboard-stack">
                <h3>Clips from this video</h3>
                <div className="job-history-list">
                  {clipsForSelectedVideo.map((clip) => (
                    <article key={clip.id} className="detail-card">
                      <span>{editingClipId === clip.id ? "Editing clip metadata" : clip.name}</span>
                      <strong>{fmt(clip.start_time)} - {fmt(clip.end_time)}</strong>
                      <p className="muted">{selectedVideo.source_uri}</p>
                      {editingClipId === clip.id ? (
                        <div className="form">
                          <input
                            value={clip.name}
                            onChange={(event) => updateSavedClip(clip.id, "name", event.target.value)}
                            aria-label="Clip name"
                          />
                          <input
                            value={clip.collection}
                            onChange={(event) => updateSavedClip(clip.id, "collection", event.target.value)}
                            aria-label="Clip collection"
                          />
                          <textarea
                            value={clip.notes}
                            onChange={(event) => updateSavedClip(clip.id, "notes", event.target.value)}
                            aria-label="Clip notes"
                          />
                          <button type="button" className="button-secondary" onClick={() => setEditingClipId("")}>Done</button>
                        </div>
                      ) : (
                        <div className="dashboard-panel-links">
                          <button type="button" className="button-secondary" onClick={() => setEditingClipId(clip.id)} disabled={!permissions.canEdit}>Edit metadata</button>
                          {clip.url ? <a href={clip.url} className="button-secondary" target="_blank" rel="noreferrer">Open clip</a> : null}
                        </div>
                      )}
                      <p className="muted">Collection {clip.collection}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="dashboard-panel-links">
              <Link href={`/jobs?job=${encodeURIComponent(latestJobByVideo.get(selectedVideo.id)?.id ?? "")}`} className="button-secondary">Open latest job</Link>
              <Link href="/search" className="button-secondary">Ask about this video</Link>
            </div>
          </div>
        )}
      </article>
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
