import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3 md:mb-6">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Section({
  title,
  action,
  children,
  className,
}: {
  title: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('gap-3 py-4 sm:gap-4 sm:py-5', className)}>
      <div className="flex min-h-6 items-center justify-between gap-2 px-4 sm:px-5">
        <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
        {action}
      </div>
      <CardContent className="px-4 sm:px-5">{children}</CardContent>
    </Card>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <Icon className="size-8 text-muted-foreground/60" strokeWidth={1.5} />
      <p className="font-medium">{title}</p>
      {children && <p className="max-w-sm text-sm text-muted-foreground">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/** Big metric number with a caption. */
export function Metric({
  label,
  value,
  hint,
  className,
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="num mt-0.5 truncate text-xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

/** Signed percent change, green when up. */
export function Change({ value, suffix }: { value: number | null; suffix?: string }) {
  if (value === null) return <span className="text-muted-foreground">—</span>
  const pct = new Intl.NumberFormat('ru-RU', { style: 'percent', maximumFractionDigits: 0, signDisplay: 'exceptZero' }).format(value)
  return (
    <span className={cn('num', value > 0 ? 'text-primary' : value < 0 ? 'text-muted-foreground' : '')}>
      {pct}
      {suffix && <span className="text-muted-foreground"> {suffix}</span>}
    </span>
  )
}

export function SourceDot({ color, className }: { color: string; className?: string }) {
  return <span className={cn('inline-block size-2.5 shrink-0 rounded-full', className)} style={{ background: color }} />
}
