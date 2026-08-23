"use client";

import { FormEvent, useEffect, useState } from "react";

const providers = [
  ["vivadeo-auto", "Vivadeo Auto"],
  ["openai", "OpenAI-compatible"],
  ["anthropic", "Anthropic"],
  ["ollama", "Ollama"],
  ["gemini", "Gemini-compatible"],
  ["nvidia", "NVIDIA-compatible"],
  ["custom", "Custom endpoint"],
] as const;

export function LlmSettingsPanel() {
  const [provider, setProvider] = useState("vivadeo-auto");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/proxy/v1/settings/llm", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load AI settings");
        const payload = await response.json() as { provider: string; base_url: string; model: string; api_key_configured: boolean };
        setProvider(payload.provider);
        setBaseUrl(payload.base_url);
        setModel(payload.model);
        setApiKeyConfigured(payload.api_key_configured);
      })
      .catch((cause) => setStatus(cause instanceof Error ? cause.message : "Could not load AI settings"));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/proxy/v1/settings/llm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, base_url: baseUrl.trim(), model: model.trim(), api_key: apiKey || null }),
      });
      if (!response.ok) throw new Error("Could not save AI settings");
      const payload = await response.json() as { api_key_configured: boolean };
      setApiKey("");
      setApiKeyConfigured(payload.api_key_configured);
      setStatus("AI settings saved.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Could not save AI settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="settings-section" id="ai">
      <div className="settings-section-heading">
        <div>
          <span className="eyebrow">AI providers</span>
          <h2>Video answer engine</h2>
          <p className="muted">Choose Vivadeo Auto or connect an OpenAI-compatible, Anthropic, Ollama, Gemini, or NVIDIA endpoint.</p>
        </div>
      </div>
      <form className="settings-form" onSubmit={save}>
        <div className="settings-form-grid">
          <label className="field"><span>Provider</span><select value={provider} onChange={(event) => setProvider(event.target.value)}>{providers.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {provider !== "vivadeo-auto" ? <>
            <label className="field"><span>Base URL</span><input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder={provider === "ollama" ? "http://localhost:11434" : "https://api.example.com/v1"} /></label>
            <label className="field"><span>Model</span><input value={model} onChange={(event) => setModel(event.target.value)} placeholder="Model name" /></label>
            <label className="field"><span>API key {apiKeyConfigured ? "(configured)" : ""}</span><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={apiKeyConfigured ? "Leave blank to keep current key" : "Paste API key"} autoComplete="off" /></label>
          </> : <p className="muted settings-inline-note">Free workspaces use the Modal-hosted Gemma fallback. Pro workspaces use the server-side Vivadeo Pro gateway configuration.</p>}
        </div>
        <div className="settings-actions"><button className="button" type="submit" disabled={saving}>{saving ? "Saving…" : "Save AI settings"}</button>{status ? <span className="muted" role="status">{status}</span> : null}</div>
        <p className="muted settings-inline-note">Keys are encrypted before PostgreSQL storage and are never returned to the browser. Pro gateway credentials stay server-side in environment configuration.</p>
      </form>
    </section>
  );
}
