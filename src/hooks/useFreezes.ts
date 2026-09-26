import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase, unwrap } from '@/lib/supabase'
import type { ISODate, StreakFreeze } from '@/lib/types'
import { useUserId } from './useAuth'

export const freezesKey = ['freezes'] as const

export function useFreezes() {
  const query = useQuery({
    queryKey: freezesKey,
    queryFn: async () => unwrap(await supabase.from('streak_freezes').select('*').order('date')) as StreakFreeze[],
  })
  const dates = useMemo(() => new Set((query.data ?? []).map((f) => f.date)), [query.data])
  return { ...query, dates }
}

export function useApplyFreezes() {
  const qc = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: async (days: ISODate[]) => {
      unwrap(await supabase.from('streak_freezes').insert(days.map((date) => ({ date }))))
    },
    onMutate: async (days) => {
      await qc.cancelQueries({ queryKey: freezesKey })
      const prev = qc.getQueryData<StreakFreeze[]>(freezesKey) ?? []
      qc.setQueryData<StreakFreeze[]>(freezesKey, [
        ...prev,
        ...days.map((date) => ({ id: `optimistic-${date}`, user_id: userId, date })),
      ])
      return { prev }
    },
    onError: (err, _v, ctx) => {
      if (ctx) qc.setQueryData(freezesKey, ctx.prev)
      toast.error(err.message)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: freezesKey }),
  })
}

export function useRemoveFreeze() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (date: ISODate) => {
      unwrap(await supabase.from('streak_freezes').delete().eq('date', date))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: freezesKey }),
  })
}
