import { Suspense } from "react";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SearchContent } from "./search-content";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; video_id?: string; video_ids?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const displayName = session?.user?.name || session?.user?.email || "V";
  const profileInitial = displayName.trim().slice(0, 1).toUpperCase();
  const { q = "", video_id: videoId = "", video_ids: videoIds = "" } = await searchParams;
  const workspace = (await cookies()).get("vivadeo_workspace")?.value || "default-workspace";

  return (
    <Suspense fallback={null}>
      <SearchContent profileInitial={profileInitial} profileName={displayName} initialQuery={q} initialVideoId={videoId} initialVideoIds={videoIds ? videoIds.split(",").filter(Boolean) : []} initialWorkspace={workspace} />
    </Suspense>
  );
}
