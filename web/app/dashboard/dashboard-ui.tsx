"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useRef, useState } from "react";
import type { Job, Video } from "./dashboard-data";

type FetchStatus = { state: "idle" | "loading" | "ok" | "error"; message?: string };

function StatusLine({ status }: { status: FetchStatus }) {
  if (status.state === "idle") return null;
  const color = status.state === "ok" ? "var(--accent)" : status.state === "error" ? "var(--danger)" : "inherit";
  return <p className="muted" style={{ marginTop: 10, color }}>{status.state === "loading" ? "Working..." : status.message}</p>;
}

async function proxyPost(path: string, body: BodyInit, json = true) {
  const res = await fetch(`/api/proxy${path}`, {
    method: "POST",
    body,
    ...(json ? { headers: { "Content-Type": "application/json" } } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? JSON.stringify(data));
  return data as { id: string; status: string };
}

export function fmt(seconds: number | null): string {
  if (seconds == null) return "-";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function PlaceholderBlock({ label, tone = "tan" }: { label: string; tone?: "tan" | "grain" | "oxblood" }) {
  return (
    <div className={`dash-placeholder dash-${tone}`}>
      <div className="dash-placeholder-shape" />
      <div className="dash-placeholder-tag">{label}</div>
    </div>
  );
}

function StatStrip({ label, value, note }: { label: string; value: string; note: string; }) {
  return (
    <div className="stat-strip">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{note}</p>
    </div>
  );
}

export function OverviewPanel({ activeWorkspace, videos, jobs }: { activeWorkspace: string; videos: Video[]; jobs: Job[]; }) {
  return (
    <section className="dashboard-hero fade-in">
      <div className="dashboard-title card">
        <div className="eyebrow">Signed-in console</div>
        <h1>Dashboard built like a control room.</h1>
        <p>Use sidebar to move through ingest, clips, jobs, and workspace without loading all at once.</p>
        <div className="dashboard-chips">
          <span className="pill">Workspace {activeWorkspace}</span>
          <span className="pill">Live ingest</span>
          <span className="pill">Clip review</span>
          <span className="pill">Search</span>
        </div>
      </div>
      <div className="dashboard-hero-side">
        <PlaceholderBlock label="Workspace view" tone="grain" />
        <StatStrip label="Jobs" value={`${jobs.length}`} note="Queued, active, or finished." />
        <StatStrip label="Videos" value={`${videos.length}`} note="Indexed items in workspace." />
      </div>
    </section>
  );
}

export function IngestPanel() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const [fileStatus, setFileStatus] = useState<FetchStatus>({ state: "idle" });
  const [urlStatus, setUrlStatus] = useState<FetchStatus>({ state: "idle" });

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return setFileStatus({ state: "error", message: "Please select a file." });
    setFileStatus({ state: "loading" });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const job = await proxyPost("/v1/videos/upload", fd, false);
      router.push(`/jobs?job=${encodeURIComponent(job.id)}`);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: unknown) {
      setFileStatus({ state: "error", message: `Upload failed: ${(e as Error).message}` });
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const url = urlRef.current?.value?.trim();
    if (!url) return setUrlStatus({ state: "error", message: "Please enter a URL." });
    setUrlStatus({ state: "loading" });
    try {
      const job = await proxyPost("/v1/videos/url", JSON.stringify({ url }));
      router.push(`/jobs?job=${encodeURIComponent(job.id)}`);
      if (urlRef.current) urlRef.current.value = "";
    } catch (e: unknown) {
      setUrlStatus({ state: "error", message: `Failed: ${(e as Error).message}` });
    }
  }

  return (
    <section className="dashboard-module-grid dashboard-module-grid-ingest">
      <article className="card dash-stack dash-primary">
        <PlaceholderBlock label="Upload lane" tone="tan" />
        <div>
          <h3>File ingest</h3>
          <p className="muted">Drop a file, queue it, keep page focused on one task.</p>
        </div>
        <div className="form">
          <div className="field">
            <label htmlFor="file">Video file</label>
            <input ref={fileRef} id="file" name="file" type="file" accept="video/*" />
          </div>
          <button className="button" onClick={handleUpload} disabled={fileStatus.state === "loading"}>Upload video</button>
          <StatusLine status={fileStatus} />
        </div>
      </article>
      <article className="card dash-stack dash-secondary">
        <PlaceholderBlock label="URL lane" tone="grain" />
        <div>
          <h3>URL ingest</h3>
          <p className="muted">Queue remote source without mixing it into clip or jobs flow.</p>
        </div>
        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="url">Video URL</label>
            <input ref={urlRef} id="url" name="url" placeholder="https://youtu.be/..." />
          </div>
          <button className="button" type="submit" disabled={urlStatus.state === "loading"}>Queue ingest</button>
          <StatusLine status={urlStatus} />
        </form>
      </article>
    </section>
  );
}

export function ClipStudioPanel() {
  const videoIdRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<FetchStatus>({ state: "idle" });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus({ state: "loading" });
    try {
      const job = await proxyPost(
        "/v1/clips",
        JSON.stringify({
          video_id: videoIdRef.current?.value,
          start_time: parseFloat(startRef.current?.value ?? "0"),
          end_time: parseFloat(endRef.current?.value ?? "0"),
        }),
      );
      setStatus({ state: "ok", message: `Clip queued - job ${job.id} (${job.status})` });
    } catch (e: unknown) {
      setStatus({ state: "error", message: `Failed: ${(e as Error).message}` });
    }
  }

  return (
    <section className="dashboard-clip-panel">
      <article className="card dash-stack dash-primary">
        <PlaceholderBlock label="Clip frame" tone="oxblood" />
        <div>
          <h3>Clip desk</h3>
          <p className="muted">Trim source ranges in dedicated flow.</p>
        </div>
        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="video_id">Video ID</label>
            <input ref={videoIdRef} id="video_id" name="video_id" placeholder="video_123" />
          </div>
          <div className="split">
            <div className="field"><label htmlFor="start_time">Start time</label><input ref={startRef} id="start_time" type="number" min="0" step="0.1" placeholder="12.5" /></div>
            <div className="field"><label htmlFor="end_time">End time</label><input ref={endRef} id="end_time" type="number" min="0" step="0.1" placeholder="34.0" /></div>
          </div>
          <button className="button" type="submit" disabled={status.state === "loading"}>Create clip</button>
          <StatusLine status={status} />
        </form>
      </article>
    </section>
  );
}

export function JobsPanel({ jobs }: { jobs: Job[]; }) {
  return (
    <section className="card dashboard-panel">
      <div className="dashboard-panel-head">
        <h2>Jobs</h2>
        <p className="muted">Single table, no other flow mixed in, with horizontal scroll on tight widths.</p>
      </div>
      {jobs.length === 0 ? <p className="muted">No jobs yet.</p> : (
        <table className="table">
          <thead><tr><th>ID</th><th>Kind</th><th>Status</th><th>Progress</th></tr></thead>
          <tbody>{jobs.map((job) => (
            <tr key={job.id}>
              <td title={job.id}>{job.id.slice(0, 8)}...</td>
              <td>{job.kind.replace(/_/g, " ")}</td>
              <td>{job.status}</td>
              <td>{job.progress != null ? `${Math.round(job.progress * 100)}%` : "-"}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </section>
  );
}

export function WorkspacePanel({ activeWorkspace }: { activeWorkspace: string; }) {
  return (
    <section className="card dashboard-panel">
      <div className="dashboard-panel-head">
        <h2>Workspace</h2>
        <p className="muted">Switch org here. Auth settings stay out of dashboard clutter.</p>
      </div>
      <form className="form" action="/api/workspace/select" method="post">
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
      <div className="dashboard-panel-links">
        <Link href="/settings" className="button-secondary">Open settings</Link>
      </div>
    </section>
  );
}
