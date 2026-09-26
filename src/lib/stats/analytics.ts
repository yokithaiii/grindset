import {
  addMonths,
  addYears,
  differenceInCalendarDays,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from 'date-fns'
import { addDaysISO, eachDayISO, fromISODate, monthStartISO, toISODate } from '../dates'
import type { ISODate, SourceType, StatEntry, WeekStart } from '../types'
import { dailyTotals, round2, sumAmounts } from './daily'
import { compare, type PeriodComparison } from './forecast'
import { quantile } from './heatmap'
import { weekStartISO } from './records'

export type PeriodKind = 'week' | 'month' | 'quarter' | 'year' | 'all'
export type Bucket = 'day' | 'week' | 'month'

export interface Period {
  kind: PeriodKind
  from: ISODate
  /** Last day of the period (may be in the future). */
  end: ISODate
  /** Last day with data to count: min(end, today). */
  to: ISODate
  bucket: Bucket
  /** Same elapsed span of the previous period; null for 'all'. */
  prev: { from: ISODate; to: ISODate } | null
}

export function periodRange(kind: PeriodKind, today: ISODate, weekStartsOn: WeekStart, firstDate: ISODate | null): Period {
  const t = fromISODate(today)
  let from: Date
  let end: Date
  let shift: (d: Date, n: number) => Date
  let bucket: Bucket
  switch (kind) {
    case 'week':
      from = fromISODate(weekStartISO(today, weekStartsOn))
      end = fromISODate(addDaysISO(toISODate(from), 6))
      shift = (d, n) => fromISODate(addDaysISO(toISODate(d), 7 * n))
      bucket = 'day'
      break
    case 'month':
      from = startOfMonth(t)
      end = endOfMonth(t)
      shift = addMonths
      bucket = 'day'
      break
    case 'quarter':
      from = startOfQuarter(t)
      end = endOfQuarter(t)
      shift = (d, n) => addMonths(d, 3 * n)
      bucket = 'week'
      break
    case 'year':
      from = startOfYear(t)
      end = endOfYear(t)
      shift = addYears
      bucket = 'week'
      break
    case 'all': {
      const f = firstDate && firstDate < today ? firstDate : today
      const days = differenceInCalendarDays(t, fromISODate(f))
      return { kind, from: f, end: today, to: today, bucket: days > 120 ? 'month' : days > 31 ? 'week' : 'day', prev: null }
    }
  }
  const fromISO = toISODate(from)
  const endISO = toISODate(end)
  const toISO = endISO < today ? endISO : today
  const elapsed = differenceInCalendarDays(fromISODate(toISO), from)
  const prevFrom = shift(from, -1)
  const prevEnd = fromISODate(addDaysISO(fromISO, -1))
  const prevToCandidate = fromISODate(addDaysISO(toISODate(prevFrom), elapsed))
  const prevTo = prevToCandidate > prevEnd ? prevEnd : prevToCandidate
  return {
    kind,
    from: fromISO,
    end: endISO,
    to: toISO,
    bucket,
    prev: { from: toISODate(prevFrom), to: toISODate(prevTo) },
  }
}

export function inRange<E extends StatEntry>(entries: readonly E[], from: ISODate, to: ISODate): E[] {
  return entries.filter((e) => e.date >= from && e.date <= to)
}

export function bucketKey(date: ISODate, bucket: Bucket, weekStartsOn: WeekStart): ISODate {
  if (bucket === 'day') return date
  if (bucket === 'week') return weekStartISO(date, weekStartsOn)
  return monthStartISO(date)
}

export interface SeriesRow {
  /** Bucket start date. */
  key: ISODate
  total: number
  /** Amount per source id. */
  [sourceId: string]: number | string
}

/** Bars for [from, end]: one row per bucket, amounts stacked by source. Empty buckets included. */
export function stackedSeries(
  entries: readonly StatEntry[],
  from: ISODate,
  end: ISODate,
  bucket: Bucket,
  weekStartsOn: WeekStart,
): SeriesRow[] {
  const rows = new Map<ISODate, SeriesRow>()
  for (const d of eachDayISO(from, end)) {
    const k = bucketKey(d, bucket, weekStartsOn)
    if (!rows.has(k)) rows.set(k, { key: k, total: 0 })
  }
  for (const e of entries) {
    if (e.date < from || e.date > end) continue
    const row = rows.get(bucketKey(e.date, bucket, weekStartsOn))!
    row[e.source_id] = round2(((row[e.source_id] as number | undefined) ?? 0) + e.amount)
    row.total = round2(row.total + e.amount)
  }
  return [...rows.values()]
}

export interface SourceShare {
  sourceId: string
  amount: number
  share: number
}

export function sourceBreakdown(entries: readonly StatEntry[]): SourceShare[] {
  const total = sumAmounts(entries)
  const sums = new Map<string, number>()
  for (const e of entries) sums.set(e.source_id, (sums.get(e.source_id) ?? 0) + e.amount)
  return [...sums]
    .map(([sourceId, amount]) => ({ sourceId, amount: round2(amount), share: total > 0 ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount)
}

export function activeSourcesCount(entries: readonly StatEntry[]): number {
  return new Set(entries.map((e) => e.source_id)).size
}

export interface CumulativeRow {
  key: ISODate
  active: number
  passive: number
}

/** Running totals of active vs passive income, one point per bucket in [from, to]. */
export function cumulativeByType(
  entries: readonly StatEntry[],
  typeOf: (sourceId: string) => SourceType | undefined,
  from: ISODate,
  to: ISODate,
  bucket: Bucket,
  weekStartsOn: WeekStart,
): CumulativeRow[] {
  const rows = stackedSeries(entries, from, to, bucket, weekStartsOn)
  let active = 0
  let passive = 0
  return rows.map((row) => {
    for (const [k, v] of Object.entries(row)) {
      if (k === 'key' || k === 'total') continue
      if (typeOf(k) === 'passive') passive += v as number
      else active += v as number
    }
    return { key: row.key, active: round2(active), passive: round2(passive) }
  })
}

export interface DayStats {
  total: number
  days: number
  activeDays: number
  avgPerDay: number
  /** Median over days with earnings. */
  medianActiveDay: number
  /** Average amount per calendar weekday (index = Date#getDay(), 0 = Sunday). */
  weekdayAverages: number[]
  /** null when there is nothing earned. */
  bestWeekday: number | null
}

export function dayStats(entries: readonly StatEntry[], from: ISODate, to: ISODate): DayStats {
  const totals = dailyTotals(inRange(entries, from, to))
  const sums = Array<number>(7).fill(0)
  const counts = Array<number>(7).fill(0)
  let days = 0
  let total = 0
  const active: number[] = []
  for (const d of eachDayISO(from, to)) {
    const v = totals.get(d) ?? 0
    const wd = fromISODate(d).getDay()
    sums[wd] += v
    counts[wd]++
    days++
    total += v
    if (v > 0) active.push(v)
  }
  const weekdayAverages = sums.map((s, i) => (counts[i] ? round2(s / counts[i]) : 0))
  let bestWeekday: number | null = null
  weekdayAverages.forEach((v, i) => {
    if (v > 0 && (bestWeekday === null || v > weekdayAverages[bestWeekday])) bestWeekday = i
  })
  active.sort((a, b) => a - b)
  return {
    total: round2(total),
    days,
    activeDays: active.length,
    avgPerDay: days ? round2(total / days) : 0,
    medianActiveDay: round2(quantile(active, 0.5)),
    weekdayAverages,
    bestWeekday,
  }
}

export function comparePeriods(entries: readonly StatEntry[], period: Period): PeriodComparison | null {
  if (!period.prev) return null
  return compare(
    sumAmounts(inRange(entries, period.from, period.to)),
    sumAmounts(inRange(entries, period.prev.from, period.prev.to)),
  )
}
