import { Section } from '@/components/common'
import type { Records } from '@/lib/stats/records'
import { days, formatDate } from '@/lib/format'
import { addDaysISO } from '@/lib/dates'
import { useMoney } from '@/hooks/useSettings'
import { useSources } from '@/hooks/useSources'
import type { ReactNode } from 'react'

function Row({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right">
        <span className="num text-sm font-medium">{value}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </div>
  )
}

export function RecordsCard({ records }: { records: Records }) {
  const money = useMoney()
  const { byId } = useSources()
  const { bestDay, bestWeek, bestMonth, bestHourly, longestStreak } = records
  const dash = <span className="text-muted-foreground">—</span>

  return (
    <Section title="Личные рекорды">
      <div className="divide-y">
        <Row label="Лучший день" value={bestDay ? money(bestDay.amount) : dash} hint={bestDay && formatDate(bestDay.date)} />
        <Row
          label="Лучшая неделя"
          value={bestWeek ? money(bestWeek.amount) : dash}
          hint={bestWeek && `${formatDate(bestWeek.date, 'd MMM')} – ${formatDate(addDaysISO(bestWeek.date, 6))}`}
        />
        <Row
          label="Лучший месяц"
          value={bestMonth ? money(bestMonth.amount) : dash}
          hint={bestMonth && <span className="capitalize">{formatDate(bestMonth.date, 'LLLL yyyy')}</span>}
        />
        <Row label="Самая длинная серия" value={longestStreak ? days(longestStreak) : dash} />
        <Row
          label="Лучшая ставка в час"
          value={bestHourly ? `${money(bestHourly.rate)}/ч` : dash}
          hint={bestHourly ? byId.get(bestHourly.sourceId)?.name : 'укажите время в записях'}
        />
      </div>
    </Section>
  )
}
