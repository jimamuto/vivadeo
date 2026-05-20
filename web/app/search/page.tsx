"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AppTopbar } from "@/components/app-topbar";
import { appendActivity } from "@/lib/activity-log";
import type { Video } from "@/lib/api";
import { useWorkspacePermissions } from "@/lib/workspace-permissions";

const SAVED_SEARCHES_KEY = "vivadeo.saved-searches";
const RECENT_SEARCHES_KEY = "vivadeo.recent-searches";

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

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function ClipCard({
  result,
  selected,
  onSelect,
  sourceType,
  status,
}: {
  result: SearchResult;
  selected: boolean;
  onSelect: () => void;
  sourceType: string;
  status: string;
}) {
  return (
    <button type="button" className={`search-result search-result-button${selected ? " is-active" : ""}`} onClick={onSelect}>
      <div className="search-top">
        <PlaceholderThumb tone={selected ? "oxblood" : "grain"} />
        <div className="search-meta">
          <h3>{result.filename}</h3>
          <p className="muted">{result.source_uri}</p>
          <p className="muted">{sourceType} • {status} • {fmt(result.start_time)} - {fmt(result.end_time)}</p>
        </div>
        <div className="search-score">{(result.similarity_score * 100).toFixed(1)}%</div>
      </div>
    </button>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [videos, setVideos] = useState<Record<string, Video>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [searchMode, setSearchMode] = useState<"text" | "image">("text");
  const [activeWorkspace, setActiveWorkspace] = useState("default-workspace");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeRangeFilter, setTimeRangeFilter] = useState("all");
  const [clipTypeFilter, setClipTypeFilter] = useState("all");
  const [minScore, setMinScore] = useState("0");
  const [savedSearches, setSavedSearches] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const permissions = useWorkspacePermissions(activeWorkspace);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    setSearchMode(searchParams.get("mode") === "image" ? "image" : "text");
    setSourceFilter(searchParams.get("source") ?? "all");
    setStatusFilter(searchParams.get("status") ?? "all");
    setTimeRangeFilter(searchParams.get("time") ?? "all");
    setClipTypeFilter(searchParams.get("clip") ?? "all");
    setMinScore(searchParams.get("score") ?? "0");
    setSelectedId(searchParams.get("result") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const workspace = document.cookie
      .split("; ")
      .find((item) => item.startsWith("vivadeo_workspace="))
      ?.split("=")[1];
    if (workspace) setActiveWorkspace(decodeURIComponent(workspace));
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/proxy/v1/videos");
        if (!response.ok) return;
        const payload = (await response.json()) as Video[];
        setVideos(Object.fromEntries(payload.map((video) => [video.id, video])));
      } catch {
        return;
      }
    })();
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SAVED_SEARCHES_KEY);
      const recent = window.localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) setSavedSearches(JSON.parse(saved) as string[]);
      if (recent) setRecentSearches(JSON.parse(recent) as string[]);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(savedSearches));
  }, [savedSearches]);

  useEffect(() => {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
  }, [recentSearches]);

  const filteredResults = useMemo(() => {
    return results.filter((result) => {
      const video = videos[result.video_id];
      if (sourceFilter !== "all" && video?.source_type !== sourceFilter) return false;
      if (statusFilter !== "all" && video?.status !== statusFilter) return false;
      if (timeRangeFilter !== "all" && video?.created_at) {
        const ageMs = Date.now() - new Date(video.created_at).getTime();
        const dayMs = 24 * 60 * 60 * 1000;
        if (timeRangeFilter === "7d" && ageMs > 7 * dayMs) return false;
        if (timeRangeFilter === "30d" && ageMs > 30 * dayMs) return false;
        if (timeRangeFilter === "90d" && ageMs > 90 * dayMs) return false;
      }
      if (clipTypeFilter !== "all") {
        const duration = result.end_time - result.start_time;
        if (clipTypeFilter === "short" && duration > 15) return false;
        if (clipTypeFilter === "medium" && (duration <= 15 || duration > 45)) return false;
        if (clipTypeFilter === "long" && duration <= 45) return false;
      }
      if (result.similarity_score < Number(minScore || 0)) return false;
      return true;
    });
  }, [clipTypeFilter, minScore, results, sourceFilter, statusFilter, timeRangeFilter, videos]);

  useEffect(() => {
    setSelectedId((current) => (current && filteredResults.some((result) => result.chunk_id === current) ? current : filteredResults[0]?.chunk_id ?? ""));
  }, [filteredResults]);

  const selectedResult = filteredResults.find((result) => result.chunk_id === selectedId) ?? filteredResults[0] ?? null;

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (searchMode !== "text") params.set("mode", searchMode);
    if (sourceFilter !== "all") params.set("source", sourceFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (timeRangeFilter !== "all") params.set("time", timeRangeFilter);
    if (clipTypeFilter !== "all") params.set("clip", clipTypeFilter);
    if (Number(minScore) > 0) params.set("score", minScore);
    if (selectedId) params.set("result", selectedId);
    const next = params.toString();
    router.replace(next ? `/search?${next}` : "/search", { scroll: false });
  }, [clipTypeFilter, minScore, query, router, selectedId, sourceFilter, statusFilter, timeRangeFilter]);

  function recordRecentSearch(value: string) {
    const next = value.trim();
    if (!next) return;
    setRecentSearches((current) => [next, ...current.filter((item) => item !== next)].slice(0, 6));
  }

  function saveCurrentSearch() {
    const next = query.trim();
    if (!next) return;
    setSavedSearches((current) => [next, ...current.filter((item) => item !== next)].slice(0, 8));
    setStatus(`Saved search: ${next}`);
  }

  function removeSavedSearch(value: string) {
    setSavedSearches((current) => current.filter((item) => item !== value));
  }

  async function copyPermalink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Permalink copied.");
    } catch {
      setStatus(url);
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("Searching...");
    const response =
      searchMode === "image"
        ? await (async () => {
            const file = imageRef.current?.files?.[0];
            if (!file) {
              setStatus("Choose image first.");
              return null;
            }
            const form = new FormData();
            form.append("image", file);
            return fetch("/api/proxy/v1/search/image?results=12", {
              method: "POST",
              body: form,
            });
          })()
        : await (async () => {
            const nextQuery = query.trim();
            if (!nextQuery) {
              setStatus("Enter search text first.");
              return null;
            }
            return fetch("/api/proxy/v1/search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: nextQuery, results: 12 }),
            });
          })();
    if (!response) return;
    if (!response.ok) {
      setStatus(`Search failed (${response.status})`);
      return;
    }
    const payload = (await response.json()) as { results: SearchResult[] };
    setResults(payload.results);
    if (searchMode === "text") {
      const nextQuery = query.trim();
      recordRecentSearch(nextQuery);
      appendActivity(activeWorkspace, "search.performed", nextQuery);
    } else {
      appendActivity(activeWorkspace, "search.performed", imageRef.current?.files?.[0]?.name || "image-search");
    }
    setStatus(payload.results.length === 0 ? "No results found." : `${payload.results.length} result(s). Select card for preview.`);
  };

  const selectedVideo = selectedResult ? videos[selectedResult.video_id] : null;
  const previewSrc = selectedVideo?.object_key
    ? `/api/proxy/v1/media/${selectedVideo.object_key}`
    : "";

  useEffect(() => {
    if (!selectedResult || !videoRef.current) return;
    const player = videoRef.current;
    const seekToMatch = () => {
      player.currentTime = selectedResult.start_time;
    };
    if (player.readyState >= 1) seekToMatch();
    else player.addEventListener("loadedmetadata", seekToMatch, { once: true });
    return () => {
      player.removeEventListener("loadedmetadata", seekToMatch);
    };
  }, [selectedResult, previewSrc]);

  function jumpToMatch() {
    if (!selectedResult || !videoRef.current) return;
    videoRef.current.currentTime = selectedResult.start_time;
    void videoRef.current.play().catch(() => {
      return;
    });
  }

  return (
    <div className="shell page">
      <AppTopbar />

      <section className="search-shell fade-in">
        <aside className="search-filters card">
          <h1>Search</h1>
          <p className="muted">Ranked results, real filters, one preview rail.</p>
          <div className="field">
            <label htmlFor="workspace-filter">Workspace</label>
            <input id="workspace-filter" value={activeWorkspace} readOnly />
          </div>
          <div className="field">
            <label htmlFor="source-filter">Source type</label>
            <select id="source-filter" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
              <option value="all">All sources</option>
              <option value="upload">Upload</option>
              <option value="url">URL</option>
              <option value="local_path">Local path</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="status-filter">Video status</label>
            <select id="status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="ready">Ready</option>
              <option value="queued">Queued</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="time-filter">Time range</label>
            <select id="time-filter" value={timeRangeFilter} onChange={(event) => setTimeRangeFilter(event.target.value)}>
              <option value="all">All time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="clip-filter">Clip type</label>
            <select id="clip-filter" value={clipTypeFilter} onChange={(event) => setClipTypeFilter(event.target.value)}>
              <option value="all">All clips</option>
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="min-score">Min similarity</label>
            <input id="min-score" type="number" min="0" max="1" step="0.05" value={minScore} onChange={(event) => setMinScore(event.target.value)} />
          </div>
        </aside>

        <div className="search-main">
          <section className="card search-query">
            <form className="form" onSubmit={submit}>
              <div className="dashboard-panel-links">
                <button type="button" className={searchMode === "text" ? "button" : "button-secondary"} onClick={() => setSearchMode("text")}>Text search</button>
                <button type="button" className={searchMode === "image" ? "button" : "button-secondary"} onClick={() => setSearchMode("image")}>Image search</button>
              </div>
              <div className="field">
                <label htmlFor={searchMode === "image" ? "image-query" : "query"}>
                  {searchMode === "image" ? "Search by image" : "Search by keyword"}
                </label>
                {searchMode === "image" ? (
                  <>
                    <input
                      ref={imageRef}
                      id="image-query"
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        setSelectedImage(file ? `${file.name} • ${(file.size / 1024).toFixed(0)} KB` : null);
                      }}
                    />
                    {selectedImage ? <p className="notice notice-soft">{selectedImage}</p> : null}
                  </>
                ) : (
                  <input id="query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="person entering loading dock" />
                )}
              </div>
              <div className="dashboard-panel-links">
                <button className="button" type="submit">Search</button>
                {searchMode === "text" ? <button className="button-secondary" type="button" onClick={saveCurrentSearch}>Save search</button> : null}
                <button className="button-secondary" type="button" onClick={copyPermalink}>Copy permalink</button>
              </div>
            </form>
            {status ? <p className="muted" style={{ marginTop: 12 }}>{status}</p> : null}
            {savedSearches.length > 0 ? (
              <div className="search-chip-group">
                <span className="search-chip-label">Saved</span>
                {savedSearches.map((item) => (
                  <div key={item} className="search-chip-row">
                    <button type="button" className="pill pill-button" onClick={() => setQuery(item)}>{item}</button>
                    <button type="button" className="pill pill-button" onClick={() => removeSavedSearch(item)}>Remove</button>
                  </div>
                ))}
              </div>
            ) : null}
            {recentSearches.length > 0 ? (
              <div className="search-chip-group">
                <span className="search-chip-label">Recent</span>
                {recentSearches.map((item) => (
                  <button key={item} type="button" className="pill pill-button" onClick={() => setQuery(item)}>{item}</button>
                ))}
              </div>
            ) : null}
          </section>

          <section className="search-layout">
            <section className="search-feed">
              {filteredResults.length === 0 ? (
                <article className="search-result">
                  <h3>No results yet</h3>
                  <p className="muted">Run search, then narrow with source and status filters.</p>
                </article>
              ) : (
                filteredResults.map((result) => (
                  <ClipCard
                    key={result.chunk_id}
                    result={result}
                    selected={result.chunk_id === selectedResult?.chunk_id}
                    onSelect={() => setSelectedId(result.chunk_id)}
                    sourceType={videos[result.video_id]?.source_type?.replace(/_/g, " ") ?? "unknown"}
                    status={videos[result.video_id]?.status ?? "unknown"}
                  />
                ))
              )}
            </section>

            <aside className="card search-preview">
              <div className="dashboard-panel-head">
                <h2>Preview</h2>
                <p className="muted">Selected result with visible score and playhead jump.</p>
              </div>
              {!selectedResult ? (
                <p className="muted">Pick result to preview clip.</p>
              ) : (
                <div className="dashboard-stack">
                  <video
                    ref={videoRef}
                    src={previewSrc}
                    muted
                    controls
                    playsInline
                    preload="metadata"
                    className="search-video"
                  />
                  <div className="detail-grid">
                    <article className="detail-card">
                      <span>Score</span>
                      <strong>{(selectedResult.similarity_score * 100).toFixed(1)}%</strong>
                    </article>
                    <article className="detail-card">
                      <span>Range</span>
                      <strong>{fmt(selectedResult.start_time)} - {fmt(selectedResult.end_time)}</strong>
                    </article>
                  </div>
                  <article className="detail-card">
                    <span>Source</span>
                    <strong className="detail-wrap">{selectedResult.source_uri}</strong>
                  </article>
                  <div className="dashboard-panel-links">
                    <button type="button" className="button-secondary" onClick={jumpToMatch}>
                      Jump to match
                    </button>
                    <Link
                      href={{
                        pathname: "/dashboard/clip-studio",
                        query: {
                          video_id: selectedResult.video_id,
                          start_time: selectedResult.start_time.toFixed(1),
                          end_time: selectedResult.end_time.toFixed(1),
                        },
                      }}
                      className="button"
                      aria-disabled={!permissions.canEdit}
                    >
                      Create clip
                    </Link>
                    {!permissions.canEdit ? <p className="muted">Viewer role can search but cannot create clips.</p> : null}
                  </div>
                </div>
              )}
            </aside>
          </section>
        </div>
      </section>
    </div>
  );
}
