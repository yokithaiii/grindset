import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, unwrap } from '@/lib/supabase'
import type { Source, SourceType } from '@/lib/types'
import { useBootstrap } from './useSettings'

export const sourcesKey = ['sources'] as const

export function useSources() {
  const bootstrap = useBootstrap()
  const query = useQuery({
    queryKey: sourcesKey,
    enabled: bootstrap.isSuccess,
    queryFn: async () =>
      unwrap(await supabase.from('sources').select('*').order('created_at')) as Source[],
  })
  const sources = useMemo(() => query.data ?? [], [query.data])
  const byId = useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources])
  const active = useMemo(() => sources.filter((s) => !s.is_archived), [sources])
  return { ...query, isPending: query.isPending || bootstrap.isPending, sources, active, byId }
}

export interface SourceInput {
  name: string
  type: SourceType
  color: string
}

export function useSaveSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<SourceInput & { is_archived: boolean }> & { id?: string }) => {
      if (id) return unwrap(await supabase.from('sources').update(input).eq('id', id).select().single())
      return unwrap(
        await supabase
          .from('sources')
          .insert(input as SourceInput)
          .select()
          .single(),
      )
    },
    onSettled: () => qc.invalidateQueries({ queryKey: sourcesKey }),
  })
}

export function useDeleteSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('sources').delete().eq('id', id))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: sourcesKey }),
  })
}
