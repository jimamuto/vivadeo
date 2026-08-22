import { Suspense } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SearchContent } from "@/app/search/search-content";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; video_id?: string; video_ids?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const displayName = session?.user?.name || session?.user?.email || "V";
  const params = await searchParams;

  return (
    <Suspense fallback={null}>
      <SearchContent
        profileInitial={displayName.trim().slice(0, 1).toUpperCase()}
        initialQuery={params.q || ""}
        initialVideoId={params.video_id || ""}
        initialVideoIds={params.video_ids ? params.video_ids.split(",").filter(Boolean) : []}
      />
    </Suspense>
  );
}
