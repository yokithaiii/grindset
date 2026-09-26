import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Section, SourceDot } from '@/components/common'
import { useDeleteSource, useSaveSource, useSources } from '@/hooks/useSources'
import { useEntries } from '@/hooks/useEntries'
import type { Source, SourceType } from '@/lib/types'
import { cn } from '@/lib/utils'

// Fixed categorical order, validated for CVD separation and contrast on light and dark surfaces.
export const SOURCE_COLORS = [
  '#16a34a', '#2563eb', '#d97706', '#9333ea', '#dc2626', '#0891b2', '#db2777', '#65a30d',
]

const schema = z.object({
  name: z.string().trim().min(1, 'Введите название').max(60, 'Не длиннее 60 символов'),
  type: z.enum(['active', 'passive']),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})
type FormValues = z.infer<typeof schema>

function SourceForm({ source, onDone, usedColors }: { source?: Source; onDone: () => void; usedColors: Set<string> }) {
  const save = useSaveSource()
  const { register, handleSubmit, watch, setValue, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: source?.name ?? '',
      type: source?.type ?? 'active',
      color: source?.color ?? SOURCE_COLORS.find((c) => !usedColors.has(c)) ?? SOURCE_COLORS[0],
    },
  })
  const type = watch('type')
  const color = watch('color')

  const onSubmit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync({ id: source?.id, ...v })
      toast(source ? 'Источник обновлён' : 'Источник добавлен')
      onDone()
    } catch (e) {
      toast.error((e as Error).message)
    }
  })

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="source-name">Название</Label>
        <Input id="source-name" autoFocus autoComplete="off" placeholder="Например, Фриланс" {...register('name')} />
        {formState.errors.name && <p className="text-sm text-destructive">{formState.errors.name.message}</p>}
      </div>
      <div className="grid gap-2">
        <Label>Тип</Label>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['active', 'Активный', 'нужно работать'],
              ['passive', 'Пассивный', 'идёт сам'],
            ] as [SourceType, string, string][]
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              onClick={() => setValue('type', value)}
              className={cn(
                'rounded-md border px-3 py-2 text-left text-sm',
                type === value ? 'border-foreground/60 bg-accent' : 'text-muted-foreground hover:bg-accent/60',
              )}
            >
              <div className="font-medium text-foreground">{label}</div>
              <div className="text-xs">{hint}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Цвет на графиках</Label>
        <div className="flex flex-wrap items-center gap-2">
          {SOURCE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => setValue('color', c)}
              className={cn(
                'size-8 rounded-full ring-offset-2 ring-offset-background pointer-coarse:size-9',
                color.toLowerCase() === c && 'ring-2 ring-foreground',
              )}
              style={{ background: c }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setValue('color', e.target.value)}
            className="size-8 cursor-pointer rounded-full border bg-transparent pointer-coarse:size-9"
            aria-label="Свой цвет"
          />
        </div>
      </div>
      <Button type="submit" disabled={save.isPending}>
        {source ? 'Сохранить' : 'Добавить источник'}
      </Button>
    </form>
  )
}

export function SourcesManager() {
  const { sources } = useSources()
  const { entries } = useEntries()
  const save = useSaveSource()
  const del = useDeleteSource()
  const [editing, setEditing] = useState<{ source?: Source } | null>(null)

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of entries) m.set(e.source_id, (m.get(e.source_id) ?? 0) + 1)
    return m
  }, [entries])
  const usedColors = new Set(sources.map((s) => s.color.toLowerCase()))
  const sorted = [...sources].sort((a, b) => Number(a.is_archived) - Number(b.is_archived))

  const toggleArchive = (s: Source) =>
    save.mutate(
      { id: s.id, is_archived: !s.is_archived },
      { onSuccess: () => toast(s.is_archived ? 'Источник восстановлен' : 'Источник в архиве') },
    )

  return (
    <Section
      title={<span id="sources">Источники дохода</span>}
      action={
        <Button size="sm" variant="outline" onClick={() => setEditing({})}>
          <Plus /> Добавить
        </Button>
      }
    >
      <ul className="divide-y">
        {sorted.map((s) => {
          const n = counts.get(s.id) ?? 0
          return (
            <li key={s.id} className={cn('flex items-center gap-3 py-2.5', s.is_archived && 'opacity-60')}>
              <SourceDot color={s.color} className="size-3" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 truncate text-sm font-medium">
                  {s.name}
                  {s.is_archived && <Badge variant="outline">архив</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {s.type === 'active' ? 'активный' : 'пассивный'} · записей: {n}
                </div>
              </div>
              <Button size="icon-sm" variant="ghost" aria-label="Изменить" onClick={() => setEditing({ source: s })}>
                <Pencil />
              </Button>
              {n > 0 ? (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={s.is_archived ? 'Вернуть из архива' : 'В архив'}
                  title={s.is_archived ? 'Вернуть из архива' : 'В архив (записи сохранятся)'}
                  onClick={() => toggleArchive(s)}
                >
                  {s.is_archived ? <ArchiveRestore /> : <Archive />}
                </Button>
              ) : (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Удалить"
                  title="Удалить"
                  onClick={() =>
                    del.mutate(s.id, {
                      onSuccess: () => toast('Источник удалён'),
                      onError: (e) => toast.error(e.message),
                    })
                  }
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      {sources.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Добавьте источник, чтобы начать вносить заработок.
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Источники с записями не удаляются, а уходят в архив — история и статистика сохраняются.
      </p>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.source ? 'Изменить источник' : 'Новый источник'}</DialogTitle>
            <DialogDescription className="sr-only">Название, тип и цвет источника</DialogDescription>
          </DialogHeader>
          {editing && <SourceForm source={editing.source} usedColors={usedColors} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </Section>
  )
}
