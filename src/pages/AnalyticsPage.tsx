import { useMemo, useState, type ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Change, EmptyState, Metric, PageHeader, Section, SourceDot } from '@/components/common'
import { useEntries } from '@/hooks/useEntries'
import { useSources } from '@/hooks/useSources'
import { useMoney, useSettings } from '@/hooks/useSettings'
import { useToday } from '@/hooks/useToday'
import {
  activeSourcesCount,
  comparePeriods,
  cumulativeByType,
  dayStats,
  inRange,
  periodRange,
  sourceBreakdown,
  stackedSeries,
  type Bucket,
  type PeriodKind,
} from '@/lib/stats/analytics'
import { hourlyRateBySource } from '@/lib/stats/records'
import { formatDate, formatMinutes, formatPercent, WEEKDAYS, WEEKDAYS_SHORT } from '@/lib/format'
import { addDaysISO } from '@/lib/dates'
import { cn } from '@/lib/utils'

const PERIODS: { value: PeriodKind; label: string; short?: string }[] = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: 'Квартал' },
  { value: 'year', label: 'Год' },
  { value: 'all', label: 'Всё время', short: 'Всё' },
]

const PREV_LABEL: Record<PeriodKind, string> = {
  week: 'к прошлой неделе',
  month: 'к прошлому месяцу',
  quarter: 'к прошлому кварталу',
  year: 'к прошлому году',
  all: '',
}

// Active vs passive: first and third categorical slots (validated pair).
const TYPE_COLORS = { active: '#16a34a', passive: '#d97706' }

const axisProps = {
  tick: { fill: 'var(--muted-foreground)', fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: 'var(--border)' },
} as const

function bucketLabel(key: string, bucket: Bucket, long = false) {
  if (bucket === 'day') return formatDate(key, long ? 'EEEEEE, d MMMM yyyy' : 'd MMM')
  if (bucket === 'week') return long ? `${formatDate(key, 'd MMM')} – ${formatDate(addDaysISO(key, 6))}` : formatDate(key, 'd MMM')
  return formatDate(key, long ? 'LLLL yyyy' : 'LLL yy')
}

interface TooltipItem {
  value?: unknown
  name?: unknown
  color?: string
  dataKey?: unknown
  payload?: unknown
}

function ChartTooltip({
  active,
  payload,
  title,
  format,
}: {
  active?: boolean
  payload?: readonly TooltipItem[]
  title: (row: Record<string, unknown>) => string
  format: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  const rows = payload.filter((p) => Number(p.value) > 0)
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium capitalize">{title(payload[0].payload as Record<string, unknown>)}</div>
      {rows.length === 0 && <div className="text-muted-foreground">нет заработка</div>}
      {[...rows].reverse().map((p) => (
        <div key={String(p.dataKey)} className="flex items-center gap-2">
          <SourceDot color={String(p.color)} className="size-2" />
          <span className="text-muted-foreground">{String(p.name)}</span>
          <span className="num ml-auto pl-3 font-medium">{format(Number(p.value))}</span>
        </div>
      ))}
    </div>
  )
}

function Legend({ items }: { items: { label: ReactNode; color: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((i, n) => (
        <span key={n} className="flex items-center gap-1.5">
          <SourceDot color={i.color} className="size-2" />
          {i.label}
        </span>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const today = useToday()
  const money = useMoney()
  const { entries } = useEntries()
  const { sources, byId } = useSources()
  const { settings } = useSettings()
  const [kind, setKind] = useState<PeriodKind>('month')
  const weekStartsOn = settings.week_starts_on

  const firstDate = entries.length ? entries[entries.length - 1].date : null
  const period = useMemo(() => periodRange(kind, today, weekStartsOn, firstDate), [kind, today, weekStartsOn, firstDate])

  const data = useMemo(() => {
    const scoped = inRange(entries, period.from, period.to)
    const breakdown = sourceBreakdown(scoped)
    return {
      scoped,
      series: stackedSeries(scoped, period.from, period.end, period.bucket, weekStartsOn),
      breakdown,
      activeSources: activeSourcesCount(scoped),
      cumulative: cumulativeByType(
        scoped,
        (id) => byId.get(id)?.type,
        period.from,
        period.to,
        period.bucket,
        weekStartsOn,
      ),
      hourly: hourlyRateBySource(scoped),
      stats: dayStats(entries, period.from, period.to),
      comparison: comparePeriods(entries, period),
    }
  }, [entries, period, weekStartsOn, byId])

  // Stack order follows the fixed source order (creation), so colors never follow rank.
  const stackSources = sources.filter((s) => data.breakdown.some((b) => b.sourceId === s.id))
  const hasPassive = data.scoped.some((e) => byId.get(e.source_id)?.type === 'passive')
  const top = data.breakdown[0]

  return (
    <>
      <PageHeader title="Аналитика" description={`${formatDate(period.from)} — ${formatDate(period.to)}`} />

      {/* Period switch: full width and pinned under the header on phones */}
      <div className="sticky top-[calc(3rem+var(--safe-top))] z-20 -mx-3 mb-3 bg-background/95 px-3 pb-2 backdrop-blur sm:-mx-4 sm:px-4 md:static md:mx-0 md:mb-4 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <Tabs value={kind} onValueChange={(v) => setKind(v as PeriodKind)}>
          <TabsList className="w-full md:w-fit pointer-coarse:group-data-[orientation=horizontal]/tabs:h-10">
            {PERIODS.map((p) => (
              <TabsTrigger key={p.value} value={p.value} className="px-2 text-xs sm:px-3 sm:text-sm">
                <span className="sm:hidden">{p.short ?? p.label}</span>
                <span className="hidden sm:inline">{p.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {data.scoped.length === 0 ? (
        <Card>
          <EmptyState icon={BarChart3} title="За этот период записей нет">
            Выберите другой период или добавьте заработок — графики появятся автоматически.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          <Card className="grid grid-cols-2 gap-x-4 gap-y-4 px-4 py-4 sm:grid-cols-3 sm:gap-5 sm:px-5 sm:py-5 lg:grid-cols-5">
            <Metric
              label="Заработано"
              value={money(data.stats.total)}
              hint={data.comparison && <Change value={data.comparison.change} suffix={PREV_LABEL[kind]} />}
            />
            <Metric label="В среднем в день" value={money(data.stats.avgPerDay)} hint={`за ${data.stats.days} дн.`} />
            <Metric
              label="Медиана активного дня"
              value={money(data.stats.medianActiveDay)}
              hint={`активных дней: ${data.stats.activeDays}`}
            />
            <Metric
              label="Лучший день недели"
              value={data.stats.bestWeekday === null ? '—' : <span className="capitalize">{WEEKDAYS[data.stats.bestWeekday]}</span>}
              hint={data.stats.bestWeekday !== null && `в среднем ${money(data.stats.weekdayAverages[data.stats.bestWeekday])}`}
            />
            <Metric label="Активных источников" value={data.activeSources} hint={`из ${sources.length}`} />
          </Card>

          <Section title={period.bucket === 'day' ? 'По дням' : period.bucket === 'week' ? 'По неделям' : 'По месяцам'}>
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.series} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="key"
                    {...axisProps}
                    tickFormatter={(k: string) => bucketLabel(k, period.bucket)}
                    minTickGap={16}
                  />
                  <YAxis {...axisProps} axisLine={false} width={56} tickFormatter={(v: number) => money(v, { compact: true })} />
                  <Tooltip
                    cursor={{ fill: 'var(--accent)', opacity: 0.6 }}
                    content={(p) => (
                      <ChartTooltip
                        active={p.active}
                        payload={p.payload}
                        format={(v) => money(v)}
                        title={(row) => `${bucketLabel(String(row.key), period.bucket, true)} · ${money(Number(row.total))}`}
                      />
                    )}
                  />
                  {stackSources.map((s) => (
                    <Bar
                      key={s.id}
                      dataKey={s.id}
                      name={s.name}
                      stackId="a"
                      fill={s.color}
                      stroke="var(--card)"
                      strokeWidth={1}
                      maxBarSize={36}
                      isAnimationActive={false}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            {stackSources.length > 1 && <Legend items={stackSources.map((s) => ({ label: s.name, color: s.color }))} />}
          </Section>

          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            <Section
              title="Источники"
              action={
                top && (
                  <span className="text-xs text-muted-foreground">
                    крупнейший — <span className="num font-medium text-foreground">{formatPercent(top.share)}</span>
                  </span>
                )
              }
            >
              <div className="grid gap-3">
                {data.breakdown.map((b) => {
                  const s = byId.get(b.sourceId)
                  return (
                    <div key={b.sourceId}>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="flex min-w-0 items-center gap-2 truncate">
                          <SourceDot color={s?.color ?? '#999'} />
                          {s?.name ?? '—'}
                        </span>
                        <span className="num shrink-0">
                          {money(b.amount)} <span className="text-muted-foreground">· {formatPercent(b.share)}</span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(b.amount / top.amount) * 100}%`, background: s?.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Section>

            <Section title="По дням недели" action={<span className="text-xs text-muted-foreground">в среднем</span>}>
              <div className="grid grid-cols-7 items-end gap-1.5">
                {Array.from({ length: 7 }, (_, i) => (weekStartsOn + i) % 7).map((wd) => {
                  const v = data.stats.weekdayAverages[wd]
                  const max = Math.max(...data.stats.weekdayAverages, 1)
                  const best = wd === data.stats.bestWeekday
                  return (
                    <div key={wd} className="flex flex-col items-center gap-1" title={`${WEEKDAYS[wd]}: ${money(v)}`}>
                      <span className={cn('num text-[10px]', best ? 'font-medium' : 'text-muted-foreground')}>
                        {v > 0 ? money(v, { compact: true }) : ''}
                      </span>
                      <div className="flex h-28 w-full items-end">
                        <div
                          className={cn('w-full rounded-t-[4px]', best ? 'bg-primary' : 'bg-primary/35')}
                          style={{ height: `${Math.max(2, (v / max) * 100)}%` }}
                        />
                      </div>
                      <span className={cn('text-xs', best ? 'font-medium' : 'text-muted-foreground')}>{WEEKDAYS_SHORT[wd]}</span>
                    </div>
                  )
                })}
              </div>
            </Section>
          </div>

          <Section title="Активный и пассивный доход, накопительно">
            {hasPassive ? (
              <>
                <div className="h-48 sm:h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.cumulative} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="key" {...axisProps} tickFormatter={(k: string) => bucketLabel(k, period.bucket)} minTickGap={16} />
                      <YAxis {...axisProps} axisLine={false} width={56} tickFormatter={(v: number) => money(v, { compact: true })} />
                      <Tooltip
                        cursor={{ stroke: 'var(--muted-foreground)', strokeDasharray: '3 3' }}
                        content={(p) => (
                          <ChartTooltip active={p.active} payload={p.payload} format={(v) => money(v)} title={(row) => bucketLabel(String(row.key), period.bucket, true)} />
                        )}
                      />
                      <Line type="monotone" dataKey="active" name="Активный" stroke={TYPE_COLORS.active} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2 }} isAnimationActive={false} />
                      <Line type="monotone" dataKey="passive" name="Пассивный" stroke={TYPE_COLORS.passive} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2 }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <Legend
                  items={[
                    { label: `Активный · ${money(data.cumulative.at(-1)?.active ?? 0)}`, color: TYPE_COLORS.active },
                    { label: `Пассивный · ${money(data.cumulative.at(-1)?.passive ?? 0)}`, color: TYPE_COLORS.passive },
                  ]}
                />
              </>
            ) : (
              <p className="py-2 text-sm text-muted-foreground">
                За этот период весь доход активный ({money(data.stats.total)}). Отметьте источник как пассивный в
                настройках, чтобы увидеть сравнение.
              </p>
            )}
          </Section>

          <Section title="Ставка в час по источникам">
            {data.hourly.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                Указывайте время в записях («Время и заметка» при вводе) — здесь появится, какой источник платит
                больше за час.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-0">Источник</TableHead>
                    <TableHead className="text-right">Ставка</TableHead>
                    <TableHead className="text-right">Часы</TableHead>
                    <TableHead className="hidden pr-0 text-right sm:table-cell">Сумма</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.hourly.map((h) => {
                    const s = byId.get(h.sourceId)
                    return (
                      <TableRow key={h.sourceId}>
                        <TableCell className="pl-0">
                          <span className="flex items-center gap-2">
                            <SourceDot color={s?.color ?? '#999'} />
                            {s?.name ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell className="num text-right font-medium">{money(h.rate)}/ч</TableCell>
                        <TableCell className="num text-right text-muted-foreground">{formatMinutes(h.minutes)}</TableCell>
                        <TableCell className="num hidden pr-0 text-right text-muted-foreground sm:table-cell">{money(h.amount)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </Section>
        </div>
      )}
    </>
  )
}
