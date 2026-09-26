import { addDaysISO, fromISODate } from '../dates'
import type { ISODate, WeekStart } from '../types'
import { weekStartISO } from './records'

export type HeatLevel = 0 | 1 | 2 | 3 | 4

export interface HeatCell {
  date: ISODate
  amount: number
  level: HeatLevel
  frozen: boolean
  /** After today — rendered as empty space. */
  future: boolean
}

export interface Heatmap {
  /** 53 columns (weeks) × 7 rows (days, starting at weekStartsOn). */
  weeks: HeatCell[][]
  /** Upper bounds of levels 1..3; values above the last one are level 4. */
  thresholds: [number, number, number]
  /** Column index where each month starts, for labels. */
  monthStarts: { week: number; month: number }[]
}

export const HEATMAP_WEEKS = 53

/** Linear-interpolated quantile of a sorted array. */
export function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

/**
 * Level by quartiles of the positive amounts visible in the grid:
 * 0 = nothing, 1 ≤ Q1, 2 ≤ Q2, 3 ≤ Q3, 4 > Q3.
 */
export function levelFor(amount: number, t: readonly [number, number, number]): HeatLevel {
  if (amount <= 0) return 0
  if (amount <= t[0]) return 1
  if (amount <= t[1]) return 2
  if (amount <= t[2]) return 3
  return 4
}

export function buildHeatmap(
  totals: ReadonlyMap<ISODate, number>,
  freezes: ReadonlySet<ISODate>,
  today: ISODate,
  weekStartsOn: WeekStart,
): Heatmap {
  const start = addDaysISO(weekStartISO(today, weekStartsOn), -7 * (HEATMAP_WEEKS - 1))

  const dates: ISODate[] = []
  for (let i = 0, d = start; i < HEATMAP_WEEKS * 7; i++, d = addDaysISO(d, 1)) dates.push(d)

  const values = dates
    .filter((d) => d <= today)
    .map((d) => totals.get(d) ?? 0)
    .filter((v) => v > 0)
    .sort((a, b) => a - b)
  const thresholds: [number, number, number] = [quantile(values, 0.25), quantile(values, 0.5), quantile(values, 0.75)]

  const weeks: HeatCell[][] = []
  const monthStarts: Heatmap['monthStarts'] = []
  let lastMonth = -1
  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    const col: HeatCell[] = []
    for (let r = 0; r < 7; r++) {
      const date = dates[w * 7 + r]
      const future = date > today
      const amount = future ? 0 : (totals.get(date) ?? 0)
      col.push({ date, amount, level: levelFor(amount, thresholds), frozen: !future && freezes.has(date), future })
    }
    // Label a month at the first column containing its 1st day (or the first column).
    const firstOfMonth = col.find((c) => c.date.endsWith('-01'))
    const labelDate = w === 0 ? col[0].date : firstOfMonth?.date
    if (labelDate) {
      const month = fromISODate(labelDate).getMonth()
      if (month !== lastMonth) {
        monthStarts.push({ week: w, month })
        lastMonth = month
      }
    }
    weeks.push(col)
  }
  // Drop a leading label if the next one starts right after it (they would overlap).
  if (monthStarts.length > 1 && monthStarts[1].week - monthStarts[0].week < 3) monthStarts.shift()

  return { weeks, thresholds, monthStarts }
}
