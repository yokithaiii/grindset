import { describe, expect, it } from 'vitest'
import {
  bestStreak,
  computeStreak,
  currentStreak,
  findRescuableGap,
  freezesLeft,
  freezesUsedInMonth,
} from './streak'

const totals = (...dates: string[]) => new Map(dates.map((d) => [d, 10]))
const set = (...dates: string[]) => new Set(dates)
const TODAY = '2026-09-15'

describe('currentStreak', () => {
  it('is zero without any data', () => {
    expect(currentStreak({ totals: new Map(), freezes: set(), today: TODAY })).toEqual({
      current: 0,
      startDate: null,
      todayDone: false,
    })
  })

  it('counts today when it has earnings', () => {
    const r = currentStreak({ totals: totals(TODAY), freezes: set(), today: TODAY })
    expect(r).toEqual({ current: 1, startDate: TODAY, todayDone: true })
  })

  it('does not break when today has no earnings yet', () => {
    const r = currentStreak({ totals: totals('2026-09-13', '2026-09-14'), freezes: set(), today: TODAY })
    expect(r.current).toBe(2)
    expect(r.todayDone).toBe(false)
    expect(r.startDate).toBe('2026-09-13')
  })

  it('counts consecutive days including today', () => {
    const r = currentStreak({ totals: totals('2026-09-13', '2026-09-14', TODAY), freezes: set(), today: TODAY })
    expect(r.current).toBe(3)
  })

  it('breaks on a missed day', () => {
    const t = totals('2026-09-10', '2026-09-11', '2026-09-13', '2026-09-14', TODAY)
    expect(currentStreak({ totals: t, freezes: set(), today: TODAY }).current).toBe(3)
  })

  it('is zero when yesterday was missed and today has nothing yet', () => {
    const t = totals('2026-09-12', '2026-09-13')
    expect(currentStreak({ totals: t, freezes: set(), today: TODAY }).current).toBe(0)
  })

  it('restarts at 1 when yesterday was missed but today has earnings', () => {
    const t = totals('2026-09-12', '2026-09-13', TODAY)
    expect(currentStreak({ totals: t, freezes: set(), today: TODAY }).current).toBe(1)
  })

  it('ignores zero-amount days', () => {
    const t = new Map([
      ['2026-09-13', 10],
      ['2026-09-14', 0],
      [TODAY, 5],
    ])
    expect(currentStreak({ totals: t, freezes: set(), today: TODAY }).current).toBe(1)
  })

  it('a frozen day bridges the gap but does not add to the streak', () => {
    const t = totals('2026-09-12', '2026-09-13', TODAY)
    const r = currentStreak({ totals: t, freezes: set('2026-09-14'), today: TODAY })
    expect(r.current).toBe(3)
    expect(r.startDate).toBe('2026-09-12')
  })

  it('multiple consecutive frozen days bridge the gap', () => {
    const t = totals('2026-09-11', '2026-09-12')
    const r = currentStreak({ totals: t, freezes: set('2026-09-13', '2026-09-14'), today: TODAY })
    expect(r.current).toBe(2)
  })

  it('frozen yesterday with nothing today keeps the streak', () => {
    const t = totals('2026-09-12', '2026-09-13')
    expect(currentStreak({ totals: t, freezes: set('2026-09-14'), today: TODAY }).current).toBe(2)
  })

  it('only frozen days give zero streak', () => {
    expect(currentStreak({ totals: new Map(), freezes: set('2026-09-13', '2026-09-14'), today: TODAY }).current).toBe(0)
  })

  it('frozen today does not count, earned days before do', () => {
    const t = totals('2026-09-13', '2026-09-14')
    expect(currentStreak({ totals: t, freezes: set(TODAY), today: TODAY }).current).toBe(2)
  })

  it('continues across a month boundary', () => {
    const t = totals('2026-08-30', '2026-08-31', '2026-09-01')
    expect(currentStreak({ totals: t, freezes: set(), today: '2026-09-01' }).current).toBe(3)
  })

  it('continues across a year boundary', () => {
    const t = totals('2026-12-30', '2026-12-31', '2027-01-01')
    expect(currentStreak({ totals: t, freezes: set(), today: '2027-01-01' }).current).toBe(3)
  })

  it('handles February in a leap year', () => {
    const t = totals('2028-02-28', '2028-02-29', '2028-03-01')
    expect(currentStreak({ totals: t, freezes: set(), today: '2028-03-01' }).current).toBe(3)
  })

  it('handles DST transitions (spring and autumn)', () => {
    const spring = totals('2026-03-28', '2026-03-29', '2026-03-30')
    expect(currentStreak({ totals: spring, freezes: set(), today: '2026-03-30' }).current).toBe(3)
    const autumn = totals('2026-10-24', '2026-10-25', '2026-10-26')
    expect(currentStreak({ totals: autumn, freezes: set(), today: '2026-10-26' }).current).toBe(3)
  })

  it('ignores future entries', () => {
    const t = totals('2026-09-14', '2026-09-20')
    expect(currentStreak({ totals: t, freezes: set(), today: TODAY }).current).toBe(1)
  })
})

describe('bestStreak', () => {
  it('is zero without data', () => {
    expect(bestStreak({ totals: new Map(), freezes: set(), today: TODAY })).toBe(0)
  })

  it('finds the longest historical run', () => {
    const t = totals('2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-10', '2026-09-11')
    expect(bestStreak({ totals: t, freezes: set(), today: TODAY })).toBe(4)
  })

  it('counts runs bridged by freezes', () => {
    const t = totals('2026-09-01', '2026-09-02', '2026-09-04', '2026-09-05')
    expect(bestStreak({ totals: t, freezes: set('2026-09-03'), today: TODAY })).toBe(4)
  })

  it('includes the current streak when it is the longest', () => {
    const t = totals('2026-09-01', '2026-09-12', '2026-09-13', '2026-09-14')
    expect(bestStreak({ totals: t, freezes: set(), today: TODAY })).toBe(3)
  })

  it('is at least the current streak', () => {
    const t = totals('2026-08-28', '2026-08-29', '2026-08-31', '2026-09-01', '2026-09-02')
    const r = computeStreak({ totals: t, freezes: set('2026-08-30'), today: '2026-09-02' })
    expect(r.current).toBe(5)
    expect(r.best).toBe(5)
  })
})

describe('freezes', () => {
  it('counts freezes per calendar month', () => {
    const f = set('2026-08-31', '2026-09-01', '2026-09-05')
    expect(freezesUsedInMonth(f, '2026-09')).toBe(2)
    expect(freezesUsedInMonth(f, '2026-08')).toBe(1)
    expect(freezesLeft(f, TODAY, 2)).toBe(0)
    expect(freezesLeft(f, '2026-08-15', 2)).toBe(1)
    expect(freezesLeft(f, '2026-10-01', 2)).toBe(2)
  })

  it('never returns a negative number of freezes left', () => {
    expect(freezesLeft(set('2026-09-01', '2026-09-02', '2026-09-03'), TODAY, 1)).toBe(0)
  })
})

describe('findRescuableGap', () => {
  it('returns null when nothing is missed', () => {
    const t = totals('2026-09-13', '2026-09-14')
    expect(findRescuableGap({ totals: t, freezes: set(), today: TODAY, perMonth: 2 })).toBeNull()
  })

  it('returns null without history', () => {
    expect(findRescuableGap({ totals: new Map(), freezes: set(), today: TODAY, perMonth: 2 })).toBeNull()
  })

  it('offers to freeze a missed yesterday', () => {
    const t = totals('2026-09-12', '2026-09-13')
    expect(findRescuableGap({ totals: t, freezes: set(), today: TODAY, perMonth: 2 })).toEqual({
      days: ['2026-09-14'],
      streakIfFrozen: 2,
      possible: true,
    })
  })

  it('still offers the rescue after earning today', () => {
    const t = totals('2026-09-12', '2026-09-13', TODAY)
    expect(findRescuableGap({ totals: t, freezes: set(), today: TODAY, perMonth: 2 })).toEqual({
      days: ['2026-09-14'],
      streakIfFrozen: 3,
      possible: true,
    })
  })

  it('returns multi-day gaps oldest first', () => {
    const t = totals('2026-09-12')
    const r = findRescuableGap({ totals: t, freezes: set(), today: TODAY, perMonth: 2 })
    expect(r?.days).toEqual(['2026-09-13', '2026-09-14'])
    expect(r?.possible).toBe(true)
  })

  it('is not possible when the gap exceeds the monthly budget', () => {
    const t = totals('2026-09-10')
    const r = findRescuableGap({ totals: t, freezes: set(), today: TODAY, perMonth: 2 })
    expect(r?.days).toHaveLength(4)
    expect(r?.possible).toBe(false)
  })

  it('takes already used freezes into account', () => {
    const t = totals('2026-09-12', '2026-09-13')
    const r = findRescuableGap({ totals: t, freezes: set('2026-09-02', '2026-09-03'), today: TODAY, perMonth: 2 })
    expect(r?.possible).toBe(false)
  })

  it('budgets each month separately across a month change', () => {
    // Aug 31 and Sep 1 missed; August budget already used once, 2 per month allowed.
    const t = totals('2026-08-29', '2026-08-30')
    const r = findRescuableGap({ totals: t, freezes: set('2026-08-05'), today: '2026-09-02', perMonth: 2 })
    expect(r).toEqual({ days: ['2026-08-31', '2026-09-01'], streakIfFrozen: 2, possible: true })

    const full = findRescuableGap({
      totals: t,
      freezes: set('2026-08-05', '2026-08-06'),
      today: '2026-09-02',
      perMonth: 2,
    })
    expect(full?.possible).toBe(false)
  })

  it('looks past an existing freeze only up to it', () => {
    // 13 frozen, 14 missed: only 14 needs freezing.
    const t = totals('2026-09-12')
    const r = findRescuableGap({ totals: t, freezes: set('2026-09-13'), today: TODAY, perMonth: 2 })
    expect(r?.days).toEqual(['2026-09-14'])
  })

  it('reports impossibility when perMonth is 0', () => {
    const t = totals('2026-09-13')
    expect(findRescuableGap({ totals: t, freezes: set(), today: TODAY, perMonth: 0 })?.possible).toBe(false)
  })

  it('ignores very long gaps', () => {
    const t = totals('2026-07-01')
    expect(findRescuableGap({ totals: t, freezes: set(), today: TODAY, perMonth: 2 })).toBeNull()
  })
})
