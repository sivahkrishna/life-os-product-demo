import { ReactNode } from "react";

export type BadgeTone = "neutral" | "primary" | "accent" | "success" | "warning" | "danger";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-surfaceMuted text-muted",
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
};

export default function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-[2px] text-[0.75rem] font-medium ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function statusTone(status: string): BadgeTone {
  switch (status) {
    case "done":
    case "completed":
    case "income":
      return "success";
    case "in_progress":
    case "active":
      return "primary";
    case "todo":
    case "planned":
      return "neutral";
    case "archived":
    case "abandoned":
      return "danger";
    default:
      return "neutral";
  }
}

export function priorityTone(priority: string): BadgeTone {
  if (priority === "high") return "danger";
  if (priority === "medium") return "warning";
  return "neutral";
}

export function labelize(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
