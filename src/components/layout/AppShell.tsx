import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  Wallet,
  GraduationCap,
  Target,
  Repeat,
  HeartPulse,
  CalendarDays,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Search,
} from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import type { SiteSettings } from "../../types";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  ownerOnly?: boolean;
}

const groups: { title: string; items: NavItem[] }[] = [
  { title: "Overview", items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "Plan",
    items: [
      { to: "/projects", label: "Projects", icon: FolderKanban },
      { to: "/tasks", label: "Tasks", icon: ListChecks },
    ],
  },
  { title: "Money", items: [{ to: "/finance", label: "Finance", icon: Wallet }] },
  {
    title: "Growth",
    items: [
      { to: "/learning", label: "Learning & Career", icon: GraduationCap },
      { to: "/goals", label: "Goals", icon: Target },
    ],
  },
  {
    title: "Health",
    items: [
      { to: "/habits", label: "Habits", icon: Repeat },
      { to: "/fitness", label: "Fitness & Wellness", icon: HeartPulse },
    ],
  },
  { title: "Schedule", items: [{ to: "/calendar", label: "Calendar", icon: CalendarDays }] },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/tasks": "Tasks",
  "/finance": "Finance",
  "/learning": "Learning & Career",
  "/goals": "Goals",
  "/habits": "Habits",
  "/fitness": "Fitness & Wellness",
  "/calendar": "Calendar",
  "/settings": "Settings",
  "/admin/settings": "Admin Settings",
};

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [site, setSite] = useState<SiteSettings | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get<SiteSettings>("/settings/site")
      .then((res) => {
        if (alive) setSite(res.data);
      })
      .catch(() => {
        /* brand falls back to Life OS */
      });
    return () => {
      alive = false;
    };
  }, [location.pathname]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const title = pageTitles[location.pathname] ?? "Life OS";
  const brand = site?.site_title || "Life OS";

  function handleSignOut() {
    logout();
    navigate("/");
  }

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        {site?.logo_url ? (
          <img src={site.logo_url} alt={`${brand} logo`} className="h-7 w-7 rounded-lg object-contain" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary font-display text-[0.8125rem] font-bold text-primary-ink">
            L
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-display text-[1rem] font-semibold leading-tight text-ink">{brand}</p>
          <p className="truncate text-[0.6875rem] text-muted">Personal workspace</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((group) => (
          <div key={group.title} className="mb-4">
            <p className="px-2 pb-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.875rem] transition-colors ${
                        isActive
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-ink hover:bg-surfaceMuted"
                      }`
                    }
                  >
                    <item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="mb-4">
          <p className="px-2 pb-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
            Account
          </p>
          <ul className="space-y-0.5">
            <li>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.875rem] transition-colors ${
                    isActive ? "bg-primary/10 font-medium text-primary" : "text-ink hover:bg-surfaceMuted"
                  }`
                }
              >
                <Settings className="h-[18px] w-[18px]" strokeWidth={1.75} />
                Settings
              </NavLink>
            </li>
            {user?.role === "OWNER" && (
              <li>
                <NavLink
                  to="/admin/settings"
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.875rem] transition-colors ${
                      isActive ? "bg-primary/10 font-medium text-primary" : "text-ink hover:bg-surfaceMuted"
                    }`
                  }
                >
                  <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  Admin Settings
                </NavLink>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-border px-3 py-3">
        <div className="mb-2 flex items-center gap-2.5 px-1.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 font-display text-[0.8125rem] font-semibold text-accent">
            {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[0.8125rem] font-medium text-ink">{user?.name}</p>
            <p className="truncate text-[0.6875rem] text-muted">{user?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[0.8125rem] text-muted transition-colors hover:bg-surfaceMuted hover:text-ink"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-bg">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] border-r border-border bg-surface lg:block">
        {nav}
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <aside className="relative h-full w-[264px] border-r border-border bg-surface">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-3 rounded-lg p-1.5 text-muted hover:bg-surfaceMuted hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
            {nav}
          </aside>
        </div>
      )}

      <div className="lg:pl-[240px]">
        <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              className="rounded-lg p-1.5 text-ink hover:bg-surfaceMuted lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-display text-[1.125rem] font-semibold text-ink">{title}</h1>
            <div className="ml-auto hidden w-full max-w-xs items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 sm:flex">
              <Search className="h-4 w-4 text-muted" strokeWidth={1.75} />
              <input
                type="search"
                placeholder="Search your workspace"
                aria-label="Search your workspace"
                className="w-full bg-transparent text-[0.8125rem] text-ink placeholder:text-muted/70 focus:outline-none"
              />
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
