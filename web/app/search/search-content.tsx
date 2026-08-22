"use client";

import { type FormEvent, useEffect, useState } from "react";
import { DashboardShell } from "@/app/dashboard/dashboard-shell";
import { appendActivity } from "@/lib/activity-log";

const RECENT_SEARCHES_KEY = "vivadeo.recent-searches";

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
}: {
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
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});
  const [historyOpen, setHistoryOpen] = useState(true);

  useEffect(() => {
    const workspace = document.cookie
      .split("; ")
      .find((item) => item.startsWith("vivadeo_workspace="))
      ?.split("=")[1];
    if (workspace) setActiveWorkspace(decodeURIComponent(workspace));
  }, []);

  useEffect(() => {
    try {
      const recent = window.localStorage.getItem(RECENT_SEARCHES_KEY);
      if (recent) setRecentSearches(JSON.parse(recent) as string[]);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
  }, [recentSearches]);

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
        }),
      });
      if (!response.ok) {
        setStatus(`Chat failed (${response.status})`);
        return;
      }
      const payload = (await response.json()) as { answer: string; citations: Citation[] };
      const seconds = Math.max(1, Math.round((Date.now() - requestStartedAt) / 1000));
      setTurns((current) => [...current, { role: "assistant", content: payload.answer, citations: payload.citations }]);
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
                  <button type="button" disabled aria-label="Attach"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 12 5.5-5.5a3 3 0 0 1 4.2 4.2L11 18.4a4.5 4.5 0 0 1-6.4-6.4l7.1-7.1" /></svg><span>Attach</span></button>
                  <button type="button" disabled aria-label="Voice Message"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h2m3-4v8m4-6v4m4-7v10m3-7v4" /></svg><span>Voice Message</span></button>
                  <button type="button" onClick={() => document.getElementById("query")?.focus()} aria-label="Browse Videos"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z M8 6l1.5-3h5L16 6 M9 10l5 2-5 2z" /></svg><span>Browse Videos</span></button>
                </div>
                <span className="chat-character-count">{question.length.toLocaleString()} / 3,000</span>
              </div>
            </form>
            {status ? (
              <div className="search-status" aria-live="polite">
                <span>{status}</span>
                {loading ? <strong>{elapsedSeconds}s elapsed</strong> : null}
              </div>
            ) : null}
            <p className="chat-disclaimer">Vivadeo may generate inaccurate information about people, places, or facts. Model: Vivadeo Archive Assistant.</p>
          </section>

          <section className="search-layout">
            <section className="search-feed">
              {turns.length === 0 ? (
                <article className="search-result chat-onboarding">
                  <h3>Welcome to Vivadeo</h3>
                  <p className="muted">Get started by asking about your videos and Vivadeo will find the relevant moments.</p>
                  <div className="chat-starters">
                    {[
                      ["Find a moment", "When did we talk about the launch?", "moment"],
                      ["Summarize a video", "Summarize the latest interview.", "summarize"],
                      ["Search transcripts", "What did the speaker say about pricing?", "transcripts"],
                      ["Compare footage", "Compare the two product demos.", "compare"],
                    ].map(([label, prompt, icon]) => (
                      <button key={label} type="button" className="chat-starter" onClick={() => setQuestion(prompt)}>
                        <svg className={`chat-starter-icon chat-starter-icon-${icon}`} viewBox="0 0 24 24" aria-hidden="true"><path d={starterPaths[icon as keyof typeof starterPaths]} /></svg>
                        <span>{label}</span><strong>＋</strong>
                      </button>
                    ))}
                  </div>
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
                  <h2>History ({recentSearches.length})</h2>
                  <p className="muted">Recent threads</p>
                </div>
                <button type="button" className="history-toggle" onClick={() => setHistoryOpen(false)} aria-label="Close history">›</button>
              </div>
              <button type="button" className="button-secondary chat-new-thread" onClick={() => { setTurns([]); setQuestion(""); }}>＋ New thread</button>
              <div className="chat-history-list">
                {recentSearches.length ? recentSearches.map((item) => (
                  <button key={item} type="button" className="chat-history-item" onClick={() => setQuestion(item)}>
                    <span>{item}</span><small>Recent question</small><i aria-hidden="true" />
                  </button>
                )) : <p className="muted chat-history-empty">Questions you ask will appear here.</p>}
              </div>
            </aside>
        {!historyOpen ? <button type="button" className="history-open-button" onClick={() => setHistoryOpen(true)} aria-label="Open history">‹ History</button> : null}
      </section>
    </DashboardShell>
  );
}
