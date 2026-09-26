import { describe, expect, it } from 'vitest'
import { computeMilestones } from './milestones'
import type { StatEntry } from '../types'

const e = (date: string, amount: number): StatEntry => ({ date, amount, source_id: 'a' })

describe('computeMilestones', () => {
  it('starts with 100 as the first milestone', () => {
    expect(computeMilestones([])).toEqual({ total: 0, reached: [], next: 100, progress: 0 })
  })

  it('records the date each milestone was crossed, in date order', () => {
    const m = computeMilestones([e('2026-09-03', 450), e('2026-09-01', 80), e('2026-09-02', 30)])
    expect(m.reached).toEqual([
      { value: 100, date: '2026-09-02' },
      { value: 500, date: '2026-09-03' },
    ])
    expect(m.next).toBe(1000)
    expect(m.progress).toBeCloseTo(60 / 500)
  })

  it('one big entry can pass several milestones', () => {
    expect(computeMilestones([e('2026-09-01', 3000)]).reached.map((r) => r.value)).toEqual([100, 500, 1000, 2500])
  })

  it('reports completion after the last milestone', () => {
    const m = computeMilestones([e('2026-09-01', 150000)])
    expect(m.next).toBeNull()
    expect(m.progress).toBe(1)
  })
})
