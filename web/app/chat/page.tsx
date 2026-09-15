import { Suspense } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SearchContent, type ChatThread } from "@/app/search/search-content";
import { getBackendHeaders, getBackendUrl } from "@/lib/backend";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Search", description: "Search selected videos for cited evidence." };

type BackendThread = {
  id: string;
  title: string;
  updated_at: string;
  current_message_id?: string | null;
  pinned?: boolean;
  archived?: boolean;
  read?: boolean;
  messages: ChatThread["turns"];
  sources?: ChatThread["sources"];
};

function toChatThread(thread: BackendThread): ChatThread {
  return {
    id: thread.id,
    title: thread.title === "New thread" ? "New search" : thread.title,
    updatedAt: thread.updated_at,
    messages: thread.messages,
    turns: thread.messages,
    currentMessageId: thread.current_message_id,
    pinned: thread.pinned,
    archived: thread.archived,
    read: thread.read,
    sources: thread.sources || [],
  };
}

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; video_id?: string; video_ids?: string; thread?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  const displayName = session.user.name || session.user.email || "Guest";
  const params = await searchParams;
  const workspace = (await cookies()).get("vivadeo_workspace")?.value || "default-workspace";
  let initialThreads: ChatThread[] = [];
  let onboardingCompleted = false;
  try {
    const [threadsResponse, onboardingResponse, requestedThreadResponse] = await Promise.all([
      fetch(getBackendUrl("/v1/chat/threads"), { headers: getBackendHeaders(undefined, workspace), cache: "no-store" }),
      fetch(getBackendUrl("/v1/chat/onboarding"), { headers: getBackendHeaders(undefined, workspace), cache: "no-store" }),
      params.thread
        ? fetch(getBackendUrl(`/v1/chat/threads/${encodeURIComponent(params.thread)}`), { headers: getBackendHeaders(undefined, workspace), cache: "no-store" })
        : Promise.resolve(null),
    ]);
    if (threadsResponse.ok) {
      const payload = (await threadsResponse.json()) as BackendThread[];
      initialThreads = payload.map(toChatThread);
    }
    if (requestedThreadResponse?.ok) {
      const requestedThread = toChatThread(await requestedThreadResponse.json() as BackendThread);
      const listedThread = initialThreads.find((thread) => thread.id === requestedThread.id);
      const hydratedThread = listedThread && listedThread.turns.length > requestedThread.turns.length
        ? listedThread
        : requestedThread;
      initialThreads = [hydratedThread, ...initialThreads.filter((thread) => thread.id !== requestedThread.id)];
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
        initialWorkspace={workspace}
        initialThreads={initialThreads}
        initialThreadId={params.thread}
        initialOnboardingCompleted={onboardingCompleted}
      />
    </Suspense>
  );
}
