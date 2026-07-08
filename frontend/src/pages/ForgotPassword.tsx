import { useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-surface">
      <div className="w-full max-w-sm card">
        <div className="flex items-center gap-2 mb-6">
          <span className="pulse-dot" />
          <span className="font-display font-bold text-lg">SupportBot</span>
        </div>
        <h2 className="font-display text-2xl font-bold mb-1">Reset your password</h2>
        <p className="text-ink-soft text-sm mb-6">We'll send a reset link to your email.</p>

        {sent ? (
          <div className="text-sm bg-accent-soft text-accent-dark rounded-lg px-3 py-3">
            If that email exists, a reset link is on its way. Check your inbox.
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            {error && <div className="mb-4 text-sm text-signal-urgent bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mb-6 rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-accent"
              placeholder="you@company.com"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-white rounded-lg py-2.5 text-sm font-medium hover:bg-accent-dark disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-6 text-sm text-ink-soft text-center">
          <Link to="/login" className="text-accent hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
