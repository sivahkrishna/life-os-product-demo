import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import type { CareerMilestone, Course, Skill } from "../types";
import Card, { CardHeader } from "../components/ui/Card";
import Badge, { labelize, statusTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal, { Field, inputClass } from "../components/ui/Modal";
import EmptyState, { ErrorBlock, LoadingBlock } from "../components/ui/EmptyState";

type SkillForm = { name: string; category: string; level: string };
type CourseForm = { title: string; provider: string; status: Course["status"]; progress: string; target_date: string };
type MilestoneForm = { title: string; description: string; date: string };

const todayISO = format(new Date(), "yyyy-MM-dd");

export default function LearningPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [milestones, setMilestones] = useState<CareerMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [skillPanel, setSkillPanel] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [skillForm, setSkillForm] = useState<SkillForm>({ name: "", category: "", level: "1" });

  const [coursePanel, setCoursePanel] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState<CourseForm>({
    title: "",
    provider: "",
    status: "in_progress",
    progress: "0",
    target_date: "",
  });

  const [milestonePanel, setMilestonePanel] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<CareerMilestone | null>(null);
  const [milestoneForm, setMilestoneForm] = useState<MilestoneForm>({ title: "", description: "", date: todayISO });

  const [confirm, setConfirm] = useState<{ kind: "skill" | "course" | "milestone"; id: number } | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [s, c, m] = await Promise.all([
        api.get<Skill[]>("/learning/skills"),
        api.get<Course[]>("/learning/courses"),
        api.get<CareerMilestone[]>("/learning/career-milestones"),
      ]);
      setSkills(s.data);
      setCourses(c.data);
      setMilestones(m.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not load your learning record.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSkill() {
    if (!skillForm.name.trim()) {
      setFormError("Name the skill.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      name: skillForm.name.trim(),
      category: skillForm.category.trim() || null,
      level: Math.min(5, Math.max(1, Number(skillForm.level) || 1)),
    };
    try {
      if (editingSkill) {
        const res = await api.put<Skill>(`/learning/skills/${editingSkill.id}`, payload);
        setSkills((prev) => prev.map((s) => (s.id === editingSkill.id ? res.data : s)));
      } else {
        const res = await api.post<Skill>("/learning/skills", payload);
        setSkills((prev) => [...prev, res.data]);
      }
      setSkillPanel(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || "Could not save the skill.");
    } finally {
      setSaving(false);
    }
  }

  async function saveCourse() {
    if (!courseForm.title.trim()) {
      setFormError("Give the course a title.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      title: courseForm.title.trim(),
      provider: courseForm.provider.trim() || null,
      status: courseForm.status,
      progress: Math.min(100, Math.max(0, Number(courseForm.progress) || 0)),
      target_date: courseForm.target_date || null,
    };
    try {
      if (editingCourse) {
        const res = await api.put<Course>(`/learning/courses/${editingCourse.id}`, payload);
        setCourses((prev) => prev.map((c) => (c.id === editingCourse.id ? res.data : c)));
      } else {
        const res = await api.post<Course>("/learning/courses", payload);
        setCourses((prev) => [res.data, ...prev]);
      }
      setCoursePanel(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || "Could not save the course.");
    } finally {
      setSaving(false);
    }
  }

  async function saveMilestone() {
    if (!milestoneForm.title.trim()) {
      setFormError("Give the milestone a title.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      title: milestoneForm.title.trim(),
      description: milestoneForm.description.trim() || null,
      date: milestoneForm.date,
    };
    try {
      if (editingMilestone) {
        const res = await api.put<CareerMilestone>(`/learning/career-milestones/${editingMilestone.id}`, payload);
        setMilestones((prev) => prev.map((m) => (m.id === editingMilestone.id ? res.data : m)));
      } else {
        const res = await api.post<CareerMilestone>("/learning/career-milestones", payload);
        setMilestones((prev) => [res.data, ...prev]);
      }
      setMilestonePanel(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || "Could not save the milestone.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm) return;
    const { kind, id } = confirm;
    try {
      if (kind === "skill") {
        await api.delete(`/learning/skills/${id}`);
        setSkills((prev) => prev.filter((s) => s.id !== id));
      } else if (kind === "course") {
        await api.delete(`/learning/courses/${id}`);
        setCourses((prev) => prev.filter((c) => c.id !== id));
      } else {
        await api.delete(`/learning/career-milestones/${id}`);
        setMilestones((prev) => prev.filter((m) => m.id !== id));
      }
    } finally {
      setConfirm(null);
    }
  }

  const sortedMilestones = [...milestones].sort((a, b) => b.date.localeCompare(a.date));
  const completedCourses = courses.filter((c) => c.status === "completed").length;
  const avgProgress = courses.length ? Math.round(courses.reduce((acc, c) => acc + c.progress, 0) / courses.length) : 0;

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
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
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">Skills</p>
          <p className="mt-2 font-display text-[1.75rem] font-semibold leading-none text-ink">{skills.length}</p>
          <p className="mt-1 text-[0.8125rem] text-muted">being developed</p>
        </Card>
        <Card>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">Courses</p>
          <p className="mt-2 font-display text-[1.75rem] font-semibold leading-none text-ink">
            {completedCourses}/{courses.length}
          </p>
          <p className="mt-1 text-[0.8125rem] text-muted">completed · {avgProgress}% average progress</p>
        </Card>
        <Card>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">Milestones</p>
          <p className="mt-2 font-display text-[1.75rem] font-semibold leading-none text-ink">{milestones.length}</p>
          <p className="mt-1 text-[0.8125rem] text-muted">on your career timeline</p>
        </Card>
      </div>

      {/* Skills */}
      <Card>
        <CardHeader
          title="Skills"
          subtitle="Where you are today, on a 1 to 5 scale"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingSkill(null);
                setSkillForm({ name: "", category: "", level: "1" });
                setFormError(null);
                setSkillPanel(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Add skill
            </Button>
          }
        />
        {skills.length === 0 ? (
          <EmptyState title="No skills listed" description="List the skills you are building and rate your level honestly." />
        ) : (
          <ul className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <li key={skill.id} className="rounded-lg border border-border px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[0.875rem] font-medium text-ink">{skill.name}</span>
                  {skill.category && <Badge tone="neutral">{skill.category}</Badge>}
                  <div className="flex items-center gap-[2px]" aria-label={`Level ${skill.level} of 5`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={`h-1.5 w-1.5 rounded-full ${n <= skill.level ? "bg-primary" : "bg-surfaceMuted"}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSkill(skill);
                      setSkillForm({
                        name: skill.name,
                        category: skill.category ?? "",
                        level: String(skill.level),
                      });
                      setFormError(null);
                      setSkillPanel(true);
                    }}
                    aria-label={`Edit ${skill.name}`}
                    className="rounded p-1 text-muted hover:bg-surfaceMuted hover:text-ink"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm({ kind: "skill", id: skill.id })}
                    aria-label={`Delete ${skill.name}`}
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

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Courses */}
        <Card>
          <CardHeader
            title="Courses"
            subtitle="What you are studying"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingCourse(null);
                  setCourseForm({ title: "", provider: "", status: "in_progress", progress: "0", target_date: "" });
                  setFormError(null);
                  setCoursePanel(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Add
              </Button>
            }
          />
          {courses.length === 0 ? (
            <EmptyState title="No courses" description="Add a course and track how far through it you are." />
          ) : (
            <ul className="space-y-3">
              {courses.map((course) => (
                <li key={course.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[0.9375rem] font-medium text-ink">{course.title}</p>
                      <p className="text-[0.75rem] text-muted">
                        {course.provider || "Self-study"}
                        {course.target_date ? ` · target ${format(new Date(`${course.target_date}T00:00:00`), "d MMM yyyy")}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge tone={statusTone(course.status)}>{labelize(course.status)}</Badge>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCourse(course);
                          setCourseForm({
                            title: course.title,
                            provider: course.provider ?? "",
                            status: course.status,
                            progress: String(course.progress),
                            target_date: course.target_date ?? "",
                          });
                          setFormError(null);
                          setCoursePanel(true);
                        }}
                        aria-label={`Edit ${course.title}`}
                        className="rounded p-1 text-muted hover:bg-surfaceMuted hover:text-ink"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirm({ kind: "course", id: course.id })}
                        aria-label={`Delete ${course.title}`}
                        className="rounded p-1 text-muted hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-surfaceMuted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${course.progress}%` }} />
                  </div>
                  <p className="mt-1.5 text-[0.75rem] text-muted">{course.progress}% complete</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Career timeline */}
        <Card>
          <CardHeader
            title="Career milestones"
            subtitle="A dated record of what you have achieved"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingMilestone(null);
                  setMilestoneForm({ title: "", description: "", date: todayISO });
                  setFormError(null);
                  setMilestonePanel(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Add
              </Button>
            }
          />
          {sortedMilestones.length === 0 ? (
            <EmptyState title="No milestones yet" description="Promotions, certifications, launches — record them here." />
          ) : (
            <ol className="relative space-y-4 border-l border-border pl-5">
              {sortedMilestones.map((m) => (
                <li key={m.id} className="relative">
                  <span
                    className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-surface"
                    aria-hidden="true"
                  />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[0.6875rem] uppercase tracking-wide text-muted">
                        {format(new Date(`${m.date}T00:00:00`), "MMM yyyy")}
                      </p>
                      <p className="text-[0.9375rem] font-medium text-ink">{m.title}</p>
                      {m.description && <p className="mt-0.5 text-[0.8125rem] text-muted">{m.description}</p>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMilestone(m);
                          setMilestoneForm({
                            title: m.title,
                            description: m.description ?? "",
                            date: m.date,
                          });
                          setFormError(null);
                          setMilestonePanel(true);
                        }}
                        aria-label={`Edit ${m.title}`}
                        className="rounded p-1 text-muted hover:bg-surfaceMuted hover:text-ink"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirm({ kind: "milestone", id: m.id })}
                        aria-label={`Delete ${m.title}`}
                        className="rounded p-1 text-muted hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* Skill panel */}
      <Modal
        open={skillPanel}
        onClose={() => setSkillPanel(false)}
        title={editingSkill ? "Edit skill" : "New skill"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSkillPanel(false)}>
              Cancel
            </Button>
            <Button onClick={saveSkill} loading={saving}>
              {editingSkill ? "Save changes" : "Add skill"}
            </Button>
          </div>
        }
      >
        {formError && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[0.8125rem] text-danger">
            {formError}
          </div>
        )}
        <Field label="Skill name">
          <input
            className={inputClass}
            value={skillForm.name}
            onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
            placeholder="e.g. TypeScript"
          />
        </Field>
        <Field label="Category" hint="Optional — e.g. Engineering, Design, Leadership.">
          <input
            className={inputClass}
            value={skillForm.category}
            onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value })}
          />
        </Field>
        <Field label="Level (1–5)">
          <select
            className={inputClass}
            value={skillForm.level}
            onChange={(e) => setSkillForm({ ...skillForm, level: e.target.value })}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
          </select>
        </Field>
      </Modal>

      {/* Course panel */}
      <Modal
        open={coursePanel}
        onClose={() => setCoursePanel(false)}
        title={editingCourse ? "Edit course" : "New course"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCoursePanel(false)}>
              Cancel
            </Button>
            <Button onClick={saveCourse} loading={saving}>
              {editingCourse ? "Save changes" : "Add course"}
            </Button>
          </div>
        }
      >
        {formError && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[0.8125rem] text-danger">
            {formError}
          </div>
        )}
        <Field label="Course title">
          <input
            className={inputClass}
            value={courseForm.title}
            onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
            placeholder="e.g. Advanced React Patterns"
          />
        </Field>
        <Field label="Provider" hint="Optional">
          <input
            className={inputClass}
            value={courseForm.provider}
            onChange={(e) => setCourseForm({ ...courseForm, provider: e.target.value })}
            placeholder="e.g. Frontend Masters"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select
              className={inputClass}
              value={courseForm.status}
              onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value as Course["status"] })}
            >
              <option value="planned">Planned</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
          <Field label="Progress %">
            <input
              type="number"
              min="0"
              max="100"
              className={inputClass}
              value={courseForm.progress}
              onChange={(e) => setCourseForm({ ...courseForm, progress: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Target date" hint="Optional">
          <input
            type="date"
            className={inputClass}
            value={courseForm.target_date}
            onChange={(e) => setCourseForm({ ...courseForm, target_date: e.target.value })}
          />
        </Field>
      </Modal>

      {/* Milestone panel */}
      <Modal
        open={milestonePanel}
        onClose={() => setMilestonePanel(false)}
        title={editingMilestone ? "Edit milestone" : "New milestone"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setMilestonePanel(false)}>
              Cancel
            </Button>
            <Button onClick={saveMilestone} loading={saving}>
              {editingMilestone ? "Save changes" : "Add milestone"}
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
            value={milestoneForm.title}
            onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
            placeholder="e.g. Promoted to senior engineer"
          />
        </Field>
        <Field label="Description" hint="Optional context">
          <textarea
            className={`${inputClass} min-h-[80px] resize-y`}
            value={milestoneForm.description}
            onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
          />
        </Field>
        <Field label="Date">
          <input
            type="date"
            className={inputClass}
            value={milestoneForm.date}
            onChange={(e) => setMilestoneForm({ ...milestoneForm, date: e.target.value })}
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
