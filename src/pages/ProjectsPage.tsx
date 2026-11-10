import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import type { Project, Task } from "../types";
import Card from "../components/ui/Card";
import Badge, { labelize, statusTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal, { Field, inputClass } from "../components/ui/Modal";
import EmptyState, { ErrorBlock, LoadingBlock } from "../components/ui/EmptyState";

const COLORS = ["#4338CA", "#0D9488", "#16A34A", "#D97706", "#DC2626", "#6B7280"];

interface FormState {
  name: string;
  description: string;
  status: Project["status"];
  color: string;
}

const emptyForm: FormState = { name: "", description: "", status: "active", color: COLORS[0] };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [p, t] = await Promise.all([
        api.get<Project[]>("/projects"),
        api.get<Task[]>("/tasks").catch(() => ({ data: [] as Task[] })),
      ]);
      setProjects(p.data);
      setTasks(t.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not load your projects.");
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

  function openEdit(project: Project) {
    setEditing(project);
    setForm({
      name: project.name,
      description: project.description ?? "",
      status: project.status,
      color: project.color || COLORS[0],
    });
    setFormError(null);
    setPanelOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setFormError("Give the project a name.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      status: form.status,
      color: form.color,
    };
    try {
      if (editing) {
        const res = await api.put<Project>(`/projects/${editing.id}`, payload);
        setProjects((prev) => prev.map((p) => (p.id === editing.id ? res.data : p)));
      } else {
        const res = await api.post<Project>("/projects", payload);
        setProjects((prev) => [res.data, ...prev]);
      }
      setPanelOpen(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || "Could not save the project.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setConfirmId(null);
    } catch {
      setConfirmId(null);
    }
  }

  function taskCount(projectId: number) {
    const list = tasks.filter((t) => t.project_id === projectId);
    const done = list.filter((t) => t.status === "done").length;
    return { total: list.length, done };
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[0.875rem] text-muted">Group your tasks into projects and track how far each one has come.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" strokeWidth={2} /> New project
        </Button>
      </div>

      {loading ? (
        <Card>
          <LoadingBlock label="Loading projects" />
        </Card>
      ) : error ? (
        <ErrorBlock message={error} onRetry={load} />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start grouping tasks around the things you are actually working on."
          action={<Button onClick={openCreate}>Create a project</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const counts = taskCount(project.id);
            const pct = counts.total ? Math.round((counts.done / counts.total) * 100) : 0;
            return (
              <Card key={project.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: project.color }}
                      aria-hidden="true"
                    />
                    <h3 className="truncate font-display text-[1.0625rem] font-semibold text-ink">{project.name}</h3>
                  </div>
                  <Badge tone={statusTone(project.status)}>{labelize(project.status)}</Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-[0.875rem] leading-relaxed text-muted">
                  {project.description || "No description yet."}
                </p>
                <div className="mt-4">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surfaceMuted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[0.75rem] text-muted">
                    {counts.done} of {counts.total} tasks done · {pct}%
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(project)}>
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger/10"
                    onClick={() => setConfirmId(project.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} /> Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editing ? "Edit project" : "New project"}
        subtitle="Projects group tasks and give them a home."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPanelOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editing ? "Save changes" : "Create project"}
            </Button>
          </div>
        }
      >
        {formError && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[0.8125rem] text-danger">
            {formError}
          </div>
        )}
        <Field label="Project name">
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Personal website rebuild"
          />
        </Field>
        <Field label="Description" hint="Optional — what this project is about.">
          <textarea
            className={`${inputClass} min-h-[100px] resize-y`}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="A short description"
          />
        </Field>
        <Field label="Status">
          <select
            className={inputClass}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as Project["status"] })}
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
        <Field label="Colour">
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Use colour ${c}`}
                aria-pressed={form.color === c}
                onClick={() => setForm({ ...form, color: c })}
                className={`h-7 w-7 rounded-full border-2 transition-transform ${
                  form.color === c ? "border-ink scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </Field>
      </Modal>

      <Modal
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        title="Delete project"
        subtitle="This also removes its tasks. This cannot be undone."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmId(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={() => confirmId !== null && handleDelete(confirmId)}>
              Delete project
            </Button>
          </div>
        }
      >
        <p className="text-[0.875rem] text-muted">
          The project and every task inside it will be permanently removed from your workspace.
        </p>
      </Modal>
    </div>
  );
}
