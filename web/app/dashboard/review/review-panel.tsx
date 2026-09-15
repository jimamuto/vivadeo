"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MascotScout } from "@/components/mascot-scout";

type ReviewDecision = "pending" | "verified" | "rejected" | "needs_context";

export type ReviewEvidence = {
  id: string;
  search_run_id: string;
  thread_id: string | null;
  query: string;
  video_id: string;
  filename: string;
  source_uri: string;
  video_url: string | null;
  duration: number | null;
  start_time: number;
  end_time: number;
  text: string;
  modality: string;
  decision: ReviewDecision;
  note: string | null;
  created_at: string;
  updated_at: string;
};

function fmt(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function decisionLabel(decision: ReviewDecision) {
  if (decision === "verified") return "Verified";
  if (decision === "rejected") return "Rejected";
  if (decision === "needs_context") return "Needs context";
  return "Not reviewed";
}

export function ReviewPanel() {
  const [items, setItems] = useState<ReviewEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeRunId, setActiveRunId] = useState("");
  const [activeItemId, setActiveItemId] = useState("");
  const [savingId, setSavingId] = useState("");
  const [note, setNote] = useState("");
  const playerRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let mounted = true;
    void fetch("/api/proxy/v1/review/evidence", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load review evidence.");
        return response.json() as Promise<ReviewEvidence[]>;
      })
      .then((payload) => {
        if (!mounted) return;
        setItems(payload);
        setActiveRunId(payload[0]?.search_run_id || "");
        setActiveItemId(payload[0]?.id || "");
      })
      .catch((cause) => mounted && setError(cause instanceof Error ? cause.message : "Could not load review evidence."))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const sessions = useMemo(() => {
    const grouped = new Map<string, ReviewEvidence[]>();
    for (const item of items) grouped.set(item.search_run_id, [...(grouped.get(item.search_run_id) || []), item]);
    return Array.from(grouped.entries()).map(([id, evidence]) => ({ id, evidence }));
  }, [items]);
  const activeSession = sessions.find((session) => session.id === activeRunId) || sessions[0];
  const activeItem = activeSession?.evidence.find((item) => item.id === activeItemId) || activeSession?.evidence[0];
  const verifiedCount = activeSession?.evidence.filter((item) => item.decision === "verified").length || 0;

  useEffect(() => {
    if (!activeItem) return;
    setActiveItemId(activeItem.id);
    setNote(activeItem.note || "");
    const player = playerRef.current;
    if (!player) return;
    const seek = () => { player.currentTime = activeItem.start_time; };
    if (player.readyState >= 1) seek();
    else player.addEventListener("loadedmetadata", seek, { once: true });
  }, [activeItem?.id]);

  function chooseSession(runId: string) {
    const first = sessions.find((session) => session.id === runId)?.evidence[0];
    setActiveRunId(runId);
    setActiveItemId(first?.id || "");
  }

  async function updateDecision(decision: ReviewDecision) {
    if (!activeItem) return;
    setSavingId(activeItem.id);
    setError("");
    try {
      const response = await fetch(`/api/proxy/v1/review/evidence/${activeItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: note.trim() || null }),
      });
      if (!response.ok) throw new Error("Could not save this review decision.");
      const updated = await response.json() as ReviewEvidence;
      setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this review decision.");
    } finally {
      setSavingId("");
    }
  }

  async function removeItem() {
    if (!activeItem) return;
    setSavingId(activeItem.id);
    try {
      const response = await fetch(`/api/proxy/v1/review/evidence/${activeItem.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not remove this evidence.");
      const remaining = items.filter((item) => item.id !== activeItem.id);
      setItems(remaining);
      const next = remaining.find((item) => item.search_run_id === activeRunId) || remaining[0];
      setActiveRunId(next?.search_run_id || "");
      setActiveItemId(next?.id || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove this evidence.");
    } finally {
      setSavingId("");
    }
  }

  if (loading) return <section className="review-loading" aria-live="polite"><span className="vivadeo-loading-spinner" aria-hidden="true" /><p>Loading</p></section>;
  if (!items.length) return (
    <section className="review-empty-simple" aria-labelledby="review-empty-title">
      <MascotScout size="large" motion="look" />
      <h1 id="review-empty-title">No evidence to review yet.</h1>
      <p>Add moments from a search answer, then verify them here.</p>
      <Link className="button" href="/search">Search videos</Link>
    </section>
  );

  return (
    <>
      <header className="workflow-step-header review-populated-header">
        <div><h1>Review evidence</h1><p>Inspect each moment in context and keep only what supports your work.</p></div>
        <div className="review-header-actions"><Link className="button-secondary" href="/search">Collect evidence</Link><Link className="button" href="/dashboard/output">Create output</Link></div>
      </header>
      <div className="review-workspace">
      <nav className="review-sessions" aria-label="Review sessions">
        <div className="review-sessions-heading"><span>Review sessions</span><strong>{sessions.length}</strong></div>
        {sessions.map((session) => {
          const verified = session.evidence.filter((item) => item.decision === "verified").length;
          return <button type="button" key={session.id} className={session.id === activeSession?.id ? "is-active" : ""} onClick={() => chooseSession(session.id)}><span>{session.evidence[0].query}</span><small>{verified}/{session.evidence.length} verified</small></button>;
        })}
      </nav>

      <section className="review-stage">
        <header className="review-stage-head">
          <div><span>From Search</span><h2>{activeItem?.query}</h2></div>
          <div className="review-stage-count"><strong>{verifiedCount}</strong><span>of {activeSession?.evidence.length || 0} verified</span></div>
        </header>

        {activeItem ? <>
          <section className="review-player-wrap" aria-label="Selected evidence moment">
            {activeItem.video_url ? <video ref={playerRef} key={activeItem.video_url} controls preload="metadata" src={activeItem.video_url} /> : <div className="review-player-missing">Preview unavailable</div>}
            <div className="review-player-caption"><div><strong>{activeItem.filename}</strong><span>{fmt(activeItem.start_time)}–{fmt(activeItem.end_time)} · {activeItem.modality} evidence</span></div><span className={`review-decision review-decision-${activeItem.decision}`}>{decisionLabel(activeItem.decision)}</span></div>
          </section>

          <section className="review-filmstrip" aria-label="Collected evidence moments">
            <span className="review-sprockets" aria-hidden="true" />
            <div className="review-filmstrip-track">
              {activeSession?.evidence.map((item, index) => <button type="button" key={item.id} className={item.id === activeItem.id ? "is-active" : ""} onClick={() => setActiveItemId(item.id)} aria-label={`Review moment ${index + 1}, ${fmt(item.start_time)} to ${fmt(item.end_time)}`}>
                {item.video_url ? <video muted preload="metadata" src={`${item.video_url}#t=${Math.max(0, item.start_time)}`} /> : <span className="review-frame-placeholder" />}
                <span>{fmt(item.start_time)}–{fmt(item.end_time)}</span>
                <i className={`review-frame-state review-frame-state-${item.decision}`} aria-hidden="true" />
              </button>)}
            </div>
            <span className="review-sprockets" aria-hidden="true" />
          </section>

          <section className="review-inspector">
            <div className="review-context">
              <span>Evidence context</span>
              <p>{activeItem.text || "No transcript or visual description was attached to this moment."}</p>
              {/^https?:\/\//i.test(activeItem.source_uri) ? <a href={activeItem.source_uri} target="_blank" rel="noreferrer">View source attribution</a> : <small className="review-source-label">Source: {activeItem.source_uri}</small>}
            </div>
            <div className="review-decision-panel">
              <label htmlFor="review-note">Review note</label>
              <textarea id="review-note" rows={3} value={note} onChange={(event) => setNote(event.currentTarget.value)} placeholder="What makes this moment useful or uncertain?" />
              <div className="review-decision-actions">
                <button type="button" className={activeItem.decision === "verified" ? "is-active" : ""} disabled={savingId === activeItem.id} onClick={() => void updateDecision("verified")}>Keep as verified</button>
                <button type="button" className={activeItem.decision === "needs_context" ? "is-active" : ""} disabled={savingId === activeItem.id} onClick={() => void updateDecision("needs_context")}>Needs context</button>
                <button type="button" className={activeItem.decision === "rejected" ? "is-active" : ""} disabled={savingId === activeItem.id} onClick={() => void updateDecision("rejected")}>Reject</button>
              </div>
              <button type="button" className="review-remove" disabled={savingId === activeItem.id} onClick={() => void removeItem()}>Remove from Review</button>
              {activeItem.thread_id ? <Link className="review-return" href={`/chat?thread=${activeItem.thread_id}`}>Return to originating search</Link> : <Link className="review-return" href="/search">Return to Search</Link>}
            </div>
          </section>
        </> : null}
        {error ? <p className="review-error" role="alert">{error}</p> : null}
      </section>
      </div>
    </>
  );
}
