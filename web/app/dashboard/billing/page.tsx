import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { DashboardShell } from "../dashboard-shell";
import { BillingPlans } from "./billing-plans";

export const metadata: Metadata = {
  title: "Billing",
  description: "Compare Vivadeo plans for your video archive.",
};

export default async function BillingPage() {
  const workspace = (await cookies()).get("vivadeo_workspace")?.value || "default-workspace";
  const session = await auth.api.getSession({ headers: await headers() });
  const displayName = session?.user?.name || session?.user?.email || "V";

  return (
    <DashboardShell workspace={workspace} profileInitial={displayName.trim().slice(0, 1).toUpperCase()} profileName={displayName}>
      <BillingPlans workspace={workspace} />
    </DashboardShell>
  );
}
