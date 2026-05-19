"use client";

import Link from "next/link";
import { useRef, useState } from "react";

export type Job = {
  id: string;
  kind: string;
  status: string;
  progress: number;
  message: string | null;
  error: string | null;
  video_id: string | null;
};

export type Video = {
  id: string;
  filename: string;
  status: string;
  duration: number | null;
  source_type: string;
};

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

function fmt(seconds: number | null): string {
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

function StatStrip({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="stat-strip">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{note}</p>
    </div>
  );
}

function UploadCard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<FetchStatus>({ state: "idle" });

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setStatus({ state: "error", message: "Please select a file." });
      return;
    }
    setStatus({ state: "loading" });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const job = await proxyPost("/v1/videos/upload", fd, false);
      setStatus({ state: "ok", message: `Queued - job ${job.id} (${job.status})` });
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: unknown) {
      setStatus({ state: "error", message: `Upload failed: ${(e as Error).message}` });
    }
  }

  return (
    <article className="card dash-stack">
      <PlaceholderBlock label="Upload lane" tone="tan" />
      <div>
        <h3>Ingest</h3>
        <p className="muted">Drop a file or queue a URL. Worker picks it up from this lane.</p>
      </div>
      <div className="form">
        <div className="field">
          <label htmlFor="file">Video file</label>
          <input ref={fileRef} id="file" name="file" type="file" accept="video/*" />
        </div>
        <button className="button" onClick={handleUpload} disabled={status.state === "loading"}>Upload video</button>
        <StatusLine status={status} />
      </div>
      <UrlIngestForm />
    </article>
  );
}

function UrlIngestForm() {
  const urlRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<FetchStatus>({ state: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = urlRef.current?.value?.trim();
    if (!url) {
      setStatus({ state: "error", message: "Please enter a URL." });
      return;
    }
    setStatus({ state: "loading" });
    try {
      const job = await proxyPost("/v1/videos/url", JSON.stringify({ url }));
      setStatus({ state: "ok", message: `Queued - job ${job.id} (${job.status})` });
      if (urlRef.current) urlRef.current.value = "";
    } catch (e: unknown) {
      setStatus({ state: "error", message: `Failed: ${(e as Error).message}` });
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="url">Video URL</label>
        <input ref={urlRef} id="url" name="url" placeholder="https://youtu.be/..." />
      </div>
      <button className="button" type="submit" disabled={status.state === "loading"}>Queue ingest</button>
      <StatusLine status={status} />
    </form>
  );
}

function ClipForm() {
  const videoIdRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<FetchStatus>({ state: "idle" });

  async function handleSubmit(e: React.FormEvent) {
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
    <article className="card dash-stack">
      <PlaceholderBlock label="Clip frame" tone="oxblood" />
      <div>
        <h3>Clip desk</h3>
        <p className="muted">Trim source ranges into reviewable clips.</p>
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
  );
}

export default function DashboardClient({ activeWorkspace, videos, jobs }: { activeWorkspace: string; videos: Video[]; jobs: Job[]; }) {
  return (
    <div className="shell page">
      <div className="topbar">
        <div className="topbar-shell">
          <Link href="/" className="brand">Vivadeo</Link>
          <div className="nav-center">
            <Link href="/" className="nav-link">Home</Link>
            <Link href="/search" className="nav-link">Search</Link>
            <Link href="/jobs" className="nav-link">Jobs</Link>
            <Link href="/settings" className="nav-link">Settings</Link>
          </div>
          <div className="nav-spacer" />
          <div className="nav-actions">
            <Link href="/settings" className="nav-user" aria-label="Profile">V</Link>
            <form action="/api/auth/sign-out" method="post">
              <button className="nav-logout" type="submit">Log out</button>
            </form>
          </div>
        </div>
      </div>

      <section className="dashboard-hero fade-in">
        <div className="dashboard-title card">
          <div className="eyebrow">Signed-in console</div>
          <h1>Dashboard built like a control room.</h1>
          <p>Upload videos, search, poll jobs, review clips, and switch organizations from one place.</p>
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

      <div className="dashboard-layout">
        <div className="dashboard-left">
          <UploadCard />
          <article className="card dash-stack">
            <PlaceholderBlock label="Search surface" tone="grain" />
            <div>
              <h3>Search</h3>
              <p className="muted">Use the dedicated search page to submit queries and inspect ranked results.</p>
            </div>
            <Link href="/search" className="button">Open search</Link>
          </article>
        </div>
        <div className="dashboard-right">
          <ClipForm />
          <article className="card dash-stack">
            <PlaceholderBlock label="Workspace switch" tone="tan" />
            <div>
              <h3>Workspace switcher</h3>
              <p className="muted">Workspace membership and invite acceptance are handled in the auth layer.</p>
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
          </article>
        </div>
      </div>

      <section className="section dashboard-ledger">
        <article className="card ledger-panel ledger-wide">
          <h3>Jobs</h3>
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
        </article>
        <article className="card ledger-panel">
          <h3>Videos</h3>
          {videos.length === 0 ? <p className="muted">No videos yet.</p> : (
            <table className="table">
              <thead><tr><th>Filename</th><th>Status</th><th>Duration</th></tr></thead>
              <tbody>{videos.map((video) => (
                <tr key={video.id}>
                  <td title={video.id}>{video.filename}</td>
                  <td>{video.status}</td>
                  <td>{fmt(video.duration)}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </article>
      </section>
    </div>
  );
}
