import { DashboardShell } from "./dashboard-shell";
import type { ReactNode } from "react";

function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`dashboard-skeleton ${className}`.trim()} aria-hidden="true" />;
}

function LoadingShell({
  children,
  breadcrumbDetail,
  label,
  pageLabel,
}: Readonly<{
  children: ReactNode;
  breadcrumbDetail?: string;
  label: string;
  pageLabel: string;
}>) {
  return (
    <DashboardShell
      workspace="default-workspace"
      profileInitial="V"
      breadcrumbDetail={breadcrumbDetail}
      loading
      pageLabelOverride={pageLabel}
    >
      <div className="dashboard-stack">
        <section className="dashboard-route-skeleton" aria-busy="true" aria-label={label}>
          <span className="sr-only" role="status">{label}</span>
          {children}
        </section>
      </div>
    </DashboardShell>
  );
}

export function IngestPageSkeleton() {
  return (
    <LoadingShell label="Loading videos" pageLabel="Ingest">
      <section className="ingest-registry">
        <header className="ingest-registry-head">
          <div className="dashboard-skeleton-copy">
            <Skeleton className="dashboard-skeleton-title dashboard-skeleton-title-compact" />
            <Skeleton className="dashboard-skeleton-line dashboard-skeleton-line-wide" />
          </div>
        </header>

        <div className="ingest-status-bar">
          <div className="ingest-status-tabs dashboard-skeleton-tabs">
            {[74, 112, 86, 142].map((width) => <Skeleton key={width} className="dashboard-skeleton-tab" />)}
          </div>
          <Skeleton className="dashboard-skeleton-button" />
        </div>

        <div className="ingest-registry-tools">
          <Skeleton className="dashboard-skeleton-input" />
          <Skeleton className="dashboard-skeleton-count" />
        </div>

        <div className="ingest-registry-table-wrap">
          <table className="ingest-registry-table dashboard-skeleton-table" aria-hidden="true">
            <thead><tr><th>File</th><th>Added</th><th>Status</th><th>Progress</th><th /></tr></thead>
            <tbody>
              {[0, 1, 2, 3, 4].map((row) => (
                <tr key={row}>
                  <td data-label="File"><div className="ingest-file-identity"><Skeleton className="dashboard-skeleton-file-icon" /><div><Skeleton className="dashboard-skeleton-line dashboard-skeleton-filename" /><Skeleton className="dashboard-skeleton-line dashboard-skeleton-caption" /></div></div></td>
                  <td data-label="Added"><Skeleton className="dashboard-skeleton-line dashboard-skeleton-date" /></td>
                  <td data-label="Status"><Skeleton className="dashboard-skeleton-status" /></td>
                  <td data-label="Progress"><div className="dashboard-skeleton-progress"><Skeleton /><Skeleton className="dashboard-skeleton-line dashboard-skeleton-caption" /></div></td>
                  <td data-label="Actions"><Skeleton className="dashboard-skeleton-action" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </LoadingShell>
  );
}

export function LibraryPageSkeleton() {
  return (
    <LoadingShell label="Loading library" pageLabel="Library" breadcrumbDetail="All videos">
      <section className="library-workbench library-manager">
        <article className="card dashboard-panel library-list-panel">
          <header className="library-page-head dashboard-skeleton-copy">
            <div>
              <Skeleton className="dashboard-skeleton-title" />
              <Skeleton className="dashboard-skeleton-line dashboard-skeleton-line-medium" />
            </div>
          </header>

          <nav className="library-section-nav dashboard-skeleton-library-nav" aria-hidden="true">
            {[116, 88, 132].map((width) => <Skeleton key={width} className="dashboard-skeleton-library-tab" />)}
            <Skeleton className="dashboard-skeleton-button" />
          </nav>

          <section className="library-content-panel">
            <header className="library-content-toolbar">
              <div className="dashboard-skeleton-copy">
                <Skeleton className="dashboard-skeleton-section-title" />
                <Skeleton className="dashboard-skeleton-line dashboard-skeleton-count" />
              </div>
              <Skeleton className="dashboard-skeleton-library-search" />
            </header>
            <div className="library-card-grid dashboard-skeleton-card-grid">
              {[0, 1, 2, 3].map((card) => (
                <article className="library-media-card dashboard-skeleton-media-card" key={card} aria-hidden="true">
                  <Skeleton className="dashboard-skeleton-thumbnail" />
                  <div className="library-media-card-body">
                    <div>
                      <Skeleton className="dashboard-skeleton-line dashboard-skeleton-card-title" />
                      <Skeleton className="dashboard-skeleton-line dashboard-skeleton-card-meta" />
                    </div>
                  </div>
                  <div className="dashboard-skeleton-card-actions"><Skeleton /><Skeleton /></div>
                </article>
              ))}
            </div>
          </section>
        </article>
      </section>
    </LoadingShell>
  );
}
