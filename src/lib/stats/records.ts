import { startOfWeek } from 'date-fns'
import { fromISODate, monthStartISO, toISODate } from '../dates'
import type { ISODate, StatEntry, WeekStart } from '../types'
import { dailyTotals, round2 } from './daily'
import { bestStreak } from './streak'

export interface PeriodRecord {
  /** Day, first day of the week or first day of the month. */
  date: ISODate
  amount: number
}

export interface HourlyRate {
  sourceId: string
  amount: number
  minutes: number
  /** Money per hour. */
  rate: number
}

export interface Records {
  bestDay: PeriodRecord | null
  bestWeek: PeriodRecord | null
  bestMonth: PeriodRecord | null
  bestHourly: HourlyRate | null
  longestStreak: number
}

export type RecordKind = 'day' | 'week' | 'month' | 'hourly' | 'streak'

export const RECORD_LABELS: Record<RecordKind, string> = {
  day: 'лучший день',
  week: 'лучшая неделя',
  month: 'лучший месяц',
  hourly: 'лучшая ставка в час',
  streak: 'самая длинная серия',
}

export function weekStartISO(date: ISODate, weekStartsOn: WeekStart): ISODate {
  return toISODate(startOfWeek(fromISODate(date), { weekStartsOn }))
}

function bestBy(entries: readonly StatEntry[], keyOf: (d: ISODate) => ISODate): PeriodRecord | null {
  const sums = new Map<ISODate, number>()
  for (const e of entries) {
    const k = keyOf(e.date)
    sums.set(k, round2((sums.get(k) ?? 0) + e.amount))
  }
  let best: PeriodRecord | null = null
  // On ties the earliest period keeps the record.
  for (const [date, amount] of [...sums].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (!best || amount > best.amount) best = { date, amount }
  }
  return best
}

/** Aggregated hourly rate per source over entries that have minutes_spent. Sorted by rate desc. */
export function hourlyRateBySource(entries: readonly StatEntry[]): HourlyRate[] {
  const agg = new Map<string, { amount: number; minutes: number }>()
  for (const e of entries) {
    if (!e.minutes_spent || e.minutes_spent <= 0) continue
    const a = agg.get(e.source_id) ?? { amount: 0, minutes: 0 }
    a.amount += e.amount
    a.minutes += e.minutes_spent
    agg.set(e.source_id, a)
  }
  return [...agg]
    .map(([sourceId, { amount, minutes }]) => ({
      sourceId,
      amount: round2(amount),
      minutes,
      rate: round2((amount / minutes) * 60),
    }))
    .sort((a, b) => b.rate - a.rate)
}

export function computeRecords(
  entries: readonly StatEntry[],
  opts: { weekStartsOn: WeekStart; freezes: ReadonlySet<ISODate>; today: ISODate },
): Records {
  return {
    bestDay: bestBy(entries, (d) => d),
    bestWeek: bestBy(entries, (d) => weekStartISO(d, opts.weekStartsOn)),
    bestMonth: bestBy(entries, monthStartISO),
    bestHourly: hourlyRateBySource(entries)[0] ?? null,
    longestStreak: bestStreak({ totals: dailyTotals(entries), freezes: opts.freezes, today: opts.today }),
  }
}

/**
 * Records beaten by going from `before` to `after`.
 * Setting the very first value isn't "beating" anything, so it's not reported.
 */
export function newRecords(before: Records, after: Records): RecordKind[] {
  const out: RecordKind[] = []
  const beat = (a: PeriodRecord | null, b: PeriodRecord | null) => !!a && !!b && b.amount > a.amount
  if (beat(before.bestDay, after.bestDay)) out.push('day')
  if (beat(before.bestWeek, after.bestWeek)) out.push('week')
  if (beat(before.bestMonth, after.bestMonth)) out.push('month')
  if (before.bestHourly && after.bestHourly && after.bestHourly.rate > before.bestHourly.rate) out.push('hourly')
  if (before.longestStreak > 1 && after.longestStreak > before.longestStreak) out.push('streak')
  return out
}
