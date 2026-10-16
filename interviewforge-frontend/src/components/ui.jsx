import { IconAlert, IconInbox } from "./Icons"
import { cx } from "../lib/cx"

/* --------------------------------- Card --------------------------------- */

export function Card({ as: Tag = "section", className = "", children, ...rest }) {
  return (
    <Tag className={cx("card", className)} {...rest}>
      {children}
    </Tag>
  )
}

export function CardTitle({ children, subtitle, action, className = "" }) {
  return (
    <div className={cx("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-ink">{children}</h2>
        {subtitle && <p className="mt-1 text-xs leading-relaxed text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

/* -------------------------------- Button -------------------------------- */

const BUTTON_VARIANTS = {
  primary:
    "bg-brand-500 text-white shadow-pill hover:bg-brand-600 disabled:hover:bg-brand-500",
  success: "bg-[#10B981] text-white hover:bg-[#059669]",
  indigo: "bg-brand-500 text-white hover:bg-brand-600",
  coral: "bg-[#FF6B4A] text-white hover:bg-[#E85A3A]",
  secondary:
    "border border-line bg-surface text-ink-soft hover:border-brand-300 hover:text-brand-600",
  ghost: "text-ink-muted hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10",
  danger: "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  icon = null,
  ...rest
}) {
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-sm",
  }

  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55",
        sizes[size],
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

/* -------------------------------- Badge --------------------------------- */

const BADGE_TONES = {
  neutral: "bg-canvas text-ink-muted border-line",
  brand: "bg-brand-50 text-brand-600 border-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:border-brand-500/25",
  success: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25",
  warning: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25",
  danger: "bg-red-50 text-red-600 border-red-100 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25",
  info: "bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/25",
  coral: "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/25",
}

export function Badge({ tone = "neutral", className = "", children }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }) {
  const completed = status === "COMPLETED"
  return (
    <Badge tone={completed ? "success" : "warning"}>
      <span
        className={cx(
          "h-1.5 w-1.5 rounded-full",
          completed ? "bg-emerald-500" : "bg-amber-500",
        )}
      />
      {completed ? "Completed" : "In progress"}
    </Badge>
  )
}

/* -------------------------------- States -------------------------------- */

export function Spinner({ className = "" }) {
  return (
    <span
      className={cx(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  )
}

export function Skeleton({ className = "" }) {
  return (
    <div
      className={cx("animate-pulse-soft rounded-lg bg-line", className)}
      aria-hidden="true"
    />
  )
}

export function EmptyState({ icon, title, description, action, className = "" }) {
  return (
    <div className={cx("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/12">
        {icon || <IconInbox size={26} />}
      </div>
      <h3 className="mt-5 text-sm font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry, className = "" }) {
  return (
    <div
      role="alert"
      className={cx(
        "flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300",
        className,
      )}
    >
      <span className="flex items-start gap-2.5">
        <IconAlert size={18} className="mt-0.5 shrink-0" />
        <span>{message}</span>
      </span>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

/* -------------------------------- Inputs -------------------------------- */

export function Field({ label, hint, htmlFor, children, className = "" }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-ink-soft">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-ink-faint">{hint}</p>}
    </div>
  )
}

export const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/12 focus:outline-none disabled:opacity-60"

export const selectClass = `${inputClass} appearance-none bg-[length:16px] bg-[right_0.9rem_center] bg-no-repeat pr-10`

/* ------------------------------ Page head ------------------------------- */

export function PageHeading({ eyebrow, title, description, actions, className = "" }) {
  return (
    <div
      className={cx(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-500">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  )
}

/* ------------------------------ Stat pill ------------------------------- */

export function StatPill({ label, value, tone = "neutral" }) {
  return (
    <div
      className={cx(
        "rounded-xl border px-3 py-2",
        tone === "brand" && "border-brand-100 bg-brand-50 dark:border-brand-500/25 dark:bg-brand-500/10",
        tone === "success" && "border-emerald-100 bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-500/10",
        tone === "neutral" && "border-line bg-surface-muted",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">{label}</p>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-ink">{value}</p>
    </div>
  )
}
