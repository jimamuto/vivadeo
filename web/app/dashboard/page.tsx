import Link from "next/link";
import { cookies } from "next/headers";

const jobs = [
  { id: "job_01", kind: "ingest_url", status: "running", progress: "63%" },
  { id: "job_02", kind: "trim_clip", status: "queued", progress: "0%" }
];

const videos = [
  { name: "northwind-drone.mp4", status: "ready", duration: "11:22" },
  { name: "warehouse-cam-03.mp4", status: "indexing", duration: "08:54" }
];

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const activeWorkspace = cookieStore.get("vivadeo_workspace")?.value || "default-workspace";

  return (
    <div className="shell" style={{ padding: "28px 0 52px" }}>
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Vivadeo
        </div>
        <div className="nav">
          <span className="pill">Workspace: {activeWorkspace}</span>
          <Link href="/search" className="button-secondary">Search</Link>
          <Link href="/jobs" className="button-secondary">Jobs</Link>
          <Link href="/settings" className="button-secondary">Settings</Link>
        </div>
      </div>

      <section className="hero" style={{ paddingTop: 0 }}>
        <div>
          <div className="eyebrow">Signed-in product surface</div>
          <h1>Dashboard</h1>
          <p>Upload videos, search, poll jobs, review clips, and switch organizations from one place.</p>
        </div>
        <div className="panel dashboard-card">
          <div className="tabs">
            <span className="pill">Search</span>
            <span className="pill">Uploads</span>
            <span className="pill">Clips</span>
            <span className="pill">Admin</span>
          </div>
          <p className="muted" style={{ marginTop: 18 }}>
            Requests go through a Next.js proxy with a service credential, so the browser never sees internal service addresses.
          </p>
        </div>
      </section>

      <div className="dashboard-grid">
        <article className="card">
          <h3>Upload</h3>
          <form className="form" method="post" action="/api/proxy/v1/videos/upload" encType="multipart/form-data">
            <div className="field">
              <label htmlFor="file">Video file</label>
              <input id="file" name="file" type="file" accept="video/*" />
            </div>
            <button className="button" type="submit">Upload video</button>
          </form>
          <hr style={{ margin: "20px 0", borderColor: "rgba(255,255,255,0.08)" }} />
          <form className="form" method="post" action="/api/proxy/v1/videos/url">
            <div className="field">
              <label htmlFor="url">Video URL</label>
              <input id="url" name="url" placeholder="https://youtu.be/..." />
            </div>
            <button className="button" type="submit">Queue ingest</button>
          </form>
        </article>

        <article className="card">
          <h3>Search</h3>
          <p className="muted">Use the dedicated search page to submit queries and inspect ranked results.</p>
          <Link href="/search" className="button">Open search</Link>
        </article>

        <article className="card">
          <h3>Clip management</h3>
          <form className="form" method="post" action="/api/proxy/v1/clips">
            <div className="field">
              <label htmlFor="video_id">Video ID</label>
              <input id="video_id" name="video_id" placeholder="video_123" />
            </div>
            <div className="split">
              <div className="field">
                <label htmlFor="start_time">Start time</label>
                <input id="start_time" name="start_time" type="number" min="0" step="0.1" placeholder="12.5" />
              </div>
              <div className="field">
                <label htmlFor="end_time">End time</label>
                <input id="end_time" name="end_time" type="number" min="0" step="0.1" placeholder="34.0" />
              </div>
            </div>
            <button className="button" type="submit">Create clip</button>
          </form>
        </article>

        <article className="card">
          <h3>Org switcher</h3>
          <p className="muted">Workspace membership and invite acceptance are handled in the auth layer.</p>
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

      <section className="section split">
        <article className="card">
          <h3>Jobs</h3>
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
                  <td>{job.id}</td>
                  <td>{job.kind}</td>
                  <td>{job.status}</td>
                  <td>{job.progress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="card">
          <h3>Videos</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((video) => (
                <tr key={video.name}>
                  <td>{video.name}</td>
                  <td>{video.status}</td>
                  <td>{video.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>
    </div>
  );
}
