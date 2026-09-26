import type { ISODate, StatEntry } from '../types'
import { round2 } from './daily'

export const MILESTONES = [100, 500, 1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000] as const

export interface MilestoneState {
  total: number
  reached: { value: number; date: ISODate }[]
  /** null after the last milestone. */
  next: number | null
  /** Progress from the previous milestone (or 0) to the next one, 0..1. */
  progress: number
}

export function computeMilestones(entries: readonly StatEntry[]): MilestoneState {
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const reached: MilestoneState['reached'] = []
  let total = 0
  let i = 0
  for (const e of sorted) {
    total = round2(total + e.amount)
    while (i < MILESTONES.length && total >= MILESTONES[i]) {
      reached.push({ value: MILESTONES[i], date: e.date })
      i++
    }
  }
  const next = MILESTONES[i] ?? null
  const prev = i > 0 ? MILESTONES[i - 1] : 0
  return { total, reached, next, progress: next === null ? 1 : (total - prev) / (next - prev) }
}
