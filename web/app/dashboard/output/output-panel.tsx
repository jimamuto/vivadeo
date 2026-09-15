"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MascotScout } from "@/components/mascot-scout";
import type { ReviewEvidence } from "../review/review-panel";

type OutputFormat = "brief" | "structured" | "export";

function fmt(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function citation(item: ReviewEvidence) {
  return `${item.filename} (${fmt(item.start_time)}–${fmt(item.end_time)})`;
}

function plainBrief(items: ReviewEvidence[]) {
  return items.map((item) => `• ${item.text || item.note || "Verified video evidence"} — ${citation(item)}`).join("\n");
}

export function OutputPanel() {
  const [items, setItems] = useState<ReviewEvidence[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [format, setFormat] = useState<OutputFormat>("brief");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void fetch("/api/proxy/v1/review/evidence", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load verified evidence.");
        return response.json() as Promise<ReviewEvidence[]>;
      })
      .then((payload) => {
        const verified = payload.filter((item) => item.decision === "verified");
        setItems(verified);
        setSelectedIds(verified.map((item) => item.id));
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load verified evidence."))
      .finally(() => setLoading(false));
  }, []);

  const selected = useMemo(() => items.filter((item) => selectedIds.includes(item.id)), [items, selectedIds]);
  const grouped = useMemo(() => {
    const groups = new Map<string, ReviewEvidence[]>();
    for (const item of selected) groups.set(item.query, [...(groups.get(item.query) || []), item]);
    return Array.from(groups.entries());
  }, [selected]);

  function toggle(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(plainBrief(selected));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function download(kind: "json" | "csv") {
    const content = kind === "json"
      ? JSON.stringify(selected.map(({ query, filename, source_uri, start_time, end_time, text, note }) => ({ query, filename, source_uri, start_time, end_time, evidence: text, note })), null, 2)
      : ["query,filename,start_time,end_time,evidence,note", ...selected.map((item) => [item.query, item.filename, item.start_time, item.end_time, item.text, item.note || ""].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: kind === "json" ? "application/json" : "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `vivadeo-verified-evidence.${kind}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <section className="review-loading" aria-live="polite"><span className="vivadeo-loading-spinner" aria-hidden="true" /><p>Loading</p></section>;
  if (!items.length) return <section className="output-empty"><MascotScout size="large" motion="look" /><h2>Nothing is ready to output.</h2><p>Verify at least one evidence moment before creating an output.</p><Link className="button" href="/dashboard/review">Review evidence</Link></section>;

  return (
    <div className="output-workspace">
      <aside className="output-evidence-picker">
        <div className="output-picker-head"><span>Verified evidence</span><strong>{selected.length}/{items.length}</strong></div>
        {items.map((item) => <label key={item.id} className={selectedIds.includes(item.id) ? "is-selected" : ""}>
          <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggle(item.id)} />
          <span><strong>{item.filename}</strong><small>{fmt(item.start_time)}–{fmt(item.end_time)} · {item.query}</small></span>
        </label>)}
      </aside>

      <section className="output-builder">
        <div className="output-format-tabs" role="tablist" aria-label="Output format">
          <button type="button" role="tab" aria-selected={format === "brief"} className={format === "brief" ? "is-active" : ""} onClick={() => setFormat("brief")}>Brief</button>
          <button type="button" role="tab" aria-selected={format === "structured"} className={format === "structured" ? "is-active" : ""} onClick={() => setFormat("structured")}>Structured findings</button>
          <button type="button" role="tab" aria-selected={format === "export"} className={format === "export" ? "is-active" : ""} onClick={() => setFormat("export")}>Export</button>
        </div>

        {!selected.length ? <div className="output-selection-empty">Select at least one verified moment.</div> : format === "brief" ? <article className="output-preview">
          <div className="output-preview-head"><span>Evidence brief</span><button type="button" onClick={() => void copyOutput()}>{copied ? "Copied ✓" : "Copy brief"}</button></div>
          {grouped.map(([query, evidence]) => <section key={query}><h2>{query}</h2><ul>{evidence.map((item) => <li key={item.id}><p>{item.text || item.note || "Verified video evidence"}</p><small>{citation(item)}</small></li>)}</ul></section>)}
        </article> : format === "structured" ? <div className="output-table-wrap"><table><thead><tr><th>Finding</th><th>Source</th><th>Time</th><th>Note</th></tr></thead><tbody>{selected.map((item) => <tr key={item.id}><td>{item.text || "Verified evidence"}</td><td>{item.filename}</td><td>{fmt(item.start_time)}–{fmt(item.end_time)}</td><td>{item.note || "—"}</td></tr>)}</tbody></table></div> : <div className="output-export"><h2>Export verified evidence</h2><p>Download a portable record with source attribution and timestamp ranges attached.</p><div><button className="button" type="button" onClick={() => download("csv")}>Download CSV</button><button className="button-secondary" type="button" onClick={() => download("json")}>Download JSON</button></div></div>}
        {error ? <p className="review-error" role="alert">{error}</p> : null}
      </section>
    </div>
  );
}
