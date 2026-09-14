import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { DashboardShell } from "../dashboard-shell";
import { OutputPanel } from "./output-panel";

export default async function OutputPage() {
  const workspace = (await cookies()).get("vivadeo_workspace")?.value || "default-workspace";
  const session = await auth.api.getSession({ headers: await headers() });
  const displayName = session?.user?.name || session?.user?.email || "V";

  return (
    <DashboardShell workspace={workspace} profileInitial={displayName.trim().slice(0, 1).toUpperCase()} profileName={displayName}>
      <div className="workflow-step-page">
        <OutputPanel />
      </div>
    </DashboardShell>
  );
}
