import type { ISODate, StatEntry } from '../types'

/** Sum of amounts per date. Rounded to cents to avoid float drift. */
export function dailyTotals(entries: readonly StatEntry[]): Map<ISODate, number> {
  const map = new Map<ISODate, number>()
  for (const e of entries) map.set(e.date, round2((map.get(e.date) ?? 0) + e.amount))
  return map
}

export function sumAmounts(entries: readonly StatEntry[]): number {
  return round2(entries.reduce((s, e) => s + e.amount, 0))
}

export function sumInRange(entries: readonly StatEntry[], from: ISODate, to: ISODate): number {
  return round2(entries.reduce((s, e) => (e.date >= from && e.date <= to ? s + e.amount : s), 0))
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}
