"use client";

import Link from "next/link";
import { useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types (kept here so page.tsx can import them)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
type FetchStatus = {
  state: "idle" | "loading" | "ok" | "error";
  message?: string;
};

function StatusLine({ status }: { status: FetchStatus }) {
  if (status.state === "idle") return null;
  const color =
    status.state === "ok"
      ? "var(--color-success, #4ade80)"
      : status.state === "error"
        ? "var(--color-error, #f87171)"
        : "inherit";
  return (
    <p className="muted" style={{ marginTop: 10, color }}>
      {status.state === "loading" ? "Working…" : status.message}
    </p>
  );
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
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

// ---------------------------------------------------------------------------
// Upload card
// ---------------------------------------------------------------------------
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
      setStatus({
        state: "ok",
        message: `Queued — job ${job.id} (${job.status}). Refresh to see updates.`,
      });
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: unknown) {
      setStatus({
        state: "error",
        message: `Upload failed: ${(e as Error).message}`,
      });
    }
  }

  return (
    <article className="card">
      <h3>Upload</h3>
      <div className="form">
        <div className="field">
          <label htmlFor="file">Video file</label>
          <input
            ref={fileRef}
            id="file"
            name="file"
            type="file"
            accept="video/*"
          />
        </div>
        <button
          className="button"
          onClick={handleUpload}
          disabled={status.state === "loading"}
        >
          Upload video
        </button>
        <StatusLine status={status} />
      </div>

      <hr style={{ margin: "20px 0", borderColor: "rgba(255,255,255,0.08)" }} />

      <UrlIngestForm />
    </article>
  );
}

// ---------------------------------------------------------------------------
// URL ingest form
// ---------------------------------------------------------------------------
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
      setStatus({
        state: "ok",
        message: `Queued — job ${job.id} (${job.status}). Refresh to see updates.`,
      });
      if (urlRef.current) urlRef.current.value = "";
    } catch (e: unknown) {
      setStatus({ state: "error", message: `Failed: ${(e as Error).message}` });
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="url">Video URL</label>
        <input
          ref={urlRef}
          id="url"
          name="url"
          placeholder="https://youtu.be/…"
        />
      </div>
      <button
        className="button"
        type="submit"
        disabled={status.state === "loading"}
      >
        Queue ingest
      </button>
      <StatusLine status={status} />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Clip form
// ---------------------------------------------------------------------------
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
      setStatus({
        state: "ok",
        message: `Clip queued — job ${job.id} (${job.status})`,
      });
    } catch (e: unknown) {
      setStatus({ state: "error", message: `Failed: ${(e as Error).message}` });
    }
  }

  return (
    <article className="card">
      <h3>Clip management</h3>
      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="video_id">Video ID</label>
          <input
            ref={videoIdRef}
            id="video_id"
            name="video_id"
            placeholder="video_123"
          />
        </div>
        <div className="split">
          <div className="field">
            <label htmlFor="start_time">Start time</label>
            <input
              ref={startRef}
              id="start_time"
              type="number"
              min="0"
              step="0.1"
              placeholder="12.5"
            />
          </div>
          <div className="field">
            <label htmlFor="end_time">End time</label>
            <input
              ref={endRef}
              id="end_time"
              type="number"
              min="0"
              step="0.1"
              placeholder="34.0"
            />
          </div>
        </div>
        <button
          className="button"
          type="submit"
          disabled={status.state === "loading"}
        >
          Create clip
        </button>
        <StatusLine status={status} />
      </form>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------
export default function DashboardClient({
  activeWorkspace,
  videos,
  jobs,
}: {
  activeWorkspace: string;
  videos: Video[];
  jobs: Job[];
}) {
  return (
    <div className="shell" style={{ padding: "28px 0 52px" }}>
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Vivadeo
        </div>
        <div className="nav">
          <span className="pill">Workspace: {activeWorkspace}</span>
          <Link href="/search" className="button-secondary">
            Search
          </Link>
          <Link href="/jobs" className="button-secondary">
            Jobs
          </Link>
          <Link href="/settings" className="button-secondary">
            Settings
          </Link>
        </div>
      </div>

      <section className="hero" style={{ paddingTop: 0 }}>
        <div>
          <div className="eyebrow">Signed-in product surface</div>
          <h1>Dashboard</h1>
          <p>
            Upload videos, search, poll jobs, review clips, and switch
            organizations from one place.
          </p>
        </div>
        <div className="panel dashboard-card">
          <div className="tabs">
            <span className="pill">Search</span>
            <span className="pill">Uploads</span>
            <span className="pill">Clips</span>
            <span className="pill">Admin</span>
          </div>
          <p className="muted" style={{ marginTop: 18 }}>
            Requests go through a Next.js proxy with a service credential, so
            the browser never sees internal service addresses.
          </p>
        </div>
      </section>

      <div className="dashboard-grid">
        <UploadCard />

        <article className="card">
          <h3>Search</h3>
          <p className="muted">
            Use the dedicated search page to submit queries and inspect ranked
            results.
          </p>
          <Link href="/search" className="button">
            Open search
          </Link>
        </article>

        <ClipForm />

        <article className="card">
          <h3>Org switcher</h3>
          <p className="muted">
            Workspace membership and invite acceptance are handled in the auth
            layer.
          </p>
          <form className="form" action="/api/workspace/select" method="post">
            <div className="field">
              <label htmlFor="workspace">Workspace ID</label>
              <select
                id="workspace"
                name="workspace"
                defaultValue={activeWorkspace}
              >
                <option value="default-workspace">Default workspace</option>
                <option value="northwind">Northwind</option>
                <option value="contoso">Contoso</option>
                <option value="acme">Acme</option>
              </select>
            </div>
            <button className="button-secondary" type="submit">
              Switch workspace
            </button>
          </form>
        </article>
      </div>

      <section className="section split">
        <article className="card">
          <h3>Jobs</h3>
          {jobs.length === 0 ? (
            <p className="muted">No jobs yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Kind</th>
                  <th>Status</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td title={job.id}>{job.id.slice(0, 8)}…</td>
                    <td>{job.kind.replace(/_/g, " ")}</td>
                    <td>{job.status}</td>
                    <td>
                      {job.progress != null
                        ? `${Math.round(job.progress * 100)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>

        <article className="card">
          <h3>Videos</h3>
          {videos.length === 0 ? (
            <p className="muted">No videos yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => (
                  <tr key={video.id}>
                    <td title={video.id}>{video.filename}</td>
                    <td>{video.status}</td>
                    <td>{fmt(video.duration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
      </section>
    </div>
  );
}
