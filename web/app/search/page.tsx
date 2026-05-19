"use client";

import { type FormEvent, useRef, useState } from "react";
import { AppTopbar } from "@/components/app-topbar";

type SearchResult = {
  chunk_id: string;
  organization_id: string;
  video_id: string;
  filename: string;
  source_uri: string;
  start_time: number;
  end_time: number;
  similarity_score: number;
};

function PlaceholderThumb({ tone = "tan" }: { tone?: "tan" | "grain" | "oxblood" }) {
  return (
    <div className={`search-thumb search-${tone}`}>
      <span />
      <i />
    </div>
  );
}

function ClipCard({ result }: { result: SearchResult }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const { video_id, filename, start_time, end_time, similarity_score } = result;
  const src = `/api/video/${video_id}#t=${start_time.toFixed(3)},${end_time.toFixed(3)}`;

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  function handleTimeUpdate() {
    const v = videoRef.current;
    if (!v) return;
    if (v.currentTime >= end_time) {
      v.currentTime = start_time;
      if (playing) v.play();
    }
  }

  function handlePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.currentTime < start_time || v.currentTime >= end_time) v.currentTime = start_time;
    v.play();
    setPlaying(true);
  }

  function handlePause() {
    videoRef.current?.pause();
    setPlaying(false);
  }

  return (
    <article className="search-result">
      <div className="search-top">
        <PlaceholderThumb tone="grain" />
        <div className="search-meta">
          <h3>{filename}</h3>
          <p className="muted">{result.source_uri}</p>
        </div>
        <div className="search-score">{(similarity_score * 100).toFixed(1)}%</div>
      </div>
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          if (videoRef.current) videoRef.current.currentTime = start_time;
          setPlaying(false);
        }}
        className="search-video"
      />
      <div className="search-footer">
        <p className="muted">{fmt(start_time)} - {fmt(end_time)}</p>
        <div className="search-actions">
          {playing ? (
            <button className="button-secondary" onClick={handlePause}>Pause</button>
          ) : (
            <button className="button" onClick={handlePlay}>Play clip</button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("Searching...");
    const response = await fetch("/api/proxy/v1/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) {
      setStatus(`Search failed (${response.status})`);
      return;
    }
    const payload = (await response.json()) as { results: SearchResult[] };
    setResults(payload.results);
    setStatus(payload.results.length === 0 ? "No results found." : `${payload.results.length} result(s) - click a clip to preview it`);
  };

  return (
    <div className="shell page">
      <AppTopbar />

      <section className="search-shell fade-in">
        <aside className="search-filters card">
          <h1>Search</h1>
          <p className="muted">Curated filter rail. Keep it tactile, not technical.</p>
          <div className="filter-group">
            <button className="filter-chip">Speaker's lists</button>
            <button className="filter-chip">Topics &amp; types</button>
            <button className="filter-chip">Budget</button>
            <button className="filter-chip">Date</button>
            <button className="filter-chip">Comments</button>
            <button className="filter-chip">Audience</button>
            <button className="filter-chip">Traveling from</button>
            <button className="filter-chip">WSB Exclusive</button>
          </div>
        </aside>

        <div className="search-main">
          <section className="card search-query">
            <form className="form" onSubmit={submit}>
              <div className="field">
                <label htmlFor="query">Search by keyword</label>
                <input id="query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="person entering loading dock" />
              </div>
              <button className="button" type="submit">Search</button>
            </form>
            {status ? <p className="muted" style={{ marginTop: 12 }}>{status}</p> : null}
          </section>

          <section className="search-feed">
            {results.map((result) => (
              <ClipCard key={result.chunk_id} result={result} />
            ))}
          </section>
        </div>
      </section>
    </div>
  );
}
