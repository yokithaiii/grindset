import { describe, expect, it } from 'vitest'
import {
  activeSourcesCount,
  comparePeriods,
  cumulativeByType,
  dayStats,
  periodRange,
  sourceBreakdown,
  stackedSeries,
} from './analytics'
import type { StatEntry } from '../types'

const e = (date: string, amount: number, source_id = 'a'): StatEntry => ({ date, amount, source_id })

describe('periodRange', () => {
  const today = '2026-09-16'

  it('week', () => {
    expect(periodRange('week', today, 1, null)).toEqual({
      kind: 'week',
      from: '2026-09-14',
      end: '2026-09-20',
      to: today,
      bucket: 'day',
      prev: { from: '2026-09-07', to: '2026-09-09' },
    })
  })

  it('month compares the same elapsed days of last month', () => {
    const p = periodRange('month', today, 1, null)
    expect(p).toMatchObject({ from: '2026-09-01', end: '2026-09-30', to: today })
    expect(p.prev).toEqual({ from: '2026-08-01', to: '2026-08-16' })
  })

  it('month clamps the previous range to a shorter month', () => {
    expect(periodRange('month', '2026-03-31', 1, null).prev).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })

  it('quarter and year use weekly buckets', () => {
    const q = periodRange('quarter', today, 1, null)
    expect(q).toMatchObject({ from: '2026-07-01', end: '2026-09-30', bucket: 'week' })
    // same number of elapsed days: Jul 1..Sep 16 is 78 days → Apr 1..Jun 17
    expect(q.prev).toEqual({ from: '2026-04-01', to: '2026-06-17' })
    const y = periodRange('year', today, 1, null)
    expect(y).toMatchObject({ from: '2026-01-01', end: '2026-12-31', bucket: 'week' })
    expect(y.prev).toEqual({ from: '2025-01-01', to: '2025-09-16' })
  })

  it('all time starts at the first entry and has no comparison', () => {
    expect(periodRange('all', today, 1, '2025-01-01')).toMatchObject({ from: '2025-01-01', bucket: 'month', prev: null })
    expect(periodRange('all', today, 1, null)).toMatchObject({ from: today, bucket: 'day' })
  })
})

describe('stackedSeries', () => {
  it('fills empty buckets and stacks by source', () => {
    const rows = stackedSeries(
      [e('2026-09-02', 10, 'a'), e('2026-09-02', 5, 'b')],
      '2026-09-01',
      '2026-09-03',
      'day',
      1,
    )
    expect(rows).toEqual([
      { key: '2026-09-01', total: 0 },
      { key: '2026-09-02', total: 15, a: 10, b: 5 },
      { key: '2026-09-03', total: 0 },
    ])
  })

  it('groups by week', () => {
    const rows = stackedSeries(
      [e('2026-09-01', 10), e('2026-09-06', 10), e('2026-09-07', 1)],
      '2026-09-01',
      '2026-09-07',
      'week',
      1,
    )
    expect(rows.map((r) => [r.key, r.total])).toEqual([
      ['2026-08-31', 20],
      ['2026-09-07', 1],
    ])
  })
})

describe('sources', () => {
  const entries = [e('2026-09-01', 75, 'a'), e('2026-09-02', 25, 'b'), e('2026-09-03', 0.5, 'b')]

  it('breakdown is sorted with shares', () => {
    const b = sourceBreakdown(entries)
    expect(b[0]).toEqual({ sourceId: 'a', amount: 75, share: 75 / 100.5 })
    expect(b[1].amount).toBe(25.5)
  })

  it('counts active sources', () => {
    expect(activeSourcesCount(entries)).toBe(2)
    expect(activeSourcesCount([])).toBe(0)
  })

  it('cumulates active vs passive', () => {
    const rows = cumulativeByType(
      entries,
      (id) => (id === 'b' ? 'passive' : 'active'),
      '2026-09-01',
      '2026-09-03',
      'day',
      1,
    )
    expect(rows).toEqual([
      { key: '2026-09-01', active: 75, passive: 0 },
      { key: '2026-09-02', active: 75, passive: 25 },
      { key: '2026-09-03', active: 75, passive: 25.5 },
    ])
  })
})

describe('dayStats', () => {
  it('computes averages, median and best weekday', () => {
    // 2026-09-14 is a Monday
    const s = dayStats(
      [e('2026-09-14', 100), e('2026-09-15', 20), e('2026-09-15', 10), e('2026-09-17', 50)],
      '2026-09-14',
      '2026-09-20',
    )
    expect(s.total).toBe(180)
    expect(s.days).toBe(7)
    expect(s.activeDays).toBe(3)
    expect(s.avgPerDay).toBeCloseTo(25.71, 2)
    expect(s.medianActiveDay).toBe(50)
    expect(s.bestWeekday).toBe(1)
  })

  it('has no best weekday without earnings', () => {
    expect(dayStats([], '2026-09-14', '2026-09-20').bestWeekday).toBeNull()
  })
})

describe('comparePeriods', () => {
  it('compares with the previous period', () => {
    const p = periodRange('week', '2026-09-16', 1, null)
    const c = comparePeriods([e('2026-09-08', 100), e('2026-09-15', 150)], p)
    expect(c).toEqual({ current: 150, previous: 100, change: 0.5 })
  })
})
