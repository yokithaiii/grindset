import { addDays, format, parseISO } from 'date-fns'
import type { ISODate } from './types'

/** Local calendar date → 'yyyy-MM-dd'. */
export function toISODate(d: Date): ISODate {
  return format(d, 'yyyy-MM-dd')
}

/** 'yyyy-MM-dd' → Date at local midnight (never UTC-shifted). */
export function fromISODate(s: ISODate): Date {
  return parseISO(s)
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now)
}

export function addDaysISO(s: ISODate, n: number): ISODate {
  return toISODate(addDays(fromISODate(s), n))
}

/** 'yyyy-MM' of the date. */
export function monthKey(s: ISODate): string {
  return s.slice(0, 7)
}

/** First day of the month as ISO date. */
export function monthStartISO(s: ISODate): ISODate {
  return `${s.slice(0, 7)}-01`
}

/** Iterate every date in [from, to] inclusive. */
export function* eachDayISO(from: ISODate, to: ISODate): Generator<ISODate> {
  let d = from
  while (d <= to) {
    yield d
    d = addDaysISO(d, 1)
  }
}
