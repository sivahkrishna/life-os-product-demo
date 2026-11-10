import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { api } from "../lib/api";
import type { CalendarEvent } from "../types";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal, { Field, inputClass } from "../components/ui/Modal";
import EmptyState, { ErrorBlock, LoadingBlock } from "../components/ui/EmptyState";

type View = "month" | "week" | "agenda";

interface FormState {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  category: string;
}

function toLocalInput(d: Date) {
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

const CATEGORY_TONES: Record<string, "primary" | "accent" | "success" | "warning" | "danger" | "neutral"> = {
  work: "primary",
  personal: "accent",
  health: "success",
  finance: "warning",
  general: "neutral",
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    start_time: toLocalInput(new Date()),
    end_time: toLocalInput(new Date(Date.now() + 60 * 60 * 1000)),
    location: "",
    category: "general",
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      let start: Date;
      let end: Date;
      if (view === "week") {
        start = startOfWeek(cursor, { weekStartsOn: 1 });
        end = endOfWeek(cursor, { weekStartsOn: 1 });
      } else if (view === "month") {
        start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
        end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
      } else {
        start = startOfMonth(cursor);
        end = endOfMonth(cursor);
      }
      const res = await api.get<CalendarEvent[]>("/calendar/events", {
        params: {
          start: format(start, "yyyy-MM-dd"),
          end: format(end, "yyyy-MM-dd"),
        },
      });
      setEvents(res.data);
    } catch (err: any) {
      // fall back to all events if the range params are not supported
      try {
        const res = await api.get<CalendarEvent[]>("/calendar/events");
        setEvents(res.data);
      } catch (inner: any) {
        setError(inner?.response?.data?.detail || err?.response?.data?.detail || "Could not load your calendar.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, view]);

  function openCreate(startAt?: Date) {
    const base = startAt ?? new Date();
    setEditing(null);
    setForm({
      title: "",
      description: "",
      start_time: toLocalInput(base),
      end_time: toLocalInput(new Date(base.getTime() + 60 * 60 * 1000)),
      location: "",
      category: "general",
    });
    setFormError(null);
    setPanelOpen(true);
  }

  function openEdit(event: CalendarEvent) {
    setEditing(event);
    setForm({
      title: event.title,
      description: event.description ?? "",
      start_time: format(new Date(event.start_time), "yyyy-MM-dd'T'HH:mm"),
      end_time: format(new Date(event.end_time), "yyyy-MM-dd'T'HH:mm"),
      location: event.location ?? "",
      category: event.category,
    });
    setFormError(null);
    setPanelOpen(true);
  }

  async function handleSubmit() {
    if (!form.title.trim()) {
      setFormError("Give the event a title.");
      return;
    }
    if (new Date(form.end_time) <= new Date(form.start_time)) {
      setFormError("The end time must be after the start time.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
      location: form.location.trim() || null,
      category: form.category.trim() || "general",
    };
    try {
      if (editing) {
        const res = await api.put<CalendarEvent>(`/calendar/events/${editing.id}`, payload);
        setEvents((prev) => prev.map((e) => (e.id === editing.id ? res.data : e)));
      } else {
        const res = await api.post<CalendarEvent>("/calendar/events", payload);
        setEvents((prev) => [...prev, res.data]);
      }
      setPanelOpen(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || "Could not save the event.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`/calendar/events/${id}`);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } finally {
      setConfirmId(null);
    }
  }

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = format(new Date(e.start_time), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return map;
  }, [events]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    const days: Date[] = [];
    let d = start;
    while (d <= end) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const agendaDays = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    const days: Date[] = [];
    let d = start;
    while (d <= end) {
      if (byDay.has(format(d, "yyyy-MM-dd"))) days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [cursor, byDay]);

  const heading =
    view === "week"
      ? `${format(startOfWeek(cursor, { weekStartsOn: 1 }), "d MMM")} – ${format(
          endOfWeek(cursor, { weekStartsOn: 1 }),
          "d MMM yyyy",
        )}`
      : format(cursor, "MMMM yyyy");

  function shift(direction: -1 | 1) {
    if (view === "week") setCursor((c) => addDays(c, direction * 7));
    else setCursor((c) => addMonths(c, direction));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Previous period"
            className="rounded-lg border border-border bg-surface p-1.5 text-ink hover:bg-surfaceMuted"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Next period"
            className="rounded-lg border border-border bg-surface p-1.5 text-ink hover:bg-surfaceMuted"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date())}
            className="ml-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[0.8125rem] text-ink hover:bg-surfaceMuted"
          >
            Today
          </button>
        </div>
        <h2 className="font-display text-[1.125rem] font-semibold text-ink">{heading}</h2>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-surface p-0.5">
            {(["month", "week", "agenda"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-md px-2.5 py-1 text-[0.8125rem] capitalize transition-colors ${
                  view === v ? "bg-primary/10 font-medium text-primary" : "text-muted hover:text-ink"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <Button onClick={() => openCreate()}>
            <Plus className="h-4 w-4" strokeWidth={2} /> New event
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <LoadingBlock label="Loading calendar" />
        </Card>
      ) : error ? (
        <ErrorBlock message={error} onRetry={load} />
      ) : view === "month" ? (
        <Card padding={false} className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-surfaceMuted/60">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="px-2 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const list = byDay.get(key) ?? [];
              const outside = !isSameMonth(day, cursor);
              const isToday = isSameDay(day, new Date());
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => openCreate(day)}
                  className={`min-h-[96px] border-b border-r border-border p-1.5 text-left align-top transition-colors last:border-r-0 hover:bg-surfaceMuted/50 ${
                    outside ? "bg-surfaceMuted/20" : "bg-surface"
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[0.75rem] ${
                      isToday ? "bg-primary font-semibold text-primary-ink" : outside ? "text-muted/60" : "text-ink"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="mt-1 space-y-1">
                    {list.slice(0, 2).map((e) => (
                      <span
                        key={e.id}
                        className="block truncate rounded bg-primary/10 px-1 py-0.5 text-[0.6875rem] text-primary"
                      >
                        {format(new Date(e.start_time), "HH:mm")} {e.title}
                      </span>
                    ))}
                    {list.length > 2 && (
                      <span className="block text-[0.6875rem] text-muted">+{list.length - 2} more</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      ) : view === "week" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {weekDays.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const list = byDay.get(key) ?? [];
            const isToday = isSameDay(day, new Date());
            return (
              <Card key={key} className={isToday ? "border-primary/40" : ""}>
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
                  {format(day, "EEE")}
                </p>
                <p className={`font-display text-[1.25rem] font-semibold ${isToday ? "text-primary" : "text-ink"}`}>
                  {format(day, "d MMM")}
                </p>
                {list.length === 0 ? (
                  <p className="mt-2 text-[0.75rem] text-muted">Nothing scheduled</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {list.map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => openEdit(e)}
                          className="w-full rounded-lg border border-border px-2 py-1.5 text-left hover:bg-surfaceMuted"
                        >
                          <span className="block text-[0.6875rem] text-muted">
                            {format(new Date(e.start_time), "HH:mm")}
                          </span>
                          <span className="block truncate text-[0.8125rem] font-medium text-ink">{e.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      ) : agendaDays.length === 0 ? (
        <EmptyState
          title="No events this month"
          description="Add an event and it will appear here, grouped by day."
          action={<Button onClick={() => openCreate()}>Add an event</Button>}
        />
      ) : (
        <div className="space-y-4">
          {agendaDays.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const list = byDay.get(key) ?? [];
            return (
              <Card key={key}>
                <div className="mb-3 flex items-baseline gap-2">
                  <h3 className="font-display text-[1.0625rem] font-semibold text-ink">{format(day, "EEEE d MMMM")}</h3>
                  <span className="text-[0.75rem] text-muted">{list.length} event{list.length === 1 ? "" : "s"}</span>
                </div>
                <ul className="divide-y divide-border">
                  {list.map((e) => (
                    <li key={e.id} className="flex items-start justify-between gap-3 py-2.5">
                      <div className="flex min-w-0 gap-3">
                        <div className="w-14 shrink-0 text-[0.75rem] text-muted">
                          {format(new Date(e.start_time), "HH:mm")}
                          <br />
                          {format(new Date(e.end_time), "HH:mm")}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[0.9375rem] font-medium text-ink">{e.title}</p>
                          {e.description && <p className="truncate text-[0.8125rem] text-muted">{e.description}</p>}
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge tone={CATEGORY_TONES[e.category] ?? "neutral"}>{e.category}</Badge>
                            {e.location && (
                              <span className="inline-flex items-center gap-1 text-[0.75rem] text-muted">
                                <MapPin className="h-3 w-3" strokeWidth={1.75} /> {e.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(e)}
                          aria-label={`Edit ${e.title}`}
                          className="rounded-lg p-1.5 text-muted hover:bg-surfaceMuted hover:text-ink"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(e.id)}
                          aria-label={`Delete ${e.title}`}
                          className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && !error && events.length > 0 && view === "month" && (
        <p className="text-[0.75rem] text-muted">Click any day to add an event. Events are listed by start time.</p>
      )}

      <Modal
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editing ? "Edit event" : "New event"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPanelOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editing ? "Save changes" : "Create event"}
            </Button>
          </div>
        }
      >
        {formError && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[0.8125rem] text-danger">
            {formError}
          </div>
        )}
        <Field label="Title">
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Dentist appointment"
          />
        </Field>
        <Field label="Description" hint="Optional">
          <textarea
            className={`${inputClass} min-h-[70px] resize-y`}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts">
            <input
              type="datetime-local"
              className={inputClass}
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            />
          </Field>
          <Field label="Ends">
            <input
              type="datetime-local"
              className={inputClass}
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Location" hint="Optional">
          <input
            className={inputClass}
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Where is it?"
          />
        </Field>
        <Field label="Category">
          <select
            className={inputClass}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="general">General</option>
            <option value="work">Work</option>
            <option value="personal">Personal</option>
            <option value="health">Health</option>
            <option value="finance">Finance</option>
          </select>
        </Field>
      </Modal>

      <Modal
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        title="Delete event"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmId(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={() => confirmId !== null && handleDelete(confirmId)}>
              Delete event
            </Button>
          </div>
        }
      >
        <p className="text-[0.875rem] text-muted">This event will be removed from your calendar.</p>
      </Modal>
    </div>
  );
}
