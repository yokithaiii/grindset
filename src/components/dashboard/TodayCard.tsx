import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { DailyTarget, SavingsProgress } from '@/lib/stats/goals'
import type { Goal } from '@/lib/types'
import { formatPercent } from '@/lib/format'
import { useMoney } from '@/hooks/useSettings'

export function TodayCard({
  earnedToday,
  target,
  savings,
}: {
  earnedToday: number
  target: DailyTarget | null
  savings: { goal: Goal; progress: SavingsProgress }[]
}) {
  const money = useMoney()
  const savingsToday = savings.filter((s) => s.progress.earnedToday > 0 && s.progress.progress < 1)

  return (
    <Card className="gap-0 py-5">
      <CardContent className="px-5">
        <div className="text-sm font-medium text-muted-foreground">Сегодня</div>
        <div className="num mt-1 text-5xl font-semibold tracking-tight">{money(earnedToday)}</div>

        <div className="mt-5">
          {!target ? (
            <p className="text-sm text-muted-foreground">
              <Link to="/goals" className="text-foreground underline underline-offset-4">
                Задайте цель на месяц
              </Link>{' '}
              — и здесь появится дневная норма.
            </p>
          ) : target.monthAchieved ? (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-4 text-primary" />
              <span>
                Цель месяца выполнена
                {target.surplus > 0 && (
                  <>
                    {' '}
                    · <span className="num font-medium">{money(target.surplus)}</span> сверху
                  </>
                )}
              </span>
            </div>
          ) : (
            <>
              <Progress value={target.todayProgress * 100} className="h-2" />
              <div className="mt-2 flex justify-between gap-2 text-sm">
                <span className="text-muted-foreground">
                  Дневная цель <span className="num font-medium text-foreground">{money(target.perDay)}</span>
                </span>
                <span className="num text-muted-foreground">
                  {target.todayProgress >= 1
                    ? 'выполнена'
                    : `осталось ${money(Math.max(0, target.perDay - earnedToday))}`}
                </span>
              </div>
            </>
          )}
        </div>

        {savingsToday.length > 0 && (
          <div className="mt-4 space-y-1 border-t pt-3 text-sm text-muted-foreground">
            {savingsToday.map(({ goal, progress }) => (
              <p key={goal.id}>
                <span className="num font-medium text-foreground">+{money(progress.earnedToday)}</span> сегодня ={' '}
                <span className="num font-medium text-foreground">
                  {formatPercent(progress.todayShare, { digits: progress.todayShare < 0.01 ? 1 : 0 })}
                </span>{' '}
                цели «{goal.title}»
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
