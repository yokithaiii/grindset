import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase, unwrap } from '@/lib/supabase'
import type { Entry, ISODate, Settings } from '@/lib/types'
import { todayISO } from '@/lib/dates'
import { computeRecords, newRecords, RECORD_LABELS } from '@/lib/stats/records'
import { useUserId } from './useAuth'
import { settingsKey, DEFAULT_SETTINGS } from './useSettings'
import { freezesKey } from './useFreezes'

export const entriesKey = ['entries'] as const

const PAGE = 1000

/** All entries of the user, newest first. Single user → the full history fits in memory. */
async function fetchAllEntries(): Promise<Entry[]> {
  const all: Entry[] = []
  for (let from = 0; ; from += PAGE) {
    const rows =
      unwrap(
      await supabase
        .from('entries')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, from + PAGE - 1),
      ) ?? []
    // numeric may arrive as string depending on PostgREST settings
    for (const r of rows) all.push({ ...r, amount: Number(r.amount) })
    if (rows.length < PAGE) return all
  }
}

export function useEntries() {
  const query = useQuery({ queryKey: entriesKey, queryFn: fetchAllEntries })
  const entries = useMemo(() => query.data ?? [], [query.data])
  return { ...query, entries }
}

export interface EntryInput {
  source_id: string
  amount: number
  date: ISODate
  minutes_spent: number | null
  note: string | null
}

function sortEntries(list: Entry[]): Entry[] {
  return list.sort((a, b) =>
    a.date === b.date ? (a.created_at < b.created_at ? 1 : -1) : a.date < b.date ? 1 : -1,
  )
}

/** Create or update an entry with an optimistic cache update and record detection. */
export function useSaveEntry() {
  const qc = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: async ({ id, ...input }: EntryInput & { id?: string }) => {
      if (id) return unwrap(await supabase.from('entries').update(input).eq('id', id).select().single())
      return unwrap(await supabase.from('entries').insert(input).select().single())
    },
    onMutate: async ({ id, ...input }) => {
      await qc.cancelQueries({ queryKey: entriesKey })
      const prev = qc.getQueryData<Entry[]>(entriesKey) ?? []
      const next = id
        ? prev.map((e) => (e.id === id ? { ...e, ...input } : e))
        : [
            {
              ...input,
              id: `optimistic-${crypto.randomUUID()}`,
              user_id: userId,
              created_at: new Date().toISOString(),
            },
            ...prev,
          ]
      qc.setQueryData(entriesKey, sortEntries(next))

      if (!id) {
        const settings = qc.getQueryData<Settings>(settingsKey) ?? DEFAULT_SETTINGS
        const freezes = new Set(qc.getQueryData<{ date: string }[]>(freezesKey)?.map((f) => f.date) ?? [])
        const opts = { weekStartsOn: settings.week_starts_on, freezes, today: todayISO() }
        const beaten = newRecords(computeRecords(prev, opts), computeRecords(next, opts))
        if (beaten.length) {
          toast.success(`Новый рекорд: ${beaten.map((k) => RECORD_LABELS[k]).join(', ')}`, {
            className: 'record-toast',
            duration: 6000,
          })
        }
      }
      return { prev }
    },
    onError: (err, _v, ctx) => {
      if (ctx) qc.setQueryData(entriesKey, ctx.prev)
      toast.error(`Не удалось сохранить: ${err.message}`)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: entriesKey }),
  })
}

export function useDeleteEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('entries').delete().eq('id', id))
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: entriesKey })
      const prev = qc.getQueryData<Entry[]>(entriesKey) ?? []
      qc.setQueryData(
        entriesKey,
        prev.filter((e) => e.id !== id),
      )
      return { prev }
    },
    onError: (err, _v, ctx) => {
      if (ctx) qc.setQueryData(entriesKey, ctx.prev)
      toast.error(`Не удалось удалить: ${err.message}`)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: entriesKey }),
  })
}
