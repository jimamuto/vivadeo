import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/app/dashboard/dashboard-shell";
import { AgentLab } from "./agent-lab";

export default async function AgentLabPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const displayName = session?.user?.name || session?.user?.email || "V";
  return (
    <DashboardShell workspace="Workspace" profileInitial={displayName.slice(0, 1).toUpperCase()} profileName={displayName}>
      <AgentLab />
    </DashboardShell>
  );
}
