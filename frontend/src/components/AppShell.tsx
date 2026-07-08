import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearSession, getBusiness, getUser } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard", glyph: "◆" },
  { href: "/knowledge-base", label: "Knowledge Base", glyph: "▤" },
  { href: "/ai-config", label: "AI Configuration", glyph: "◎" },
  { href: "/conversations", label: "Conversations", glyph: "◇" },
  { href: "/tickets", label: "Tickets", glyph: "▣" },
  { href: "/escalations", label: "Escalations", glyph: "▲" },
  { href: "/analytics", label: "Analytics", glyph: "▥" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const business = getBusiness();
  const user = getUser();

  function logout() {
    clearSession();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 bg-navy text-white flex flex-col">
        <div className="px-6 py-6 flex items-center gap-2 border-b border-navy-border">
          <span className="pulse-dot" />
          <span className="font-display font-bold text-lg tracking-tight">SupportBot</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active ? "bg-accent text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="w-4 text-center opacity-80">{item.glyph}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-navy-border">
          <div className="text-xs text-white/50 mb-1">{business?.name}</div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-white/90">{user?.name}</div>
            <button onClick={logout} className="text-xs text-white/50 hover:text-white underline">
              Log out
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
