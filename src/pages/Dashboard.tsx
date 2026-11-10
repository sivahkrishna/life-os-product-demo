import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { AnalyticsOverview, CalendarEvent, Transaction } from "../types";
import StatCard from "../components/ui/StatCard";
import Card, { CardHeader } from "../components/ui/Card";
import EmptyState, { ErrorBlock, LoadingBlock } from "../components/ui/EmptyState";

function currency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function ProgressBar({ value, tone = "primary" }: { value: number; tone?: "primary" | "accent" | "success" }) {
  const bg = tone === "accent" ? "bg-accent" : tone === "success" ? "bg-success" : "bg-primary";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surfaceMuted">
      <div className={`h-full rounded-full ${bg}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [overview, tx] = await Promise.all([
        api.get<AnalyticsOverview>("/analytics/overview"),
        api.get<Transaction[]>("/finance/transactions").catch(() => ({ data: [] as Transaction[] })),
      ]);
      setData(overview.data);
      setTransactions(tx.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not load your dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const cashflowSeries = useMemo(() => {
    const byMonth = new Map<string, { month: string; income: number; expense: number }>();
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    for (const t of sorted) {
      const key = t.date.slice(0, 7);
      const label = format(new Date(`${key}-01T00:00:00`), "MMM");
      const row = byMonth.get(key) ?? { month: label, income: 0, expense: 0 };
      if (t.type === "income") row.income += t.amount;
      else row.expense += t.amount;
      byMonth.set(key, row);
    }
    return Array.from(byMonth.values()).slice(-6);
  }, [transactions]);

  const completionRate =
    data && data.tasks_total_this_week > 0
      ? Math.round((data.tasks_completed_this_week / data.tasks_total_this_week) * 100)
      : 0;

  const today = format(new Date(), "EEEE, d MMMM yyyy");
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className={i < 2 ? "md:col-span-2" : ""}>
            <LoadingBlock />
          </Card>
        ))}
      </div>
    );
  }

  if (error) return <ErrorBlock message={error} onRetry={load} />;
  if (!data) return <ErrorBlock message="No dashboard data available." onRetry={load} />;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-[1.5rem] font-semibold text-ink">
          {greeting}, {user?.name?.split(" ")[0] || "there"}
        </h2>
        <p className="mt-1 text-[0.875rem] text-muted">{today} — here is everything in one view.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {/* Large tile: tasks this week */}
        <Card className="md:col-span-2 md:row-span-2">
          <CardHeader
            title="Tasks this week"
            subtitle="Completed against everything due in the current week"
            action={
              <Link to="/tasks" className="flex items-center gap-1 text-[0.8125rem] font-medium text-primary hover:underline">
                Open tasks <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            }
          />
          <div className="flex items-end gap-3">
            <span className="font-display text-[3rem] font-semibold leading-none text-ink">
              {data.tasks_completed_this_week}
            </span>
            <span className="pb-1.5 text-[0.875rem] text-muted">of {data.tasks_total_this_week} tasks</span>
          </div>
          <div className="mt-4">
            <ProgressBar value={completionRate} />
            <p className="mt-2 text-[0.8125rem] text-muted">{completionRate}% completion rate this week</p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-surfaceMuted/50 p-3">
              <p className="flex items-center gap-1.5 text-[0.75rem] text-muted">
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} /> Done
              </p>
              <p className="mt-1 font-display text-[1.125rem] font-semibold text-ink">
                {data.tasks_completed_this_week}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surfaceMuted/50 p-3">
              <p className="flex items-center gap-1.5 text-[0.75rem] text-muted">
                <Clock className="h-3.5 w-3.5" strokeWidth={2} /> Open
              </p>
              <p className="mt-1 font-display text-[1.125rem] font-semibold text-ink">
                {Math.max(0, data.tasks_total_this_week - data.tasks_completed_this_week)}
              </p>
            </div>
          </div>
        </Card>

        <StatCard
          label="Month net cashflow"
          value={currency(data.month_net_cashflow)}
          trend={{
            value: data.month_net_cashflow >= 0 ? "positive" : "negative",
            positive: data.month_net_cashflow >= 0,
          }}
          hint="income − expenses"
        />
        <StatCard label="Habit completion" value={`${Math.round(data.habit_avg_completion)}%`} hint="average, last 30 days" />
        <StatCard label="Workouts this week" value={data.workouts_this_week} hint="logged sessions" />
        <StatCard label="Events this week" value={data.events_this_week} hint="scheduled" />

        {/* Cashflow chart */}
        <Card className="md:col-span-2">
          <CardHeader title="Cashflow" subtitle="Income and expenses by month" />
          {cashflowSeries.length === 0 ? (
            <EmptyState title="No transactions yet" description="Record income or an expense to see your cashflow trend." />
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashflowSeries} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--success)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--danger)" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="var(--danger)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      fontSize: 12,
                      boxShadow: "0 4px 12px rgba(16,24,40,0.08)",
                    }}
                    formatter={((v: any, n: any) => [currency(Number(v)), n === "income" ? "Income" : "Expense"]) as any}
                  />
                  <Area type="monotone" dataKey="income" stroke="var(--success)" strokeWidth={2} fill="url(#incomeFill)" />
                  <Area type="monotone" dataKey="expense" stroke="var(--danger)" strokeWidth={2} fill="url(#expenseFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Goals */}
        <Card>
          <CardHeader
            title="Goals"
            action={
              <Link to="/goals" className="text-[0.8125rem] font-medium text-primary hover:underline">
                View
              </Link>
            }
          />
          <p className="font-display text-[2rem] font-semibold leading-none text-ink">{data.avg_goal_progress}%</p>
          <p className="mt-1 text-[0.8125rem] text-muted">average progress</p>
          <div className="mt-4">
            <ProgressBar value={data.avg_goal_progress} tone="accent" />
          </div>
          <p className="mt-3 text-[0.8125rem] text-muted">{data.active_goals_count} active goals</p>
        </Card>

        <Card>
          <CardHeader
            title="Habits"
            action={
              <Link to="/habits" className="text-[0.8125rem] font-medium text-primary hover:underline">
                Open
              </Link>
            }
          />
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-[2rem] font-semibold leading-none text-ink">
              {Math.round(data.habit_avg_completion)}
            </span>
            <span className="text-[0.875rem] text-muted">% complete</span>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surfaceMuted">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.min(100, Math.max(0, data.habit_avg_completion))}%` }}
            />
          </div>
          <p className="mt-3 text-[0.8125rem] text-muted">30-day average across your tracked habits</p>
        </Card>

        {/* Upcoming events */}
        <Card className="md:col-span-4">
          <CardHeader
            title="Upcoming events"
            subtitle="Next items on your calendar"
            action={
              <Link to="/calendar" className="text-[0.8125rem] font-medium text-primary hover:underline">
                Open calendar
              </Link>
            }
          />
          {data.upcoming_events.length === 0 ? (
            <EmptyState title="Nothing scheduled" description="Add an event to your calendar and it will show up here." />
          ) : (
            <ul className="divide-y divide-border">
              {data.upcoming_events.slice(0, 6).map((event: CalendarEvent) => (
                <li key={event.id} className="flex items-center gap-3 py-2.5">
                  <div className="w-14 shrink-0">
                    <p className="text-[0.6875rem] uppercase tracking-wide text-muted">
                      {format(new Date(event.start_time), "MMM")}
                    </p>
                    <p className="font-display text-[1.0625rem] font-semibold text-ink">
                      {format(new Date(event.start_time), "d")}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.875rem] font-medium text-ink">{event.title}</p>
                    <p className="truncate text-[0.75rem] text-muted">
                      {format(new Date(event.start_time), "HH:mm")} · {event.category}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
