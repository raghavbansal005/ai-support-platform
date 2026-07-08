import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { api } from "@/lib/api";

interface AnalyticsData {
  chatMetrics: {
    totalConversations: number;
    avgResponseTimeMs: number;
    resolutionRate: number;
    escalationRate: number;
  };
  knowledgeBaseMetrics: {
    mostReferencedDocuments: { filename: string; count: number }[];
    failedQueries: number;
    unansweredQuestions: string[];
  };
}

export default function AnalyticsPage() {
  const ready = useAuthGuard();
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    if (!ready) return;
    api.get<AnalyticsData>("/api/analytics").then(setData);
  }, [ready]);

  if (!ready || !data) return null;

  const maxRef = Math.max(1, ...data.knowledgeBaseMetrics.mostReferencedDocuments.map((d) => d.count));

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold mb-1">Analytics</h1>
      <p className="text-ink-soft mb-6">How well the assistant is performing and what it's actually being used for.</p>

      <h2 className="font-display font-semibold mb-3 text-ink-soft text-sm uppercase tracking-wide">Chat metrics</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-ink-faint mb-2">Total Conversations</div>
          <div className="font-mono text-3xl font-bold">{data.chatMetrics.totalConversations}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-ink-faint mb-2">Avg Response Time</div>
          <div className="font-mono text-3xl font-bold">{(data.chatMetrics.avgResponseTimeMs / 1000).toFixed(1)}s</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-ink-faint mb-2">Resolution Rate</div>
          <div className="font-mono text-3xl font-bold text-signal-low">{data.chatMetrics.resolutionRate}%</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-ink-faint mb-2">Escalation Rate</div>
          <div className="font-mono text-3xl font-bold text-signal-urgent">{data.chatMetrics.escalationRate}%</div>
        </div>
      </div>

      <h2 className="font-display font-semibold mb-3 text-ink-soft text-sm uppercase tracking-wide">Knowledge base metrics</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-medium mb-4">Most referenced documents</h3>
          <div className="space-y-3">
            {data.knowledgeBaseMetrics.mostReferencedDocuments.map((d) => (
              <div key={d.filename}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="truncate pr-2">{d.filename}</span>
                  <span className="font-mono text-ink-faint">{d.count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-black/[0.06]">
                  <div className="h-1.5 rounded-full bg-accent" style={{ width: `${(d.count / maxRef) * 100}%` }} />
                </div>
              </div>
            ))}
            {data.knowledgeBaseMetrics.mostReferencedDocuments.length === 0 && (
              <p className="text-sm text-ink-faint">No documents referenced yet.</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="font-medium mb-1">Unanswered questions</h3>
          <p className="text-xs text-ink-faint mb-4">
            {data.knowledgeBaseMetrics.failedQueries} conversations where no knowledge-base source was used. Consider adding
            documents to cover these.
          </p>
          <ul className="space-y-2 text-sm text-ink-soft max-h-64 overflow-y-auto">
            {data.knowledgeBaseMetrics.unansweredQuestions.map((q, i) => (
              <li key={i} className="border-l-2 border-signal-medium pl-3">
                {q}
              </li>
            ))}
            {data.knowledgeBaseMetrics.unansweredQuestions.length === 0 && (
              <p className="text-ink-faint">Nothing here - the knowledge base is covering incoming questions well.</p>
            )}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
