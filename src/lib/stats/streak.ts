import { addDaysISO, eachDayISO, monthKey } from '../dates'
import type { ISODate } from '../types'

/**
 * Streak rules:
 *  - a day counts when its total is > 0;
 *  - today without earnings does not break the streak yet (the day isn't over);
 *  - a frozen day neither extends nor breaks the streak.
 */
export interface StreakInput {
  totals: ReadonlyMap<ISODate, number>
  freezes: ReadonlySet<ISODate>
  today: ISODate
}

export interface StreakResult {
  current: number
  best: number
  /** Today already has earnings. */
  todayDone: boolean
  /** First earning day of the current streak. */
  startDate: ISODate | null
}

const earned = (totals: ReadonlyMap<ISODate, number>, d: ISODate) => (totals.get(d) ?? 0) > 0

/** Earliest date that has either earnings or a freeze, not after today. */
function earliestDate({ totals, freezes, today }: StreakInput): ISODate | null {
  let min: ISODate | null = null
  for (const d of totals.keys()) if (d <= today && earned(totals, d) && (min === null || d < min)) min = d
  for (const d of freezes) if (d <= today && (min === null || d < min)) min = d
  return min
}

export function currentStreak(input: StreakInput): Pick<StreakResult, 'current' | 'startDate' | 'todayDone'> {
  const { totals, freezes, today } = input
  const earliest = earliestDate(input)
  const todayDone = earned(totals, today)
  if (earliest === null) return { current: 0, startDate: null, todayDone }

  let current = todayDone ? 1 : 0
  let startDate: ISODate | null = todayDone ? today : null

  for (let d = addDaysISO(today, -1); d >= earliest; d = addDaysISO(d, -1)) {
    if (earned(totals, d)) {
      current++
      startDate = d
    } else if (!freezes.has(d)) {
      break
    }
  }
  return { current, startDate, todayDone }
}

export function bestStreak(input: StreakInput): number {
  const { totals, freezes, today } = input
  const earliest = earliestDate(input)
  if (earliest === null) return 0

  let run = 0
  let best = 0
  for (const d of eachDayISO(earliest, today)) {
    if (earned(totals, d)) {
      run++
      if (run > best) best = run
    } else if (!freezes.has(d) && d !== today) {
      run = 0
    }
  }
  return best
}

export function computeStreak(input: StreakInput): StreakResult {
  return { ...currentStreak(input), best: bestStreak(input) }
}

// ---------------------------------------------------------------------------
// Freezes
// ---------------------------------------------------------------------------

export function freezesUsedInMonth(freezes: ReadonlySet<ISODate>, month: string): number {
  let n = 0
  for (const d of freezes) if (monthKey(d) === month) n++
  return n
}

/** Freezes still available in the calendar month of `date`. */
export function freezesLeft(freezes: ReadonlySet<ISODate>, date: ISODate, perMonth: number): number {
  return Math.max(0, perMonth - freezesUsedInMonth(freezes, monthKey(date)))
}

export interface FreezeRescue {
  /** Missed days (oldest first) that must be frozen to keep the streak. */
  days: ISODate[]
  /** Streak length that would be preserved (as it would be today). */
  streakIfFrozen: number
  /** Enough freezes left in every affected month. */
  possible: boolean
}

/** Longest gap we look back over; larger gaps are simply a broken streak. */
const MAX_GAP = 31

/**
 * The most recent run of missed days before today that broke (or will break) a streak.
 * Returns null when nothing is broken or there was no streak to save.
 */
export function findRescuableGap(input: StreakInput & { perMonth: number }): FreezeRescue | null {
  const { totals, freezes, today, perMonth } = input
  const earliest = earliestDate(input)
  if (earliest === null) return null

  const gap: ISODate[] = []
  let d = addDaysISO(today, -1)
  while (d >= earliest && !earned(totals, d) && !freezes.has(d)) {
    gap.push(d)
    if (gap.length > MAX_GAP) return null
    d = addDaysISO(d, -1)
  }
  // Nothing missed, or the gap reaches back past all history (no streak before it).
  if (gap.length === 0 || d < earliest) return null

  const withGapFrozen = new Set(freezes)
  for (const g of gap) withGapFrozen.add(g)
  const { current } = currentStreak({ totals, freezes: withGapFrozen, today })
  if (current === 0) return null

  const needed = new Map<string, number>()
  for (const g of gap) needed.set(monthKey(g), (needed.get(monthKey(g)) ?? 0) + 1)
  let possible = true
  for (const [month, n] of needed) {
    if (freezesUsedInMonth(freezes, month) + n > perMonth) possible = false
  }

  return { days: gap.reverse(), streakIfFrozen: current, possible }
}
