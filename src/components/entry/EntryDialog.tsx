import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDeleteEntry, useEntries, useSaveEntry } from '@/hooks/useEntries'
import { useSources } from '@/hooks/useSources'
import { useMoney, useSettings } from '@/hooks/useSettings'
import { addDaysISO, todayISO } from '@/lib/dates'
import { parseAmount } from '@/lib/format'
import type { Entry } from '@/lib/types'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Context: open the dialog from anywhere (FAB, header button, entries table)
// ---------------------------------------------------------------------------

const EntryDialogContext = createContext<{ open: (entry?: Entry) => void }>({ open: () => {} })

export const useEntryDialog = () => useContext(EntryDialogContext)

export function EntryDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; entry?: Entry; key: number }>({ open: false, key: 0 })
  const open = useCallback((entry?: Entry) => setState((s) => ({ open: true, entry, key: s.key + 1 })), [])
  const value = useMemo(() => ({ open }), [open])

  return (
    <EntryDialogContext.Provider value={value}>
      {children}
      <Dialog open={state.open} onOpenChange={(o) => setState((s) => ({ ...s, open: o }))}>
        <DialogContent className="pb-0 sm:max-w-md sm:pb-0">
          {/* key: fresh form state every time the dialog opens */}
          <EntryForm key={state.key} entry={state.entry} onDone={() => setState((s) => ({ ...s, open: false }))} />
        </DialogContent>
      </Dialog>
    </EntryDialogContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

const schema = z.object({
  amount: z.string().refine((v) => {
    const n = parseAmount(v)
    return Number.isFinite(n) && n > 0 && n < 1e10
  }, 'Введите сумму больше нуля'),
  source_id: z.string().min(1, 'Выберите источник'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Выберите дату'),
  minutes: z.string().refine((v) => v.trim() === '' || /^\d{1,5}$/.test(v.trim()), 'Целое число минут'),
  note: z.string().max(500, 'Не длиннее 500 символов'),
})
type FormValues = z.infer<typeof schema>

const QUICK_MINUTES = [15, 30, 60, 120]

function EntryForm({ entry, onDone }: { entry?: Entry; onDone: () => void }) {
  const { entries } = useEntries()
  const { active, byId } = useSources()
  const { settings } = useSettings()
  const money = useMoney()
  const save = useSaveEntry()
  const del = useDeleteEntry()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const today = todayISO()
  const yesterday = addDaysISO(today, -1)

  const lastSourceId = useMemo(() => {
    let latest: Entry | undefined
    for (const e of entries) if (!latest || e.created_at > latest.created_at) latest = e
    const id = latest?.source_id
    return id && active.some((s) => s.id === id) ? id : (active[0]?.id ?? '')
  }, [entries, active])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: entry ? String(entry.amount).replace('.', ',') : '',
      source_id: entry?.source_id ?? lastSourceId,
      date: entry?.date ?? today,
      minutes: entry?.minutes_spent ? String(entry.minutes_spent) : '',
      note: entry?.note ?? '',
    },
  })
  const { register, handleSubmit, watch, setValue, formState } = form
  const [extraOpen, setExtraOpen] = useState(Boolean(entry?.minutes_spent || entry?.note))

  // Archived source of an edited entry must remain selectable.
  const choices = entry && !active.some((s) => s.id === entry.source_id) && byId.get(entry.source_id)
    ? [...active, byId.get(entry.source_id)!]
    : active

  const sourceId = watch('source_id')
  const date = watch('date')
  const minutes = watch('minutes')

  const onSubmit = handleSubmit((v) => {
    const amount = Math.round(parseAmount(v.amount) * 100) / 100
    save.mutate({
      id: entry?.id,
      amount,
      source_id: v.source_id,
      date: v.date,
      minutes_spent: v.minutes.trim() ? Number(v.minutes) : null,
      note: v.note.trim() || null,
    })
    toast(entry ? 'Запись обновлена' : `Добавлено: ${money(amount)} · ${byId.get(v.source_id)?.name ?? ''}`)
    onDone()
  })

  if (active.length === 0 && !entry) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Нет источников дохода</DialogTitle>
          <DialogDescription>Создайте хотя бы один источник в настройках, чтобы добавлять записи.</DialogDescription>
        </DialogHeader>
        <Button asChild>
          <Link to="/settings#sources" onClick={onDone}>
            Перейти к источникам
          </Link>
        </Button>
      </>
    )
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:gap-5">
      <DialogHeader>
        <DialogTitle>{entry ? 'Изменить запись' : 'Новая запись'}</DialogTitle>
        <DialogDescription className="sr-only">Сумма, источник и дата заработка</DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor="amount">
          Сумма{' '}
          <span className="font-normal text-muted-foreground">
            {settings.currency}, {settings.amount_mode === 'net' ? 'чистыми' : 'до вычетов'}
          </span>
        </Label>
        <Input
          id="amount"
          autoFocus
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          enterKeyHint="done"
          className="num h-14 text-3xl font-semibold pointer-coarse:h-14 md:pointer-fine:text-3xl"
          aria-invalid={!!formState.errors.amount}
          {...register('amount')}
        />
        {formState.errors.amount && <p className="text-sm text-destructive">{formState.errors.amount.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label>Источник</Label>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Источник">
          {choices.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={sourceId === s.id}
              onClick={() => setValue('source_id', s.id, { shouldValidate: true })}
              className={cn(
                'flex min-h-9 items-center gap-2 rounded-full border px-3 text-sm transition-colors select-none pointer-coarse:min-h-10',
                sourceId === s.id
                  ? 'border-foreground/60 bg-accent font-medium'
                  : 'text-muted-foreground hover:bg-accent/60',
              )}
            >
              <span className="size-2.5 rounded-full" style={{ background: s.color }} />
              {s.name}
            </button>
          ))}
        </div>
        {formState.errors.source_id && <p className="text-sm text-destructive">{formState.errors.source_id.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="date">Дата</Label>
        <div className="flex gap-2">
          {[
            [today, 'Сегодня'],
            [yesterday, 'Вчера'],
          ].map(([d, label]) => (
            <Button
              key={d}
              type="button"
              size="sm"
              variant={date === d ? 'secondary' : 'ghost'}
              className={cn(date === d && 'font-medium')}
              onClick={() => setValue('date', d, { shouldValidate: true })}
            >
              {label}
            </Button>
          ))}
          <Input id="date" type="date" max={today} className="h-8 min-w-0 flex-1 pointer-coarse:h-10" {...register('date')} />
        </div>
      </div>

      <Collapsible open={extraOpen} onOpenChange={setExtraOpen}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex min-h-9 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronDown className={cn('size-4 transition-transform', extraOpen && 'rotate-180')} />
            Время и заметка
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="minutes">Сколько времени заняло, мин</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="minutes"
                inputMode="numeric"
                autoComplete="off"
                placeholder="—"
                className="num w-20"
                {...register('minutes')}
              />
              {QUICK_MINUTES.map((m) => (
                <Button
                  key={m}
                  type="button"
                  size="sm"
                  variant={minutes === String(m) ? 'secondary' : 'ghost'}
                  className="px-2"
                  onClick={() => setValue('minutes', String(m), { shouldValidate: true })}
                >
                  {m < 60 ? `${m}м` : `${m / 60}ч`}
                </Button>
              ))}
            </div>
            {formState.errors.minutes && <p className="text-sm text-destructive">{formState.errors.minutes.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="note">Заметка</Label>
            <Input id="note" autoComplete="off" enterKeyHint="done" placeholder="Например, заказ №42" {...register('note')} />
            {formState.errors.note && <p className="text-sm text-destructive">{formState.errors.note.message}</p>}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* sticky: stays reachable when the keyboard is open (iOS decimal pad has no Enter key) */}
      <div className="sticky bottom-0 -mx-5 flex gap-2 bg-background px-5 pt-2 pb-5 sm:-mx-6 sm:px-6 sm:pb-6">
        {entry && (
          <Button
            type="button"
            size="lg"
            variant={confirmDelete ? 'destructive' : 'ghost'}
            onClick={() => {
              if (!confirmDelete) return setConfirmDelete(true)
              del.mutate(entry.id)
              toast('Запись удалена')
              onDone()
            }}
          >
            {confirmDelete ? 'Точно удалить?' : 'Удалить'}
          </Button>
        )}
        <Button type="submit" size="lg" className="flex-1">
          {entry ? 'Сохранить' : 'Добавить'}
          <kbd className="ml-2 hidden text-xs opacity-60 sm:inline">Enter</kbd>
        </Button>
      </div>
    </form>
  )
}
