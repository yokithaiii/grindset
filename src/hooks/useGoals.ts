import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase, unwrap } from '@/lib/supabase'
import type { Goal, ISODate } from '@/lib/types'

export const goalsKey = ['goals'] as const

export function useGoals() {
  const query = useQuery({
    queryKey: goalsKey,
    queryFn: async () => {
      const rows = unwrap(await supabase.from('goals').select('*').order('created_at')) as Goal[]
      return rows.map((g) => ({ ...g, target_amount: Number(g.target_amount) }))
    },
  })
  const goals = useMemo(() => query.data ?? [], [query.data])
  const monthly = useMemo(
    () => goals.filter((g) => g.kind === 'monthly').sort((a, b) => (a.month! < b.month! ? -1 : 1)),
    [goals],
  )
  const savings = useMemo(() => goals.filter((g) => g.kind === 'savings'), [goals])
  return { ...query, goals, monthly, savings }
}

/** Upsert monthly goals for one or several months (first day of month). */
export function useSetMonthlyGoals() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ months, target }: { months: ISODate[]; target: number }) => {
      const existing = qc.getQueryData<Goal[]>(goalsKey) ?? []
      for (const month of months) {
        const found = existing.find((g) => g.kind === 'monthly' && g.month === month)
        if (found) {
          unwrap(await supabase.from('goals').update({ target_amount: target }).eq('id', found.id))
        } else {
          unwrap(
            await supabase
              .from('goals')
              .insert({ kind: 'monthly', title: 'Цель на месяц', month, target_amount: target }),
          )
        }
      }
    },
    onError: (err) => toast.error(err.message),
    onSettled: () => qc.invalidateQueries({ queryKey: goalsKey }),
  })
}

export function useSaveSavingsGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, title, target_amount }: { id?: string; title: string; target_amount: number }) => {
      if (id) unwrap(await supabase.from('goals').update({ title, target_amount }).eq('id', id))
      else unwrap(await supabase.from('goals').insert({ kind: 'savings', title, target_amount }))
    },
    onError: (err) => toast.error(err.message),
    onSettled: () => qc.invalidateQueries({ queryKey: goalsKey }),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('goals').delete().eq('id', id))
    },
    onError: (err) => toast.error(err.message),
    onSettled: () => qc.invalidateQueries({ queryKey: goalsKey }),
  })
}
