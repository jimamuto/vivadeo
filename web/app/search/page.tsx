"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

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

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("Searching...");
    const response = await fetch("/api/proxy/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    });
    if (!response.ok) {
      setStatus(`Search failed (${response.status})`);
      return;
    }
    const payload = (await response.json()) as { results: SearchResult[] };
    setResults(payload.results);
    setStatus(`${payload.results.length} result(s)`);
  };

  return (
    <div className="shell" style={{ padding: "28px 0 52px" }}>
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Vivadeo
        </div>
        <Link href="/dashboard" className="button-secondary">Back to dashboard</Link>
      </div>

      <section className="card fade-in">
        <h1>Search footage</h1>
        <p className="muted">Run semantic search against the active workspace and inspect clip timestamps.</p>
        <form className="form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="query">Query</label>
            <input id="query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="person entering loading dock" />
          </div>
          <button className="button" type="submit">Search</button>
        </form>

        {status ? <p className="muted">{status}</p> : null}
        <div className="split" style={{ marginTop: 18 }}>
          {results.map((result) => (
            <article className="card" key={result.chunk_id}>
              <h3>{result.filename}</h3>
              <p className="muted">{result.source_uri}</p>
              <p>{result.start_time.toFixed(1)}s - {result.end_time.toFixed(1)}s</p>
              <p>Score: {result.similarity_score.toFixed(3)}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
