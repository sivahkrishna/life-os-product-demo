import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { SiteSettings } from "../types";
import { PasswordInput } from "./Login";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [brand, setBrand] = useState("Life OS");
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<SiteSettings>("/settings/site")
      .then((res) => {
        setBrand(res.data.site_title || "Life OS");
        setLogo(res.data.logo_url);
      })
      .catch(() => undefined);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      navigate("/dashboard");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Could not create your account. Try a different email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          {logo ? (
            <img src={logo} alt={`${brand} logo`} className="h-8 w-8 rounded-lg object-contain" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-display text-[0.875rem] font-bold text-primary-ink">
              L
            </span>
          )}
          <span className="font-display text-[1.125rem] font-semibold text-ink">{brand}</span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]">
          <h1 className="font-display text-[1.375rem] font-semibold text-ink">Create your workspace</h1>
          <p className="mt-1 text-[0.875rem] text-muted">Private to you from the first sign-in.</p>

          {error && (
            <div className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[0.8125rem] text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5">
            <label className="mb-4 block">
              <span className="mb-1.5 block text-[0.8125rem] font-medium text-ink">Full name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                required
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[0.875rem] text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-[0.8125rem] font-medium text-ink">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[0.875rem] text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-[0.8125rem] font-medium text-ink">Password</span>
              <PasswordInput
                id="register-password"
                value={password}
                onChange={setPassword}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
            </label>
            <label className="mb-5 block">
              <span className="mb-1.5 block text-[0.8125rem] font-medium text-ink">Confirm password</span>
              <PasswordInput
                id="register-confirm"
                value={confirm}
                onChange={setConfirm}
                placeholder="Repeat your password"
                autoComplete="new-password"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-[0.875rem] font-medium text-primary-ink transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-center text-[0.8125rem] text-muted">
            Already registered?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
