import type { Tables } from './database.types'

export type SourceType = 'active' | 'passive'
export type AmountMode = 'net' | 'gross'
export type GoalKind = 'monthly' | 'savings'
export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type Source = Omit<Tables<'sources'>, 'type'> & { type: SourceType }
export type Entry = Tables<'entries'>
export type Goal = Omit<Tables<'goals'>, 'kind'> & { kind: GoalKind }
export type Settings = Omit<Tables<'settings'>, 'amount_mode' | 'week_starts_on'> & {
  amount_mode: AmountMode
  week_starts_on: WeekStart
}
export type StreakFreeze = Tables<'streak_freezes'>

/** ISO calendar date without time: 'yyyy-MM-dd', always in the user's local timezone. */
export type ISODate = string

/** Minimal entry shape the stats functions need. */
export interface StatEntry {
  amount: number
  date: ISODate
  source_id: string
  minutes_spent?: number | null
}
