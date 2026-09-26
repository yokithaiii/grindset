import { describe, expect, it } from 'vitest'
import { compareWithSameDayLastMonth, monthForecast } from './forecast'
import type { StatEntry } from '../types'

const e = (date: string, amount: number): StatEntry => ({ date, amount, source_id: 'a' })

describe('monthForecast', () => {
  it('extrapolates the current pace', () => {
    const f = monthForecast([e('2026-09-01', 100), e('2026-09-10', 200)], '2026-09-10')
    expect(f).toEqual({ earned: 300, daysElapsed: 10, daysInMonth: 30, projected: 900 })
  })

  it('is zero without earnings', () => {
    expect(monthForecast([], '2026-09-01').projected).toBe(0)
  })

  it('handles February', () => {
    expect(monthForecast([e('2027-02-14', 140)], '2027-02-14').projected).toBe(280)
  })
})

describe('compareWithSameDayLastMonth', () => {
  it('compares the same number of days', () => {
    const entries = [e('2026-08-05', 100), e('2026-08-20', 999), e('2026-09-03', 150)]
    expect(compareWithSameDayLastMonth(entries, '2026-09-10')).toEqual({ current: 150, previous: 100, change: 0.5 })
  })

  it('clamps to the end of a shorter previous month', () => {
    const entries = [e('2026-02-28', 100), e('2026-03-31', 50)]
    expect(compareWithSameDayLastMonth(entries, '2026-03-31')).toEqual({ current: 50, previous: 100, change: -0.5 })
  })

  it('works across the year boundary', () => {
    const entries = [e('2025-12-01', 100), e('2026-01-01', 100)]
    expect(compareWithSameDayLastMonth(entries, '2026-01-01').change).toBe(0)
  })

  it('returns null change when last month is empty', () => {
    expect(compareWithSameDayLastMonth([e('2026-09-01', 10)], '2026-09-01').change).toBeNull()
  })
})
