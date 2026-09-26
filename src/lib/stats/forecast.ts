import { getDaysInMonth, subMonths } from 'date-fns'
import { fromISODate, monthStartISO, toISODate } from '../dates'
import type { ISODate, StatEntry } from '../types'
import { round2, sumInRange } from './daily'

export interface MonthForecast {
  earned: number
  /** Days from the 1st through today, inclusive. */
  daysElapsed: number
  daysInMonth: number
  /** earned / daysElapsed × daysInMonth */
  projected: number
}

export function monthForecast(entries: readonly StatEntry[], today: ISODate): MonthForecast {
  const d = fromISODate(today)
  const earned = sumInRange(entries, monthStartISO(today), today)
  const daysElapsed = d.getDate()
  const daysInMonth = getDaysInMonth(d)
  return { earned, daysElapsed, daysInMonth, projected: round2((earned / daysElapsed) * daysInMonth) }
}

export interface PeriodComparison {
  current: number
  previous: number
  /** Relative change, e.g. 0.12 = +12%. null when previous is 0. */
  change: number | null
}

export function compare(current: number, previous: number): PeriodComparison {
  return { current, previous, change: previous > 0 ? (current - previous) / previous : null }
}

/**
 * This month from the 1st to today vs. last month from the 1st to the same day
 * (clamped to the last day of a shorter month).
 */
export function compareWithSameDayLastMonth(entries: readonly StatEntry[], today: ISODate): PeriodComparison {
  const d = fromISODate(today)
  const prevMonth = subMonths(new Date(d.getFullYear(), d.getMonth(), 1), 1)
  const prevDay = Math.min(d.getDate(), getDaysInMonth(prevMonth))
  const prevStart = toISODate(prevMonth)
  const prevEnd = toISODate(new Date(prevMonth.getFullYear(), prevMonth.getMonth(), prevDay))
  return compare(sumInRange(entries, monthStartISO(today), today), sumInRange(entries, prevStart, prevEnd))
}
