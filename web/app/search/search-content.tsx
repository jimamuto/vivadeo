"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { DashboardShell } from "@/app/dashboard/dashboard-shell";
import { appendActivity } from "@/lib/activity-log";

const RECENT_SEARCHES_KEY = "vivadeo.recent-searches";
const CHAT_ONBOARDING_KEY = "vivadeo.chat-onboarding-seen";
const GREETINGS = ["Good to see you", "Ready when you are", "Let’s find something", "Back to the archive"];

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Citation = {
  segment_id: string;
  video_id: string;
  filename: string;
  source_uri: string;
  start_time: number;
  end_time: number;
  text: string;
  similarity_score: number | null;
};

type ChatTurn = ChatMessage & {
  citations?: Citation[];
};

export type ChatThread = {
  id: string;
  title: string;
  turns: ChatTurn[];
  updatedAt: string;
};


type VideoOption = {
  id: string;
  filename: string;
  status: string;
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

export function SearchContent({
  profileInitial,
  profileName,
  initialQuery = "",
  initialVideoId = "",
  initialVideoIds = [],
  initialThreads = [],
}: {
  initialThreads?: ChatThread[];
  profileInitial: string;
  profileName?: string;
  initialQuery?: string;
  initialVideoId?: string;
  initialVideoIds?: string[];
}) {
  const [activeWorkspace, setActiveWorkspace] = useState("default-workspace");
  const [question, setQuestion] = useState(initialQuery);
  const [videoId, setVideoId] = useState(initialVideoId);
  const [videoIds, setVideoIds] = useState(initialVideoIds);
  const [chatModel, setChatModel] = useState("vivadeo-auto");
  const [modelOpen, setModelOpen] = useState(false);
  const [videos, setVideos] = useState<VideoOption[]>([]);
  const [videosLoaded, setVideosLoaded] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>(initialThreads[0]?.turns || []);
  const [threads, setThreads] = useState<ChatThread[]>(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState(initialThreads[0]?.id || "");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});
  const [historyOpen, setHistoryOpen] = useState(true);
  const [threadMenuId, setThreadMenuId] = useState<string | null>(null);
  const initialQuerySubmitted = useRef(false);

  useEffect(() => {
    const workspace = document.cookie
      .split("; ")
      .find((item) => item.startsWith("vivadeo_workspace="))
      ?.split("=")[1];
    if (workspace) setActiveWorkspace(decodeURIComponent(workspace));
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
    setOnboardingSeen(window.localStorage.getItem(CHAT_ONBOARDING_KEY) === "true");
  }, []);

  useEffect(() => {
    window.localStorage.removeItem("vivadeo.chat-threads");
    void fetch("/api/proxy/v1/chat/threads", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load chat threads");
        const payload = (await response.json()) as Array<{ id: string; title: string; updated_at: string; messages: ChatTurn[] }>;
        const loadedThreads = payload.map((thread) => ({ id: thread.id, title: thread.title, updatedAt: thread.updated_at, turns: thread.messages }));
        if (loadedThreads.length) {
          setThreads(loadedThreads);
          const selectedId = loadedThreads.some((thread) => thread.id === activeThreadId) ? activeThreadId : loadedThreads[0].id;
          setActiveThreadId(selectedId);
          setTurns(loadedThreads.find((thread) => thread.id === selectedId)?.turns || []);
          return;
        }
        if (threads.length) return;
        const created = await fetch("/api/proxy/v1/chat/threads", { method: "POST" });
        if (!created.ok) return;
        const thread = (await created.json()) as { id: string; title: string; updated_at: string; messages: ChatTurn[] };
        const initialThread = { id: thread.id, title: thread.title, updatedAt: thread.updated_at, turns: thread.messages };
        setThreads([initialThread]);
        setActiveThreadId(thread.id);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
  }, [recentSearches]);

  useEffect(() => {
    if (!initialQuery.trim() || !activeThreadId || initialQuerySubmitted.current) return;
    initialQuerySubmitted.current = true;
    window.setTimeout(() => document.querySelector<HTMLFormElement>(".chat-composer")?.requestSubmit(), 0);
  }, [initialQuery, activeThreadId]);

  useEffect(() => {
    if (!loading || startedAt === null) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.round((Date.now() - startedAt) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loading, startedAt]);

  function recordRecentSearch(value: string) {
    const next = value.trim();
    if (!next) return;
    setRecentSearches((current) => [next, ...current.filter((item) => item !== next)].slice(0, 6));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuestion = question.trim();
    if (!nextQuestion || loading) return;

    const nextTurns: ChatTurn[] = [...turns, { role: "user", content: nextQuestion }];
    setTurns(nextTurns);
    setThreads((current) => current.map((thread) => thread.id === activeThreadId ? { ...thread, turns: nextTurns, updatedAt: new Date().toISOString() } : thread));
    setOnboardingSeen(true);
    window.localStorage.setItem(CHAT_ONBOARDING_KEY, "true");
    setQuestion("");
    const requestStartedAt = Date.now();
    setLoading(true);
    setStartedAt(requestStartedAt);
    setElapsedSeconds(0);
    setStatus("Finding evidence, then preparing an answer...");

    try {
      const response = await fetch("/api/proxy/v1/search/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextTurns.map(({ role, content }) => ({ role, content })),
          results: 6,
          video_id: videoId || null,
          video_ids: videoIds,
          thread_id: activeThreadId || null,
          model: chatModel,
        }),
      });
      if (!response.ok) {
        setStatus(`Chat failed (${response.status})`);
        return;
      }
      const payload = (await response.json()) as { answer: string; citations: Citation[]; thread_id?: string; title?: string | null };
      const seconds = Math.max(1, Math.round((Date.now() - requestStartedAt) / 1000));
      const assistantTurn: ChatTurn = { role: "assistant", content: payload.answer, citations: payload.citations };
      setTurns((current) => [...current, assistantTurn]);
      setThreads((current) => current.map((thread) => thread.id === activeThreadId ? { ...thread, title: payload.title || thread.title, turns: [...thread.turns, assistantTurn], updatedAt: new Date().toISOString() } : thread));
      recordRecentSearch(nextQuestion);
      appendActivity(activeWorkspace, "search.performed", nextQuestion);
      setStatus(payload.citations.length ? `Answer ready in ${seconds}s with ${payload.citations.length} cited evidence range(s).` : `Answer ready in ${seconds}s. No cited evidence yet.`);
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Chat failed");
    } finally {
      setLoading(false);
      setStartedAt(null);
    }
  }

  async function startNewThread() {
    const response = await fetch("/api/proxy/v1/chat/threads", { method: "POST" });
    if (!response.ok) return;
    const thread = (await response.json()) as { id: string; title: string; updated_at: string; messages: ChatTurn[] };
    const nextThread = { id: thread.id, title: thread.title, updatedAt: thread.updated_at, turns: thread.messages };
    setThreads((current) => [nextThread, ...current]);
    setActiveThreadId(nextThread.id);
    setTurns([]);
    setQuestion("");
    setStatus(null);
    setExpandedCitations({});
  }

  function openThread(thread: ChatThread) {
    setActiveThreadId(thread.id);
    setTurns(thread.turns);
    setQuestion("");
    setStatus(null);
    setExpandedCitations({});
    setThreadMenuId(null);
  }

  async function deleteThread(thread: ChatThread) {
    const response = await fetch(`/api/proxy/v1/chat/threads/${thread.id}`, { method: "DELETE" });
    if (!response.ok) return;
    const remaining = threads.filter((item) => item.id !== thread.id);
    setThreads(remaining);
    if (thread.id === activeThreadId) {
      if (remaining[0]) openThread(remaining[0]);
      else await startNewThread();
    }
    setThreadMenuId(null);
  }

  const firstName = (profileName || "there").split(/[ @]/)[0];
  const greetingSeed = Array.from(profileName || "there").reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const greeting = GREETINGS[greetingSeed % GREETINGS.length];
  const hasConversation = threads.some((thread) => thread.turns.length > 0);
  const showGreeting = turns.length === 0 && !hasConversation;
  const showOnboarding = videosLoaded && videos.length === 0 && !onboardingSeen && showGreeting;

  return (
    <DashboardShell workspace={activeWorkspace} profileInitial={profileInitial} profileName={profileName}>
      <section className={`search-shell chat-shell ${historyOpen ? "history-open" : "history-closed"} fade-in`}>
        <aside className="search-filters surface-section">
          <h1>Ask Vivadeo</h1>
          <p className="muted">Transcript-grounded answers from workspace videos. Clip evidence arrives later.</p>
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

        <div className="search-main">
          <section className="surface-section search-query">
            <form className="chat-composer" onSubmit={submit}>
              <div className="field chat-composer-input">
                <label htmlFor="query">Ask about your videos</label>
                <textarea
                  id="query"
                  rows={1}
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="What did the speaker say about the launch timeline?"
                  disabled={loading}
                />
              </div>
              <button className="chat-send" type="submit" disabled={loading || !question.trim()} aria-label={loading ? "Asking" : "Ask"}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 16 8-16 8 3-8-3-8Zm3 8h13" /></svg>
              </button>
              <div className="chat-composer-footer">
                <div className="chat-composer-tools" aria-label="Composer tools">
                  <button type="button" onClick={() => document.getElementById("video-scope")?.focus()} aria-label="Choose videos"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 12 5.5-5.5a3 3 0 0 1 4.2 4.2L11 18.4a4.5 4.5 0 0 1-6.4-6.4l7.1-7.1" /></svg><span>Choose videos</span></button>
                  <button type="button" onClick={() => document.getElementById("query")?.focus()} aria-label="Focus question"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7" /></svg><span>Focus question</span></button>
                  <button type="button" onClick={() => document.getElementById("video-scope")?.focus()} aria-label="Browse videos"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z M8 6l1.5-3h5L16 6 M9 10l5 2-5 2z" /></svg><span>Browse videos</span></button>
                  <div className="chat-model-control">
                    <span>Model</span>
                    <button className="chat-model-trigger" type="button" aria-label="Choose chat model" aria-expanded={modelOpen} onClick={() => setModelOpen((open) => !open)}>
                      <strong>Vivadeo Auto</strong>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                    {modelOpen ? (
                      <div className="chat-model-menu">
                        <button type="button" className="is-selected" onClick={() => { setChatModel("vivadeo-auto"); setModelOpen(false); }}>
                          <span>Vivadeo Auto</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
                <span className="chat-character-count">{question.length.toLocaleString()} / 3,000</span>
              </div>
            </form>
            <p className="chat-disclaimer">Vivadeo may generate inaccurate information about people, places, or facts.</p>
            {status ? (
              <div className="search-status" aria-live="polite">
                <span>{status}</span>
                {loading ? <strong>{elapsedSeconds}s elapsed</strong> : null}
              </div>
            ) : null}
          </section>

          <section className="search-layout">
            <section className="search-feed">
              {turns.length === 0 ? (
                <article className={`search-result ${showOnboarding ? "chat-onboarding" : "chat-returning"}`}>
                  <h3 className="chat-greeting">{showGreeting ? `${greeting}, ${firstName}` : "New thread"}</h3>
                  <p className="muted">{showGreeting ? (showOnboarding ? "Start with a question and Vivadeo will find the relevant moments." : "Ask anything about your video archive.") : "Ask a new question to start this thread."}</p>
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
                  const citationKey = `${turn.role}-${index}`;
                  const showAll = expandedCitations[citationKey] ?? false;
                  const visibleCitations = showAll ? citations : citations.slice(0, 3);

                  return (
                    <article key={citationKey} className={`search-result ${turn.role === "assistant" ? "search-result-answer" : ""}`}>
                      <div className="search-top">
                        <div className="search-meta">
                          <p className="pill">{turn.role === "user" ? "You" : "Vivadeo"}</p>
                          {turn.role === "assistant" ? (
                            <p className="search-answer-text">{turn.content}</p>
                          ) : (
                            <h3>{turn.content}</h3>
                          )}
                        </div>
                      </div>
                      {citations.length ? (
                        <div className="search-citations">
                          <div className="search-citation-head">
                            <span>Evidence ranges</span>
                            <strong>{citations.length} cited</strong>
                          </div>
                          {visibleCitations.map((citation) => (
                            <article key={citation.segment_id} className="detail-card search-citation-card">
                              <span>{citation.filename} • {fmt(citation.start_time)} - {fmt(citation.end_time)}</span>
                              <strong className="detail-wrap">{citation.text}</strong>
                              <p className="muted">{citation.source_uri}</p>
                              <Link className="button-secondary" href={`/dashboard/library?video_id=${encodeURIComponent(citation.video_id)}`}>
                                Open video
                              </Link>
                            </article>
                          ))}
                          {citations.length > 3 ? (
                            <button
                              className="button-secondary search-citation-toggle"
                              type="button"
                              onClick={() => setExpandedCitations((current) => ({ ...current, [citationKey]: !showAll }))}
                            >
                              {showAll ? "Show fewer ranges" : `Show ${citations.length - 3} more ranges`}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })
              )}
            </section>
          </section>
        </div>

        <aside className="surface-section search-preview chat-history">
              <div className="chat-history-head">
                <div>
                  <h2>History ({threads.length})</h2>
                  <p className="muted">Recent threads</p>
                </div>
                <button type="button" className="history-toggle" onClick={() => setHistoryOpen(false)} aria-label="Close history">×</button>
              </div>
              <button type="button" className="button-secondary chat-new-thread" onClick={startNewThread}>＋ New thread</button>
              <div className="chat-history-list">
                {threads.length ? threads.map((thread) => (
                  <div key={thread.id} className="chat-history-row">
                    <button type="button" className={`chat-history-item ${thread.id === activeThreadId ? "is-active" : ""}`} onClick={() => openThread(thread)}>
                      <span>{thread.title}</span><small>{thread.turns.length ? `${thread.turns.length} messages` : "Empty thread"}</small>
                    </button>
                    <button type="button" className="chat-thread-more" onClick={(event) => { event.stopPropagation(); setThreadMenuId((current) => current === thread.id ? null : thread.id); }} aria-label={`More actions for ${thread.title}`} data-tooltip="Manage thread">•••</button>
                    <button type="button" className="chat-thread-delete" onClick={() => void deleteThread(thread)} aria-label={`Delete ${thread.title}`} data-tooltip="Delete thread">×</button>
                    {threadMenuId === thread.id ? (
                      <div className="chat-thread-menu">
                        <button type="button" onClick={() => openThread(thread)}>Open thread</button>
                        <button type="button" onClick={() => void deleteThread(thread)}>Delete thread</button>
                      </div>
                    ) : null}
                  </div>
                )) : <p className="muted chat-history-empty">Start a new thread to begin.</p>}
              </div>
            </aside>
        {!historyOpen ? <button type="button" className="history-open-button" onClick={() => setHistoryOpen(true)} aria-label="Manage chat history" data-tooltip="Manage chat history">•••</button> : null}
      </section>
    </DashboardShell>
  );
}
