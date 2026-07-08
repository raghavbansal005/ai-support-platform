import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError, setSession } from "@/lib/api";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ businessName: "", name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ token: string; business: any; user: any }>("/api/auth/register", form);
      setSession(res.token, res.business, res.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-surface">
      <form onSubmit={onSubmit} className="w-full max-w-sm card">
        <div className="flex items-center gap-2 mb-6">
          <span className="pulse-dot" />
          <span className="font-display font-bold text-lg">SupportBot</span>
        </div>
        <h2 className="font-display text-2xl font-bold mb-1">Create your account</h2>
        <p className="text-ink-soft text-sm mb-6">Set up your business's AI support assistant.</p>

        {error && <div className="mb-4 text-sm text-signal-urgent bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

        <label className="block text-sm font-medium mb-1">Business name</label>
        <input
          required
          value={form.businessName}
          onChange={(e) => setForm({ ...form, businessName: e.target.value })}
          className="w-full mb-4 rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-accent"
          placeholder="Acme Corp"
        />

        <label className="block text-sm font-medium mb-1">Your name</label>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full mb-4 rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-accent"
          placeholder="Jane Doe"
        />

        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full mb-4 rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-accent"
          placeholder="you@company.com"
        />

        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          required
          minLength={8}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full mb-6 rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-accent"
          placeholder="At least 8 characters"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-white rounded-lg py-2.5 text-sm font-medium hover:bg-accent-dark disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>

        <p className="mt-6 text-sm text-ink-soft text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-accent hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
