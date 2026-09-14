import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { DashboardShell } from "../dashboard-shell";
import { ReviewPanel } from "./review-panel";

export default async function ReviewPage() {
  const workspace = (await cookies()).get("vivadeo_workspace")?.value || "default-workspace";
  const session = await auth.api.getSession({ headers: await headers() });
  const displayName = session?.user?.name || session?.user?.email || "V";

  return (
    <DashboardShell workspace={workspace} profileInitial={displayName.trim().slice(0, 1).toUpperCase()} profileName={displayName}>
      <div className="workflow-step-page">
        <ReviewPanel />
      </div>
    </DashboardShell>
  );
}
