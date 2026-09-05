"use client";

import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DashboardShell } from "@/app/dashboard/dashboard-shell";
import { appendActivity } from "@/lib/activity-log";

const RECENT_SEARCHES_KEY = "vivadeo.recent-searches";
const CHAT_ONBOARDING_KEY = "vivadeo.chat-onboarding-seen";
const DEFAULT_CHAT_PROMPT = "What did the speaker say about the launch timeline?";
const GREETINGS = ["Good to see you", "Ready when you are", "Let’s find something", "Back to the archive"];
const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function TypedGreeting({ text }: { text: string }) {
  const [visible, setVisible] = useState("");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(text);
      return;
    }
    setVisible("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setVisible(text.slice(0, index));
      if (index >= text.length) window.clearInterval(timer);
    }, 55);
    return () => window.clearInterval(timer);
  }, [text]);

  return <span className="chat-greeting-typed" aria-label={text}><span aria-hidden="true">{visible}</span></span>;
}

type ComposerSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

function ComposerSelect({
  label,
  value,
  options,
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  options: ComposerSelectOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div className="chat-inline-select" ref={rootRef} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
      <button
        type="button"
        className="chat-inline-select-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open ? (
        <div className="chat-inline-select-menu" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={option.value === value ? "is-selected" : ""}
              disabled={option.disabled}
              onClick={() => { onChange(option.value); setOpen(false); }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function readCachedPoster(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeCachedPoster(key: string, url: string) {
  try {
    window.sessionStorage.setItem(key, url);
  } catch {
    // Storage may be unavailable in private browsing or locked-down embeds.
  }
}

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type MessageAttachment = {
  video_id: string;
  filename: string;
  status: string;
  duration: number | null;
  created_at: string;
};

type Citation = {
  segment_id?: string | null;
  video_id: string;
  filename: string;
  source_uri: string;
  start_time: number;
  end_time: number;
  text: string;
  similarity_score: number | null;
  visual_verified?: boolean;
  verification_status?: "verified" | "possible" | "rejected";
  modality?: "visual" | "transcript" | "hybrid";
  confidence?: number;
  match_reason?: string;
};

type ExtractionRow = {
  item: string;
  source: string;
  video_id: string;
  start_time: number;
  end_time: number;
  confidence: number;
  verification_status: "verified" | "possible";
  evidence_key: string;
};

type ComparisonClaim = {
  claim: string;
  confidence: number;
  left_citations: Citation[];
  right_citations: Citation[];
};

type SavedSearch = {
  id: string;
  name: string;
  query: string;
  modality: string;
  search_mode: string;
  output_format: string;
  extraction_type?: string | null;
  video_ids: string[];
  archived: boolean;
  last_run_id?: string | null;
  created_at: string;
  updated_at: string;
};

type ChatTurn = ChatMessage & {
  id?: string;
  parentId?: string | null;
  status?: string;
  error?: string | null;
  search_run_id?: string | null;
  intent?: { modality?: string; search_mode?: string; confidence?: number };
  verification_summary?: { verified?: number; possible?: number; rejected?: number; modality?: string };
  suggested_refinements?: string[];
  rows?: ExtractionRow[];
  comparison?: ComparisonClaim[];
  output_format?: string;
  attachments?: MessageAttachment[];
  citations?: Citation[];
};

export type ThreadSource = {
  video_id: string;
  filename: string;
  status: string;
  transcript_status: string;
  visual_status: string;
  duration: number | null;
  url: string | null;
  created_at: string;
};

export type ChatThread = {
  id: string;
  title: string;
  turns: ChatTurn[];
  messages: ChatTurn[];
  currentMessageId?: string | null;
  pinned?: boolean;
  archived?: boolean;
  read?: boolean;
  updatedAt: string;
  sources: ThreadSource[];
};


type VideoOption = {
  id: string;
  filename: string;
  status: string;
  duration?: number | null;
  url?: string | null;
};

type UploadItem = {
  id: string;
  filename: string;
  jobId?: string;
  videoId?: string;
  status: string;
  progress: number;
  message?: string | null;
  error?: string | null;
};

type MomentContext = {
  videoId: string;
  filename: string;
  startTime: number;
  endTime: number;
};

const starterPaths = {
  moment: "M12 3a9 9 0 1 0 9 9 M12 7v5l3 2",
  summarize: "M4 5h16v14H4z M7 9h10 M7 12h7 M7 15h5",
  transcripts: "M6 4h12v16H6z M9 8h6 M9 12h6 M9 16h4",
  compare: "M4 6h7v12H4z M13 6h7v12h-7z M7 10h1 M16 10h1",
} as const;

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function CitationPreview({
  citation,
  sourceUrl,
  previewStart,
  previewEnd,
  preload,
  onPlay,
}: {
  citation: Citation;
  sourceUrl: string | null | undefined;
  previewStart: number;
  previewEnd: number;
  preload: boolean;
  onPlay: () => void;
}) {
  const posterCacheKey = `vivadeo.citation-poster:${citation.video_id}:${citation.start_time.toFixed(3)}`;
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [posterStatus, setPosterStatus] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");
  const previewRef = useRef<HTMLDivElement>(null);

  useClientLayoutEffect(() => {
    const cached = readCachedPoster(posterCacheKey);
    if (cached) {
      setPosterUrl(cached);
      setPosterStatus("ready");
    }
  }, [posterCacheKey]);

  useEffect(() => {
    let cancelled = false;
    let requested = false;

    const loadPoster = async () => {
      if (requested || cancelled) return;
      requested = true;
      const cached = readCachedPoster(posterCacheKey);
      if (cached) {
        setPosterUrl(cached);
        setPosterStatus("ready");
        return;
      }
      setPosterStatus("loading");
      try {
        const response = await fetch(`/api/proxy/v1/videos/${citation.video_id}/frames`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timestamp: citation.start_time }),
        });
        if (!response.ok) throw new Error("Poster request failed");
        let frame = await response.json() as { id: string; status: string; url?: string | null };
        for (let attempt = 0; attempt < 30 && frame.status === "queued" && !cancelled; attempt += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 1000));
          const refreshed = await fetch(`/api/proxy/v1/videos/${citation.video_id}/frames/${frame.id}`, { cache: "no-store" });
          if (!refreshed.ok) break;
          frame = await refreshed.json() as { id: string; status: string; url?: string | null };
        }
        if (!cancelled && frame.status === "ready" && frame.url) {
          writeCachedPoster(posterCacheKey, frame.url);
          setPosterUrl(frame.url);
          setPosterStatus("ready");
        } else if (!cancelled) {
          setPosterStatus("unavailable");
        }
      } catch {
        if (!cancelled) setPosterStatus("unavailable");
      }
    };

    if (preload || typeof IntersectionObserver === "undefined") {
      void loadPoster();
      return () => { cancelled = true; };
    }

    const node = previewRef.current;
    if (!node) return () => { cancelled = true; };
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        void loadPoster();
      }
    }, { rootMargin: "200px" });
    observer.observe(node);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [citation.video_id, citation.start_time, posterCacheKey, preload]);

  const showSkeleton = !posterUrl && posterStatus !== "unavailable";

  return (
    <div ref={previewRef} className={`search-citation-preview${showSkeleton ? " is-loading" : ""}`}>
      {sourceUrl && !showSkeleton ? (
        <video
          playsInline
          preload="metadata"
          poster={posterUrl || undefined}
          tabIndex={0}
          aria-label={`Play ${citation.filename} from ${fmt(citation.start_time)} to ${fmt(citation.end_time)}`}
          src={`${sourceUrl}#t=${previewStart},${previewEnd}`}
          onLoadedMetadata={(event) => { event.currentTarget.currentTime = citation.start_time; }}
          onPlay={onPlay}
          onClick={(event) => { if (event.currentTarget.paused) void event.currentTarget.play().catch(() => undefined); else event.currentTarget.pause(); }}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (event.currentTarget.paused) void event.currentTarget.play().catch(() => undefined); else event.currentTarget.pause(); } }}
          onTimeUpdate={(event) => { if (event.currentTarget.currentTime >= previewEnd) { event.currentTarget.pause(); event.currentTarget.currentTime = citation.start_time; } }}
        />
      ) : posterUrl ? (
        <img className="search-citation-poster" src={posterUrl} alt="" decoding="async" onError={() => { setPosterUrl(null); setPosterStatus("unavailable"); }} />
      ) : showSkeleton ? (
        <span className="search-citation-skeleton" aria-hidden="true" />
      ) : (
        <span className="search-citation-preview-empty">Preview unavailable</span>
      )}
      {sourceUrl && !showSkeleton ? <span className="search-citation-play" aria-hidden="true">▶</span> : null}
      <span className="search-citation-time">{fmt(citation.start_time)}–{fmt(citation.end_time)}</span>
    </div>
  );
}

function threadDateGroup(value: string, hydrated: boolean) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Earlier";
  if (!hydrated) {
    return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }).format(date);
  }
  const now = new Date();
  const startOfDay = (input: Date) => new Date(input.getFullYear(), input.getMonth(), input.getDate()).getTime();
  const days = Math.floor((startOfDay(now) - startOfDay(date)) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "Previous 7 days";
  if (date.getFullYear() === now.getFullYear()) return date.toLocaleDateString(undefined, { month: "long" });
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function activeBranch(messages: ChatTurn[], currentMessageId?: string | null) {
  if (!messages.length || !currentMessageId) return messages;
  const byId = new Map(messages.filter((message) => message.id).map((message) => [message.id, message]));
  const branch: ChatTurn[] = [];
  const seen = new Set<string>();
  let currentId: string | undefined = currentMessageId;
  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    const message = byId.get(currentId);
    if (!message) break;
    branch.push(message);
    currentId = message.parentId || undefined;
  }
  return branch.length ? branch.reverse() : messages;
}

function normalizeThread(payload: { id: string; title: string; updated_at: string; current_message_id?: string | null; pinned?: boolean; archived?: boolean; read?: boolean; messages: Array<ChatTurn & { parent_id?: string | null }>; sources?: ThreadSource[] }): ChatThread {
  const messages = payload.messages.map((message) => ({ ...message, parentId: message.parent_id ?? message.parentId }));
  const currentMessageId = payload.current_message_id ?? messages.at(-1)?.id ?? null;
  return {
    id: payload.id,
    title: payload.title === "New thread" ? "New chat" : payload.title,
    updatedAt: payload.updated_at,
    messages,
    turns: activeBranch(messages, currentMessageId),
    currentMessageId,
    pinned: payload.pinned || false,
    archived: payload.archived || false,
    read: payload.read ?? true,
    sources: payload.sources || [],
  };
}

export function SearchContent({
  profileInitial,
  profileName,
  initialQuery = "",
  initialVideoId = "",
  initialVideoIds = [],
  initialWorkspace = "default-workspace",
  initialThreads = [],
  initialOnboardingCompleted = false,
}: {
  initialThreads?: ChatThread[];
  initialOnboardingCompleted?: boolean;
  profileInitial: string;
  profileName?: string;
  initialQuery?: string;
  initialVideoId?: string;
  initialVideoIds?: string[];
  initialWorkspace?: string;
}) {
  const [activeWorkspace, setActiveWorkspace] = useState(initialWorkspace);
  const [workspacePlan, setWorkspacePlan] = useState("starter");
  const [question, setQuestion] = useState(initialQuery);
  const [videoId, setVideoId] = useState(initialVideoId);
  const [videoIds, setVideoIds] = useState(initialVideoIds);
  const [chatModel, setChatModel] = useState("vivadeo-auto");
  const [modalityOverride, setModalityOverride] = useState<"auto" | "visual" | "transcript" | "hybrid">("auto");
  const [searchMode, setSearchMode] = useState<"top" | "all" | "focused">("top");
  const [outputFormat, setOutputFormat] = useState<"answer" | "rows" | "comparison">("answer");
  const [extractionType, setExtractionType] = useState("claims");
  const [comparisonVideoIds, setComparisonVideoIds] = useState<string[]>(initialVideoIds);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [parentSearchRunId, setParentSearchRunId] = useState<string | null>(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [customModelView, setCustomModelView] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [customApiKey, setCustomApiKey] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [videos, setVideos] = useState<VideoOption[]>([]);
  const [videosLoaded, setVideosLoaded] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState(initialOnboardingCompleted);
  const [hydrated, setHydrated] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>(initialThreads[0]?.turns || []);
  const [threads, setThreads] = useState<ChatThread[]>(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState(initialThreads[0]?.id || "");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [chatProgress, setChatProgress] = useState(0);
  const [streamedAnswer, setStreamedAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [activeChatJobId, setActiveChatJobId] = useState<string | null>(null);
  const [threadMenuId, setThreadMenuId] = useState<string | null>(null);
  const [renamingThreadId, setRenamingThreadId] = useState<string | null>(null);
  const [renamingTitle, setRenamingTitle] = useState("");
  const [threadSearch, setThreadSearch] = useState("");
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [momentContext, setMomentContext] = useState<MomentContext | null>(null);
  const [citationFeedback, setCitationFeedback] = useState<Record<string, string>>({});
  const [savedSearchName, setSavedSearchName] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState("");
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadTransfersRef = useRef<Promise<void>>(Promise.resolve());
  const questionInputRef = useRef<HTMLTextAreaElement>(null);
  const chatFeedRef = useRef<HTMLElement>(null);
  const creatingThreadRef = useRef<Promise<string | null> | null>(null);
  const initialQuerySubmitted = useRef(false);

  useClientLayoutEffect(() => {
    const feed = chatFeedRef.current;
    if (feed) feed.scrollTop = feed.scrollHeight;
  }, [turns, loading, streamedAnswer]);

  useEffect(() => {
    if (!threadMenuId) return;
    const closeMenu = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest(".chat-thread-menu, .chat-thread-more")) return;
      setThreadMenuId(null);
    };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [threadMenuId]);

  useEffect(() => {
    void fetch("/api/proxy/v1/workspaces", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json() as Array<{ id: string; slug: string; plan: string }>;
        const workspace = payload.find((item) => item.id === activeWorkspace || item.slug === activeWorkspace);
        setWorkspacePlan(workspace?.plan || "starter");
      })
      .catch(() => setWorkspacePlan("starter"));
  }, [activeWorkspace]);

  useEffect(() => {
    void fetch("/api/proxy/v1/settings/llm", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json() as { provider?: string; base_url?: string; model?: string };
        if (payload.provider) setChatModel(payload.provider === "vivadeo-auto" && ["pro", "enterprise"].includes(workspacePlan) ? "vivadeo-pro" : payload.provider);
        if (payload.base_url) setCustomBaseUrl(payload.base_url);
        if (payload.model) setCustomModel(payload.model);
      })
      .catch(() => undefined);
  }, [workspacePlan]);

  useEffect(() => {
    void fetch("/api/proxy/v1/search/saved", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        setSavedSearches(await response.json() as SavedSearch[]);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void fetch("/api/proxy/v1/videos", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as VideoOption[];
        setVideos(payload.filter((video) => video.status !== "archived"));
      })
      .catch(() => undefined)
      .finally(() => setVideosLoaded(true));
  }, []);

  useEffect(() => {
    if (window.localStorage.getItem(CHAT_ONBOARDING_KEY) === "true") setOnboardingSeen(true);
    setHydrated(true);
  }, []);

  useEffect(() => {
    window.localStorage.removeItem("vivadeo.chat-threads");
    void fetch("/api/proxy/v1/chat/threads", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load chats");
        const payload = (await response.json()) as Array<Parameters<typeof normalizeThread>[0]>;
        const loadedThreads = payload.map(normalizeThread).filter((thread) => thread.turns.length > 0);
        if (loadedThreads.length) {
          setThreads(loadedThreads);
          const selectedId = loadedThreads.some((thread) => thread.id === activeThreadId) ? activeThreadId : loadedThreads[0].id;
          setActiveThreadId(selectedId);
          setTurns(loadedThreads.find((thread) => thread.id === selectedId)?.turns || []);
          return;
        }
        if (threads.length) return;
        setActiveThreadId("");
        setTurns([]);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
  }, [recentSearches]);

  useEffect(() => {
    if (!initialQuery.trim() || initialQuerySubmitted.current) return;
    initialQuerySubmitted.current = true;
    window.setTimeout(() => document.querySelector<HTMLFormElement>(".chat-composer")?.requestSubmit(), 0);
  }, [initialQuery, activeThreadId]);

  function recordRecentSearch(value: string) {
    const next = value.trim();
    if (!next) return;
    setRecentSearches((current) => [next, ...current.filter((item) => item !== next)].slice(0, 6));
  }

  async function ensureActiveThread() {
    if (activeThreadId) return activeThreadId;
    if (creatingThreadRef.current) return creatingThreadRef.current;
    const creation = fetch("/api/proxy/v1/chat/threads", { method: "POST" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not create a chat");
        const thread = (await response.json()) as Parameters<typeof normalizeThread>[0];
        const nextThread = normalizeThread(thread);
        setThreads((current) => current.some((item) => item.id === nextThread.id) ? current : [nextThread, ...current]);
        setActiveThreadId(nextThread.id);
        setTurns(nextThread.turns);
        return nextThread.id;
      })
      .catch((cause) => {
        setStatus(cause instanceof Error ? cause.message : "Could not create a chat");
        return null;
      })
      .finally(() => { creatingThreadRef.current = null; });
    creatingThreadRef.current = creation;
    return creation;
  }

  async function refreshThreadSources(threadId: string) {
    const [sourcesResponse, videosResponse] = await Promise.all([
      fetch(`/api/proxy/v1/chat/threads/${threadId}/sources`, { cache: "no-store" }),
      fetch("/api/proxy/v1/videos", { cache: "no-store" }),
    ]);
    if (!sourcesResponse.ok) return;
    const sources = (await sourcesResponse.json()) as ThreadSource[];
    setThreads((current) => current.map((thread) => thread.id === threadId ? { ...thread, sources } : thread));
    if (videosResponse.ok) {
      const payload = (await videosResponse.json()) as VideoOption[];
      setVideos(payload.filter((video) => video.status !== "archived"));
    }
    return sources;
  }

  async function refreshThread(threadId: string) {
    const response = await fetch(`/api/proxy/v1/chat/threads/${threadId}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not refresh chat");
    const thread = normalizeThread(await response.json() as Parameters<typeof normalizeThread>[0]);
    setThreads((current) => current.map((item) => item.id === thread.id ? thread : item));
    if (thread.id === activeThreadId) setTurns(thread.turns);
    return thread;
  }

  function watchChatJob(jobId: string) {
    return new Promise<{ status: string; message?: string | null; error?: string | null }>((resolve) => {
      let polling = false;
      let settled = false;
      const stream = new EventSource(`/api/chat-events/${jobId}`);
      const finish = (payload: { status: string; message?: string | null; error?: string | null }) => {
        if (settled) return;
        settled = true;
        stream.close();
        resolve(payload);
      };
      const poll = async () => {
        if (settled) return;
        try {
          const response = await fetch(`/api/proxy/v1/jobs/${jobId}`, { cache: "no-store" });
          if (response.ok) {
            const payload = await response.json() as { status: string; progress?: number; message?: string | null; error?: string | null; content?: string | null };
            setChatProgress(payload.progress ?? 0);
            setStatus(payload.message || "Preparing answer...");
            if (payload.content != null) setStreamedAnswer(payload.content);
            if (["succeeded", "failed", "canceled"].includes(payload.status)) return finish(payload);
          }
        } catch { /* retry while the job continues */ }
        window.setTimeout(() => void poll(), 1500);
      };
      const recover = () => {
        if (polling || settled) return;
        polling = true;
        void poll();
      };
      stream.addEventListener("job", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data) as { status: string; progress?: number; message?: string | null; error?: string | null; content?: string | null };
          setChatProgress(payload.progress ?? 0);
          setStatus(payload.message || "Preparing answer...");
          if (payload.content != null) setStreamedAnswer(payload.content);
          if (["succeeded", "failed", "canceled"].includes(payload.status)) finish(payload);
        } catch { recover(); }
      });
      stream.onerror = recover;
    });
  }

  function waitForJob(jobId: string) {
    return new Promise<{ status: string }>((resolve) => {
      let polling = false;
      let settled = false;
      const stream = new EventSource(`/api/job-events/${jobId}`);
      const finish = (payload: { status: string }) => {
        if (settled) return;
        settled = true;
        stream.close();
        resolve(payload);
      };
      const poll = async () => {
        if (settled) return;
        try {
          const response = await fetch(`/api/proxy/v1/jobs/${jobId}`, { cache: "no-store" });
          if (response.ok) {
            const payload = await response.json() as { status: string };
            if (["succeeded", "failed", "canceled"].includes(payload.status)) return finish(payload);
          }
        } catch { /* retry while the job continues */ }
        window.setTimeout(() => void poll(), 1500);
      };
      const recover = () => {
        if (polling || settled) return;
        polling = true;
        void poll();
      };
      stream.addEventListener("job", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data) as { status: string };
          if (["succeeded", "failed", "canceled"].includes(payload.status)) finish(payload);
        } catch { recover(); }
      });
      stream.onerror = recover;
    });
  }

  function watchUploadJob(itemId: string, jobId: string) {
    return new Promise<string>((resolve) => {
      let polling = false;
      let settled = false;
      const stream = new EventSource(`/api/job-events/${jobId}`);
      const apply = (payload: { status: string; progress?: number; message?: string | null; error?: string | null }) => {
        setUploadItems((current) => current.map((item) => item.id === itemId ? { ...item, status: payload.status, progress: ["succeeded", "ready"].includes(payload.status) ? 1 : payload.progress ?? item.progress, message: payload.message, error: payload.error } : item));
        if (["succeeded", "failed", "canceled"].includes(payload.status)) {
          settled = true;
          stream.close();
          resolve(payload.status);
        }
      };
      const poll = async () => {
        if (settled) return;
        try {
          const response = await fetch(`/api/proxy/v1/jobs/${jobId}`, { cache: "no-store" });
          if (response.ok) apply(await response.json() as { status: string; progress?: number; message?: string | null; error?: string | null });
        } catch { /* retry while the job continues */ }
        if (!settled) window.setTimeout(() => void poll(), 1500);
      };
      const recover = () => {
        if (polling || settled) return;
        polling = true;
        setUploadItems((current) => current.map((item) => item.id === itemId ? { ...item, message: "Checking progress…" } : item));
        void poll();
      };
      stream.addEventListener("job", (event) => {
        try {
          apply(JSON.parse((event as MessageEvent).data) as { status: string; progress?: number; message?: string | null; error?: string | null });
        } catch { recover(); }
      });
      stream.onerror = recover;
    });
  }

  async function ingestVideoUrl(rawUrl: string): Promise<string | null> {
    const threadId = await ensureActiveThread();
    if (!threadId) return null;
    const url = rawUrl.trim();
    if (!/^https?:\/\//i.test(url)) return null;
    const itemId = `${Date.now()}-url`;
    setUploadItems((current) => [...current, { id: itemId, filename: url, status: "uploading", progress: 0 }]);
    try {
      const response = await fetch("/api/proxy/v1/videos/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, max_height: 480, transcribe: true, thread_id: threadId }),
      });
      if (!response.ok) throw new Error(`URL ingest failed (${response.status})`);
      const job = (await response.json()) as { id: string; video_id?: string };
      setUploadItems((current) => current.map((item) => item.id === itemId ? { ...item, jobId: job.id, videoId: job.video_id, status: "queued" } : item));
      await refreshThreadSources(threadId);
      void watchUploadJob(itemId, job.id).then(() => refreshThreadSources(threadId));
      return job.video_id || null;
    } catch (cause) {
      setUploadItems((current) => current.map((item) => item.id === itemId ? { ...item, status: "failed", error: cause instanceof Error ? cause.message : "URL ingest failed" } : item));
      return null;
    } finally {
      setActiveChatJobId(null);
    }
  }

  async function attachExistingVideo(videoIdToAttach: string) {
    const threadId = await ensureActiveThread();
    if (!threadId) return;
    const response = await fetch(`/api/proxy/v1/chat/threads/${threadId}/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_ids: [videoIdToAttach] }),
    });
    if (!response.ok) {
      setStatus("Could not attach that video to this chat.");
      return;
    }
    await refreshThreadSources(threadId);
    setBrowseOpen(false);
    setStatus("Video added to this chat.");
  }

  function uploadVideos(files: FileList | File[]) {
    const selected = Array.from(files);
    uploadTransfersRef.current = uploadTransfersRef.current.then(() => transferVideos(selected));
    return uploadTransfersRef.current;
  }

  async function transferVideos(files: File[]) {
    const threadId = await ensureActiveThread();
    if (!threadId) return;
    const selected = Array.from(files);
    for (const file of selected) {
      const itemId = `${Date.now()}-${file.name}`;
      if (!file.type.startsWith("video/")) {
        setUploadItems((current) => [...current, { id: itemId, filename: file.name, status: "rejected", progress: 0, error: "Choose a video file." }]);
        continue;
      }
      if (file.size > 512 * 1024 * 1024) {
        setUploadItems((current) => [...current, { id: itemId, filename: file.name, status: "rejected", progress: 0, error: "Videos must be 512 MB or smaller." }]);
        continue;
      }
      setUploadItems((current) => [...current, { id: itemId, filename: file.name, status: "uploading", progress: 0 }]);
      const form = new FormData();
      form.append("file", file);
      form.append("transcribe", "true");
      form.append("thread_id", threadId);
      try {
        const job = await new Promise<{ id: string; video_id?: string }>((resolve, reject) => {
          const request = new XMLHttpRequest();
          request.open("POST", "/api/proxy/v1/videos/upload");
          request.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            setUploadItems((current) => current.map((item) => item.id === itemId ? { ...item, progress: event.loaded / event.total } : item));
          };
          request.onload = () => {
            if (request.status < 200 || request.status >= 300) {
              reject(new Error(`Upload failed (${request.status})`));
              return;
            }
            try {
              resolve(JSON.parse(request.responseText) as { id: string; video_id?: string });
            } catch {
              reject(new Error("Upload returned an invalid response."));
            }
          };
          request.onerror = () => reject(new Error("Upload failed. Check the connection and try again."));
          request.onabort = () => reject(new Error("Upload canceled."));
          request.send(form);
        });
        setUploadItems((current) => current.map((item) => item.id === itemId ? { ...item, jobId: job.id, videoId: job.video_id, status: "queued" } : item));
        await refreshThreadSources(threadId);
        void watchUploadJob(itemId, job.id).then(() => refreshThreadSources(threadId));
        setVideosLoaded(true);
      } catch (cause) {
        setUploadItems((current) => current.map((item) => item.id === itemId ? { ...item, status: "failed", error: cause instanceof Error ? cause.message : "Upload failed" } : item));
      }
    }
  }

  function evidenceKey(citation: Citation) {
    return `${citation.video_id}:${citation.start_time.toFixed(3)}`;
  }

  async function sendCitationFeedback(turn: ChatTurn, citation: Citation, feedback: string) {
    if (!turn.search_run_id) {
      setStatus("This older answer cannot receive evidence feedback.");
      return;
    }
    const response = await fetch(`/api/proxy/v1/search/runs/${turn.search_run_id}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_id: citation.video_id,
        start_time: citation.start_time,
        end_time: citation.end_time,
        feedback,
      }),
    });
    if (!response.ok) {
      setStatus("Could not save that evidence feedback.");
      return;
    }
    setCitationFeedback((current) => ({ ...current, [evidenceKey(citation)]: feedback }));
    setStatus(feedback === "relevant" ? "Marked as relevant." : "Marked as not relevant. Refine the question to search again.");
  }

  async function saveCurrentSearch(turn: ChatTurn) {
    const name = window.prompt("Name this saved search", turns.find((item) => item.role === "user" && item.id && item.id === turn.parentId)?.content.slice(0, 80) || "Verified video search");
    if (!name?.trim()) return;
    const response = await fetch("/api/proxy/v1/search/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        query: turns.find((item) => item.id === turn.parentId)?.content || question,
        modality: turn.intent?.modality || "auto",
        search_mode: turn.intent?.search_mode || "top",
        output_format: turn.output_format || "answer",
        video_ids: threadSources.map((source) => source.video_id),
      }),
    });
    if (!response.ok) {
      setStatus("Could not save that search.");
      return;
    }
    const saved = await response.json() as SavedSearch;
    setSavedSearches((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    setStatus("Saved search added.");
  }

  function useSavedSearch(saved: SavedSearch) {
    setQuestion(saved.query);
    setModalityOverride(saved.modality as typeof modalityOverride);
    setSearchMode(saved.search_mode as typeof searchMode);
    setOutputFormat(saved.output_format as typeof outputFormat);
    if (saved.extraction_type) setExtractionType(saved.extraction_type);
    setVideoIds(saved.video_ids);
    setComparisonVideoIds(saved.video_ids);
    setStatus("Saved search loaded. Ask to run it.");
  }

  function editPrompt(message: ChatTurn) {
    if (!message.id || loading) return;
    setEditingMessageId(message.id);
    setEditingPrompt(message.content);
  }

  async function copyPrompt(content: string) {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      setStatus("Could not copy this prompt.");
    }
  }

  function focusMoment(citation: Citation, prompt = "What is happening in this moment?", runId?: string | null) {
    setMomentContext({ videoId: citation.video_id, filename: citation.filename, startTime: citation.start_time, endTime: citation.end_time });
    setParentSearchRunId(runId || null);
    setSearchMode("focused");
    setQuestion(prompt);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuestion = question.trim() || (!turns.length ? DEFAULT_CHAT_PROMPT : "");
    await sendPrompt(nextQuestion);
  }

  async function submitEditedPrompt(event: FormEvent<HTMLFormElement>, messageId: string) {
    event.preventDefault();
    await sendPrompt(editingPrompt.trim(), messageId);
  }

  async function sendPrompt(nextQuestion: string, editMessageId: string | null = null) {
    if (!nextQuestion || loading) return;
    const threadId = await ensureActiveThread();
    if (!threadId) return;

    const userTurn: ChatTurn = { role: "user", content: nextQuestion, status: "completed" };
    const editIndex = editMessageId ? turns.findIndex((turn) => turn.id === editMessageId) : -1;
    const nextTurns: ChatTurn[] = [...(editIndex >= 0 ? turns.slice(0, editIndex) : turns), userTurn];
    setTurns(nextTurns);
    setThreads((current) => current.map((thread) => thread.id === threadId ? { ...thread, turns: nextTurns, messages: [...thread.messages, userTurn], updatedAt: new Date().toISOString() } : thread));
    setOnboardingSeen(true);
    window.localStorage.setItem(CHAT_ONBOARDING_KEY, "true");
    void fetch("/api/proxy/v1/chat/onboarding/complete", { method: "POST" });
    if (!editMessageId) setQuestion("");
    setEditingMessageId(null);
    setEditingPrompt("");
    const requestStartedAt = Date.now();
    setLoading(true);
    setStreamedAnswer("");
    setStatus("Preparing a reply...");
    setChatProgress(0);

    try {
      // Wait for transfer/attachment registration, never for full indexing.
      await uploadTransfersRef.current;
      const linkedUrl = nextQuestion.match(/https?:\/\/[^\s<>()]+/i)?.[0].replace(/[),.!?]+$/, "") || null;
      if (linkedUrl) setStatus("Preparing the linked video…");
      const linkedVideoId = linkedUrl ? await ingestVideoUrl(linkedUrl) : null;
      if (linkedUrl && !linkedVideoId) throw new Error("Vivadeo could not prepare the linked video.");
      const currentSources = await refreshThreadSources(threadId);
      if (!currentSources) throw new Error("Could not check the attached videos. Please try again.");
      setStatus("Preparing a reply...");
      const response = await fetch(`/api/proxy/v1/chat/threads/${threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: nextQuestion,
          edit_message_id: editMessageId,
          results: 6,
          provider: chatModel === "vivadeo-pro" ? "vivadeo-pro" : chatModel,
          modality: modalityOverride,
          search_mode: momentContext ? "focused" : searchMode,
          output_format: outputFormat,
          extraction_type: outputFormat === "rows" ? extractionType : null,
          comparison_video_ids: outputFormat === "comparison" ? (comparisonVideoIds.length ? comparisonVideoIds : currentSources.map((source) => source.video_id)) : [],
          parent_search_run_id: parentSearchRunId,
          focus_window_seconds: momentContext ? Math.max(8, momentContext.endTime - momentContext.startTime) : null,
          custom_base_url: chatModel === "custom" ? customBaseUrl || null : null,
          custom_api_key: chatModel === "custom" ? customApiKey || null : null,
          custom_model: chatModel === "custom" ? customModel || null : null,
          video_id: videoId || null,
          video_ids: Array.from(new Set([...videoIds, ...currentSources.map((source) => source.video_id), ...(linkedVideoId ? [linkedVideoId] : [])])),
          focus_video_id: momentContext?.videoId || null,
          focus_start_time: momentContext?.startTime ?? null,
          focus_end_time: momentContext?.endTime ?? null,
        }),
      });
      if (!response.ok) {
        setStatus(`Chat failed (${response.status})`);
        return;
      }
      const job = (await response.json()) as { id: string };
      setActiveChatJobId(job.id);
      const outcome = await watchChatJob(job.id);
      const refreshed = await refreshThread(threadId);
      if (outcome.status !== "succeeded") throw new Error(outcome.error || `Chat ${outcome.status}`);
      const assistantTurn = refreshed.turns.at(-1);
      const citations = assistantTurn?.citations || [];
      const seconds = Math.max(1, Math.round((Date.now() - requestStartedAt) / 1000));
      recordRecentSearch(nextQuestion);
      appendActivity(activeWorkspace, "search.performed", nextQuestion);
      setMomentContext(null);
      setParentSearchRunId(null);
      setSearchMode("top");
      setOutputFormat("answer");
      setStatus(citations.length ? `Answer ready in ${seconds}s with ${citations.length} cited evidence range(s).` : `Answer ready in ${seconds}s. No cited evidence yet.`);
    } catch (cause) {
      if (editMessageId) await refreshThread(threadId);
      setStatus(cause instanceof Error ? cause.message : "Chat failed");
    } finally {
      setLoading(false);
      setActiveChatJobId(null);
      setChatProgress(0);
    }
  }

  async function cancelChatGeneration() {
    if (!activeChatJobId) return;
    const response = await fetch(`/api/proxy/v1/jobs/${activeChatJobId}/cancel`, { method: "POST" });
    if (response.ok) setStatus("Stopping current task...");
  }

  async function regenerateMessage(message: ChatTurn) {
    if (!activeThreadId || !message.id || message.role !== "assistant" || regeneratingId) return;
    setRegeneratingId(message.id);
    setLoading(true);
    setStatus(message.status === "failed" ? "Retrying the answer..." : "Regenerating the answer...");
    try {
      const response = await fetch(`/api/proxy/v1/chat/threads/${activeThreadId}/messages/${message.id}/${message.status === "failed" ? "retry" : "regenerate"}`, { method: "POST" });
      if (!response.ok) throw new Error(`Could not regenerate answer (${response.status})`);
      const thread = normalizeThread(await response.json() as Parameters<typeof normalizeThread>[0]);
      setThreads((current) => current.map((item) => item.id === thread.id ? thread : item));
      setTurns(thread.turns);
      setStatus("Answer regenerated. Choose another branch from the response controls when available.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Could not regenerate answer");
    } finally {
      setLoading(false);
      setRegeneratingId(null);
    }
  }

  async function selectMessageBranch(messageId: string) {
    if (!activeThreadId) return;
    const response = await fetch(`/api/proxy/v1/chat/threads/${activeThreadId}/messages/${messageId}/select`, { method: "POST" });
    if (!response.ok) return;
    const thread = normalizeThread(await response.json() as Parameters<typeof normalizeThread>[0]);
    setThreads((current) => current.map((item) => item.id === thread.id ? thread : item));
    setTurns(thread.turns);
    setStatus("Conversation branch selected.");
  }

  function startNewThread() {
    setActiveThreadId("");
    setTurns([]);
    setQuestion("");
    setStatus(null);
    setMomentContext(null);
  }

  function openThread(thread: ChatThread) {
    if (thread.read === false) {
      void fetch(`/api/proxy/v1/chat/threads/${thread.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ read: true }) });
      setThreads((current) => current.map((item) => item.id === thread.id ? { ...item, read: true } : item));
    }
    setActiveThreadId(thread.id);
    setTurns(thread.turns);
    setQuestion("");
    setStatus(null);
    setMomentContext(null);
    setThreadMenuId(null);
  }

  function beginRenameThread(thread: ChatThread) {
    setRenamingThreadId(thread.id);
    setRenamingTitle(thread.title);
    setThreadMenuId(null);
  }

  async function saveThreadRename(thread: ChatThread) {
    const title = renamingTitle.trim();
    if (!title) return;
    const response = await fetch(`/api/proxy/v1/chat/threads/${thread.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) {
      setStatus("Could not rename this chat.");
      return;
    }
    setThreads((current) => current.map((item) => item.id === thread.id ? { ...item, title } : item));
    setRenamingThreadId(null);
    setRenamingTitle("");
  }

  async function updateThreadMetadata(thread: ChatThread, patch: { pinned?: boolean; archived?: boolean; read?: boolean }) {
    const response = await fetch(`/api/proxy/v1/chat/threads/${thread.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) return;
    const updated = normalizeThread(await response.json() as Parameters<typeof normalizeThread>[0]);
    setThreads((current) => current.map((item) => item.id === updated.id ? updated : item));
    if (updated.id === activeThreadId) setTurns(updated.turns);
    setThreadMenuId(null);
    if (updated.archived && updated.id === activeThreadId) {
      const next = threads.find((item) => item.id !== updated.id && !item.archived);
      if (next) openThread(next);
      else startNewThread();
    }
  }

  async function deleteThread(thread: ChatThread) {
    const response = await fetch(`/api/proxy/v1/chat/threads/${thread.id}`, { method: "DELETE" });
    if (!response.ok) return;
    const remaining = threads.filter((item) => item.id !== thread.id);
    setThreads(remaining);
    if (thread.id === activeThreadId) {
      if (remaining[0]) openThread(remaining[0]);
      else startNewThread();
    }
    setThreadMenuId(null);
  }

  const firstName = (profileName || "there").split(/[ @]/)[0];
  const greetingSeed = Array.from(profileName || "there").reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const greeting = GREETINGS[greetingSeed % GREETINGS.length];
  const activeThread = threads.find((thread) => thread.id === activeThreadId);
  const visibleThreads = threads.filter((thread) => !thread.archived && thread.turns.length > 0);
  const filteredThreads = visibleThreads.filter((thread) => !threadSearch.trim() || `${thread.title} ${thread.turns.map((turn) => turn.content).join(" ")}`.toLowerCase().includes(threadSearch.trim().toLowerCase()));
  const groupedThreads = filteredThreads.reduce<Array<{ label: string; threads: ChatThread[] }>>((groups, thread) => {
    const label = threadDateGroup(thread.updatedAt, hydrated);
    const group = groups.find((item) => item.label === label);
    if (group) group.threads.push(thread);
    else groups.push({ label, threads: [thread] });
    return groups;
  }, []);
  const threadSources = activeThread?.sources || [];
  const sourceCount = threadSources.length + uploadItems.filter((item) => !["succeeded", "ready", "failed", "canceled", "rejected"].includes(item.status) && !threadSources.some((source) => source.video_id === item.videoId)).length;
  const hasConversation = threads.some((thread) => thread.turns.length > 0);
  const showGreeting = turns.length === 0 && !hasConversation;
  const showOnboarding = videosLoaded && videos.length === 0 && !onboardingSeen && showGreeting && !uploadItems.length && !threadSources.length;

  return (
    <DashboardShell
      workspace={activeWorkspace}
      profileInitial={profileInitial}
      profileName={profileName}
      sidebarContent={visibleThreads.length ? <section className="sidebar-recent-chats" aria-label="Recent chats">
        <div className="sidebar-recent-chats-head"><span>Recent chats</span><button type="button" onClick={startNewThread} aria-label="Start a new chat">＋</button></div>
        <div className="sidebar-recent-chats-list">
          {visibleThreads.slice(0, 8).map((thread) => (
            <div key={thread.id} className={`sidebar-recent-chat ${thread.id === activeThreadId ? "is-active" : ""} ${threadMenuId === thread.id ? "menu-open" : ""}`}>
              {renamingThreadId === thread.id ? (
                <div className="chat-thread-rename" onPointerDown={(event) => event.stopPropagation()}>
                  <input autoFocus value={renamingTitle} onChange={(event) => setRenamingTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void saveThreadRename(thread); } if (event.key === "Escape") { setRenamingThreadId(null); setRenamingTitle(""); } }} aria-label="Chat name" />
                  <button type="button" onClick={() => void saveThreadRename(thread)} aria-label="Save chat name">✓</button>
                </div>
              ) : <button type="button" className="sidebar-recent-chat-open" onClick={() => openThread(thread)} title={thread.title}><TypedGreeting text={thread.title} /></button>}
              <button type="button" className="chat-thread-more" onClick={(event) => { event.stopPropagation(); setThreadMenuId((current) => current === thread.id ? null : thread.id); }} aria-label={`More actions for ${thread.title}`} aria-expanded={threadMenuId === thread.id}>•••</button>
              {threadMenuId === thread.id ? <div className="chat-thread-menu" onPointerDown={(event) => event.stopPropagation()}>
                <button type="button" onClick={() => beginRenameThread(thread)}>Rename chat</button>
                <button type="button" onClick={() => void updateThreadMetadata(thread, { pinned: !thread.pinned })}>{thread.pinned ? "Unpin chat" : "Pin chat"}</button>
                <button type="button" onClick={() => void updateThreadMetadata(thread, { archived: true })}>Archive chat</button>
                <button type="button" onClick={() => void deleteThread(thread)}>Delete chat</button>
              </div> : null}
            </div>
          ))}
        </div>
      </section> : null}
    >
      <section className="search-shell chat-shell fade-in">
        <aside className="search-filters surface-section">
          <h1>Ask Vivadeo</h1>
          <p className="muted">Search across your video moments, then ask follow-up questions.</p>
          <div className="field">
            <label htmlFor="workspace-filter">Workspace</label>
            <input id="workspace-filter" value={activeWorkspace} readOnly />
          </div>
          <div className="field">
            <label htmlFor="video-scope">Search scope</label>
            <select
              id="video-scope"
              value={videoId}
              onChange={(event) => {
                setVideoId(event.target.value);
                setVideoIds([]);
              }}
            >
              <option value="">All workspace videos ({videos.length})</option>
              {videos.map((video) => <option key={video.id} value={video.id}>{video.filename}</option>)}
            </select>
          </div>
          <div className="detail-card">
            <span>Answer source</span>
            <strong>Video transcripts</strong>
          </div>
          <div className="detail-card">
            <span>Answer engine</span>
            <strong>Vivadeo archive assistant</strong>
          </div>
          {recentSearches.length > 0 ? (
            <div className="search-chip-group">
              <span className="search-chip-label">Recent questions</span>
              {recentSearches.map((item) => (
                <button key={item} type="button" className="pill pill-button" onClick={() => setQuestion(item)}>{item}</button>
              ))}
            </div>
          ) : null}
        </aside>

        <div className={`search-main ${turns.length ? "chat-main-active" : "chat-main-empty"}`}>
          <section className="surface-section search-query">
            <input
              ref={uploadInputRef}
              className="visually-hidden"
              type="file"
              accept="video/*"
              multiple
              onChange={(event) => {
                const selectedFiles = event.target.files ? Array.from(event.target.files) : [];
                event.target.value = "";
                if (selectedFiles.length) void uploadVideos(selectedFiles);
              }}
            />
            <form className="chat-composer" onSubmit={submit}>
              <div className="field chat-composer-input">
                <label htmlFor="query">Ask about your videos</label>
                {momentContext ? <button type="button" className="chat-moment-context" onClick={() => setMomentContext(null)}>Focused on {momentContext.filename} · {fmt(momentContext.startTime)} ×</button> : null}
                <textarea
                  ref={questionInputRef}
                  id="query"
                  rows={1}
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder={turns.length ? "Ask Vivadeo about your videos…" : DEFAULT_CHAT_PROMPT}
                  disabled={loading}
                />
              </div>
              <button
                className={`chat-send ${loading ? "chat-stop" : ""}`}
                type={loading ? "button" : "submit"}
                disabled={loading ? !activeChatJobId : (!question.trim() && turns.length > 0)}
                onClick={loading ? () => void cancelChatGeneration() : undefined}
                aria-label={loading ? "Stop current task" : "Ask"}
              >
                {loading ? <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 16 8-16 8 3-8-3-8Zm3 8h13" /></svg>}
              </button>
              <div className="chat-composer-footer">
                <div className="chat-composer-tools" aria-label="Composer tools">
                  <button type="button" onClick={() => uploadInputRef.current?.click()} aria-label="Attach videos" data-tooltip="Attach videos"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 12 5.5-5.5a3 3 0 0 1 4.2 4.2L11 18.4a4.5 4.5 0 0 1-6.4-6.4l7.1-7.1" /></svg><span>Attach</span></button>
                  <button type="button" onClick={() => setBrowseOpen((open) => !open)} aria-label="Browse videos" data-tooltip="Browse videos" aria-expanded={browseOpen}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z M8 6l1.5-3h5L16 6 M9 10l5 2-5 2z" /></svg><span>Browse</span></button>
                  <div className="chat-model-control">
                    <button className="chat-model-trigger" type="button" aria-label="Choose chat model" aria-expanded={modelOpen} onClick={() => { setCustomModelView(false); setModelOpen((open) => !open); }}>
                      <strong>{chatModel === "vivadeo-pro" ? "Vivadeo Pro" : chatModel === "vivadeo-auto" ? "Vivadeo Auto" : chatModel === "ollama" ? "Ollama" : chatModel === "anthropic" ? "Anthropic" : chatModel === "openai" ? "OpenAI-compatible" : chatModel === "gemini" ? "Gemini-compatible" : chatModel === "nvidia" ? "NVIDIA-compatible" : "Custom endpoint"}</strong>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                    {modelOpen && typeof document !== "undefined" ? createPortal(
                      <div className="chat-model-overlay" onPointerDown={(event) => { if (event.target === event.currentTarget) setModelOpen(false); }}>
                        <section className="chat-model-dialog" role="dialog" aria-modal="true" aria-labelledby="chat-model-title">
                          <header>
                            <div>
                              <h2 id="chat-model-title">Choose an answer service</h2>
                              <p>Select Vivadeo or connect your own provider.</p>
                            </div>
                            <button autoFocus type="button" className="chat-model-close" onClick={() => setModelOpen(false)} aria-label="Close answer service picker">×</button>
                          </header>
                          {!customModelView ? <div className="chat-model-options">
                            <p>Vivadeo</p>
                            <button type="button" className={chatModel === "vivadeo-auto" ? "is-selected" : ""} onClick={() => { setChatModel("vivadeo-auto"); setModelOpen(false); }}><span>Vivadeo Auto</span><span aria-hidden="true">{chatModel === "vivadeo-auto" ? "✓" : ""}</span></button>
                            {["pro", "enterprise"].includes(workspacePlan) ? <button type="button" className={chatModel === "vivadeo-pro" ? "is-selected" : ""} onClick={() => { setChatModel("vivadeo-pro"); setModelOpen(false); }}><span>Vivadeo Pro</span><span aria-hidden="true">{chatModel === "vivadeo-pro" ? "✓" : ""}</span></button> : null}
                            <p>Your provider</p>
                            <button type="button" className={chatModel === "custom" ? "is-selected" : ""} onClick={() => setCustomModelView(true)}><span>Custom endpoint</span><span aria-hidden="true">{chatModel === "custom" ? "✓" : ""}</span></button>
                            <button type="button" className={chatModel === "openai" ? "is-selected" : ""} onClick={() => { setChatModel("openai"); setModelOpen(false); }}><span>OpenAI-compatible</span><span aria-hidden="true">{chatModel === "openai" ? "✓" : ""}</span></button>
                            <button type="button" className={chatModel === "anthropic" ? "is-selected" : ""} onClick={() => { setChatModel("anthropic"); setModelOpen(false); }}><span>Anthropic</span><span aria-hidden="true">{chatModel === "anthropic" ? "✓" : ""}</span></button>
                            <button type="button" className={chatModel === "ollama" ? "is-selected" : ""} onClick={() => { setChatModel("ollama"); setModelOpen(false); }}><span>Ollama</span><span aria-hidden="true">{chatModel === "ollama" ? "✓" : ""}</span></button>
                            <button type="button" className={chatModel === "gemini" ? "is-selected" : ""} onClick={() => { setChatModel("gemini"); setModelOpen(false); }}><span>Gemini-compatible</span><span aria-hidden="true">{chatModel === "gemini" ? "✓" : ""}</span></button>
                            <button type="button" className={chatModel === "nvidia" ? "is-selected" : ""} onClick={() => { setChatModel("nvidia"); setModelOpen(false); }}><span>NVIDIA-compatible</span><span aria-hidden="true">{chatModel === "nvidia" ? "✓" : ""}</span></button>
                          </div> : null}
                          {customModelView ? <div className="chat-model-custom">
                            <button type="button" className="chat-model-back" onClick={() => setCustomModelView(false)}>← Back to answer services</button>
                            <input value={customBaseUrl} onChange={(event) => setCustomBaseUrl(event.target.value)} placeholder="https://api.example.com/v1" aria-label="Custom AI base URL" />
                            <input value={customModel} onChange={(event) => setCustomModel(event.target.value)} placeholder="Model name" aria-label="Custom AI model" />
                            <input type="password" value={customApiKey} onChange={(event) => setCustomApiKey(event.target.value)} placeholder="API key (used for this session)" aria-label="Custom AI API key" autoComplete="off" />
                            <small>Your key is used only for your requests and is never displayed again.</small>
                            <button type="button" className="chat-model-done" onClick={() => { setChatModel("custom"); setModelOpen(false); }}>Done</button>
                          </div> : null}
                        </section>
                      </div>,
                      document.body,
                    ) : null}
                  </div>
                  <div className="chat-accuracy-controls" aria-label="Evidence search controls">
                    <span className="chat-evidence-label">Evidence</span>
                    <ComposerSelect
                      label="Evidence type"
                      value={modalityOverride}
                      options={[
                        { value: "auto", label: "Auto" },
                        { value: "visual", label: "Visual" },
                        { value: "transcript", label: "Transcript" },
                        { value: "hybrid", label: "Both" },
                      ]}
                      onChange={(value) => setModalityOverride(value as typeof modalityOverride)}
                    />
                    <ComposerSelect
                      label="Search depth"
                      value={momentContext ? "focused" : searchMode}
                      disabled={Boolean(momentContext)}
                      options={[
                        { value: "top", label: "Best matches" },
                        { value: "all", label: "Find every occurrence" },
                        { value: "focused", label: "Focused moment", disabled: !momentContext },
                      ]}
                      onChange={(value) => setSearchMode(value as typeof searchMode)}
                    />
                    <ComposerSelect
                      label="Answer format"
                      value={outputFormat}
                      options={[
                        { value: "answer", label: "Answer" },
                        { value: "rows", label: "Extract rows" },
                        { value: "comparison", label: "Compare videos", disabled: threadSources.length < 2 },
                      ]}
                      onChange={(value) => setOutputFormat(value as typeof outputFormat)}
                    />
                    {outputFormat === "rows" ? <ComposerSelect
                      label="Extraction type"
                      value={extractionType}
                      options={[
                        { value: "claims", label: "Claims" },
                        { value: "action_items", label: "Action items" },
                        { value: "people", label: "People" },
                        { value: "appearances", label: "Appearances" },
                        { value: "objections", label: "Objections" },
                        { value: "chapters", label: "Chapters" },
                        { value: "visual_events", label: "Visual events" },
                      ]}
                      onChange={setExtractionType}
                    /> : null}
                  </div>
                  {outputFormat === "comparison" && threadSources.length > 1 ? <select className="chat-comparison-picker" aria-label="Videos to compare" multiple value={comparisonVideoIds} onChange={(event) => setComparisonVideoIds(Array.from(event.target.selectedOptions, (option) => option.value))}>
                    {threadSources.map((source) => <option key={source.video_id} value={source.video_id}>{source.filename}</option>)}
                  </select> : null}
                </div>
                <div className="chat-message-attachments" aria-live="polite" aria-label="Attached video preparation">
                  {threadSources.map((source) => <span key={source.video_id} className="chat-message-attachment">
                    {source.filename}: {source.transcript_status === "ready" ? "Ready for spoken questions" : source.visual_status === "ready" ? "Visual evidence ready" : ["failed", "canceled"].includes(source.status) ? "Preparation interrupted" : "Preparing spoken content"}
                  </span>)}
                  {uploadItems.filter((item) => !threadSources.some((source) => source.video_id === item.videoId)).map((item) => <span key={item.id} className="chat-message-attachment">
                    {item.filename}: {item.status === "uploading" ? `Uploading ${Math.round((item.progress || 0) * 100)}%` : ["failed", "canceled", "rejected"].includes(item.status) ? "Upload interrupted" : "Preparing spoken content"}
                  </span>)}
                </div>
                <div className="chat-composer-meta">
                  {sourceCount ? <span className="chat-source-count">{sourceCount} {sourceCount === 1 ? "source" : "sources"}</span> : null}
                  <span className="chat-character-count">{question.length.toLocaleString()} / 3,000</span>
                </div>
              </div>
            </form>
            {browseOpen ? (
              <div className="chat-tool-panel" role="dialog" aria-label="Browse workspace videos">
                <div>
                  <strong>Browse workspace videos</strong>
                  <p className="muted">Choose an existing video to add to this chat.</p>
                </div>
                {videos.length ? (
                  <div className="chat-video-picker">
                    {videos.map((video) => {
                      const attached = threadSources.some((source) => source.video_id === video.id);
                      return <button key={video.id} type="button" className="chat-video-picker-item" disabled={attached} onClick={() => void attachExistingVideo(video.id)}><span>{video.filename}</span><small>{attached ? "Already attached" : video.status}</small></button>;
                    })}
                  </div>
                ) : <p className="muted">No videos are available yet. Attach a file or add a URL first.</p>}
              </div>
            ) : null}
            <p className="chat-disclaimer">Only share videos you have permission to process. Vivadeo may make mistakes.</p>
          </section>

          <section className="search-layout">
            <section ref={chatFeedRef} className={`search-feed ${turns.length ? "chat-feed-active" : "chat-feed-empty"}`} aria-busy={loading}>
              {turns.length === 0 ? (
                <article className={`search-result ${showOnboarding ? "chat-onboarding" : "chat-returning"}`}>
                  <h3 className="chat-greeting">{showGreeting ? <TypedGreeting text={`${greeting}, ${firstName}`} /> : "New chat"}</h3>
                  <p className="muted">{showGreeting ? (showOnboarding ? "Start with a question and Vivadeo will find the relevant moments." : "Ask anything about your video archive.") : "Ask a new question to start this chat."}</p>
                  {showOnboarding ? <div className="chat-starters">
                    {[
                      ["Find a moment", "When did we talk about the launch?", "moment"],
                      ["Summarize a video", "Summarize the latest interview.", "summarize"],
                      ["Search transcripts", "What did the speaker say about pricing?", "transcripts"],
                      ["Compare footage", "Compare the two product demos.", "compare"],
                    ].map(([label, prompt, icon]) => (
                      <button key={label} type="button" className="chat-starter" onClick={() => { setQuestion(prompt); setOnboardingSeen(true); window.localStorage.setItem(CHAT_ONBOARDING_KEY, "true"); }}>
                        <svg className={`chat-starter-icon chat-starter-icon-${icon}`} viewBox="0 0 24 24" aria-hidden="true"><path d={starterPaths[icon as keyof typeof starterPaths]} /></svg>
                        <span>{label}</span><strong>＋</strong>
                      </button>
                    ))}
                  </div> : null}
                </article>
              ) : (
                turns.map((turn, index) => {
                  const citations = turn.citations ?? [];
                  const citationKey = `${turn.id || turn.role}-${index}`;
                  const branchMessages = turn.id && turn.parentId
                    ? (activeThread?.messages || []).filter((candidate) => candidate.role === turn.role && candidate.parentId === turn.parentId)
                    : [];
                  const branchIndex = turn.id ? branchMessages.findIndex((candidate) => candidate.id === turn.id) : -1;
                  const isFailed = turn.status === "failed";
                  const visibleCitations = citations;

                  return (
                    <article key={citationKey} className={`search-result chat-message ${turn.role === "assistant" ? "search-result-answer chat-message-assistant" : "chat-message-user"}`}>
                      <div className="search-top">
                        <div className="search-meta">
                          {turn.role === "assistant" ? (
                            <>
                              {isFailed ? <div className="search-answer-text">Vivadeo could not prepare this answer.</div> : turn.content ? <div className="search-answer-text">{turn.content}</div> : null}
                              {turn.intent?.modality ? <div className="chat-evidence-summary">{turn.intent.modality === "visual" ? "Visual evidence" : turn.intent.modality === "hybrid" ? "Visual + spoken evidence" : "Transcript evidence"}{turn.verification_summary?.verified ? ` · ${turn.verification_summary.verified} verified` : ""}{turn.verification_summary?.possible ? ` · ${turn.verification_summary.possible} possible` : ""}</div> : null}
                              {turn.error ? <p className="chat-message-error" role="alert">{turn.error}</p> : null}
                              {branchMessages.length > 1 ? <div className="chat-message-actions">
                                <span className="chat-branch-control" aria-label="Answer branches">
                                  <button type="button" className="button-secondary" disabled={branchIndex <= 0} onClick={() => void selectMessageBranch(branchMessages[branchIndex - 1].id!)} aria-label="Previous answer branch">←</button>
                                  <span>{branchIndex + 1} / {branchMessages.length}</span>
                                  <button type="button" className="button-secondary" disabled={branchIndex === branchMessages.length - 1} onClick={() => void selectMessageBranch(branchMessages[branchIndex + 1].id!)} aria-label="Next answer branch">→</button>
                                </span>
                              </div> : null}
                            </>
                          ) : (
                            <>
                              {editingMessageId === turn.id ? <form className="chat-prompt-editor" onSubmit={(event) => void submitEditedPrompt(event, turn.id!)}>
                                <textarea autoFocus rows={2} maxLength={3000} value={editingPrompt} onChange={(event) => setEditingPrompt(event.target.value)} aria-label="Edit prompt" />
                                <div>
                                  <button type="button" onClick={() => { setEditingMessageId(null); setEditingPrompt(""); }}>Cancel</button>
                                  <button type="submit" disabled={!editingPrompt.trim()}>Send edit</button>
                                </div>
                              </form> : <>
                                <h3>{turn.content}</h3>
                                <div className="chat-user-message-actions" aria-label="Prompt actions">
                                  <button type="button" onClick={() => editPrompt(turn)} aria-label="Edit prompt">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4" /></svg>
                                  </button>
                                  <button type="button" onClick={() => void copyPrompt(turn.content)} aria-label="Copy prompt">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" /><path d="M16 8V5H5v11h3" /></svg>
                                  </button>
                                </div>
                              </>}
                              {turn.attachments?.length ? <div className="chat-message-attachments" aria-label="Videos attached to this question">
                                {turn.attachments.map((attachment) => <span key={attachment.video_id} className={`chat-message-attachment chat-message-attachment-${attachment.status}`}><span aria-hidden="true" />{attachment.filename}</span>)}
                              </div> : null}
                            </>
                          )}
                        </div>
                      </div>
                      {turn.role === "assistant" && (turn.search_run_id || turn.suggested_refinements?.length) ? <div className="chat-answer-actions">
                        {turn.suggested_refinements?.length ? <div className="chat-refinement-row" aria-label="Suggested follow-ups">
                          <span>Follow up</span>
                          {turn.suggested_refinements.slice(0, 3).map((suggestion) => <button key={suggestion} type="button" onClick={() => { setParentSearchRunId(turn.search_run_id || null); setQuestion(suggestion); }}>{suggestion}</button>)}
                        </div> : null}
                        {turn.search_run_id ? <button type="button" className="chat-save-search" onClick={() => void saveCurrentSearch(turn)}>Save search</button> : null}
                      </div> : null}
                      {citations.length ? (
                        <div className="search-citations">
                          <div className="search-citation-head">
                            <span>Evidence moments</span>
                            <strong>{citations.length} found</strong>
                          </div>
                          <div className="search-citation-scroller" aria-label="Relevant video moments">
                            <div className={`search-citation-filmstrip ${citations.length === 1 ? "is-single" : ""}`}>
                              <span className="search-citation-sprockets" aria-hidden="true" />
                              <div className="search-citation-filmstrip-frames">
                            {visibleCitations.map((citation, citationIndex) => {
                              const citationSource = videos.find((video) => video.id === citation.video_id) || threadSources.find((source) => source.video_id === citation.video_id);
                              const previewStart = Math.max(0, citation.start_time - 1);
                              const previewEnd = citationSource?.duration ? Math.min(citationSource.duration, citation.end_time + 1) : citation.end_time + 1;
                              const feedback = citationFeedback[evidenceKey(citation)];
                              const verification = citation.verification_status || (citation.visual_verified ? "verified" : "possible");
                              return (
                                <article key={`${citation.video_id}-${citation.start_time.toFixed(3)}`} className={`search-citation-card search-citation-${verification}`}>
                                  <CitationPreview
                                    citation={citation}
                                    sourceUrl={citationSource?.url}
                                    previewStart={previewStart}
                                    previewEnd={previewEnd}
                                    preload={index === turns.length - 1 && citationIndex < 3}
                                    onPlay={() => setMomentContext({ videoId: citation.video_id, filename: citation.filename, startTime: citation.start_time, endTime: citation.end_time })}
                                  />
                                  <div className="chat-evidence-actions">
                                    <div className="chat-evidence-summary-row">
                                      <span className={`chat-evidence-status chat-evidence-status-${verification}`} aria-label={`Evidence status: ${verification}`}>{verification === "verified" ? "Verified" : verification === "possible" ? "Possible match" : "Not relevant"}</span>
                                      {citation.match_reason ? <span className="chat-evidence-reason">{citation.match_reason}</span> : null}
                                    </div>
                                    <div className="chat-evidence-controls">
                                      <button type="button" className={feedback === "relevant" ? "is-active" : ""} onClick={() => void sendCitationFeedback(turn, citation, "relevant")}>Relevant</button>
                                      <button type="button" className={feedback === "not_relevant" ? "is-active" : ""} onClick={() => void sendCitationFeedback(turn, citation, "not_relevant")}>Not relevant</button>
                                      <button type="button" onClick={() => focusMoment(citation, "Show nearby context around this moment.", turn.search_run_id)}>Nearby</button>
                                      <button type="button" onClick={() => focusMoment(citation, "What is happening in this moment?", turn.search_run_id)}>Ask about this</button>
                                    </div>
                                  </div>
                                </article>
                              );
                            })}
                              </div>
                              <span className="search-citation-sprockets" aria-hidden="true" />
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {turn.rows?.length ? <section className="chat-extraction-results" aria-label="Extracted evidence rows">
                        <div className="chat-extraction-head"><span>Extracted evidence</span><strong>{turn.rows.length} rows</strong></div>
                        <div className="chat-extraction-list">
                          {turn.rows.map((row) => <div className="chat-extraction-row" key={row.evidence_key}>
                            <div><strong>{row.item}</strong><small>{row.source} · {fmt(row.start_time)}–{fmt(row.end_time)} · {row.verification_status === "verified" ? "Verified" : "Possible match"}</small></div>
                            <button type="button" onClick={() => { setMomentContext({ videoId: row.video_id, filename: row.source, startTime: row.start_time, endTime: row.end_time }); setSearchMode("focused"); setQuestion("What is important about this moment?"); }}>Ask about</button>
                          </div>)}
                        </div>
                      </section> : null}
                      {turn.comparison?.length ? <section className="chat-comparison-results" aria-label="Video comparison">
                        <div className="chat-extraction-head"><span>Comparison</span><strong>{turn.comparison.length} claim{turn.comparison.length === 1 ? "" : "s"}</strong></div>
                        {turn.comparison.map((claim, claimIndex) => <div className="chat-comparison-claim" key={`${claim.claim}-${claimIndex}`}>
                          <p>{claim.claim}</p>
                          <div className="chat-comparison-sides"><div><small>First video</small>{claim.left_citations.map((citation) => <button type="button" key={evidenceKey(citation)} onClick={() => focusMoment(citation, "What is important about this moment?")}>{fmt(citation.start_time)}–{fmt(citation.end_time)}</button>)}</div><div><small>Second video</small>{claim.right_citations.map((citation) => <button type="button" key={evidenceKey(citation)} onClick={() => focusMoment(citation, "What is important about this moment?")}>{fmt(citation.start_time)}–{fmt(citation.end_time)}</button>)}</div></div>
                        </div>)}
                      </section> : null}
                    </article>
                  );
                })
              )}
              {loading ? <article className="search-result chat-message chat-message-assistant chat-pending-message" aria-label={status || "Vivadeo is preparing an answer"}>
                <div className="search-top">
                  <div className="search-meta">
                    {streamedAnswer ? <div className="search-answer-text" aria-live="polite">{streamedAnswer}</div> : <div className="chat-pending-status" aria-live="polite" aria-busy="true">
                      <span className="chat-typing" aria-hidden="true"><span /><span /><span /></span>
                      <span className="chat-progress-copy">{status || "Preparing answer..."}</span>
                      <span className="chat-progress-percent">{Math.round(chatProgress * 100)}%</span>
                    </div>}
                  </div>
                </div>
              </article> : null}
            </section>
          </section>
        </div>

        {false ? <aside className="surface-section search-preview chat-history">
              <div className="chat-history-head">
                <div>
                  <h2>History ({visibleThreads.length})</h2>
                  <p className="muted">Recent chats</p>
                </div>
                <button type="button" className="history-toggle" aria-label="Close history">×</button>
              </div>
              <button type="button" className="button-secondary chat-new-thread" onClick={startNewThread}>＋ New chat</button>
              <input className="chat-history-search" value={threadSearch} onChange={(event) => setThreadSearch(event.target.value)} placeholder="Search chats" aria-label="Search chats" />
              {savedSearches.filter((saved) => !saved.archived).length ? <section className="chat-saved-searches" aria-label="Saved searches">
                <h3>Saved searches</h3>
                {savedSearches.filter((saved) => !saved.archived).slice(0, 8).map((saved) => <button key={saved.id} type="button" onClick={() => useSavedSearch(saved)}><span>{saved.name}</span><small>{saved.output_format === "rows" ? "Rows" : saved.output_format === "comparison" ? "Compare" : "Answer"} · Run</small></button>)}
              </section> : null}
              <div className="chat-history-list">
                {groupedThreads.length ? groupedThreads.map((group) => (
                  <section key={group.label} className="chat-history-group">
                    <h3>{group.label}</h3>
                    <div className="chat-history-group-list">
                    {group.threads.map((thread) => (
                      <div key={thread.id} className={`chat-history-row ${thread.id === activeThreadId ? "is-active" : ""} ${threadMenuId === thread.id ? "menu-open" : ""}`}>
                    {renamingThreadId === thread.id ? (
                      <div className="chat-thread-rename" onPointerDown={(event) => event.stopPropagation()}>
                        <input autoFocus value={renamingTitle} onChange={(event) => setRenamingTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void saveThreadRename(thread); } if (event.key === "Escape") { setRenamingThreadId(null); setRenamingTitle(""); } }} aria-label="Chat name" />
                        <button type="button" onClick={() => void saveThreadRename(thread)} aria-label="Save chat name">✓</button>
                      </div>
                    ) : (
                      <button type="button" className={`chat-history-item ${thread.id === activeThreadId ? "is-active" : ""}`} onClick={() => openThread(thread)}>
                        <span>{thread.pinned ? "★ " : ""}{thread.title}</span><small>{thread.id === activeThreadId ? "Current chat" : thread.turns.length ? `${thread.turns.length} messages` : "Empty chat"}{thread.read === false ? " · Unread" : ""}</small>
                      </button>
                    )}
                    <button type="button" className="chat-thread-more" onClick={(event) => { event.stopPropagation(); setThreadMenuId((current) => current === thread.id ? null : thread.id); }} aria-label={`More actions for ${thread.title}`} data-tooltip="Manage chat">•••</button>
                    <button type="button" className="chat-thread-delete" onClick={() => void deleteThread(thread)} aria-label={`Delete ${thread.title}`} data-tooltip="Delete chat">×</button>
                    {threadMenuId === thread.id ? (
                      <div className="chat-thread-menu" onPointerDown={(event) => event.stopPropagation()}>
                        <button type="button" onClick={() => openThread(thread)}>Open chat</button>
                        <button type="button" onClick={() => beginRenameThread(thread)}>Rename chat</button>
                        <button type="button" onClick={() => void updateThreadMetadata(thread, { pinned: !thread.pinned })}>{thread.pinned ? "Unpin chat" : "Pin chat"}</button>
                        <button type="button" onClick={() => void updateThreadMetadata(thread, { read: thread.read === false })}>{thread.read === false ? "Mark read" : "Mark unread"}</button>
                        <button type="button" onClick={() => void updateThreadMetadata(thread, { archived: true })}>Archive chat</button>
                        <button type="button" onClick={() => void deleteThread(thread)}>Delete chat</button>
                      </div>
                    ) : null}
                      </div>
                    ))}
                    </div>
                  </section>
                )) : <p className="muted chat-history-empty">Start a new chat to begin.</p>}
              </div>
            </aside> : null}
      </section>
    </DashboardShell>
  );
}
