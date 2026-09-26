import { describe, expect, it } from 'vitest'
import { computeRecords, hourlyRateBySource, newRecords, weekStartISO } from './records'
import type { StatEntry } from '../types'

const e = (date: string, amount: number, source_id = 'a', minutes_spent: number | null = null): StatEntry => ({
  date,
  amount,
  source_id,
  minutes_spent,
})
const opts = { weekStartsOn: 1 as const, freezes: new Set<string>(), today: '2026-09-15' }

describe('weekStartISO', () => {
  it('respects the first day of week', () => {
    expect(weekStartISO('2026-09-13', 1)).toBe('2026-09-07') // Sunday → previous Monday
    expect(weekStartISO('2026-09-13', 0)).toBe('2026-09-13') // Sunday is the start
  })
})

describe('computeRecords', () => {
  it('returns empty records without entries', () => {
    expect(computeRecords([], opts)).toEqual({
      bestDay: null,
      bestWeek: null,
      bestMonth: null,
      bestHourly: null,
      longestStreak: 0,
    })
  })

  it('sums multiple entries on the same day', () => {
    const r = computeRecords([e('2026-09-01', 50), e('2026-09-01', 60), e('2026-09-02', 100)], opts)
    expect(r.bestDay).toEqual({ date: '2026-09-01', amount: 110 })
  })

  it('finds best week and month', () => {
    const r = computeRecords(
      [e('2026-08-03', 100), e('2026-08-04', 100), e('2026-09-07', 150), e('2026-09-14', 10)],
      opts,
    )
    expect(r.bestWeek).toEqual({ date: '2026-08-03', amount: 200 })
    expect(r.bestMonth).toEqual({ date: '2026-08-01', amount: 200 })
  })

  it('keeps the earliest period on ties', () => {
    const r = computeRecords([e('2026-09-02', 100), e('2026-09-01', 100)], opts)
    expect(r.bestDay?.date).toBe('2026-09-01')
  })

  it('computes the longest streak', () => {
    const r = computeRecords([e('2026-09-01', 1), e('2026-09-02', 1), e('2026-09-10', 1)], opts)
    expect(r.longestStreak).toBe(2)
  })

  it('avoids float drift', () => {
    const r = computeRecords([e('2026-09-01', 0.1), e('2026-09-01', 0.2)], opts)
    expect(r.bestDay?.amount).toBe(0.3)
  })
})

describe('hourlyRateBySource', () => {
  it('uses only entries with minutes and aggregates per source', () => {
    const rates = hourlyRateBySource([
      e('2026-09-01', 100, 'a', 60),
      e('2026-09-02', 50, 'a', 60),
      e('2026-09-02', 999, 'a', null),
      e('2026-09-03', 40, 'b', 20),
    ])
    expect(rates).toEqual([
      { sourceId: 'b', amount: 40, minutes: 20, rate: 120 },
      { sourceId: 'a', amount: 150, minutes: 120, rate: 75 },
    ])
  })

  it('ignores zero minutes', () => {
    expect(hourlyRateBySource([e('2026-09-01', 10, 'a', 0)])).toEqual([])
  })
})

describe('newRecords', () => {
  it('reports beaten records only', () => {
    const before = computeRecords([e('2026-09-01', 100, 'a', 60), e('2026-09-02', 50)], opts)
    const after = computeRecords(
      [e('2026-09-01', 100, 'a', 60), e('2026-09-02', 50), e('2026-09-03', 200, 'a', 30)],
      opts,
    )
    expect(newRecords(before, after)).toEqual(['day', 'week', 'month', 'hourly', 'streak'])
  })

  it('does not report the very first entry as a record', () => {
    expect(newRecords(computeRecords([], opts), computeRecords([e('2026-09-01', 10)], opts))).toEqual([])
  })

  it('does not report ties', () => {
    const before = computeRecords([e('2026-08-01', 100)], opts)
    const after = computeRecords([e('2026-08-01', 100), e('2026-09-01', 100)], opts)
    expect(newRecords(before, after)).toEqual([])
  })
})
