import { useMemo, useState } from 'react'
import { startOfYear, subMonths, endOfMonth, startOfMonth } from 'date-fns'
import { Download, List, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Card } from '@/components/ui/card'
import { EmptyState, PageHeader, SourceDot } from '@/components/common'
import { useEntryDialog } from '@/components/entry/EntryDialog'
import { EntryRow } from '@/components/entry/EntryRow'
import { useDeleteEntry, useEntries } from '@/hooks/useEntries'
import { useSources } from '@/hooks/useSources'
import { useMoney, useSettings } from '@/hooks/useSettings'
import { useToday } from '@/hooks/useToday'
import { addDaysISO, fromISODate, toISODate } from '@/lib/dates'
import { weekStartISO } from '@/lib/stats/records'
import { sumAmounts } from '@/lib/stats/daily'
import { formatDate, formatMinutes } from '@/lib/format'
import { downloadCsv, entriesToCsv } from '@/lib/csv'
import type { Entry, ISODate, WeekStart } from '@/lib/types'

type PeriodFilter = 'all' | 'week' | 'month' | 'last-month' | '30d' | 'year'

const PERIODS: { value: PeriodFilter; label: string }[] = [
  { value: 'all', label: 'Всё время' },
  { value: 'week', label: 'Эта неделя' },
  { value: 'month', label: 'Этот месяц' },
  { value: 'last-month', label: 'Прошлый месяц' },
  { value: '30d', label: 'Последние 30 дней' },
  { value: 'year', label: 'Этот год' },
]

function range(p: PeriodFilter, today: ISODate, weekStartsOn: WeekStart): [ISODate, ISODate] | null {
  const t = fromISODate(today)
  switch (p) {
    case 'all':
      return null
    case 'week':
      return [weekStartISO(today, weekStartsOn), today]
    case 'month':
      return [toISODate(startOfMonth(t)), today]
    case 'last-month': {
      const m = subMonths(startOfMonth(t), 1)
      return [toISODate(m), toISODate(endOfMonth(m))]
    }
    case '30d':
      return [addDaysISO(today, -29), today]
    case 'year':
      return [toISODate(startOfYear(t)), today]
  }
}

const PAGE = 100

export function EntriesPage() {
  const { entries, isPending } = useEntries()
  const { sources, byId } = useSources()
  const { settings } = useSettings()
  const money = useMoney()
  const today = useToday()
  const { open } = useEntryDialog()
  const del = useDeleteEntry()

  const [period, setPeriod] = useState<PeriodFilter>('all')
  const [sourceId, setSourceId] = useState('all')
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [toDelete, setToDelete] = useState<Entry | null>(null)

  const filtered = useMemo(() => {
    const r = range(period, today, settings.week_starts_on)
    const needle = q.trim().toLowerCase()
    return entries.filter(
      (e) =>
        (!r || (e.date >= r[0] && e.date <= r[1])) &&
        (sourceId === 'all' || e.source_id === sourceId) &&
        (!needle || (e.note ?? '').toLowerCase().includes(needle)),
    )
  }, [entries, period, sourceId, q, today, settings.week_starts_on])

  const total = sumAmounts(filtered)
  const visible = filtered.slice(0, limit)

  const exportCsv = () => downloadCsv(`grindset-${today}.csv`, entriesToCsv(filtered, byId))

  return (
    <>
      <PageHeader
        title="Записи"
        description={
          entries.length > 0 && (
            <>
              {filtered.length} {filtered.length === entries.length ? 'всего' : `из ${entries.length}`} · на сумму{' '}
              <span className="num font-medium text-foreground">{money(total)}</span>
            </>
          )
        }
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0} aria-label="Экспорт в CSV">
            <Download /> <span className="hidden sm:inline">CSV</span>
          </Button>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-2 sm:mb-4 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative col-span-2 sm:col-span-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            enterKeyHint="search"
            placeholder="Поиск по заметке"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setLimit(PAGE)
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={period}
          onValueChange={(v) => {
            setPeriod(v as PeriodFilter)
            setLimit(PAGE)
          }}
        >
          <SelectTrigger className="w-full min-w-0 sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sourceId}
          onValueChange={(v) => {
            setSourceId(v)
            setLimit(PAGE)
          }}
        >
          <SelectTrigger className="w-full min-w-0 sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все источники</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <SourceDot color={s.color} />
                {s.name}
                {s.is_archived && <span className="text-muted-foreground"> (архив)</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!isPending && filtered.length === 0 ? (
        <Card>
          {entries.length === 0 ? (
            <EmptyState
              icon={List}
              title="Записей пока нет"
              action={
                <Button onClick={() => open()}>
                  <Plus /> Добавить запись
                </Button>
              }
            >
              Здесь будет вся история заработка с поиском и экспортом.
            </EmptyState>
          ) : (
            <EmptyState icon={Search} title="Ничего не найдено">
              Попробуйте изменить период, источник или строку поиска.
            </EmptyState>
          )}
        </Card>
      ) : (
        <>
          {/* Mobile: compact list */}
          <Card className="gap-0 px-1.5 py-1.5 md:hidden">
            {visible.map((e) => (
              <EntryRow key={e.id} entry={e} source={byId.get(e.source_id)} />
            ))}
          </Card>

          {/* Desktop: table */}
          <Card className="hidden py-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Дата</TableHead>
                  <TableHead>Источник</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead className="text-right">Время</TableHead>
                  <TableHead>Заметка</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((e) => {
                  const s = byId.get(e.source_id)
                  return (
                    <TableRow key={e.id} className="group">
                      <TableCell className="num pl-4 text-muted-foreground">{formatDate(e.date, 'dd.MM.yyyy, EEEEEE')}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <SourceDot color={s?.color ?? '#999'} />
                          {s?.name ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="num text-right font-medium">{money(e.amount)}</TableCell>
                      <TableCell className="num text-right text-muted-foreground">
                        {e.minutes_spent ? formatMinutes(e.minutes_spent) : ''}
                      </TableCell>
                      <TableCell className="max-w-64 truncate text-muted-foreground">{e.note}</TableCell>
                      <TableCell className="pr-2 text-right">
                        <div className="flex justify-end opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100">
                          <Button size="icon-sm" variant="ghost" aria-label="Изменить" onClick={() => open(e)}>
                            <Pencil />
                          </Button>
                          <Button size="icon-sm" variant="ghost" aria-label="Удалить" onClick={() => setToDelete(e)}>
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>

          {filtered.length > limit && (
            <div className="mt-4 text-center">
              <Button variant="ghost" onClick={() => setLimit((l) => l + PAGE)}>
                Показать ещё ({filtered.length - limit})
              </Button>
            </div>
          )}
          <p className="mt-3 text-center text-xs text-muted-foreground md:hidden">
            Нажмите на запись, чтобы изменить или удалить её.
          </p>
        </>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить запись?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete &&
                `${money(toDelete.amount)} · ${byId.get(toDelete.source_id)?.name ?? ''} · ${formatDate(toDelete.date)}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) del.mutate(toDelete.id)
                setToDelete(null)
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
