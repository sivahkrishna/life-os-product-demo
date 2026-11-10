import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import type { Goal } from "../types";
import Card from "../components/ui/Card";
import StatCard from "../components/ui/StatCard";
import Badge, { labelize, statusTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal, { Field, inputClass } from "../components/ui/Modal";
import EmptyState, { ErrorBlock, LoadingBlock } from "../components/ui/EmptyState";

const CATEGORIES: Goal["category"][] = ["career", "finance", "health", "learning", "personal"];

interface FormState {
  title: string;
  category: Goal["category"];
  description: string;
  target_date: string;
  progress: string;
  status: Goal["status"];
}

const emptyForm: FormState = {
  title: "",
  category: "personal",
  description: "",
  target_date: "",
  progress: "0",
  status: "active",
};

function progressTone(progress: number, status: Goal["status"]) {
  if (status === "completed" || progress >= 100) return "bg-success";
  if (status === "abandoned") return "bg-muted";
  if (progress >= 60) return "bg-accent";
  return "bg-primary";
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Goal[]>("/goals");
      setGoals(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not load your goals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setPanelOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditing(goal);
    setForm({
      title: goal.title,
      category: goal.category,
      description: goal.description ?? "",
      target_date: goal.target_date ?? "",
      progress: String(goal.progress),
      status: goal.status,
    });
    setFormError(null);
    setPanelOpen(true);
  }

  async function handleSubmit() {
    if (!form.title.trim()) {
      setFormError("Give the goal a title.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const progress = Math.min(100, Math.max(0, Number(form.progress) || 0));
    const payload = {
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim() || null,
      target_date: form.target_date || null,
      progress,
      status: progress >= 100 ? "completed" : form.status,
    };
    try {
      if (editing) {
        const res = await api.put<Goal>(`/goals/${editing.id}`, payload);
        setGoals((prev) => prev.map((g) => (g.id === editing.id ? res.data : g)));
      } else {
        const res = await api.post<Goal>("/goals", payload);
        setGoals((prev) => [res.data, ...prev]);
      }
      setPanelOpen(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || "Could not save the goal.");
    } finally {
      setSaving(false);
    }
  }

  async function quickProgress(goal: Goal, delta: number) {
    const progress = Math.min(100, Math.max(0, goal.progress + delta));
    const optimistic = { ...goal, progress, status: progress >= 100 ? ("completed" as const) : goal.status };
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? optimistic : g)));
    try {
      const res = await api.put<Goal>(`/goals/${goal.id}`, {
        title: goal.title,
        category: goal.category,
        description: goal.description,
        target_date: goal.target_date,
        progress,
        status: progress >= 100 ? "completed" : goal.status,
      });
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? res.data : g)));
    } catch {
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)));
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`/goals/${id}`);
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } finally {
      setConfirmId(null);
    }
  }

  const visible = useMemo(
    () => (categoryFilter === "all" ? goals : goals.filter((g) => g.category === categoryFilter)),
    [goals, categoryFilter],
  );

  const activeCount = goals.filter((g) => g.status === "active").length;
  const completedCount = goals.filter((g) => g.status === "completed").length;
  const avgProgress = goals.length ? Math.round(goals.reduce((a, g) => a + g.progress, 0) / goals.length) : 0;

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <LoadingBlock />
          </Card>
        ))}
      </div>
    );
  }
  if (error) return <ErrorBlock message={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active goals" value={activeCount} hint="in progress" />
        <StatCard label="Completed" value={completedCount} hint="reached the target" />
        <StatCard label="Average progress" value={`${avgProgress}%`} hint="across all goals" />
        <StatCard label="Total goals" value={goals.length} hint="in your workspace" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {["all", ...CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoryFilter(c)}
              className={`rounded-full px-3 py-1 text-[0.8125rem] capitalize transition-colors ${
                categoryFilter === c
                  ? "bg-primary/10 font-medium text-primary"
                  : "border border-border bg-surface text-muted hover:text-ink"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <Button className="ml-auto" onClick={openCreate}>
          <Plus className="h-4 w-4" strokeWidth={2} /> New goal
        </Button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={goals.length === 0 ? "No goals yet" : "No goals in this category"}
          description={
            goals.length === 0
              ? "Set yourself something to work towards — career, finance, health, learning or personal."
              : "Switch category or add a goal here."
          }
          action={<Button onClick={openCreate}>Add a goal</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((goal) => (
            <Card key={goal.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-[1.0625rem] font-semibold text-ink">{goal.title}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge tone="accent">{labelize(goal.category)}</Badge>
                    <Badge tone={statusTone(goal.status)}>{labelize(goal.status)}</Badge>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(goal)}
                    aria-label={`Edit ${goal.title}`}
                    className="rounded-lg p-1.5 text-muted hover:bg-surfaceMuted hover:text-ink"
                  >
                    <Pencil className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(goal.id)}
                    aria-label={`Delete ${goal.title}`}
                    className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
              </div>

              {goal.description && (
                <p className="mt-2 line-clamp-2 text-[0.875rem] leading-relaxed text-muted">{goal.description}</p>
              )}

              <div className="mt-auto pt-4">
                <div className="flex items-center justify-between text-[0.75rem] text-muted">
                  <span>{goal.progress}% complete</span>
                  {goal.target_date && (
                    <span>target {format(new Date(`${goal.target_date}T00:00:00`), "d MMM yyyy")}</span>
                  )}
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surfaceMuted">
                  <div
                    className={`h-full rounded-full ${progressTone(goal.progress, goal.status)}`}
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  <Button variant="secondary" size="sm" onClick={() => quickProgress(goal, -10)} disabled={goal.progress <= 0}>
                    −10
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => quickProgress(goal, 10)} disabled={goal.progress >= 100}>
                    +10
                  </Button>
                  <span className="ml-auto text-[0.6875rem] text-muted">Adjust progress</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editing ? "Edit goal" : "New goal"}
        subtitle="Set a target and keep the progress honest."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPanelOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editing ? "Save changes" : "Create goal"}
            </Button>
          </div>
        }
      >
        {formError && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[0.8125rem] text-danger">
            {formError}
          </div>
        )}
        <Field label="Goal title">
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Build a three-month emergency fund"
          />
        </Field>
        <Field label="Category">
          <select
            className={inputClass}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as Goal["category"] })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {labelize(c)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Description" hint="Optional">
          <textarea
            className={`${inputClass} min-h-[90px] resize-y`}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What does done look like?"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target date" hint="Optional">
            <input
              type="date"
              className={inputClass}
              value={form.target_date}
              onChange={(e) => setForm({ ...form, target_date: e.target.value })}
            />
          </Field>
          <Field label="Status">
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Goal["status"] })}
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="abandoned">Abandoned</option>
            </select>
          </Field>
        </div>
        <Field label={`Progress — ${form.progress}%`}>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={form.progress}
            onChange={(e) => setForm({ ...form, progress: e.target.value })}
            className="w-full accent-[var(--primary)]"
            aria-label="Goal progress"
          />
        </Field>
      </Modal>

      <Modal
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        title="Delete goal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmId(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={() => confirmId !== null && handleDelete(confirmId)}>
              Delete goal
            </Button>
          </div>
        }
      >
        <p className="text-[0.875rem] text-muted">This goal will be permanently removed from your workspace.</p>
      </Modal>
    </div>
  );
}
