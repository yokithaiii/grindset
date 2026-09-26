import { describe, expect, it } from 'vitest'
import { buildHeatmap, HEATMAP_WEEKS, levelFor, quantile } from './heatmap'

describe('quantile', () => {
  it('interpolates', () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5)
    expect(quantile([10], 0.75)).toBe(10)
    expect(quantile([], 0.5)).toBe(0)
  })
})

describe('levelFor', () => {
  const t = [10, 20, 30] as const
  it('maps amounts to 5 levels', () => {
    expect([0, 5, 10, 15, 20, 25, 30, 31].map((v) => levelFor(v, t))).toEqual([0, 1, 1, 2, 2, 3, 3, 4])
  })
})

describe('buildHeatmap', () => {
  const today = '2026-09-16' // Wednesday

  it('has 53 weeks × 7 days ending with the week of today', () => {
    const h = buildHeatmap(new Map(), new Set(), today, 1)
    expect(h.weeks).toHaveLength(HEATMAP_WEEKS)
    expect(h.weeks.every((w) => w.length === 7)).toBe(true)
    const last = h.weeks[HEATMAP_WEEKS - 1]
    expect(last[0].date).toBe('2026-09-14') // Monday
    expect(last[2]).toMatchObject({ date: today, future: false })
    expect(last[3].future).toBe(true)
    expect(h.weeks[0][0].date).toBe('2025-09-15')
  })

  it('starts columns on Sunday when configured', () => {
    const h = buildHeatmap(new Map(), new Set(), today, 0)
    expect(h.weeks[HEATMAP_WEEKS - 1][0].date).toBe('2026-09-13')
  })

  it('assigns quantile levels and marks freezes', () => {
    const totals = new Map([
      ['2026-09-10', 10],
      ['2026-09-11', 20],
      ['2026-09-12', 30],
      ['2026-09-13', 40],
      ['2026-09-20', 1000], // future: ignored
    ])
    const h = buildHeatmap(totals, new Set(['2026-09-09', '2026-09-30']), today, 1)
    const cells = new Map(h.weeks.flat().map((c) => [c.date, c]))
    expect(cells.get('2026-09-10')?.level).toBe(1)
    expect(cells.get('2026-09-13')?.level).toBe(4)
    expect(cells.get('2026-09-09')?.frozen).toBe(true)
    expect(cells.get('2026-09-20')?.amount).toBe(0)
    expect(h.thresholds).toEqual([17.5, 25, 32.5])
  })

  it('labels each month once in order', () => {
    const h = buildHeatmap(new Map(), new Set(), today, 1)
    const weeks = h.monthStarts.map((m) => m.week)
    expect([...weeks].sort((a, b) => a - b)).toEqual(weeks)
    expect(h.monthStarts.length).toBeGreaterThanOrEqual(12)
  })
})
