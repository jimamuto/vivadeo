import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "../../dashboard-shell";
import { BillingPlans } from "../billing-plans";

export const metadata: Metadata = {
  title: "Choose a plan",
  description: "Choose the Vivadeo plan that fits your video archive.",
};

export default async function BillingPlansPage() {
  const workspace = (await cookies()).get("vivadeo_workspace")?.value || "default-workspace";
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  const displayName = session.user.name || session.user.email || "Guest";

  return (
    <DashboardShell workspace={workspace} profileInitial={displayName.trim().slice(0, 1).toUpperCase()} profileName={displayName}>
      <BillingPlans workspace={workspace} plansOnly />
    </DashboardShell>
  );
}
