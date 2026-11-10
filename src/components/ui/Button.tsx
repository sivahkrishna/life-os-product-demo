import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-ink hover:bg-primary/90",
  secondary: "border border-border bg-surface text-ink hover:bg-surfaceMuted",
  ghost: "text-ink hover:bg-surfaceMuted",
  danger: "bg-danger text-danger-ink hover:bg-danger/90",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[0.8125rem]",
  md: "px-4 py-2 text-[0.875rem]",
};

export default function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  loading = false,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  );
}
