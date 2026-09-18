"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { contactEmail } from "@/lib/site";

const topics = [
  { title: "Getting started", body: "Upload your first video, follow preparation, and ask a question when it is ready.", href: "/dashboard/ingest", action: "Open Add video", icon: "M12 4v10 M8 10l4 4 4-4 M5 19h14" },
  { title: "Search and evidence", body: "Learn how to ask focused questions, read citations, and review the moment behind an answer.", href: "/search", action: "Open Search", icon: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M16 16l4 4" },
  { title: "Account and workspace", body: "Manage your profile, team access, billing, and account preferences from Settings.", href: "/settings/account", action: "Open Settings", icon: "M12 3v18 M3 12h18 M6 6l12 12 M18 6 6 18" },
];

const questions = [
  ["How do I add a video?", "Open Add video from the sidebar, choose a file or permitted video URL, and wait for the video to become Ready before searching it."],
  ["Why can’t I search a video yet?", "Vivadeo prepares the transcript and searchable evidence first. Processing videos stay unavailable until preparation is complete."],
  ["How do citations work?", "Each answer can include a source video and timestamp range. Open the citation to inspect the footage before using it elsewhere."],
  ["Who can access my workspace?", "Workspace owners and admins manage members and roles. Viewers can inspect workspace content without making changes."],
  ["How do I change my password?", "Open Settings, choose Security, then enter your current password and the new password twice."],
] as const;

export function HelpContent() {
  const [query, setQuery] = useState("");
  const [openQuestion, setOpenQuestion] = useState(0);
  const [plan, setPlan] = useState("free");
  useEffect(() => {
    void fetch("/api/billing/summary", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const payload = await response.json() as { plan?: string };
      if (payload.plan) setPlan(payload.plan);
    }).catch(() => undefined);
  }, []);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleQuestions = useMemo(() => questions.filter(([question, answer]) => !normalizedQuery || `${question} ${answer}`.toLowerCase().includes(normalizedQuery)), [normalizedQuery]);
  const paidSupport = plan !== "free";

  return (
    <div className="help-page fade-in">
      <header className="help-hero">
        <p className="eyebrow">Support</p>
        <h1>Find your way around Vivadeo.</h1>
        <p>Search your archive, verify evidence, and keep your workspace moving. Start with a guide or ask a question below.</p>
        <label className="help-search"><span className="sr-only">Search help</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m20 20-4.5-4.5m2-5.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" /></svg><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search help articles..." /></label>
      </header>

      <section className="help-topic-grid" aria-label="Help topics">
        {topics.map((topic) => <article className="help-topic" key={topic.title}><span className="help-topic-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d={topic.icon} /></svg></span><h2>{topic.title}</h2><p>{topic.body}</p><Link href={topic.href as any}>{topic.action}<span aria-hidden="true"> →</span></Link></article>)}
      </section>

      <section className="help-faq" aria-labelledby="help-faq-title">
        <div className="help-faq-intro"><p className="eyebrow">Common questions</p><h2 id="help-faq-title">Questions, answered.</h2><p>Can’t find what you need? Email <a href={`mailto:${contactEmail}`}>{contactEmail}</a> and tell us what you were trying to do.</p></div>
        <div className="help-faq-list">
          {visibleQuestions.length ? visibleQuestions.map(([question, answer], index) => { const isOpen = openQuestion === index; const id = `help-answer-${index}`; return <div className="help-faq-item" key={question}><button type="button" aria-expanded={isOpen} aria-controls={id} onClick={() => setOpenQuestion(isOpen ? -1 : index)}><span>{question}</span><span aria-hidden="true">{isOpen ? "−" : "+"}</span></button>{isOpen ? <p id={id}>{answer}</p> : null}</div>; }) : <p className="help-empty">No help article matches “{query}”. Try another search or email us.</p>}
        </div>
      </section>

      <section className="help-contact" aria-labelledby="help-contact-title">
        <div><p className="eyebrow">{paidSupport ? "Priority support" : "Need a hand?"}</p><h2 id="help-contact-title">Still can’t find what you need?</h2><p>{paidSupport ? "Your paid workspace includes priority support. Tell us what you were trying to do and we’ll help you get unstuck." : "We’re happy to help. Paid workspaces receive priority support, while Free workspaces can still reach us with questions."}</p></div>
        <a className="button" href={`mailto:${contactEmail}?subject=${encodeURIComponent(paidSupport ? "Vivadeo priority support" : "Vivadeo help request")}`}>Contact support</a>
      </section>
    </div>
  );
}
