import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { api } from "@/lib/api";

interface ConversationSummary {
  id: string;
  customerName: string | null;
  customerEmail: string | null;
  channel: string;
  escalated: boolean;
  lastMessageAt: string;
  _count: { messages: number };
  tickets: { id: string; status: string; priority: string }[];
}

interface Message {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  createdAt: string;
}

interface ConversationDetail extends ConversationSummary {
  messages: Message[];
}

export default function ConversationsPage() {
  const ready = useAuthGuard();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ConversationDetail | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const q = query ? `?q=${encodeURIComponent(query)}` : "";
    const res = await api.get<{ conversations: ConversationSummary[] }>(`/api/conversations${q}`);
    setConversations(res.conversations);
  }, [query]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  async function openConversation(id: string) {
    const res = await api.get<{ conversation: ConversationDetail }>(`/api/conversations/${id}`);
    setSelected(res.conversation);
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/api/conversations/${selected.id}/reply`, { message: reply });
      setReply("");
      openConversation(selected.id);
    } finally {
      setSending(false);
    }
  }

  if (!ready) return null;

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold mb-1">Conversations</h1>
      <p className="text-ink-soft mb-6">Full history of customer chats, searchable by name, email, or message content.</p>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search conversations..."
        className="w-full mb-4 rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-accent"
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 card p-0 overflow-hidden max-h-[70vh] overflow-y-auto">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => openConversation(c.id)}
              className={`w-full text-left px-4 py-3 border-b border-black/[0.04] hover:bg-black/[0.02] ${
                selected?.id === c.id ? "bg-accent-soft" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{c.customerName || c.customerEmail || "Anonymous"}</span>
                {c.escalated && <span className="text-xs text-signal-urgent font-medium">Escalated</span>}
              </div>
              <div className="text-xs text-ink-faint mt-0.5">
                {c._count.messages} messages · {new Date(c.lastMessageAt).toLocaleString()}
              </div>
            </button>
          ))}
          {conversations.length === 0 && <div className="px-4 py-10 text-center text-ink-faint text-sm">No conversations found.</div>}
        </div>

        <div className="lg:col-span-3 card flex flex-col max-h-[70vh]">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-ink-faint text-sm">Select a conversation to view it.</div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {selected.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "USER" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        m.role === "USER" ? "bg-accent text-white" : "bg-surface border border-black/[0.06]"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2 border-t border-black/[0.06] pt-4">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendReply()}
                  placeholder="Reply as a human agent..."
                  className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-accent"
                />
                <button
                  onClick={sendReply}
                  disabled={sending}
                  className="bg-accent text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-accent-dark disabled:opacity-60"
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
