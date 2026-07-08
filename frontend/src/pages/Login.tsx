import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError, setSession } from "@/lib/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ token: string; business: any; user: any }>("/api/auth/login", { email, password });
      setSession(res.token, res.business, res.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-navy text-white px-16 py-16">
        <div className="flex items-center gap-2">
          <span className="pulse-dot" />
          <span className="font-display font-bold text-xl">SupportBot</span>
        </div>
        <div>
          <h1 className="font-display text-4xl font-bold leading-tight max-w-md">
            Every customer question, answered by what your business already knows.
          </h1>
          <p className="mt-4 text-white/60 max-w-sm">
            Train an assistant on your docs, deploy it in minutes, and let it hand off to your team the moment it matters.
          </p>
        </div>
        <p className="text-xs text-white/40">© {new Date().getFullYear()} SupportBot Console</p>
      </div>
      <div className="flex-1 flex items-center justify-center px-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <h2 className="font-display text-2xl font-bold mb-1">Log in</h2>
          <p className="text-ink-soft text-sm mb-6">Welcome back to your support console.</p>

          {error && <div className="mb-4 text-sm text-signal-urgent bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-4 rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-accent"
            placeholder="you@company.com"
          />

          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-2 rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-accent"
            placeholder="••••••••"
          />
          <div className="text-right mb-6">
            <Link to="/forgot-password" className="text-xs text-accent hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white rounded-lg py-2.5 text-sm font-medium hover:bg-accent-dark disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>

          <p className="mt-6 text-sm text-ink-soft text-center">
            New here?{" "}
            <Link to="/register" className="text-accent hover:underline">
              Create a business account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
