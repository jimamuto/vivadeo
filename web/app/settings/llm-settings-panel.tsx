"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

const providers = [
  ["vivadeo-auto", "Vivadeo Auto"],
  ["custom", "Custom endpoint"],
] as const;

function ProviderPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = providers.find(([optionValue]) => optionValue === value) || providers[0];

  useEffect(() => {
    function closePicker(event: PointerEvent) {
      if (event.target instanceof Node && !pickerRef.current?.contains(event.target)) setOpen(false);
    }
    function closePickerWithKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", closePicker);
    document.addEventListener("keydown", closePickerWithKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closePicker);
      document.removeEventListener("keydown", closePickerWithKeyboard);
    };
  }, []);

  return <div className="field provider-picker" ref={pickerRef}>
    <span id="provider-label">Provider</span>
    <button ref={triggerRef} className="provider-picker-trigger" type="button" aria-haspopup="listbox" aria-expanded={open} aria-labelledby="provider-label provider-value" onClick={() => setOpen((current) => !current)} onKeyDown={(event) => { if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpen(true); } }}>
      <span id="provider-value">{selected[1]}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
    </button>
    {open ? <div className="provider-picker-menu" role="listbox" aria-labelledby="provider-label">
      {providers.map(([optionValue, label]) => <button key={optionValue} className={`provider-picker-option${optionValue === value ? " is-selected" : ""}`} type="button" role="option" aria-selected={optionValue === value} onClick={() => { onChange(optionValue); setOpen(false); triggerRef.current?.focus(); }}>{label}{optionValue === value ? <span aria-hidden="true">✓</span> : null}</button>)}
    </div> : null}
  </div>;
}

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
        setProvider(payload.provider === "vivadeo-auto" ? "vivadeo-auto" : "custom");
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
          <h2>Video answer engine</h2>
          <p className="muted">Choose Vivadeo Auto or connect an AI provider you manage.</p>
        </div>
      </div>
      <form className="settings-form" onSubmit={save}>
        <div className="settings-form-grid">
          <ProviderPicker value={provider} onChange={setProvider} />
          {provider !== "vivadeo-auto" ? <>
            <label className="field"><span>Base URL</span><input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.example.com/v1" /></label>
            <label className="field"><span>Model</span><input value={model} onChange={(event) => setModel(event.target.value)} placeholder="Model name" /></label>
            <label className="field"><span>API key {apiKeyConfigured ? "(configured)" : ""}</span><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={apiKeyConfigured ? "Leave blank to keep current key" : "Paste API key"} autoComplete="off" /></label>
          </> : <p className="muted settings-inline-note">Vivadeo Auto is included with your workspace.</p>}
        </div>
        <div className="settings-actions"><button className="button" type="submit" disabled={saving}>{saving ? "Saving…" : "Save AI settings"}</button>{status ? <span className="muted" role="status">{status}</span> : null}</div>
        <p className="muted settings-inline-note">Keys are protected and never displayed again after saving.</p>
      </form>
    </section>
  );
}
