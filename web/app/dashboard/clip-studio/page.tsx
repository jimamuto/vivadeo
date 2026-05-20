import { cookies } from "next/headers";
import { DashboardShell } from "../dashboard-shell";
import { ClipStudioPanel } from "../dashboard-ui";

export default async function ClipStudioPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const cookieStore = await cookies();
  const activeWorkspace =
    cookieStore.get("vivadeo_workspace")?.value || "default-workspace";
  const params = (await searchParams) ?? {};
  const clipId = typeof params.clip_id === "string" ? params.clip_id : "";
  const videoId = typeof params.video_id === "string" ? params.video_id : "";
  const startTime = typeof params.start_time === "string" ? params.start_time : "";
  const endTime = typeof params.end_time === "string" ? params.end_time : "";

  return (
    <DashboardShell workspace={activeWorkspace}>
      <div className="dashboard-solo dashboard-clip-stage">
        <section className="dashboard-section-head">
          <div>
            <div className="eyebrow">Clip studio</div>
            <h1>Trim, then ship.</h1>
            <p className="muted">Dedicated view for clip creation keeps focus tight.</p>
          </div>
        </section>
        <ClipStudioPanel
          workspace={activeWorkspace}
          initialClipId={clipId}
          initialVideoId={videoId}
          initialStartTime={startTime}
          initialEndTime={endTime}
        />
      </div>
    </DashboardShell>
  );
}
