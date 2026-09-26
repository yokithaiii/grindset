import { Link } from 'react-router-dom'
import { Progress } from '@/components/ui/progress'
import { Change, Metric, Section } from '@/components/common'
import type { MonthForecast, PeriodComparison } from '@/lib/stats/forecast'
import { formatDate } from '@/lib/format'
import { useMoney } from '@/hooks/useSettings'

export function MonthCard({
  today,
  forecast,
  goalAmount,
  vsLastMonth,
}: {
  today: string
  forecast: MonthForecast
  goalAmount: number | null
  vsLastMonth: PeriodComparison
}) {
  const money = useMoney()
  const progress = goalAmount ? Math.min(1, forecast.earned / goalAmount) : 0

  return (
    <Section title={<span className="capitalize">{formatDate(today, 'LLLL yyyy')}</span>}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="num text-3xl font-semibold tracking-tight">{money(forecast.earned)}</span>
        {goalAmount ? (
          <span className="num text-muted-foreground">из {money(goalAmount)}</span>
        ) : (
          <Link to="/goals" className="text-sm text-muted-foreground underline underline-offset-4">
            задать цель
          </Link>
        )}
      </div>
      {goalAmount ? <Progress value={progress * 100} className="mt-3 h-2" /> : null}

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Metric
          label="Прогноз на конец месяца"
          value={money(forecast.projected)}
          hint={`в текущем темпе, день ${forecast.daysElapsed} из ${forecast.daysInMonth}`}
        />
        <Metric
          label="К тому же дню прошлого месяца"
          value={<Change value={vsLastMonth.change} />}
          hint={`тогда: ${money(vsLastMonth.previous)}`}
        />
        {goalAmount ? (
          <Metric
            label="Прогноз к цели"
            value={`${Math.round((forecast.projected / goalAmount) * 100)}%`}
            hint={
              forecast.earned >= goalAmount
                ? 'цель выполнена'
                : forecast.projected >= goalAmount
                  ? 'темп достаточный'
                  : `нужно ещё ${money(goalAmount - forecast.earned)}`
            }
          />
        ) : null}
      </div>
    </Section>
  )
}
