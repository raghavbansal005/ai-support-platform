import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { api } from "@/lib/api";

interface AIConfig {
  botName: string;
  welcomeMessage: string;
  personality: string;
  escalationRules: string[];
}

const RULE_OPTIONS = [
  { key: "refund_requested", label: "Refund requested" },
  { key: "legal_complaint", label: "Legal complaint" },
  { key: "customer_angry", label: "Customer angry" },
  { key: "human_requested", label: "Human requested" },
  { key: "payment_failure", label: "Payment failure" },
  { key: "service_outage", label: "Service outage" },
];

export default function AIConfigPage() {
  const ready = useAuthGuard();
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [embedSnippet, setEmbedSnippet] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!ready) return;
    api.get<{ config: AIConfig }>("/api/ai-config").then((r) => setConfig(r.config));
    api.get<{ embedSnippet: string }>("/api/business/me").then((r) => setEmbedSnippet(r.embedSnippet));
  }, [ready]);

  async function save() {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    try {
      await api.put("/api/ai-config", config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function toggleRule(key: string) {
    if (!config) return;
    const has = config.escalationRules.includes(key);
    setConfig({
      ...config,
      escalationRules: has ? config.escalationRules.filter((r) => r !== key) : [...config.escalationRules, key],
    });
  }

  if (!ready || !config) return null;

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold mb-1">AI Configuration</h1>
      <p className="text-ink-soft mb-6">Tune how your assistant introduces itself and when it hands off to a human.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">Bot name</label>
            <input
              value={config.botName}
              onChange={(e) => setConfig({ ...config, botName: e.target.value })}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-accent"
              placeholder="Acme AI Assistant"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Welcome message</label>
            <textarea
              value={config.welcomeMessage}
              onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Personality</label>
            <div className="flex gap-2">
              {["Professional", "Friendly", "Technical"].map((p) => (
                <button
                  key={p}
                  onClick={() => setConfig({ ...config, personality: p })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                    config.personality === p ? "bg-accent text-white border-accent" : "border-black/10 hover:bg-black/[0.02]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Escalate to a human when</label>
            <div className="space-y-2">
              {RULE_OPTIONS.map((r) => (
                <label key={r.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.escalationRules.includes(r.key)}
                    onChange={() => toggleRule(r.key)}
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="bg-accent text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-accent-dark disabled:opacity-60"
          >
            {saving ? "Saving..." : saved ? "Saved ✓" : "Save changes"}
          </button>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="font-display font-bold mb-2">Embed on your website</h2>
            <p className="text-sm text-ink-soft mb-3">Paste this snippet before the closing <code>&lt;/body&gt;</code> tag.</p>
            <pre className="bg-navy text-white text-xs rounded-lg p-4 overflow-x-auto">
              <code>{embedSnippet || "Loading..."}</code>
            </pre>
          </div>
          <div className="card">
            <h2 className="font-display font-bold mb-2">Preview</h2>
            <div className="rounded-lg border border-black/10 bg-surface p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="pulse-dot" />
                <span className="text-sm font-semibold">{config.botName || "Assistant"}</span>
              </div>
              <div className="bg-white rounded-lg rounded-tl-none px-3 py-2 text-sm shadow-card max-w-[85%]">
                {config.welcomeMessage}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
