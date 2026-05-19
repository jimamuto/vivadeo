"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  const [jobId, setJobId] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const response = await fetch(`/api/proxy/v1/jobs/${jobId}`);
        if (!response.ok) {
          throw new Error(`Job lookup failed (${response.status})`);
        }
        const nextJob = (await response.json()) as Job;
        if (mounted) {
          setJob(nextJob);
          setError(null);
        }
        if (nextJob.status === "succeeded" || nextJob.status === "failed") {
          return;
        }
        timeoutId = setTimeout(poll, 2500);
      } catch (cause) {
        if (mounted) {
          setError(cause instanceof Error ? cause.message : "Unknown error");
        }
      }
    };

    poll();
    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [jobId]);

  return (
    <div className="shell" style={{ padding: "28px 0 52px" }}>
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Vivadeo
        </div>
        <Link href="/dashboard" className="button-secondary">Back to dashboard</Link>
      </div>

      <section className="card fade-in">
        <h1>Job polling</h1>
        <p className="muted">Paste a job ID to watch ingest or clip generation progress through the proxy.</p>
        <div className="form">
          <div className="field">
            <label htmlFor="jobId">Job ID</label>
            <input id="jobId" value={jobId} onChange={(event) => setJobId(event.target.value)} placeholder="job_123" />
          </div>
        </div>

        {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
        {job ? (
          <div className="card" style={{ marginTop: 18 }}>
            <h3>{job.kind}</h3>
            <p>Status: {job.status}</p>
            <p>Progress: {Math.round(job.progress * 100)}%</p>
            <p className="muted">{job.message || "No job message yet."}</p>
            {job.error ? <p style={{ color: "var(--danger)" }}>{job.error}</p> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
