import { SourceDot } from '@/components/common'
import { useEntryDialog } from './EntryDialog'
import { useMoney } from '@/hooks/useSettings'
import { formatDate, formatMinutes } from '@/lib/format'
import type { Entry, Source } from '@/lib/types'

/** Compact clickable entry line (opens the edit dialog). */
export function EntryRow({ entry, source }: { entry: Entry; source?: Source }) {
  const money = useMoney()
  const { open } = useEntryDialog()
  return (
    <button
      type="button"
      onClick={() => open(entry)}
      className="flex min-h-12 w-full items-center gap-3 rounded-md px-2.5 py-2 text-left select-none hover:bg-accent/60 active:bg-accent"
    >
      <SourceDot color={source?.color ?? '#999'} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{source?.name ?? 'Источник удалён'}</div>
        <div className="truncate text-xs text-muted-foreground">
          {formatDate(entry.date, 'd MMM, EEEEEE')}
          {entry.minutes_spent ? ` · ${formatMinutes(entry.minutes_spent)}` : ''}
          {entry.note ? ` · ${entry.note}` : ''}
        </div>
      </div>
      <div className="num text-sm font-medium">{money(entry.amount)}</div>
    </button>
  )
}
