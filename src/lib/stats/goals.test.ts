import { describe, expect, it } from 'vitest'
import { dailyTarget, effectiveMonthlyGoal, savingsProgress } from './goals'
import type { StatEntry } from '../types'

const e = (date: string, amount: number): StatEntry => ({ date, amount, source_id: 'a' })
const g = (month: string, target_amount: number) => ({ kind: 'monthly', month, target_amount })

describe('effectiveMonthlyGoal', () => {
  it('prefers the exact month', () => {
    const goals = [g('2026-08-01', 1000), g('2026-09-01', 2000)]
    expect(effectiveMonthlyGoal(goals, '2026-09-15')?.target_amount).toBe(2000)
  })

  it('carries the latest earlier goal forward', () => {
    const goals = [g('2026-06-01', 500), g('2026-08-01', 1000), g('2026-12-01', 3000)]
    expect(effectiveMonthlyGoal(goals, '2026-09-15')?.target_amount).toBe(1000)
  })

  it('returns null when no goal applies', () => {
    expect(effectiveMonthlyGoal([g('2026-10-01', 1000)], '2026-09-15')).toBeNull()
    expect(effectiveMonthlyGoal([{ kind: 'savings', month: null, target_amount: 1 }], '2026-09-15')).toBeNull()
  })
})

describe('dailyTarget', () => {
  it('divides the remainder by days left including today', () => {
    // September has 30 days; on the 21st there are 10 days left.
    const t = dailyTarget([e('2026-09-01', 1000)], 2000, '2026-09-21')
    expect(t.daysLeft).toBe(10)
    expect(t.perDay).toBe(100)
    expect(t.todayProgress).toBe(0)
    expect(t.monthAchieved).toBe(false)
  })

  it('ignores earnings of today in the target so it stays fixed during the day', () => {
    const t = dailyTarget([e('2026-09-01', 1000), e('2026-09-21', 50)], 2000, '2026-09-21')
    expect(t.perDay).toBe(100)
    expect(t.earnedToday).toBe(50)
    expect(t.todayProgress).toBe(0.5)
  })

  it('caps progress at 1', () => {
    const t = dailyTarget([e('2026-09-21', 500)], 2000, '2026-09-21')
    expect(t.todayProgress).toBe(1)
  })

  it('ignores entries from other months', () => {
    const t = dailyTarget([e('2026-08-31', 5000)], 300, '2026-09-01')
    expect(t.daysLeft).toBe(30)
    expect(t.perDay).toBe(10)
  })

  it('on the last day the whole remainder is due', () => {
    const t = dailyTarget([e('2026-09-01', 900)], 1000, '2026-09-30')
    expect(t.daysLeft).toBe(1)
    expect(t.perDay).toBe(100)
  })

  it('reports achievement and surplus', () => {
    const t = dailyTarget([e('2026-09-01', 900), e('2026-09-10', 250)], 1000, '2026-09-10')
    expect(t.monthAchieved).toBe(true)
    expect(t.surplus).toBe(150)
  })

  it('perDay is 0 once the goal was met before today', () => {
    const t = dailyTarget([e('2026-09-01', 1200)], 1000, '2026-09-10')
    expect(t.perDay).toBe(0)
    expect(t.todayProgress).toBe(1)
  })
})

describe('savingsProgress', () => {
  const entries = [e('2026-09-01', 500), e('2026-09-10', 300), e('2026-09-15', 85)]

  it('counts only earnings since the start date', () => {
    const p = savingsProgress(entries, { target_amount: 2000, startDate: '2026-09-10' }, '2026-09-15')
    expect(p.saved).toBe(385)
    expect(p.remaining).toBe(1615)
    expect(p.progress).toBeCloseTo(0.1925)
  })

  it('reports the share of the target contributed today', () => {
    const p = savingsProgress(entries, { target_amount: 2000, startDate: '2026-09-10' }, '2026-09-15')
    expect(p.earnedToday).toBe(85)
    expect(p.todayShare).toBeCloseTo(0.0425)
  })

  it('caps progress at 1', () => {
    const p = savingsProgress(entries, { target_amount: 100, startDate: '2026-09-01' }, '2026-09-15')
    expect(p.progress).toBe(1)
    expect(p.remaining).toBe(0)
  })
})
