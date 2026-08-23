import { Suspense } from "react";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SearchContent, type ChatThread } from "@/app/search/search-content";
import { getBackendHeaders, getBackendUrl } from "@/lib/backend";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; video_id?: string; video_ids?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const displayName = session?.user?.name || session?.user?.email || "V";
  const params = await searchParams;
  const workspace = (await cookies()).get("vivadeo_workspace")?.value || "default-workspace";
  let initialThreads: ChatThread[] = [];
  try {
    const response = await fetch(getBackendUrl("/v1/chat/threads"), {
      headers: getBackendHeaders(undefined, workspace),
      cache: "no-store",
    });
    if (response.ok) {
      const payload = (await response.json()) as Array<{ id: string; title: string; updated_at: string; messages: ChatThread["turns"] }>;
      initialThreads = payload.map((thread) => ({ id: thread.id, title: thread.title, updatedAt: thread.updated_at, turns: thread.messages }));
    }
  } catch {
    initialThreads = [];
  }

  return (
    <Suspense fallback={null}>
      <SearchContent
        profileInitial={displayName.trim().slice(0, 1).toUpperCase()}
        profileName={displayName}
        initialQuery={params.q || ""}
        initialVideoId={params.video_id || ""}
        initialVideoIds={params.video_ids ? params.video_ids.split(",").filter(Boolean) : []}
        initialThreads={initialThreads}
      />
    </Suspense>
  );
}
