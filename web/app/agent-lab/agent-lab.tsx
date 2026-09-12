"use client";

import { FormEvent, useState } from "react";
import { useEveAgent } from "eve/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AgentLab() {
  const [draft, setDraft] = useState("");
  const agent = useEveAgent();
  const busy = agent.status === "submitted" || agent.status === "streaming";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || agent.status === "resuming") return;
    setDraft("");
    void agent.send(message, busy ? { turnPolicy: "steer" } : undefined);
  }

  return (
    <section className="agent-lab">
      <header className="agent-lab-heading">
        <p className="eyebrow">Agent preview</p>
        <h1>Research your archive conversationally</h1>
        <p>Try follow-up questions, broad investigations, and comparisons. The agent searches only evidence available to this workspace.</p>
      </header>
      <div className="agent-lab-feed" aria-live="polite">
        {agent.data.messages.length === 0 ? (
          <div className="agent-lab-empty">
            <strong>Start with a research question</strong>
            <span>For example: “What objections came up across the recent interviews?”</span>
          </div>
        ) : agent.data.messages.map((message) => (
          <article className={`agent-lab-message agent-lab-message-${message.role}`} key={message.id}>
            <small>{message.role === "user" ? "You" : "Vivadeo"}</small>
            {message.parts.map((part, index) => part.type === "text" ? (
              <ReactMarkdown key={index} remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
            ) : part.type === "dynamic-tool" ? (
              <p className="agent-lab-activity" key={index}>{part.state === "output-available" ? "Evidence reviewed" : "Reviewing video evidence…"}</p>
            ) : null)}
          </article>
        ))}
        {busy ? <p className="agent-lab-status">Vivadeo is investigating…</p> : null}
        {agent.error ? <p className="agent-lab-error" role="alert">{agent.error.message}</p> : null}
      </div>
      <form className="agent-lab-composer" onSubmit={submit}>
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask across your video archive…" maxLength={3000} rows={3} />
        <div>
          <span>Durable research preview</span>
          {busy ? <button type="button" onClick={() => void agent.cancel()}>Stop</button> : <button type="submit" disabled={!draft.trim()}>Send</button>}
        </div>
      </form>
    </section>
  );
}
