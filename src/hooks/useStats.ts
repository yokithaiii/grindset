import { useMemo } from 'react'
import { toISODate } from '@/lib/dates'
import { dailyTotals } from '@/lib/stats/daily'
import { compareWithSameDayLastMonth, monthForecast } from '@/lib/stats/forecast'
import { dailyTarget, effectiveMonthlyGoal, savingsProgress } from '@/lib/stats/goals'
import { buildHeatmap } from '@/lib/stats/heatmap'
import { computeMilestones } from '@/lib/stats/milestones'
import { computeRecords } from '@/lib/stats/records'
import { computeStreak, findRescuableGap, freezesLeft } from '@/lib/stats/streak'
import { useEntries } from './useEntries'
import { useFreezes } from './useFreezes'
import { useGoals } from './useGoals'
import { useSettings } from './useSettings'
import { useToday } from './useToday'

/** Everything the dashboard shows, derived from cached data with pure stats functions. */
export function useDashboardStats() {
  const today = useToday()
  const { entries, isPending: entriesPending } = useEntries()
  const { dates: freezes, isPending: freezesPending } = useFreezes()
  const { monthly, savings, isPending: goalsPending } = useGoals()
  const { settings } = useSettings()
  const { week_starts_on: weekStartsOn, freezes_per_month: perMonth } = settings

  const totals = useMemo(() => dailyTotals(entries), [entries])

  const stats = useMemo(() => {
    const goal = effectiveMonthlyGoal(monthly, today)
    const input = { totals, freezes, today }
    return {
      goal,
      target: goal ? dailyTarget(entries, goal.target_amount, today) : null,
      earnedToday: totals.get(today) ?? 0,
      streak: computeStreak(input),
      rescue: findRescuableGap({ ...input, perMonth }),
      freezesLeft: freezesLeft(freezes, today, perMonth),
      forecast: monthForecast(entries, today),
      vsLastMonth: compareWithSameDayLastMonth(entries, today),
      heatmap: buildHeatmap(totals, freezes, today, weekStartsOn),
      records: computeRecords(entries, { weekStartsOn, freezes, today }),
      milestones: computeMilestones(entries),
      savings: savings.map((g) => ({
        goal: g,
        progress: savingsProgress(entries, { ...g, startDate: toISODate(new Date(g.created_at)) }, today),
      })),
    }
  }, [entries, totals, freezes, monthly, savings, today, weekStartsOn, perMonth])

  return { ...stats, today, isPending: entriesPending || freezesPending || goalsPending, hasEntries: entries.length > 0 }
}
