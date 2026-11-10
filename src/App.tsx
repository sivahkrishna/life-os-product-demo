import { Suspense, lazy, ReactNode, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const AppShell = lazy(() => import("./components/layout/AppShell"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const TasksPage = lazy(() => import("./pages/TasksPage"));
const FinancePage = lazy(() => import("./pages/FinancePage"));
const HabitsPage = lazy(() => import("./pages/HabitsPage"));
const LearningPage = lazy(() => import("./pages/LearningPage"));
const FitnessPage = lazy(() => import("./pages/FitnessPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const GoalsPage = lazy(() => import("./pages/GoalsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AdminSettingsPage = lazy(() => import("./pages/AdminSettingsPage"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function ProtectedRoute({ children, ownerOnly = false }: { children: ReactNode; ownerOnly?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-bg text-muted">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (ownerOnly && user.role !== "OWNER") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function Shell() {
  return (
    <ProtectedRoute>
      <AppShell />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-bg text-muted">Loading…</div>}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Shell />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="finance" element={<FinancePage />} />
              <Route path="habits" element={<HabitsPage />} />
              <Route path="learning" element={<LearningPage />} />
              <Route path="fitness" element={<FitnessPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="goals" element={<GoalsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route
                path="admin/settings"
                element={
                  <ProtectedRoute ownerOnly>
                    <AdminSettingsPage />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
