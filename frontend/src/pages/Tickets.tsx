import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { api } from "@/lib/api";

interface Ticket {
  id: string;
  customerName: string;
  customerEmail: string;
  query: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  createdAt: string;
}

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: "bg-red-50 text-signal-urgent",
  HIGH: "bg-orange-50 text-signal-high",
  MEDIUM: "bg-yellow-50 text-signal-medium",
  LOW: "bg-green-50 text-signal-low",
};

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function TicketsPage() {
  const ready = useAuthGuard();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<string>("");

  const load = useCallback(async () => {
    const q = filter ? `?status=${filter}` : "";
    const res = await api.get<{ tickets: Ticket[] }>(`/api/tickets${q}`);
    setTickets(res.tickets);
  }, [filter]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  async function updateStatus(id: string, status: string) {
    await api.patch(`/api/tickets/${id}`, { status });
    load();
  }

  if (!ready) return null;

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl font-bold">Tickets</h1>
      </div>
      <p className="text-ink-soft mb-6">Issues the assistant couldn't fully resolve on its own.</p>

      <div className="flex gap-2 mb-4">
        {["", ...STATUS_OPTIONS].map((s) => (
          <button
            key={s || "all"}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              filter === s ? "bg-navy text-white border-navy" : "border-black/10 text-ink-soft hover:bg-black/[0.02]"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/[0.02] text-ink-faint text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Customer</th>
              <th className="text-left px-4 py-3 font-medium">Query</th>
              <th className="text-left px-4 py-3 font-medium">Priority</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="border-t border-black/[0.04] align-top">
                <td className="px-4 py-3">
                  <div className="font-medium">{t.customerName}</div>
                  <div className="text-xs text-ink-faint">{t.customerEmail}</div>
                </td>
                <td className="px-4 py-3 max-w-sm text-ink-soft">{t.query}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_COLOR[t.priority]}`}>{t.priority}</span>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={t.status}
                    onChange={(e) => updateStatus(t.id, e.target.value)}
                    className="text-xs border border-black/10 rounded-lg px-2 py-1"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-ink-faint">{new Date(t.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-faint">
                  No tickets here. Nice and quiet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
