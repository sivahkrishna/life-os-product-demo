import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import { api } from "../lib/api";
import type { Habit, HabitLog, HabitSummaryItem } from "../types";
import Card from "../components/ui/Card";
import StatCard from "../components/ui/StatCard";
import Badge, { labelize } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal, { Field, inputClass } from "../components/ui/Modal";
import EmptyState, { ErrorBlock, LoadingBlock } from "../components/ui/EmptyState";

const COLORS = ["#0D9488", "#4338CA", "#16A34A", "#D97706", "#DC2626", "#7C3AED"];

interface FormState {
  name: string;
  frequency: Habit["frequency"];
  target_per_period: string;
  color: string;
}

const emptyForm: FormState = { name: "", frequency: "daily", target_per_period: "1", color: COLORS[0] };

export default function HabitsPage() {
  const [summary, setSummary] = useState<HabitSummaryItem[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  // habit_id -> set of logged dates in the last 30 days
  const [loggedDates, setLoggedDates] = useState<Record<number, Set<string>>>({});
  const today = format(new Date(), "yyyy-MM-dd");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [s, h] = await Promise.all([
        api.get<HabitSummaryItem[]>("/habits/summary"),
        api.get<Habit[]>("/habits"),
      ]);
      setSummary(s.data);
      setHabits(h.data);

      const entries = await Promise.all(
        h.data.map(async (habit) => {
          try {
            const res = await api.get<HabitLog[]>(`/habits/${habit.id}/logs`);
            const set = new Set(res.data.filter((l) => l.completed).map((l) => l.date));
            return [habit.id, set] as [number, Set<string>];
          } catch {
            return [habit.id, new Set<string>()] as [number, Set<string>];
          }
        }),
      );
      setLoggedDates(Object.fromEntries(entries));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not load your habits.");
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

  function openEdit(habit: Habit) {
    setEditing(habit);
    setForm({
      name: habit.name,
      frequency: habit.frequency,
      target_per_period: String(habit.target_per_period),
      color: habit.color || COLORS[0],
    });
    setFormError(null);
    setPanelOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setFormError("Give the habit a name.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      name: form.name.trim(),
      frequency: form.frequency,
      target_per_period: Number(form.target_per_period) || 1,
      color: form.color,
    };
    try {
      if (editing) {
        await api.put(`/habits/${editing.id}`, payload);
      } else {
        await api.post("/habits", payload);
      }
      setPanelOpen(false);
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || "Could not save the habit.");
    } finally {
      setSaving(false);
    }
  }

  async function markToday(habit: Habit) {
    try {
      await api.post(`/habits/${habit.id}/log`, { date: today, completed: true });
      await load();
    } catch {
      /* keep the previous state */
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`/habits/${id}`);
      setConfirmId(null);
      await load();
    } catch {
      setConfirmId(null);
    }
  }

  const last30 = useMemo(() => Array.from({ length: 30 }, (_, i) => format(subDays(new Date(), 29 - i), "yyyy-MM-dd")), []);

  const summaryById = useMemo(() => {
    const map = new Map<number, HabitSummaryItem>();
    for (const s of summary) map.set(s.habit_id, s);
    return map;
  }, [summary]);

  const avgCompletion = summary.length
    ? Math.round(summary.reduce((acc, s) => acc + s.completion_rate, 0) / summary.length)
    : 0;
  const bestStreak = summary.length ? Math.max(...summary.map((s) => s.streak)) : 0;
  const doneToday = habits.filter((h) => loggedDates[h.id]?.has(today)).length;

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
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Habits tracked" value={habits.length} hint="active routines" />
        <StatCard label="Done today" value={`${doneToday}/${habits.length || 0}`} hint="marked complete" />
        <StatCard label="Average completion" value={`${avgCompletion}%`} hint="last 30 days" />
        <StatCard label="Best streak" value={`${bestStreak} d`} hint="current run" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.875rem] text-muted">Tick a habit off as you do it — the streaks do the rest.</p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" strokeWidth={2} /> New habit
        </Button>
      </div>

      {habits.length === 0 ? (
        <EmptyState
          title="No habits yet"
          description="Add the routines you want to keep — reading, walking, stretching — and tick them off each day."
          action={<Button onClick={openCreate}>Add your first habit</Button>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {habits.map((habit) => {
            const stat = summaryById.get(habit.id);
            const dates = loggedDates[habit.id] ?? new Set<string>();
            const isDoneToday = dates.has(today);
            return (
              <Card key={habit.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: habit.color }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-[1.0625rem] font-semibold text-ink">{habit.name}</h3>
                      <p className="text-[0.75rem] text-muted">
                        {labelize(habit.frequency)} · target {habit.target_per_period}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(habit)}
                      aria-label={`Edit ${habit.name}`}
                      className="rounded-lg p-1.5 text-muted hover:bg-surfaceMuted hover:text-ink"
                    >
                      <Pencil className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(habit.id)}
                      aria-label={`Delete ${habit.name}`}
                      className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-end gap-4">
                  <div>
                    <p className="font-display text-[1.5rem] font-semibold leading-none text-ink">
                      {stat?.streak ?? 0}
                    </p>
                    <p className="text-[0.75rem] text-muted">day streak</p>
                  </div>
                  <div>
                    <p className="font-display text-[1.5rem] font-semibold leading-none text-ink">
                      {Math.round(stat?.completion_rate ?? 0)}%
                    </p>
                    <p className="text-[0.75rem] text-muted">completion</p>
                  </div>
                  <div className="ml-auto">
                    <Button
                      size="sm"
                      variant={isDoneToday ? "secondary" : "primary"}
                      onClick={() => markToday(habit)}
                      disabled={isDoneToday}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                      {isDoneToday ? "Done today" : "Mark today"}
                    </Button>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
                    Last 30 days
                  </p>
                  <div className="flex gap-[3px]">
                    {last30.map((d) => {
                      const on = dates.has(d);
                      return (
                        <span
                          key={d}
                          title={d}
                          className="h-6 flex-1 rounded-[3px]"
                          style={{ backgroundColor: on ? habit.color : "var(--surface-muted)" }}
                        />
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editing ? "Edit habit" : "New habit"}
        subtitle="Small routines, tracked honestly."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPanelOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editing ? "Save changes" : "Create habit"}
            </Button>
          </div>
        }
      >
        {formError && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[0.8125rem] text-danger">
            {formError}
          </div>
        )}
        <Field label="Habit name">
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Read 20 pages"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Frequency">
            <select
              className={inputClass}
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value as Habit["frequency"] })}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </Field>
          <Field label="Target per period">
            <input
              type="number"
              min="1"
              className={inputClass}
              value={form.target_per_period}
              onChange={(e) => setForm({ ...form, target_per_period: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Colour">
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Use colour ${c}`}
                aria-pressed={form.color === c}
                onClick={() => setForm({ ...form, color: c })}
                className={`h-7 w-7 rounded-full border-2 ${form.color === c ? "border-ink" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </Field>
      </Modal>

      <Modal
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        title="Delete habit"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmId(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={() => confirmId !== null && handleDelete(confirmId)}>
              Delete habit
            </Button>
          </div>
        }
      >
        <p className="text-[0.875rem] text-muted">This habit and its entire log history will be removed.</p>
      </Modal>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">Streaks and rates are calculated from your own logs</Badge>
      </div>
    </div>
  );
}
