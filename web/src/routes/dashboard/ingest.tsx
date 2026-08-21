import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "~/components/dashboard-shell";
import { IngestPanel } from "~/components/dashboard-ui";

async function IngestPage() {
  const cookieStore = { get: (_name: string) => undefined as { value: string } | undefined };
  const activeWorkspace =
    cookieStore.get("vivadeo_workspace")?.value || "default-workspace";
  const session: any = null;
  const displayName = session?.user?.name || session?.user?.email || "V";
  const profileInitial = displayName.trim().slice(0, 1).toUpperCase();

  return (
      <DashboardShell workspace={activeWorkspace} profileInitial={profileInitial}>
      <div className="dashboard-stack">
        <section className="dashboard-section-head">
          <div>
            <div className="eyebrow">Ingest</div>
            <h1>One source, one queue.</h1>
            <p className="muted">Upload file or queue URL without loading clip or job tables at same time.</p>
          </div>
        </section>
        <IngestPanel workspace={activeWorkspace} />
      </div>
    </DashboardShell>
  );
}

export const Route = createFileRoute("/dashboard/ingest")({ component: IngestPage as any });
