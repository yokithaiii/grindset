import { Flame, Snowflake } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { FreezeRescue, StreakResult } from '@/lib/stats/streak'
import { days, formatDate, plural } from '@/lib/format'
import { useApplyFreezes } from '@/hooks/useFreezes'
import { cn } from '@/lib/utils'

export function StreakCard({
  streak,
  rescue,
  freezesLeft,
  perMonth,
}: {
  streak: StreakResult
  rescue: FreezeRescue | null
  freezesLeft: number
  perMonth: number
}) {
  const applyFreezes = useApplyFreezes()

  return (
    <Card className="gap-0 py-4 sm:py-5">
      <CardContent className="flex h-full flex-col px-4 sm:px-5">
        <div className="text-sm font-medium text-muted-foreground">Серия</div>
        <div className="mt-1 flex items-baseline gap-2">
          <Flame
            className={cn('size-6 self-center', streak.current > 0 ? 'text-primary' : 'text-muted-foreground/50')}
            strokeWidth={1.75}
          />
          <span className="num text-4xl font-semibold tracking-tight sm:text-5xl">{streak.current}</span>
          <span className="text-muted-foreground">{plural(streak.current, 'день', 'дня', 'дней')}</span>
        </div>
        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          <p>
            Рекорд: <span className="num font-medium text-foreground">{days(streak.best)}</span>
          </p>
          {streak.current > 0 && !streak.todayDone && <p>Сегодня ещё без записи — серия продолжится с первой.</p>}
          <p className="flex items-center gap-1.5">
            <Snowflake className="size-3.5" />
            Заморозок в этом месяце: <span className="num text-foreground">{freezesLeft}</span> из {perMonth}
          </p>
        </div>

        {rescue && (
          <div className="mt-4 rounded-md border border-dashed p-3 text-sm">
            <p>
              {rescue.days.length === 1
                ? `${formatDate(rescue.days[0], 'd MMMM')} без заработка.`
                : `${rescue.days.length} ${plural(rescue.days.length, 'день', 'дня', 'дней')} без заработка (с ${formatDate(rescue.days[0], 'd MMMM')}).`}{' '}
              {rescue.possible
                ? `Заморозка сохранит серию в ${days(rescue.streakIfFrozen)}.`
                : 'Заморозок не хватает, серия начнётся заново.'}
            </p>
            {rescue.possible && (
              <Button
                size="sm"
                variant="secondary"
                className="mt-2"
                disabled={applyFreezes.isPending}
                onClick={() => applyFreezes.mutate(rescue.days)}
              >
                <Snowflake /> Заморозить {rescue.days.length > 1 ? days(rescue.days.length) : 'день'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
