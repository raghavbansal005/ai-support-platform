import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { api } from "@/lib/api";

interface EscalationData {
  counts: { URGENT: number; HIGH: number; MEDIUM: number; LOW: number };
  recent: {
    id: string;
    customerName: string;
    customerEmail: string;
    query: string;
    priority: string;
    createdAt: string;
  }[];
}

const TIER_STYLE: Record<string, string> = {
  URGENT: "border-signal-urgent/30 bg-red-50",
  HIGH: "border-signal-high/30 bg-orange-50",
  MEDIUM: "border-signal-medium/30 bg-yellow-50",
  LOW: "border-signal-low/30 bg-green-50",
};

export default function EscalationsPage() {
  const ready = useAuthGuard();
  const [data, setData] = useState<EscalationData | null>(null);

  useEffect(() => {
    if (!ready) return;
    api.get<EscalationData>("/api/analytics/escalations").then(setData);
  }, [ready]);

  if (!ready || !data) return null;

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold mb-1">Escalation Dashboard</h1>
      <p className="text-ink-soft mb-6">Open issues the assistant flagged for human attention, by urgency.</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {(["URGENT", "HIGH", "MEDIUM", "LOW"] as const).map((tier) => (
          <div key={tier} className={`card border ${TIER_STYLE[tier]}`}>
            <div className="text-xs uppercase tracking-wide text-ink-faint mb-2">{tier}</div>
            <div className="font-mono text-3xl font-bold">{data.counts[tier]}</div>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/[0.02] text-ink-faint text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Customer</th>
              <th className="text-left px-4 py-3 font-medium">Issue</th>
              <th className="text-left px-4 py-3 font-medium">Priority</th>
              <th className="text-left px-4 py-3 font-medium">Flagged</th>
            </tr>
          </thead>
          <tbody>
            {data.recent.map((r) => (
              <tr key={r.id} className="border-t border-black/[0.04]">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.customerName}</div>
                  <div className="text-xs text-ink-faint">{r.customerEmail}</div>
                </td>
                <td className="px-4 py-3 max-w-md text-ink-soft">{r.query}</td>
                <td className="px-4 py-3 font-medium">{r.priority}</td>
                <td className="px-4 py-3 text-ink-faint">{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {data.recent.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-ink-faint">
                  Nothing escalated right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
