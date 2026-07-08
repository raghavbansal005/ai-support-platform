import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import StatCard from "@/components/StatCard";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { api } from "@/lib/api";

interface DashboardStats {
  totalConversations: number;
  openTickets: number;
  resolvedTickets: number;
  escalatedTickets: number;
  aiResolutionRate: number;
}

export default function DashboardPage() {
  const ready = useAuthGuard();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    if (!ready) return;
    api.get<DashboardStats>("/api/analytics/dashboard").then(setStats).catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-ink-soft mb-8">A snapshot of how your assistant is performing right now.</p>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Conversations" value={stats?.totalConversations ?? "—"} />
        <StatCard label="Open Tickets" value={stats?.openTickets ?? "—"} accent="medium" />
        <StatCard label="Resolved Tickets" value={stats?.resolvedTickets ?? "—"} accent="low" />
        <StatCard label="Escalated" value={stats?.escalatedTickets ?? "—"} accent="urgent" />
        <StatCard label="AI Resolution Rate" value={stats ? `${stats.aiResolutionRate}%` : "—"} />
      </div>

      <div className="mt-10 card">
        <h2 className="font-display font-bold mb-2">Get your widget live</h2>
        <p className="text-sm text-ink-soft mb-4">
          Upload a few knowledge base documents, tune your assistant's personality, then grab the embed snippet from
          the AI Configuration page and drop it into your site.
        </p>
        <div className="flex gap-3 text-sm">
          <a href="/knowledge-base" className="px-4 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent-dark">
            Upload documents
          </a>
          <a href="/ai-config" className="px-4 py-2 rounded-lg border border-black/10 font-medium hover:bg-black/[0.02]">
            Configure assistant
          </a>
        </div>
      </div>
    </AppShell>
  );
}
