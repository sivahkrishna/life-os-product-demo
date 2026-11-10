import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  trend?: { value: string; positive?: boolean };
  className?: string;
  children?: ReactNode;
}

export default function StatCard({ label, value, hint, trend, className = "", children }: StatCardProps) {
  return (
    <div
      className={`flex flex-col rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)] ${className}`}
    >
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-2 font-display text-[1.75rem] font-semibold leading-none text-ink">{value}</p>
      <div className="mt-2 flex items-center gap-2">
        {trend && (
          <span
            className={`text-[0.8125rem] font-medium ${
              trend.positive === false ? "text-danger" : "text-success"
            }`}
          >
            {trend.value}
          </span>
        )}
        {hint && <span className="text-[0.8125rem] text-muted">{hint}</span>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
