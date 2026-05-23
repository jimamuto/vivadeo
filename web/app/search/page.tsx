"use client";

import { Suspense, type FormEvent, useEffect, useState } from "react";
import { AppTopbar } from "@/components/app-topbar";
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

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function SearchContent() {
  const [activeWorkspace, setActiveWorkspace] = useState("default-workspace");
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    setStatus("Searching transcripts and asking Gemma...");

    try {
      const response = await fetch("/api/proxy/v1/search/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextTurns.map(({ role, content }) => ({ role, content })),
          results: 8,
        }),
      });
      if (!response.ok) {
        setStatus(`Chat failed (${response.status})`);
        return;
      }
      const payload = (await response.json()) as { answer: string; citations: Citation[] };
      setTurns((current) => [...current, { role: "assistant", content: payload.answer, citations: payload.citations }]);
      recordRecentSearch(nextQuestion);
      appendActivity(activeWorkspace, "search.performed", nextQuestion);
      setStatus(payload.citations.length ? `${payload.citations.length} transcript citation(s).` : "No transcript citations yet.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Chat failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shell page">
      <AppTopbar />

      <section className="search-shell fade-in">
        <aside className="search-filters card">
          <h1>Ask Vivadeo</h1>
          <p className="muted">Transcript-grounded answers from workspace videos. Clip evidence arrives later.</p>
          <div className="field">
            <label htmlFor="workspace-filter">Workspace</label>
            <input id="workspace-filter" value={activeWorkspace} readOnly />
          </div>
          <div className="detail-card">
            <span>Answer source</span>
            <strong>faster-whisper transcripts</strong>
          </div>
          <div className="detail-card">
            <span>Model</span>
            <strong>Gemma E4B on Modal</strong>
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
          <section className="card search-query">
            <form className="form" onSubmit={submit}>
              <div className="field">
                <label htmlFor="query">Ask about your videos</label>
                <input
                  id="query"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="What did the speaker say about the launch timeline?"
                  disabled={loading}
                />
              </div>
              <div className="dashboard-panel-links">
                <button className="button" type="submit" disabled={loading}>{loading ? "Asking..." : "Ask"}</button>
                <button className="button-secondary" type="button" onClick={() => setTurns([])} disabled={loading || turns.length === 0}>Clear chat</button>
              </div>
            </form>
            {status ? <p className="muted" style={{ marginTop: 12 }}>{status}</p> : null}
          </section>

          <section className="search-layout">
            <section className="search-feed">
              {turns.length === 0 ? (
                <article className="search-result">
                  <h3>No questions yet</h3>
                  <p className="muted">Ask a text question. Vivadeo retrieves transcript evidence, then Gemma answers with citations.</p>
                </article>
              ) : (
                turns.map((turn, index) => (
                  <article key={`${turn.role}-${index}`} className="search-result">
                    <div className="search-top">
                      <div className="search-meta">
                        <p className="pill">{turn.role === "user" ? "You" : "Vivadeo"}</p>
                        <h3>{turn.content}</h3>
                      </div>
                    </div>
                    {turn.citations?.length ? (
                      <div className="dashboard-stack" style={{ marginTop: 12 }}>
                        {turn.citations.map((citation) => (
                          <article key={citation.segment_id} className="detail-card">
                            <span>{citation.filename} • {fmt(citation.start_time)} - {fmt(citation.end_time)}</span>
                            <strong className="detail-wrap">{citation.text}</strong>
                            <p className="muted">{citation.source_uri}</p>
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </section>

            <aside className="card search-preview">
              <div className="dashboard-panel-head">
                <h2>Evidence mode</h2>
                <p className="muted">Answers cite transcript ranges. Video clip extraction is intentionally disabled for this phase.</p>
              </div>
              <div className="dashboard-stack">
                <article className="detail-card">
                  <span>Current phase</span>
                  <strong>Text questions only</strong>
                </article>
                <article className="detail-card">
                  <span>Next phase</span>
                  <strong>Clip-backed answers from cited ranges</strong>
                </article>
              </div>
            </aside>
          </section>
        </div>
      </section>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchContent />
    </Suspense>
  );
}
