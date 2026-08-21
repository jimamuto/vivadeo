"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { AppTopbar } from "@/components/app-topbar";

type Job = {
  id: string;
  organization_id: string;
  kind: string;
  status: string;
  progress: number;
  message?: string | null;
  error?: string | null;
};

type JobTimelineEntry = {
  at: string;
  message: string;
};

const INGEST_STAGES = [
  "queued",
  "uploading",
  "chunking",
  "embedding",
  "indexing",
  "ready",
  "failed",
] as const;

type IngestStage = (typeof INGEST_STAGES)[number];

function resolveStage(job: Job): IngestStage {
  const message = (job.message ?? "").toLowerCase();

  if (job.status === "failed" || job.status === "canceled") return "failed";
  if (job.status === "succeeded") return "ready";
  if (message.includes("upload")) return "uploading";
  if (message.includes("chunk")) return "chunking";
  if (message.includes("embed")) return "embedding";
  if (message.includes("index")) return "indexing";

  if ((job.progress ?? 0) >= 0.8) return "indexing";
  if ((job.progress ?? 0) >= 0.6) return "embedding";
  if ((job.progress ?? 0) >= 0.35) return "chunking";
  if ((job.progress ?? 0) > 0) return "uploading";

  return "queued";
}

function JobStages({ job }: { job: Job }) {
  const activeStage = resolveStage(job);
  const activeIndex = INGEST_STAGES.indexOf(activeStage);

  return (
    <div className="job-stage-list" aria-label="Job stages">
      {INGEST_STAGES.map((stage, index) => {
        const state =
          stage === "failed"
            ? job.status === "failed"
              ? "failed"
              : "pending"
            : index < activeIndex
              ? "done"
              : index === activeIndex
                ? "active"
                : "pending";
        return (
          <div key={stage} className={`job-stage job-stage-${state}`}>
            <strong>{stage}</strong>
          </div>
        );
      })}
    </div>
  );
}

function JobsContent() {
  const searchParams = useSearchParams();
  const [jobId, setJobId] = useState(searchParams.get("job") ?? "");
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryNote, setRetryNote] = useState<string | null>(null);
  const [cancelNote, setCancelNote] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<JobTimelineEntry[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setJobId(searchParams.get("job") ?? "");
  }, [searchParams]);

  useEffect(() => {
    if (!jobId) return;
    let mounted = true;
    setTimeline([]);
    const stream = new EventSource(`/api/job-events/${jobId}`);
    stream.addEventListener("job", (event) => {
      if (!mounted) return;
      const nextJob = JSON.parse((event as MessageEvent<string>).data) as Job;
      setJob(nextJob);
      setError(null);
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
      const nextJob = (await response.json()) as Job;
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
      const nextJob = (await response.json()) as Job;
      setJob(nextJob);
      setCancelNote("Job canceled.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unknown error");
    }
  }

  const progress = job ? Math.max(0, Math.min(1, job.progress ?? 0)) : 0;
  const activeStage = job ? resolveStage(job) : "queued";
  const statusTone =
    job?.status === "succeeded"
      ? "good"
      : job?.status === "failed" || job?.status === "canceled"
        ? "bad"
        : job?.status === "running"
          ? "live"
          : "idle";

  return (
    <div className="shell page">
      <AppTopbar />

      <section className="card fade-in">
        <div className="dashboard-panel-head">
          <h1>Ingest progress</h1>
          <p className="muted">Paste job ID or arrive here after upload. This page tracks queued, uploading, chunking, embedding, indexing, ready, and failed states.</p>
        </div>
        <div className="form">
          <div className="field">
            <label htmlFor="jobId">Job ID</label>
            <input
              id="jobId"
              value={jobId}
              onChange={(event) => setJobId(event.target.value)}
              placeholder="job_123"
            />
          </div>
        </div>

        {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
        {job ? (
          <div className="job-card">
            <div className="job-card-head">
              <div>
                <p className="eyebrow">Live job</p>
                <h3>{job.kind.replace(/_/g, " ")}</h3>
              </div>
              <span className={`job-status job-status-${statusTone}`}>{job.status}</span>
            </div>

            <div className="job-progress" aria-label="Job progress">
              <div className="job-progress-track">
                <div className="job-progress-fill" style={{ width: `${progress * 100}%` }} />
              </div>
              <div className="job-progress-meta">
                <span>{Math.round(progress * 100)}%</span>
                <span>{job.message || "Waiting for worker"}</span>
              </div>
            </div>

            <JobStages job={job} />
            <p className="muted">
              Current stage: <strong>{activeStage}</strong>
            </p>

            <p className="muted">{job.message || "No job message yet."}</p>
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
            {job.error ? <p style={{ color: "var(--danger)" }}>{job.error}</p> : null}
            {job.status === "succeeded" ? <p className="job-finish">Ready. Ingest finished and source should now appear in library and search.</p> : null}
            {job.status === "failed" ? <p className="job-finish">Failed. Check error above, then retry if source is still valid.</p> : null}
            {job.status === "canceled" ? <p className="job-finish">Canceled. Work should stop at the next safe checkpoint.</p> : null}
            {job.status !== "succeeded" && job.status !== "failed" && job.status !== "canceled" ? <p className="job-finish">Still processing. Keep this page open or check dashboard jobs later.</p> : null}
            {job.status === "queued" || job.status === "running" ? (
              <button
                className="button-secondary"
                type="button"
                onClick={() => startTransition(cancelJob)}
                disabled={isPending}
                style={{ marginTop: 14 }}
              >
                Cancel job
              </button>
            ) : null}
            {job.status === "failed" ? (
              <button
                className="button"
                type="button"
                onClick={() => startTransition(retryJob)}
                disabled={isPending}
                style={{ marginTop: 14 }}
              >
                Retry failed job
              </button>
            ) : null}
            {cancelNote ? <p className="notice notice-good" style={{ marginTop: 12 }}>{cancelNote}</p> : null}
            {retryNote ? <p className="notice notice-good" style={{ marginTop: 12 }}>{retryNote}</p> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={null}>
      <JobsContent />
    </Suspense>
  );
}
