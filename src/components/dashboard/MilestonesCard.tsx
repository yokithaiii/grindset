import { Section } from '@/components/common'
import { MILESTONES, type MilestoneState } from '@/lib/stats/milestones'
import { formatDate } from '@/lib/format'
import { useMoney } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'

/** Plain scale with marks — position of each milestone is by index, not value (values span 3 orders). */
export function MilestonesCard({ state }: { state: MilestoneState }) {
  const money = useMoney()
  const reachedCount = state.reached.length
  const last = MILESTONES.length - 1
  // Fill up to the last reached mark plus partial progress towards the next one.
  const fill = Math.min(1, (Math.max(0, reachedCount - 1) + (reachedCount ? state.progress : 0)) / last)

  return (
    <Section
      title="Вехи"
      action={
        <span className="text-xs text-muted-foreground">
          всего <span className="num font-medium text-foreground">{money(state.total)}</span>
        </span>
      }
    >
      <div className="px-2 pt-2 pb-7">
        <div className="relative h-1 rounded-full bg-muted">
          <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${fill * 100}%` }} />
          {MILESTONES.map((m, i) => (
            <div
              key={m}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(i / last) * 100}%` }}
            >
              <div
                className={cn(
                  'size-2.5 rounded-full border-2 border-card',
                  i < reachedCount ? 'bg-primary' : 'bg-muted-foreground/30',
                )}
              />
              <div
                className={cn(
                  'num absolute top-3 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap',
                  i < reachedCount ? 'text-foreground' : 'text-muted-foreground',
                  // show every label on wide screens, every other one on phones
                  i % 2 === 1 && 'hidden sm:block',
                )}
              >
                {money(m, { compact: true })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-sm">
        {state.next !== null ? (
          <p className="text-muted-foreground">
            До <span className="num font-medium text-foreground">{money(state.next)}</span> осталось{' '}
            <span className="num font-medium text-foreground">{money(state.next - state.total)}</span>
          </p>
        ) : (
          <p className="text-muted-foreground">Все вехи пройдены.</p>
        )}
        {reachedCount > 0 && (
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-3">
            {[...state.reached].reverse().map((r) => (
              <li key={r.value} className="flex justify-between gap-2">
                <span className="num text-foreground">{money(r.value)}</span>
                <span>{formatDate(r.date, 'd MMM yyyy')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  )
}
