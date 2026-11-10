import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { SiteSettings } from "../types";
import Card, { CardHeader } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Field, inputClass } from "../components/ui/Modal";
import { ErrorBlock, LoadingBlock } from "../components/ui/EmptyState";

export default function AdminSettingsPage() {
  const [site, setSite] = useState<SiteSettings | null>(null);
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<SiteSettings>("/settings/site");
      setSite(res.data);
      setTitle(res.data.site_title);
      setTagline(res.data.tagline);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not load site settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSite(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!title.trim()) {
      setMsg({ type: "err", text: "The site title cannot be empty." });
      return;
    }
    setSaving(true);
    try {
      const res = await api.put<SiteSettings>("/settings/site", {
        site_title: title.trim(),
        tagline: tagline.trim(),
      });
      setSite(res.data);
      setTitle(res.data.site_title);
      setTagline(res.data.tagline);
      setMsg({ type: "ok", text: "Site settings saved — the public pages now use these values." });
      document.title = res.data.site_title;
    } catch (err: any) {
      setMsg({ type: "err", text: err?.response?.data?.detail || "Could not save site settings." });
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg(null);
    const data = new FormData();
    data.append("file", file);
    try {
      const res = await api.post<SiteSettings>("/settings/site/logo", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSite(res.data);
      setUploadMsg({ type: "ok", text: "Logo uploaded." });
    } catch (err: any) {
      setUploadMsg({ type: "err", text: err?.response?.data?.detail || "Could not upload the logo." });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  if (loading) {
    return (
      <Card>
        <LoadingBlock label="Loading site settings" />
      </Card>
    );
  }
  if (error) return <ErrorBlock message={error} onRetry={load} />;

  return (
    <div className="max-w-3xl space-y-5">
      <Card>
        <CardHeader
          title="Branding"
          subtitle="The name and tagline shown on the public site, sign-in screens and app navigation"
        />
        <form onSubmit={saveSite}>
          {msg && (
            <div
              className={`mb-4 rounded-lg border px-3 py-2 text-[0.8125rem] ${
                msg.type === "ok"
                  ? "border-success/30 bg-success/5 text-success"
                  : "border-danger/30 bg-danger/5 text-danger"
              }`}
            >
              {msg.text}
            </div>
          )}
          <Field label="Site title">
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Tagline" hint="One line describing the product.">
            <input className={inputClass} value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </Field>
          <Button type="submit" loading={saving}>
            Save changes
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Logo" subtitle="PNG, SVG or WebP — a transparent PNG works best" />
        {uploadMsg && (
          <div
            className={`mb-4 rounded-lg border px-3 py-2 text-[0.8125rem] ${
              uploadMsg.type === "ok"
                ? "border-success/30 bg-success/5 text-success"
                : "border-danger/30 bg-danger/5 text-danger"
            }`}
          >
            {uploadMsg.text}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-border bg-surfaceMuted">
            {site?.logo_url ? (
              <img src={site.logo_url} alt="Current site logo" className="h-full w-full object-contain p-2" />
            ) : (
              <span className="font-display text-[0.75rem] text-muted">No logo</span>
            )}
          </div>
          <div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-[0.875rem] font-medium text-ink transition-colors hover:bg-surfaceMuted">
              {uploading ? "Uploading…" : "Choose file"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={uploadLogo}
                disabled={uploading}
                className="sr-only"
              />
            </label>
            <p className="mt-2 text-[0.75rem] text-muted">
              The uploaded logo replaces the current one everywhere the brand appears.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Preview" subtitle="How the brand renders in the app header" />
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-bg px-4 py-3">
          {site?.logo_url ? (
            <img src={site.logo_url} alt="" className="h-7 w-7 rounded-lg object-contain" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary font-display text-[0.8125rem] font-bold text-primary-ink">
              L
            </span>
          )}
          <div>
            <p className="font-display text-[1rem] font-semibold leading-tight text-ink">{site?.site_title}</p>
            <p className="text-[0.6875rem] text-muted">{site?.tagline}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
