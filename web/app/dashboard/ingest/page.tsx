import { cookies } from "next/headers";
import { headers } from "next/headers";
import { DashboardShell } from "../dashboard-shell";
import { IngestPanel } from "../dashboard-ui";
import { auth } from "@/lib/auth";

export default async function IngestPage() {
  const cookieStore = await cookies();
  const activeWorkspace =
    cookieStore.get("vivadeo_workspace")?.value || "default-workspace";
  const session = await auth.api.getSession({ headers: await headers() });
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
