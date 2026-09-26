import { getDaysInMonth } from 'date-fns'
import { fromISODate, monthStartISO } from '../dates'
import type { ISODate, StatEntry } from '../types'
import { round2, sumInRange } from './daily'

interface MonthlyGoalLike {
  kind: string
  month: string | null
  target_amount: number
}

/**
 * Monthly goal in effect for the month of `date`: the goal set for that month,
 * or the most recent earlier one (goals carry forward until changed).
 */
export function effectiveMonthlyGoal<G extends MonthlyGoalLike>(goals: readonly G[], date: ISODate): G | null {
  const month = monthStartISO(date)
  let best: G | null = null
  for (const g of goals) {
    if (g.kind !== 'monthly' || !g.month || g.month > month) continue
    if (!best || g.month > best.month!) best = g
  }
  return best
}

export interface DailyTarget {
  monthTarget: number
  earnedThisMonth: number
  earnedToday: number
  /** Remaining days in the month including today. */
  daysLeft: number
  /**
   * What today needs: (target − earned before today) / days left incl. today.
   * Earnings before today are used so the target stays fixed during the day.
   */
  perDay: number
  /** Today's progress towards perDay, 0..1 (1 when perDay is 0). */
  todayProgress: number
  monthAchieved: boolean
  /** Earned above the monthly target (0 if not achieved). */
  surplus: number
}

export function dailyTarget(entries: readonly StatEntry[], monthTarget: number, today: ISODate): DailyTarget {
  const monthStart = monthStartISO(today)
  const earnedThisMonth = sumInRange(entries, monthStart, today)
  const earnedToday = sumInRange(entries, today, today)
  const earnedBefore = round2(earnedThisMonth - earnedToday)
  const daysLeft = getDaysInMonth(fromISODate(today)) - fromISODate(today).getDate() + 1
  const perDay = round2(Math.max(0, monthTarget - earnedBefore) / daysLeft)
  const monthAchieved = monthTarget > 0 && earnedThisMonth >= monthTarget

  return {
    monthTarget,
    earnedThisMonth,
    earnedToday,
    daysLeft,
    perDay,
    todayProgress: perDay === 0 ? 1 : Math.min(1, earnedToday / perDay),
    monthAchieved,
    surplus: monthAchieved ? round2(earnedThisMonth - monthTarget) : 0,
  }
}

export interface SavingsProgress {
  saved: number
  target: number
  remaining: number
  /** 0..1 */
  progress: number
  earnedToday: number
  /** Share of the target contributed today, 0..1. */
  todayShare: number
}

/** Savings goals count all earnings since the goal was created (by local date). */
export function savingsProgress(
  entries: readonly StatEntry[],
  goal: { target_amount: number; startDate: ISODate },
  today: ISODate,
): SavingsProgress {
  const saved = sumInRange(entries, goal.startDate, today)
  const earnedToday = goal.startDate <= today ? sumInRange(entries, today, today) : 0
  const target = goal.target_amount
  return {
    saved,
    target,
    remaining: round2(Math.max(0, target - saved)),
    progress: target > 0 ? Math.min(1, saved / target) : 0,
    earnedToday,
    todayShare: target > 0 ? earnedToday / target : 0,
  }
}
