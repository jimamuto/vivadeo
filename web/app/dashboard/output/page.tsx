import Link from "next/link";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { DashboardShell } from "../dashboard-shell";

export default async function OutputPage() {
  const workspace = (await cookies()).get("vivadeo_workspace")?.value || "default-workspace";
  const session = await auth.api.getSession({ headers: await headers() });
  const displayName = session?.user?.name || session?.user?.email || "V";

  return (
    <DashboardShell workspace={workspace} profileInitial={displayName.trim().slice(0, 1).toUpperCase()} profileName={displayName}>
      <div className="workflow-step-page">
        <header className="workflow-step-header"><div><p className="workflow-step-kicker">Step 04 · Output</p><h1>Turn verified moments into work.</h1><p>Choose the shape of the result you want to share. Evidence and source attribution stay attached.</p></div><Link className="button-secondary" href={"/dashboard/review" as any}>Back to Review</Link></header>
        <section className="output-form-panel" aria-labelledby="output-form-title"><div><p className="workflow-step-kicker">Create a deliverable</p><h2 id="output-form-title">What should this become?</h2></div><div className="output-choice-list"><button type="button" className="output-choice is-selected"><span>Brief</span><small>A concise, cited summary of the selected evidence.</small></button><button type="button" className="output-choice"><span>Structured findings</span><small>Organize the evidence into rows, claims, or action items.</small></button><button type="button" className="output-choice"><span>Export</span><small>Prepare the verified moments and citations for handoff.</small></button></div><div className="output-form-footer"><span>Selected evidence will appear here after Review.</span><button className="button" type="button" disabled>Create output</button></div></section>
      </div>
    </DashboardShell>
  );
}
