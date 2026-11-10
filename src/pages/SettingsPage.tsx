import { FormEvent, useEffect, useState } from "react";
import { format } from "date-fns";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Card, { CardHeader } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { Field, inputClass } from "../components/ui/Modal";
import { PasswordInput } from "./Login";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
  }, [user]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    if (!name.trim() || !email.trim()) {
      setProfileMsg({ type: "err", text: "Name and email are both required." });
      return;
    }
    setProfileSaving(true);
    try {
      await api.put("/settings/profile", { name: name.trim(), email: email.trim() });
      await refreshUser();
      setProfileMsg({ type: "ok", text: "Profile updated." });
    } catch (err: any) {
      setProfileMsg({
        type: "err",
        text: err?.response?.data?.detail || "Could not update your profile.",
      });
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPassword.length < 6) {
      setPwMsg({ type: "err", text: "The new password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: "err", text: "The new passwords do not match." });
      return;
    }
    setPwSaving(true);
    try {
      await api.put("/settings/password", { old_password: oldPassword, new_password: newPassword });
      setPwMsg({ type: "ok", text: "Password changed." });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwMsg({
        type: "err",
        text: err?.response?.data?.detail || "Could not change your password.",
      });
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <Card>
        <CardHeader title="Your account" subtitle="Details attached to your private workspace" />
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">Name</dt>
            <dd className="mt-1 text-[0.9375rem] text-ink">{user?.name}</dd>
          </div>
          <div>
            <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">Email</dt>
            <dd className="mt-1 text-[0.9375rem] text-ink">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">Role</dt>
            <dd className="mt-1">
              <Badge tone={user?.role === "OWNER" ? "primary" : "neutral"}>{user?.role ?? "USER"}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">Member since</dt>
            <dd className="mt-1 text-[0.9375rem] text-ink">
              {user?.created_at ? format(new Date(user.created_at), "d MMMM yyyy") : "—"}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardHeader title="Edit profile" subtitle="Change the name and email shown across your workspace" />
        <form onSubmit={saveProfile}>
          {profileMsg && (
            <div
              className={`mb-4 rounded-lg border px-3 py-2 text-[0.8125rem] ${
                profileMsg.type === "ok"
                  ? "border-success/30 bg-success/5 text-success"
                  : "border-danger/30 bg-danger/5 text-danger"
              }`}
            >
              {profileMsg.text}
            </div>
          )}
          <Field label="Full name">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </Field>
          <Button type="submit" loading={profileSaving}>
            Save profile
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Change password" subtitle="Use at least 6 characters" />
        <form onSubmit={savePassword}>
          {pwMsg && (
            <div
              className={`mb-4 rounded-lg border px-3 py-2 text-[0.8125rem] ${
                pwMsg.type === "ok"
                  ? "border-success/30 bg-success/5 text-success"
                  : "border-danger/30 bg-danger/5 text-danger"
              }`}
            >
              {pwMsg.text}
            </div>
          )}
          <Field label="Current password">
            <PasswordInput
              id="settings-current-password"
              value={oldPassword}
              onChange={setOldPassword}
              placeholder="Your current password"
              autoComplete="current-password"
            />
          </Field>
          <Field label="New password">
            <PasswordInput
              id="settings-new-password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm new password">
            <PasswordInput
              id="settings-confirm-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Repeat the new password"
              autoComplete="new-password"
            />
          </Field>
          <Button type="submit" loading={pwSaving}>
            Update password
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Privacy" subtitle="How your data is handled" />
        <p className="text-[0.875rem] leading-relaxed text-muted">
          Everything you record in Life OS is attached to your own account. Tasks, transactions, habits, workouts,
          events and goals are queried only for the signed-in user, so no other person can see your workspace.
          Nothing is generated, inferred or automated — the numbers you see are arithmetic on the entries you made.
        </p>
      </Card>
    </div>
  );
}
