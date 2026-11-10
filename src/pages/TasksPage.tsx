import { useEffect, useMemo, useState } from "react";
import { format, isBefore, startOfDay } from "date-fns";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { api } from "../lib/api";
import type { Project, Task } from "../types";
import Card from "../components/ui/Card";
import Badge, { labelize, priorityTone, statusTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal, { Field, inputClass } from "../components/ui/Modal";
import EmptyState, { ErrorBlock, LoadingBlock } from "../components/ui/EmptyState";

interface FormState {
  title: string;
  description: string;
  project_id: string;
  status: Task["status"];
  priority: Task["priority"];
  due_date: string;
}

const emptyForm: FormState = {
  title: "",
  description: "",
  project_id: "",
  status: "todo",
  priority: "medium",
  due_date: "",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"created" | "due" | "priority">("created");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [t, p] = await Promise.all([api.get<Task[]>("/tasks"), api.get<Project[]>("/projects").catch(() => ({ data: [] as Project[] }))]);
      setTasks(t.data);
      setProjects(p.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not load your tasks.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const projectName = (id: number | null) => projects.find((p) => p.id === id)?.name ?? "No project";

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setPanelOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description ?? "",
      project_id: task.project_id ? String(task.project_id) : "",
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ?? "",
    });
    setFormError(null);
    setPanelOpen(true);
  }

  async function handleSubmit() {
    if (!form.title.trim()) {
      setFormError("Give the task a title.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      project_id: form.project_id ? Number(form.project_id) : null,
      status: form.status,
      priority: form.priority,
      due_date: form.due_date || null,
    };
    try {
      if (editing) {
        const res = await api.put<Task>(`/tasks/${editing.id}`, payload);
        setTasks((prev) => prev.map((t) => (t.id === editing.id ? res.data : t)));
      } else {
        const res = await api.post<Task>("/tasks", payload);
        setTasks((prev) => [res.data, ...prev]);
      }
      setPanelOpen(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || "Could not save the task.");
    } finally {
      setSaving(false);
    }
  }

  async function cycleStatus(task: Task) {
    const order: Task["status"][] = ["todo", "in_progress", "done"];
    const next = order[(order.indexOf(task.status) + 1) % order.length];
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    try {
      const res = await api.put<Task>(`/tasks/${task.id}`, {
        title: task.title,
        description: task.description,
        project_id: task.project_id,
        priority: task.priority,
        due_date: task.due_date,
        status: next,
      });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? res.data : t)));
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`/tasks/${id}`);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setConfirmId(null);
    }
  }

  const visible = useMemo(() => {
    const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return tasks
      .filter((t) => (statusFilter === "all" ? true : t.status === statusFilter))
      .filter((t) => (priorityFilter === "all" ? true : t.priority === priorityFilter))
      .filter((t) =>
        projectFilter === "all"
          ? true
          : projectFilter === "none"
            ? t.project_id === null
            : String(t.project_id) === projectFilter,
      )
      .filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === "due") {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return a.due_date.localeCompare(b.due_date);
        }
        if (sortBy === "priority") return priorityRank[a.priority] - priorityRank[b.priority];
        return b.created_at.localeCompare(a.created_at);
      });
  }, [tasks, statusFilter, priorityFilter, projectFilter, search, sortBy]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.875rem] text-muted">Everything you need to do, across all of your projects.</p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" strokeWidth={2} /> New task
        </Button>
      </div>

      <Card className="mb-4" padding={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5">
            <Search className="h-4 w-4 text-muted" strokeWidth={1.75} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks"
              aria-label="Search tasks"
              className="w-full bg-transparent text-[0.8125rem] text-ink placeholder:text-muted/70 focus:outline-none"
            />
          </div>
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[0.8125rem] text-ink focus:border-primary focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
          <select
            aria-label="Filter by priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[0.8125rem] text-ink focus:border-primary focus:outline-none"
          >
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            aria-label="Filter by project"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[0.8125rem] text-ink focus:border-primary focus:outline-none"
          >
            <option value="all">All projects</option>
            <option value="none">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort tasks"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[0.8125rem] text-ink focus:border-primary focus:outline-none"
          >
            <option value="created">Newest first</option>
            <option value="due">By due date</option>
            <option value="priority">By priority</option>
          </select>
        </div>

        {loading ? (
          <div className="p-5">
            <LoadingBlock label="Loading tasks" />
          </div>
        ) : error ? (
          <div className="p-5">
            <ErrorBlock message={error} onRetry={load} />
          </div>
        ) : visible.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title={tasks.length === 0 ? "No tasks yet" : "Nothing matches these filters"}
              description={
                tasks.length === 0
                  ? "Add your first task and it will appear here with its status, priority and due date."
                  : "Try clearing the filters or searching for something else."
              }
              action={tasks.length === 0 ? <Button onClick={openCreate}>Add a task</Button> : undefined}
            />
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-[0.875rem]">
                <thead className="sticky top-0 bg-surfaceMuted/70 text-[0.75rem] uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Task</th>
                    <th className="px-4 py-2.5 font-medium">Project</th>
                    <th className="px-4 py-2.5 font-medium">Priority</th>
                    <th className="px-4 py-2.5 font-medium">Due</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((task) => {
                    const overdue =
                      task.due_date && task.status !== "done" && isBefore(new Date(task.due_date), startOfDay(new Date()));
                    return (
                      <tr key={task.id} className="transition-colors hover:bg-surfaceMuted/40">
                        <td className="max-w-[280px] px-4 py-3">
                          <p className={`truncate font-medium ${task.status === "done" ? "text-muted line-through" : "text-ink"}`}>
                            {task.title}
                          </p>
                          {task.description && <p className="truncate text-[0.75rem] text-muted">{task.description}</p>}
                        </td>
                        <td className="px-4 py-3 text-muted">{projectName(task.project_id)}</td>
                        <td className="px-4 py-3">
                          <Badge tone={priorityTone(task.priority)}>{labelize(task.priority)}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {task.due_date ? (
                            <span className={overdue ? "text-danger" : "text-muted"}>
                              {format(new Date(`${task.due_date}T00:00:00`), "d MMM yyyy")}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => cycleStatus(task)} title="Click to advance status">
                            <Badge tone={statusTone(task.status)}>{labelize(task.status)}</Badge>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(task)}
                              aria-label={`Edit ${task.title}`}
                              className="rounded-lg p-1.5 text-muted hover:bg-surfaceMuted hover:text-ink"
                            >
                              <Pencil className="h-4 w-4" strokeWidth={1.75} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmId(task.id)}
                              aria-label={`Delete ${task.title}`}
                              className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-border md:hidden">
              {visible.map((task) => (
                <li key={task.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-[0.9375rem] font-medium ${task.status === "done" ? "text-muted line-through" : "text-ink"}`}>
                      {task.title}
                    </p>
                    <Badge tone={statusTone(task.status)}>{labelize(task.status)}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.75rem] text-muted">
                    <Badge tone={priorityTone(task.priority)}>{labelize(task.priority)}</Badge>
                    <span>{projectName(task.project_id)}</span>
                    {task.due_date && <span>· due {format(new Date(`${task.due_date}T00:00:00`), "d MMM")}</span>}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => cycleStatus(task)}>
                      Advance status
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(task)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-danger" onClick={() => setConfirmId(task.id)}>
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Modal
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editing ? "Edit task" : "New task"}
        subtitle="Tasks belong to a project, or stand alone."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPanelOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editing ? "Save changes" : "Create task"}
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
            placeholder="e.g. Review the monthly budget"
          />
        </Field>
        <Field label="Description" hint="Optional details for this task.">
          <textarea
            className={`${inputClass} min-h-[80px] resize-y`}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Anything worth remembering"
          />
        </Field>
        <Field label="Project">
          <select
            className={inputClass}
            value={form.project_id}
            onChange={(e) => setForm({ ...form, project_id: e.target.value })}
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority">
            <select
              className={inputClass}
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as Task["priority"] })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Field>
          <Field label="Status">
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Task["status"] })}
            >
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </Field>
        </div>
        <Field label="Due date" hint="Leave empty if there is no deadline.">
          <input
            type="date"
            className={inputClass}
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />
        </Field>
      </Modal>

      <Modal
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        title="Delete task"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmId(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={() => confirmId !== null && handleDelete(confirmId)}>
              Delete task
            </Button>
          </div>
        }
      >
        <p className="text-[0.875rem] text-muted">This task will be permanently removed. This cannot be undone.</p>
      </Modal>
    </div>
  );
}
