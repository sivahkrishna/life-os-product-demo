import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { SiteSettings } from "../types";

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="w-full rounded-lg border border-border bg-surface py-2 pl-3 pr-11 text-[0.875rem] text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      <button
        type="button"
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {show ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />}
      </button>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not sign in. Check your email and password.");
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
          <h1 className="font-display text-[1.375rem] font-semibold text-ink">Sign in</h1>
          <p className="mt-1 text-[0.875rem] text-muted">Your private workspace is waiting.</p>

          {error && (
            <div className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[0.8125rem] text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5">
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
            <label className="mb-5 block">
              <span className="mb-1.5 block text-[0.8125rem] font-medium text-ink">Password</span>
              <PasswordInput
                id="login-password"
                value={password}
                onChange={setPassword}
                placeholder="Your password"
                autoComplete="current-password"
              />
            </label>
            <div className="mb-4 -mt-2 text-right">
              <Link to="/forgot-password" className="text-[0.8125rem] font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-[0.875rem] font-medium text-primary-ink transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-5 text-center text-[0.8125rem] text-muted">
            New here?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-surface px-4 py-3 text-[0.75rem] leading-relaxed text-muted">
          <p className="font-medium text-ink">Demo account</p>
          <p className="mt-0.5">demo@lifeos.app / Demo@123</p>
        </div>
      </div>
    </div>
  );
}
