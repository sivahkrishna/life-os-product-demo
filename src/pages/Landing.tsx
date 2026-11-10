import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ListChecks,
  Wallet,
  Repeat,
  GraduationCap,
  HeartPulse,
  CalendarDays,
  Target,
  ArrowRight,
} from "lucide-react";
import { api } from "../lib/api";
import type { SiteSettings } from "../types";

const modules = [
  {
    icon: ListChecks,
    title: "Tasks & Projects",
    body: "Group work into projects with timelines and milestones, then break it into tasks with priorities, due dates and checklists. Kanban, list and calendar views.",
    span: "md:col-span-2",
  },
  {
    icon: Wallet,
    title: "Financial management",
    body: "Accounts, categorised transactions and monthly budgets. See net cashflow and where the money actually goes.",
  },
  {
    icon: Repeat,
    title: "Habit tracking",
    body: "Daily and weekly habits with a log per day. Streaks and completion rates computed from what you record.",
  },
  {
    icon: GraduationCap,
    title: "Learning & career",
    body: "Skills with proficiency levels, courses with progress, and a dated timeline of career milestones.",
  },
  {
    icon: HeartPulse,
    title: "Fitness & wellness",
    body: "Log workouts with duration and calories, and track mood, sleep, water and weight day by day.",
  },
  {
    icon: CalendarDays,
    title: "Calendar & scheduling",
    body: "Events with start and end times, location and category, laid out as a clean agenda by day.",
  },
  {
    icon: Target,
    title: "Personal goals",
    body: "Cross-cutting goals across career, finance, health, learning and personal life, with progress you set yourself.",
    span: "md:col-span-2",
  },
];

const steps = [
  {
    index: "01",
    title: "Create your private space",
    body: "Register with an email and password. Everything you add is scoped to your account only — no shared boards, no public profiles.",
  },
  {
    index: "02",
    title: "Enter what is actually going on",
    body: "Add your projects and tasks, record transactions, tick habits, log workouts, schedule events. The app stores it exactly as you entered it.",
  },
  {
    index: "03",
    title: "Read the overview",
    body: "The dashboard adds up your numbers with plain arithmetic so you can see completion rates, balances, streaks and goal progress in one place.",
  },
];

export default function Landing() {
  const [site, setSite] = useState<SiteSettings | null>(null);

  useEffect(() => {
    api
      .get<SiteSettings>("/settings/site")
      .then((res) => setSite(res.data))
      .catch(() => setSite(null));
  }, []);

  const brand = site?.site_title || "Life OS";
  const tagline = site?.tagline || "one platform, every part of your life";

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3.5">
          {site?.logo_url ? (
            <img src={site.logo_url} alt={`${brand} logo`} className="h-7 w-7 rounded-lg object-contain" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary font-display text-[0.8125rem] font-bold text-primary-ink">
              L
            </span>
          )}
          <span className="font-display text-[1.0625rem] font-semibold text-ink">{brand}</span>
          <nav className="ml-auto flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-[0.875rem] font-medium text-ink transition-colors hover:bg-surfaceMuted"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-primary px-4 py-2 text-[0.875rem] font-medium text-primary-ink transition-colors hover:bg-primary/90"
            >
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 sm:pt-20">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-accent">
            Personal life management
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-[2.25rem] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[3.25rem]">
            Every part of your life,
            <br className="hidden sm:block" /> in one place you actually control.
          </h1>
          <p className="mt-5 max-w-2xl text-[1rem] leading-relaxed text-muted">
            {brand} is a manual workspace for the whole of your life: projects and tasks, money, habits,
            learning, fitness, your calendar and the goals you set for yourself. You type it in, it is
            stored privately to your account, and the numbers are simple arithmetic on your own entries.
          </p>
          <p className="mt-4 max-w-2xl rounded-lg border border-border bg-surface px-4 py-3 text-[0.875rem] leading-relaxed text-muted">
            To be explicit: there is no AI assistant, no chatbot and no generated content anywhere in this
            product. It is a tool you drive yourself — {tagline}.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[0.9375rem] font-medium text-primary-ink transition-colors hover:bg-primary/90"
            >
              Start your workspace
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-5 py-2.5 text-[0.9375rem] font-medium text-ink transition-colors hover:bg-surfaceMuted"
            >
              I already have an account
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-16">
          <div className="mb-6 flex items-baseline gap-4">
            <h2 className="font-display text-[1.5rem] font-semibold text-ink">Seven modules, one workspace</h2>
            <span className="hidden h-px flex-1 bg-border sm:block" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {modules.map((m) => (
              <article
                key={m.title}
                className={`rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)] ${
                  m.span ?? ""
                }`}
              >
                <div className="flex items-center gap-2 text-primary">
                  <m.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  <h3 className="font-display text-[1.0625rem] font-semibold text-ink">{m.title}</h3>
                </div>
                <p className="mt-2.5 text-[0.875rem] leading-relaxed text-muted">{m.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="font-display text-[1.5rem] font-semibold text-ink">How it works</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {steps.map((step) => (
                <div key={step.index} className="border-t border-border pt-5">
                  <p className="font-display text-[0.8125rem] font-semibold tracking-[0.08em] text-accent">
                    {step.index}
                  </p>
                  <h3 className="mt-2 font-display text-[1.0625rem] font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 text-[0.875rem] leading-relaxed text-muted">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Modules", value: "7" },
              { label: "Analytics", value: "Plain arithmetic" },
              { label: "Your data", value: "Private per account" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-surface p-5">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
                  {stat.label}
                </p>
                <p className="mt-2 font-display text-[1.375rem] font-semibold text-ink">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-[0.8125rem] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            {brand} — {tagline}
          </p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-ink">
              Sign in
            </Link>
            <Link to="/register" className="hover:text-ink">
              Create account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
