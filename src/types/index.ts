export interface User {
  id: number;
  email: string;
  name: string;
  role: "USER" | "OWNER";
  created_at: string;
}

export interface SiteSettings {
  site_title: string;
  tagline: string;
  logo_url: string | null;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  status: "active" | "completed" | "archived";
  color: string;
  created_at: string;
}

export interface Task {
  id: number;
  project_id: number | null;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Account {
  id: number;
  name: string;
  type: "checking" | "savings" | "credit" | "cash" | "investment";
  balance: number;
  created_at: string;
}

export interface Transaction {
  id: number;
  account_id: number;
  category: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  note: string | null;
}

export interface Budget {
  id: number;
  category: string;
  monthly_limit: number;
}

export interface FinanceSummary {
  total_balance: number;
  month_income: number;
  month_expense: number;
  by_category: { category: string; total: number }[];
}

export interface Habit {
  id: number;
  name: string;
  frequency: "daily" | "weekly";
  target_per_period: number;
  color: string;
}

export interface HabitLog {
  id: number;
  habit_id: number;
  date: string;
  completed: boolean;
}

export interface HabitSummaryItem {
  habit_id: number;
  name: string;
  streak: number;
  completion_rate: number;
}

export interface Skill {
  id: number;
  name: string;
  category: string | null;
  level: number;
}

export interface Course {
  id: number;
  title: string;
  provider: string | null;
  status: "planned" | "in_progress" | "completed";
  progress: number;
  target_date: string | null;
}

export interface CareerMilestone {
  id: number;
  title: string;
  description: string | null;
  date: string;
}

export interface Workout {
  id: number;
  type: string;
  duration_minutes: number;
  calories: number | null;
  date: string;
  notes: string | null;
}

export interface WellnessLog {
  id: number;
  date: string;
  mood: number | null;
  sleep_hours: number | null;
  water_glasses: number | null;
  weight: number | null;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  category: string;
}

export interface Goal {
  id: number;
  title: string;
  category: "career" | "finance" | "health" | "learning" | "personal";
  description: string | null;
  target_date: string | null;
  progress: number;
  status: "active" | "completed" | "abandoned";
}

export interface AnalyticsOverview {
  tasks_completed_this_week: number;
  tasks_total_this_week: number;
  habit_avg_completion: number;
  month_net_cashflow: number;
  active_goals_count: number;
  avg_goal_progress: number;
  workouts_this_week: number;
  upcoming_events: CalendarEvent[];
  events_this_week: number;
}
