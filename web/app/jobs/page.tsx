"use client";

import { useEffect, useState } from "react";
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

export default function JobsPage() {
  const searchParams = useSearchParams();
  const [jobId, setJobId] = useState(searchParams.get("job") ?? "");
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setJobId(searchParams.get("job") ?? "");
  }, [searchParams]);

  useEffect(() => {
    if (!jobId) return;
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const response = await fetch(`/api/proxy/v1/jobs/${jobId}`);
        if (!response.ok) throw new Error(`Job lookup failed (${response.status})`);
        const nextJob = (await response.json()) as Job;
        if (mounted) {
          setJob(nextJob);
          setError(null);
        }
        if (nextJob.status === "succeeded" || nextJob.status === "failed") return;
        timeoutId = setTimeout(poll, 2500);
      } catch (cause) {
        if (mounted) setError(cause instanceof Error ? cause.message : "Unknown error");
      }
    };

    poll();
    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [jobId]);

  const progress = job ? Math.max(0, Math.min(1, job.progress ?? 0)) : 0;
  const statusTone =
    job?.status === "succeeded"
      ? "good"
      : job?.status === "failed"
        ? "bad"
        : job?.status === "running"
          ? "live"
          : "idle";

  return (
    <div className="shell page">
      <AppTopbar />

      <section className="card fade-in">
        <div className="dashboard-panel-head">
          <h1>Job monitor</h1>
          <p className="muted">Paste job ID or arrive here after upload. Progress updates while backend works.</p>
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

            <p className="muted">{job.message || "No job message yet."}</p>
            {job.error ? <p style={{ color: "var(--danger)" }}>{job.error}</p> : null}
            {job.status === "succeeded" ? <p className="job-finish">Done. Video ready.</p> : null}
            {job.status === "failed" ? <p className="job-finish">Failed. Check error above.</p> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
