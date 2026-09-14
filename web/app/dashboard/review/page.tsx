import Link from "next/link";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { DashboardShell } from "../dashboard-shell";

export default async function ReviewPage() {
  const workspace = (await cookies()).get("vivadeo_workspace")?.value || "default-workspace";
  const session = await auth.api.getSession({ headers: await headers() });
  const displayName = session?.user?.name || session?.user?.email || "V";

  return (
    <DashboardShell workspace={workspace} profileInitial={displayName.trim().slice(0, 1).toUpperCase()} profileName={displayName}>
      <div className="workflow-step-page">
        <header className="workflow-step-header">
          <div><p className="workflow-step-kicker">Step 03 · Review</p><h1>Make the evidence trustworthy.</h1><p>Inspect the moments returned by Search, keep what is relevant, and decide what is ready to become an output.</p></div>
          <span className="workflow-step-status">No review in progress</span>
        </header>
        <section className="review-empty" aria-labelledby="review-empty-title">
          <div className="review-empty-mark" aria-hidden="true">03</div>
          <div><h2 id="review-empty-title">Bring a search result here.</h2><p>Search results and their timestamped citations will appear in this review space. Select the evidence you can stand behind, then continue to an output.</p><Link className="button" href="/search">Go to Search</Link></div>
        </section>
        <section className="review-next-step" aria-labelledby="review-next-title"><div><p className="workflow-step-kicker">Next step</p><h2 id="review-next-title">Create an output from verified evidence.</h2><p>The output step will keep the selected moments, source names, and timestamps attached to the result.</p></div><Link className="button-secondary" href={"/dashboard/output" as any}>Open Output</Link></section>
      </div>
    </DashboardShell>
  );
}
