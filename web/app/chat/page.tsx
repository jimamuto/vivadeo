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
  let onboardingCompleted = false;
  try {
    const [threadsResponse, onboardingResponse] = await Promise.all([
      fetch(getBackendUrl("/v1/chat/threads"), { headers: getBackendHeaders(undefined, workspace), cache: "no-store" }),
      fetch(getBackendUrl("/v1/chat/onboarding"), { headers: getBackendHeaders(undefined, workspace), cache: "no-store" }),
    ]);
    if (threadsResponse.ok) {
      const payload = (await threadsResponse.json()) as Array<{ id: string; title: string; updated_at: string; current_message_id?: string | null; messages: ChatThread["turns"]; sources?: ChatThread["sources"] }>;
      initialThreads = payload.map((thread) => ({
        id: thread.id,
        title: thread.title,
        updatedAt: thread.updated_at,
        messages: thread.messages,
        turns: thread.messages,
        currentMessageId: thread.current_message_id,
        sources: thread.sources || [],
      }));
    }
    if (onboardingResponse.ok) onboardingCompleted = Boolean((await onboardingResponse.json()).completed);
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
        initialOnboardingCompleted={onboardingCompleted}
      />
    </Suspense>
  );
}
