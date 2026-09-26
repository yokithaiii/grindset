import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, unwrap } from '@/lib/supabase'
import type { Settings } from '@/lib/types'
import { formatMoney } from '@/lib/format'
import { useUserId } from './useAuth'

export const settingsKey = ['settings'] as const

export const DEFAULT_SETTINGS: Omit<Settings, 'user_id'> = {
  currency: 'EUR',
  week_starts_on: 1,
  freezes_per_month: 2,
  amount_mode: 'net',
}

/** Creates settings and default sources on first login (idempotent RPC). */
export function useBootstrap() {
  const userId = useUserId()
  return useQuery({
    queryKey: ['bootstrap', userId],
    queryFn: async () => {
      unwrap(await supabase.rpc('ensure_user_setup'))
      return true
    },
    staleTime: Infinity,
    retry: 1,
  })
}

export function useSettings() {
  const userId = useUserId()
  const query = useQuery({
    queryKey: settingsKey,
    queryFn: async () => {
      const row = unwrap(await supabase.from('settings').select('*').maybeSingle())
      return (row ?? { ...DEFAULT_SETTINGS, user_id: userId }) as Settings
    },
  })
  return { ...query, settings: query.data ?? { ...DEFAULT_SETTINGS, user_id: userId } }
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: async (patch: Partial<Omit<Settings, 'user_id'>>) =>
      unwrap(await supabase.from('settings').upsert({ user_id: userId, ...patch }).select().single()) as Settings,
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: settingsKey })
      const prev = qc.getQueryData<Settings>(settingsKey)
      if (prev) qc.setQueryData<Settings>(settingsKey, { ...prev, ...patch })
      return { prev }
    },
    onError: (_e, _p, ctx) => ctx?.prev && qc.setQueryData(settingsKey, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: settingsKey }),
  })
}

/** Money formatter bound to the currency from settings. */
export function useMoney() {
  const { settings } = useSettings()
  const currency = settings.currency
  return (amount: number, opts?: { compact?: boolean }) => formatMoney(amount, currency, opts)
}
