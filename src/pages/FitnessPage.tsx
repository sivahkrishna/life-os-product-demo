import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import type { WellnessLog, Workout } from "../types";
import Card, { CardHeader } from "../components/ui/Card";
import StatCard from "../components/ui/StatCard";
import Button from "../components/ui/Button";
import Modal, { Field, inputClass } from "../components/ui/Modal";
import EmptyState, { ErrorBlock, LoadingBlock } from "../components/ui/EmptyState";

type WorkoutForm = {
  type: string;
  duration_minutes: string;
  calories: string;
  date: string;
  notes: string;
};

type WellnessForm = {
  date: string;
  mood: string;
  sleep_hours: string;
  water_glasses: string;
  weight: string;
};

const todayISO = format(new Date(), "yyyy-MM-dd");

interface FitnessSummary {
  workouts_this_week?: number;
  total_minutes?: number;
  total_calories?: number;
  avg_sleep_hours?: number;
  [key: string]: number | undefined;
}

export default function FitnessPage() {
  const [summary, setSummary] = useState<FitnessSummary | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [wellness, setWellness] = useState<WellnessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [workoutPanel, setWorkoutPanel] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [workoutForm, setWorkoutForm] = useState<WorkoutForm>({
    type: "",
    duration_minutes: "30",
    calories: "",
    date: todayISO,
    notes: "",
  });

  const [wellnessPanel, setWellnessPanel] = useState(false);
  const [editingWellness, setEditingWellness] = useState<WellnessLog | null>(null);
  const [wellnessForm, setWellnessForm] = useState<WellnessForm>({
    date: todayISO,
    mood: "3",
    sleep_hours: "",
    water_glasses: "",
    weight: "",
  });

  const [confirm, setConfirm] = useState<{ kind: "workout" | "wellness"; id: number } | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [s, w, wl] = await Promise.all([
        api.get<FitnessSummary>("/fitness/summary").catch(() => ({ data: {} as FitnessSummary })),
        api.get<Workout[]>("/fitness/workouts"),
        api.get<WellnessLog[]>("/fitness/wellness-logs"),
      ]);
      setSummary(s.data);
      setWorkouts(w.data);
      setWellness(wl.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not load your fitness record.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveWorkout() {
    if (!workoutForm.type.trim()) {
      setFormError("What kind of workout was it?");
      return;
    }
    const duration = Number(workoutForm.duration_minutes);
    if (!duration || duration <= 0) {
      setFormError("Enter a duration in minutes.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      type: workoutForm.type.trim(),
      duration_minutes: duration,
      calories: workoutForm.calories ? Number(workoutForm.calories) : null,
      date: workoutForm.date,
      notes: workoutForm.notes.trim() || null,
    };
    try {
      if (editingWorkout) {
        const res = await api.put<Workout>(`/fitness/workouts/${editingWorkout.id}`, payload);
        setWorkouts((prev) => prev.map((w) => (w.id === editingWorkout.id ? res.data : w)));
      } else {
        const res = await api.post<Workout>("/fitness/workouts", payload);
        setWorkouts((prev) => [res.data, ...prev]);
      }
      setWorkoutPanel(false);
      load();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || "Could not save the workout.");
    } finally {
      setSaving(false);
    }
  }

  async function saveWellness() {
    setSaving(true);
    setFormError(null);
    const payload = {
      date: wellnessForm.date,
      mood: wellnessForm.mood ? Number(wellnessForm.mood) : null,
      sleep_hours: wellnessForm.sleep_hours ? Number(wellnessForm.sleep_hours) : null,
      water_glasses: wellnessForm.water_glasses ? Number(wellnessForm.water_glasses) : null,
      weight: wellnessForm.weight ? Number(wellnessForm.weight) : null,
    };
    try {
      if (editingWellness) {
        const res = await api.put<WellnessLog>(`/fitness/wellness-logs/${editingWellness.id}`, payload);
        setWellness((prev) => prev.map((w) => (w.id === editingWellness.id ? res.data : w)));
      } else {
        const res = await api.post<WellnessLog>("/fitness/wellness-logs", payload);
        setWellness((prev) => [res.data, ...prev]);
      }
      setWellnessPanel(false);
      load();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || "Could not save the wellness log.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm) return;
    const { kind, id } = confirm;
    try {
      if (kind === "workout") {
        await api.delete(`/fitness/workouts/${id}`);
        setWorkouts((prev) => prev.filter((w) => w.id !== id));
      } else {
        await api.delete(`/fitness/wellness-logs/${id}`);
        setWellness((prev) => prev.filter((w) => w.id !== id));
      }
      load();
    } finally {
      setConfirm(null);
    }
  }

  const totalMinutes = summary?.total_minutes ?? workouts.reduce((acc, w) => acc + w.duration_minutes, 0);
  const totalCalories = summary?.total_calories ?? workouts.reduce((acc, w) => acc + (w.calories ?? 0), 0);
  const avgSleep =
    summary?.avg_sleep_hours ??
    (wellness.filter((w) => w.sleep_hours != null).length
      ? Math.round(
          (wellness.filter((w) => w.sleep_hours != null).reduce((a, w) => a + (w.sleep_hours ?? 0), 0) /
            wellness.filter((w) => w.sleep_hours != null).length) *
            10,
        ) / 10
      : 0);

  const sortedWorkouts = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
  const sortedWellness = [...wellness].sort((a, b) => b.date.localeCompare(a.date));

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
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
        <StatCard label="Workouts" value={workouts.length} hint={`${summary?.workouts_this_week ?? 0} this week`} />
        <StatCard label="Minutes trained" value={totalMinutes} hint="all logged sessions" />
        <StatCard label="Calories burned" value={totalCalories || "—"} hint="where recorded" />
        <StatCard label="Average sleep" value={avgSleep ? `${avgSleep} h` : "—"} hint="from wellness logs" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding={false}>
          <div className="flex items-center justify-between gap-3 border-b border-border p-3">
            <h3 className="font-display text-[1.0625rem] font-semibold text-ink">Workouts</h3>
            <Button
              size="sm"
              onClick={() => {
                setEditingWorkout(null);
                setWorkoutForm({ type: "", duration_minutes: "30", calories: "", date: todayISO, notes: "" });
                setFormError(null);
                setWorkoutPanel(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Log workout
            </Button>
          </div>
          {sortedWorkouts.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No workouts logged" description="Record a session — type, duration and calories." />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {sortedWorkouts.map((w) => (
                <li key={w.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-[0.9375rem] font-medium text-ink">{w.type}</p>
                    <p className="text-[0.75rem] text-muted">
                      {format(new Date(`${w.date}T00:00:00`), "d MMM yyyy")} · {w.duration_minutes} min
                      {w.calories ? ` · ${w.calories} kcal` : ""}
                    </p>
                    {w.notes && <p className="mt-1 truncate text-[0.75rem] text-muted">{w.notes}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingWorkout(w);
                        setWorkoutForm({
                          type: w.type,
                          duration_minutes: String(w.duration_minutes),
                          calories: w.calories != null ? String(w.calories) : "",
                          date: w.date,
                          notes: w.notes ?? "",
                        });
                        setFormError(null);
                        setWorkoutPanel(true);
                      }}
                      aria-label={`Edit ${w.type}`}
                      className="rounded p-1 text-muted hover:bg-surfaceMuted hover:text-ink"
                    >
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirm({ kind: "workout", id: w.id })}
                      aria-label={`Delete ${w.type}`}
                      className="rounded p-1 text-muted hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding={false}>
          <div className="flex items-center justify-between gap-3 border-b border-border p-3">
            <h3 className="font-display text-[1.0625rem] font-semibold text-ink">Wellness log</h3>
            <Button
              size="sm"
              onClick={() => {
                setEditingWellness(null);
                setWellnessForm({ date: todayISO, mood: "3", sleep_hours: "", water_glasses: "", weight: "" });
                setFormError(null);
                setWellnessPanel(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Log day
            </Button>
          </div>
          {sortedWellness.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No wellness entries" description="Track mood, sleep, water and weight day by day." />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {sortedWellness.map((w) => (
                <li key={w.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-[0.9375rem] font-medium text-ink">
                      {format(new Date(`${w.date}T00:00:00`), "EEEE d MMM")}
                    </p>
                    <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.75rem] text-muted">
                      {w.mood != null && <span>Mood {w.mood}/5</span>}
                      {w.sleep_hours != null && <span>{w.sleep_hours} h sleep</span>}
                      {w.water_glasses != null && <span>{w.water_glasses} glasses</span>}
                      {w.weight != null && <span>{w.weight} kg</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingWellness(w);
                        setWellnessForm({
                          date: w.date,
                          mood: w.mood != null ? String(w.mood) : "3",
                          sleep_hours: w.sleep_hours != null ? String(w.sleep_hours) : "",
                          water_glasses: w.water_glasses != null ? String(w.water_glasses) : "",
                          weight: w.weight != null ? String(w.weight) : "",
                        });
                        setFormError(null);
                        setWellnessPanel(true);
                      }}
                      aria-label="Edit wellness entry"
                      className="rounded p-1 text-muted hover:bg-surfaceMuted hover:text-ink"
                    >
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirm({ kind: "wellness", id: w.id })}
                      aria-label="Delete wellness entry"
                      className="rounded p-1 text-muted hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal
        open={workoutPanel}
        onClose={() => setWorkoutPanel(false)}
        title={editingWorkout ? "Edit workout" : "Log a workout"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setWorkoutPanel(false)}>
              Cancel
            </Button>
            <Button onClick={saveWorkout} loading={saving}>
              {editingWorkout ? "Save changes" : "Save workout"}
            </Button>
          </div>
        }
      >
        {formError && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[0.8125rem] text-danger">
            {formError}
          </div>
        )}
        <Field label="Workout type">
          <input
            className={inputClass}
            value={workoutForm.type}
            onChange={(e) => setWorkoutForm({ ...workoutForm, type: e.target.value })}
            placeholder="e.g. Running, Strength, Yoga"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration (minutes)">
            <input
              type="number"
              min="1"
              className={inputClass}
              value={workoutForm.duration_minutes}
              onChange={(e) => setWorkoutForm({ ...workoutForm, duration_minutes: e.target.value })}
            />
          </Field>
          <Field label="Calories" hint="Optional">
            <input
              type="number"
              min="0"
              className={inputClass}
              value={workoutForm.calories}
              onChange={(e) => setWorkoutForm({ ...workoutForm, calories: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Date">
          <input
            type="date"
            className={inputClass}
            value={workoutForm.date}
            onChange={(e) => setWorkoutForm({ ...workoutForm, date: e.target.value })}
          />
        </Field>
        <Field label="Notes" hint="Optional">
          <textarea
            className={`${inputClass} min-h-[80px] resize-y`}
            value={workoutForm.notes}
            onChange={(e) => setWorkoutForm({ ...workoutForm, notes: e.target.value })}
          />
        </Field>
      </Modal>

      <Modal
        open={wellnessPanel}
        onClose={() => setWellnessPanel(false)}
        title={editingWellness ? "Edit wellness entry" : "Log your day"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setWellnessPanel(false)}>
              Cancel
            </Button>
            <Button onClick={saveWellness} loading={saving}>
              {editingWellness ? "Save changes" : "Save entry"}
            </Button>
          </div>
        }
      >
        {formError && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[0.8125rem] text-danger">
            {formError}
          </div>
        )}
        <Field label="Date">
          <input
            type="date"
            className={inputClass}
            value={wellnessForm.date}
            onChange={(e) => setWellnessForm({ ...wellnessForm, date: e.target.value })}
          />
        </Field>
        <Field label="Mood (1–5)">
          <select
            className={inputClass}
            value={wellnessForm.mood}
            onChange={(e) => setWellnessForm({ ...wellnessForm, mood: e.target.value })}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sleep (hours)">
            <input
              type="number"
              step="0.5"
              min="0"
              className={inputClass}
              value={wellnessForm.sleep_hours}
              onChange={(e) => setWellnessForm({ ...wellnessForm, sleep_hours: e.target.value })}
            />
          </Field>
          <Field label="Water (glasses)">
            <input
              type="number"
              min="0"
              className={inputClass}
              value={wellnessForm.water_glasses}
              onChange={(e) => setWellnessForm({ ...wellnessForm, water_glasses: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Weight (kg)" hint="Optional">
          <input
            type="number"
            step="0.1"
            min="0"
            className={inputClass}
            value={wellnessForm.weight}
            onChange={(e) => setWellnessForm({ ...wellnessForm, weight: e.target.value })}
          />
        </Field>
      </Modal>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title="Confirm delete"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-[0.875rem] text-muted">This entry will be permanently removed from your record.</p>
      </Modal>
    </div>
  );
}
