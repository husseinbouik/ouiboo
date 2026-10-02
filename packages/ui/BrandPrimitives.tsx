import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "./utils"

const pageShellVariants = cva(
  "relative min-h-screen overflow-hidden bg-background text-foreground",
  {
    variants: {
      tone: {
        default: "bg-[radial-gradient(circle_at_top_left,rgba(255,107,53,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.12),transparent_30%),var(--background)]",
        plain: "bg-background",
        dashboard: "bg-[linear-gradient(135deg,var(--background),var(--muted))]",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  }
)

export interface PageShellProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pageShellVariants> {}

export function PageShell({ className, tone, ...props }: PageShellProps) {
  return <div className={cn(pageShellVariants({ tone }), className)} {...props} />
}

export function BrandOrb({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute -z-10 rounded-full bg-gradient-to-br from-sunset-orange/30 via-ocean-500/20 to-transparent blur-3xl",
        className
      )}
      {...props}
    />
  )
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  align?: "left" | "center"
  className?: string
}) {
  return (
    <div className={cn("space-y-4", align === "center" && "mx-auto max-w-3xl text-center", className)}>
      {eyebrow ? (
        <div className="inline-flex rounded-full border border-sunset-orange/20 bg-sunset-orange/10 px-3 py-1 text-xs font-black uppercase tracking-[0.24em] text-sunset-orange">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="font-display text-4xl font-black tracking-tight text-foreground sm:text-5xl">
        {title}
      </h2>
      {description ? <p className="text-lg leading-8 text-muted-foreground">{description}</p> : null}
    </div>
  )
}

export function FormPanel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[2rem] border border-border/70 bg-card/90 p-6 text-card-foreground shadow-elevated backdrop-blur-xl sm:p-8",
        className
      )}
      {...props}
    />
  )
}

export function DashboardCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-border/70 bg-card/90 p-6 text-card-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-elevated",
        className
      )}
      {...props}
    />
  )
}

export function StatCard({
  label,
  value,
  hint,
  className,
}: {
  label: React.ReactNode
  value: React.ReactNode
  hint?: React.ReactNode
  className?: string
}) {
  return (
    <DashboardCard className={cn("space-y-3", className)}>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="font-display text-4xl font-black tracking-tight text-foreground">{value}</p>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
    </DashboardCard>
  )
}

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted text-muted-foreground",
        success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
        warning: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        danger: "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-300",
        brand: "border-sunset-orange/25 bg-sunset-orange/10 text-sunset-orange",
        ocean: "border-ocean-500/25 bg-ocean-500/10 text-ocean-700 dark:text-ocean-300",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  }
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {}

export function StatusBadge({ className, tone, ...props }: StatusBadgeProps) {
  return <span className={cn(statusBadgeVariants({ tone }), className)} {...props} />
}

export function ActionBar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[1.5rem] border border-border/70 bg-card/85 p-3 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      {...props}
    />
  )
}
