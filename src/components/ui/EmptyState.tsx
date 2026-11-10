import { ReactNode } from "react";

export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surfaceMuted/40 px-6 py-12 text-center">
      <svg
        className="mb-4 h-7 w-7 text-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 7h16M4 12h10M4 17h7" />
      </svg>
      <p className="font-display text-[1.0625rem] font-semibold text-ink">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-[0.875rem] text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingBlock({ label = "Loading" }: { label?: string }) {
  return (
    <div className="animate-pulse space-y-3" aria-busy="true" aria-label={label}>
      <div className="h-4 w-1/3 rounded bg-surfaceMuted" />
      <div className="h-4 w-2/3 rounded bg-surfaceMuted" />
      <div className="h-4 w-1/2 rounded bg-surfaceMuted" />
      <span className="sr-only">{label}…</span>
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-danger/30 bg-danger/5 p-5 text-[0.875rem] text-danger">
      <p className="font-medium">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-lg border border-danger/40 px-3 py-1.5 text-[0.8125rem] font-medium text-danger transition-colors hover:bg-danger/10"
        >
          Retry
        </button>
      )}
    </div>
  );
}
