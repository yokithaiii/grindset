import { useMemo, useState } from 'react'
import { addMonths, endOfMonth, startOfMonth, subMonths } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { PiggyBank, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState, PageHeader, Section } from '@/components/common'
import { useDeleteGoal, useGoals, useSaveSavingsGoal, useSetMonthlyGoals } from '@/hooks/useGoals'
import { useEntries } from '@/hooks/useEntries'
import { useMoney, useSettings } from '@/hooks/useSettings'
import { useToday } from '@/hooks/useToday'
import { addDaysISO, fromISODate, monthStartISO, toISODate } from '@/lib/dates'
import { effectiveMonthlyGoal, savingsProgress } from '@/lib/stats/goals'
import { sumInRange } from '@/lib/stats/daily'
import { days, formatDate, formatPercent, parseAmount } from '@/lib/format'
import type { Goal } from '@/lib/types'

const amountField = z.string().refine((v) => {
  const n = parseAmount(v)
  return Number.isFinite(n) && n > 0 && n < 1e10
}, 'Введите сумму больше нуля')

// ---------------------------------------------------------------------------
// Monthly goal
// ---------------------------------------------------------------------------

function MonthlyGoalSection() {
  const today = useToday()
  const money = useMoney()
  const { monthly } = useGoals()
  const { entries } = useEntries()
  const setGoals = useSetMonthlyGoals()
  const current = effectiveMonthlyGoal(monthly, today)

  const monthOptions = useMemo(() => {
    const start = startOfMonth(fromISODate(today))
    return Array.from({ length: 12 }, (_, i) => toISODate(addMonths(start, i)))
  }, [today])

  const [month, setMonth] = useState(monthOptions[0])
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = amountField.safeParse(amount)
    if (!parsed.success) return setError(parsed.error.issues[0].message)
    setError(null)
    setGoals.mutate(
      { months: [month], target: Math.round(parseAmount(amount) * 100) / 100 },
      { onSuccess: () => toast('Цель сохранена') },
    )
    setAmount('')
  }

  // Last 6 months incl. current: target in effect vs earned
  const history = useMemo(() => {
    const start = startOfMonth(fromISODate(today))
    return Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(start, i)
      const from = toISODate(m)
      const to = i === 0 ? today : toISODate(endOfMonth(m))
      const goal = effectiveMonthlyGoal(monthly, from)
      return { month: from, earned: sumInRange(entries, from, to), target: goal?.target_amount ?? null }
    })
  }, [monthly, entries, today])

  const upcoming = monthly.filter((g) => g.month! > monthStartISO(today))

  return (
    <Section title="Цель на месяц">
      {current ? (
        <p className="text-sm text-muted-foreground">
          Сейчас: <span className="num text-2xl font-semibold text-foreground">{money(current.target_amount)}</span> в
          месяц
          {current.month !== monthStartISO(today) && (
            <> (задана с {formatDate(current.month!, 'LLLL yyyy')})</>
          )}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Цель не задана. С ней на дашборде появится дневная норма и прогноз.
        </p>
      )}

      <form onSubmit={submit} className="mt-4 grid gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-end">
        <div className="grid gap-1.5">
          <Label>С месяца</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-full capitalize sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m} value={m} className="capitalize">
                  {formatDate(m, 'LLLL yyyy')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="monthly-amount">Сумма</Label>
          <Input
            id="monthly-amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder={current ? String(current.target_amount) : 'Например, 2000'}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="num"
          />
        </div>
        <Button type="submit" disabled={setGoals.isPending}>
          Сохранить
        </Button>
      </form>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
      <p className="mt-2 text-xs text-muted-foreground">
        Цель действует и в следующих месяцах, пока вы не зададите новую.
      </p>

      {upcoming.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Запланировано:{' '}
          {upcoming.map((g) => `${formatDate(g.month!, 'LLLL')} — ${money(g.target_amount)}`).join(', ')}
        </p>
      )}

      {history.some((h) => h.target !== null || h.earned > 0) && (
        <div className="mt-5 border-t pt-4">
          <div className="mb-2 text-xs text-muted-foreground">Последние месяцы</div>
          <div className="grid gap-2">
            {history.map((h) => {
              const pct = h.target ? h.earned / h.target : null
              return (
                <div key={h.month} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-sm">
                  <span className="text-muted-foreground capitalize">{formatDate(h.month, 'LLL yyyy')}</span>
                  <Progress value={pct === null ? 0 : Math.min(100, pct * 100)} className="h-1.5" />
                  <span className="num w-36 text-right">
                    {money(h.earned)}
                    {h.target !== null && (
                      <span className="text-muted-foreground"> / {money(h.target, { compact: true })}</span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Savings goals
// ---------------------------------------------------------------------------

const savingsSchema = z.object({
  title: z.string().trim().min(1, 'Введите название').max(80),
  amount: amountField,
})

function SavingsForm({ goal, onDone }: { goal?: Goal; onDone: () => void }) {
  const save = useSaveSavingsGoal()
  const { settings } = useSettings()
  const { register, handleSubmit, formState } = useForm<z.infer<typeof savingsSchema>>({
    resolver: zodResolver(savingsSchema),
    defaultValues: { title: goal?.title ?? '', amount: goal ? String(goal.target_amount) : '' },
  })
  const onSubmit = handleSubmit((v) => {
    save.mutate(
      { id: goal?.id, title: v.title, target_amount: Math.round(parseAmount(v.amount) * 100) / 100 },
      { onSuccess: () => toast(goal ? 'Цель обновлена' : 'Цель создана') },
    )
    onDone()
  })
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="goal-title">Название</Label>
        <Input id="goal-title" autoFocus autoComplete="off" placeholder="Отпуск" {...register('title')} />
        {formState.errors.title && <p className="text-sm text-destructive">{formState.errors.title.message}</p>}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="goal-amount">Сумма, {settings.currency}</Label>
        <Input id="goal-amount" inputMode="decimal" autoComplete="off" className="num" {...register('amount')} />
        {formState.errors.amount && <p className="text-sm text-destructive">{formState.errors.amount.message}</p>}
      </div>
      {!goal && (
        <p className="text-xs text-muted-foreground">
          Прогресс считается от всего заработка, начиная с сегодняшнего дня.
        </p>
      )}
      <Button type="submit">{goal ? 'Сохранить' : 'Создать цель'}</Button>
    </form>
  )
}

function SavingsSection() {
  const today = useToday()
  const money = useMoney()
  const { savings } = useGoals()
  const { entries } = useEntries()
  const del = useDeleteGoal()
  const [editing, setEditing] = useState<{ goal?: Goal } | null>(null)

  // Recent pace: average per day over the last 30 days
  const pace = sumInRange(entries, addDaysISO(today, -29), today) / 30

  return (
    <Section
      title="Накопительные цели"
      action={
        <Button size="sm" variant="outline" onClick={() => setEditing({})}>
          <Plus /> Новая цель
        </Button>
      }
    >
      {savings.length === 0 ? (
        <EmptyState icon={PiggyBank} title="Нет накопительных целей">
          Например, «Отпуск — 2000 €». Каждый заработок будет приближать к ней, а на дашборде появится, сколько
          процентов цели дал сегодняшний день.
        </EmptyState>
      ) : (
        <div className="grid gap-5">
          {savings.map((g) => {
            const startDate = toISODate(new Date(g.created_at))
            const p = savingsProgress(entries, { ...g, startDate }, today)
            const eta = p.remaining > 0 && pace > 0 ? Math.ceil(p.remaining / pace) : null
            return (
              <div key={g.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-medium">{g.title}</div>
                  <div className="flex items-center">
                    <Button size="icon-sm" variant="ghost" aria-label="Изменить" onClick={() => setEditing({ goal: g })}>
                      <Pencil />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Удалить"
                      onClick={() => del.mutate(g.id, { onSuccess: () => toast('Цель удалена') })}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <Progress value={p.progress * 100} className="mt-1 h-2" />
                <div className="mt-1.5 flex flex-wrap justify-between gap-x-4 text-sm text-muted-foreground">
                  <span className="num">
                    <span className="font-medium text-foreground">{money(p.saved)}</span> из {money(p.target)} ·{' '}
                    {formatPercent(p.progress)}
                  </span>
                  <span>
                    {p.remaining === 0
                      ? 'Цель достигнута'
                      : eta
                        ? `≈ ${days(eta)} в текущем темпе`
                        : `осталось ${money(p.remaining)}`}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">с {formatDate(startDate)}</div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.goal ? 'Изменить цель' : 'Новая накопительная цель'}</DialogTitle>
            <DialogDescription className="sr-only">Название и сумма цели</DialogDescription>
          </DialogHeader>
          {editing && <SavingsForm goal={editing.goal} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </Section>
  )
}

export function GoalsPage() {
  return (
    <>
      <PageHeader title="Цели" />
      <div className="grid gap-4">
        <MonthlyGoalSection />
        <SavingsSection />
      </div>
    </>
  )
}
