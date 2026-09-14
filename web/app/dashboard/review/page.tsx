import Link from "next/link";
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
        <header className="workflow-step-header">
          <div><p className="workflow-step-kicker">Step 03 · Review</p><h1>Verify the moments behind your answer.</h1><p>Inspect collected evidence in source context, record your decision, and keep attribution attached.</p></div>
          <Link className="button-secondary" href="/search">Collect more evidence</Link>
        </header>
        <ReviewPanel />
        <section className="review-next-step" aria-labelledby="review-next-title"><div><p className="workflow-step-kicker">Next step</p><h2 id="review-next-title">Create an output from verified evidence.</h2><p>The output step will keep the selected moments, source names, and timestamps attached to the result.</p></div><Link className="button-secondary" href={"/dashboard/output" as any}>Open Output</Link></section>
      </div>
    </DashboardShell>
  );
}
