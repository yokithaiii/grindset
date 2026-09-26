import { useEffect, useRef, useState } from 'react'
import type { Heatmap, HeatCell } from '@/lib/stats/heatmap'
import { formatDate, WEEKDAYS_SHORT } from '@/lib/format'
import { fromISODate } from '@/lib/dates'
import { useMoney } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'

const LEVEL_CLASS = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4'] as const
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const CELL = 11
const GAP = 3

function cellClass(c: HeatCell) {
  if (c.future) return 'bg-transparent'
  if (c.frozen && c.amount === 0) return 'bg-freeze'
  return LEVEL_CLASS[c.level]
}

export function YearHeatmap({ heatmap, today }: { heatmap: Heatmap; today: string }) {
  const money = useMoney()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ cell: HeatCell; x: number; y: number } | null>(null)

  // Most recent weeks are on the right: start scrolled to the end on narrow screens.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [])

  const firstWeekday = fromISODate(heatmap.weeks[0][0].date).getDay()
  const rowLabels = Array.from({ length: 7 }, (_, r) => (r % 2 === 0 ? WEEKDAYS_SHORT[(firstWeekday + r) % 7] : ''))

  const show = (cell: HeatCell, target: HTMLElement) => {
    if (cell.future) return setHover(null)
    const box = scrollRef.current!.getBoundingClientRect()
    const r = target.getBoundingClientRect()
    setHover({ cell, x: r.left - box.left + r.width / 2, y: r.top - box.top })
  }

  return (
    <div>
      <div className="relative">
        <div ref={scrollRef} className="overflow-x-auto pb-1" onMouseLeave={() => setHover(null)}>
          <div className="inline-grid min-w-max gap-x-2" style={{ gridTemplateColumns: 'auto auto' }}>
            <div />
            <div className="relative h-4 text-[10px] text-muted-foreground">
              {heatmap.monthStarts.map((m) => (
                <span key={`${m.week}-${m.month}`} className="absolute" style={{ left: m.week * (CELL + GAP) }}>
                  {MONTHS[m.month]}
                </span>
              ))}
            </div>
            <div className="grid text-[10px] leading-none text-muted-foreground" style={{ gridTemplateRows: `repeat(7, ${CELL}px)`, rowGap: GAP }}>
              {rowLabels.map((l, i) => (
                <span key={i} className="flex items-center">
                  {l}
                </span>
              ))}
            </div>
            <div className="flex" style={{ gap: GAP }} role="grid" aria-label="Заработок за год по дням">
              {heatmap.weeks.map((week, w) => (
                <div key={w} className="flex flex-col" style={{ gap: GAP }} role="row">
                  {week.map((c) => (
                    <div
                      key={c.date}
                      role="gridcell"
                      aria-label={c.future ? undefined : `${formatDate(c.date)}: ${money(c.amount)}`}
                      className={cn(
                        'rounded-[2px]',
                        cellClass(c),
                        c.date === today && 'ring-1 ring-foreground/50',
                        hover?.cell.date === c.date && 'ring-1 ring-foreground',
                      )}
                      style={{ width: CELL, height: CELL }}
                      onMouseEnter={(e) => show(c, e.currentTarget)}
                      onClick={(e) => show(c, e.currentTarget)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        {hover && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background shadow"
            style={{
              // keep the tooltip inside the card near the edges
              left: Math.min(Math.max(hover.x, 110), (scrollRef.current?.clientWidth ?? 0) - 110),
              top: hover.y - 6,
            }}
          >
            <span className="num font-medium">{money(hover.cell.amount)}</span>
            <span className="opacity-70"> · {formatDate(hover.cell.date, 'EEEEEE, d MMM yyyy')}</span>
            {hover.cell.frozen && <span className="opacity-70"> · заморозка</span>}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-2.5 rounded-[2px] bg-freeze" /> заморозка
        </span>
        <span className="flex items-center gap-1">
          меньше
          {LEVEL_CLASS.map((c) => (
            <span key={c} className={cn('size-2.5 rounded-[2px]', c)} />
          ))}
          больше
        </span>
      </div>
    </div>
  )
}
