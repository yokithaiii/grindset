import { Link } from 'react-router-dom'
import { Plus, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, Section } from '@/components/common'
import { useEntryDialog } from '@/components/entry/EntryDialog'
import { EntryRow } from '@/components/entry/EntryRow'
import { TodayCard } from '@/components/dashboard/TodayCard'
import { StreakCard } from '@/components/dashboard/StreakCard'
import { MonthCard } from '@/components/dashboard/MonthCard'
import { YearHeatmap } from '@/components/dashboard/YearHeatmap'
import { RecordsCard } from '@/components/dashboard/RecordsCard'
import { MilestonesCard } from '@/components/dashboard/MilestonesCard'
import { useDashboardStats } from '@/hooks/useStats'
import { useEntries } from '@/hooks/useEntries'
import { useSources } from '@/hooks/useSources'
import { useSettings } from '@/hooks/useSettings'

export function DashboardPage() {
  const stats = useDashboardStats()
  const { entries } = useEntries()
  const { byId } = useSources()
  const { settings } = useSettings()
  const { open } = useEntryDialog()

  if (stats.isPending) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
        <Skeleton className="h-44 md:col-span-2" />
        <Skeleton className="h-44" />
        <Skeleton className="h-40 md:col-span-3" />
        <Skeleton className="h-48 md:col-span-3" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
      <div className="md:col-span-2">
        <TodayCard earnedToday={stats.earnedToday} target={stats.target} savings={stats.savings} />
      </div>
      <StreakCard
        streak={stats.streak}
        rescue={stats.rescue}
        freezesLeft={stats.freezesLeft}
        perMonth={settings.freezes_per_month}
      />

      <div className="md:col-span-3">
        <MonthCard
          today={stats.today}
          forecast={stats.forecast}
          goalAmount={stats.goal?.target_amount ?? null}
          vsLastMonth={stats.vsLastMonth}
        />
      </div>

      <Section title="Год" className="md:col-span-3">
        <YearHeatmap heatmap={stats.heatmap} today={stats.today} />
      </Section>

      <Section
        title="Последние записи"
        className="md:col-span-2"
        action={
          stats.hasEntries && (
            <Link to="/entries" className="text-sm text-muted-foreground hover:text-foreground">
              Все записи →
            </Link>
          )
        }
      >
        {stats.hasEntries ? (
          <div className="-mx-2">
            {entries.slice(0, 5).map((e) => (
              <EntryRow key={e.id} entry={e} source={byId.get(e.source_id)} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Wallet}
            title="Пока нет ни одной записи"
            action={
              <Button onClick={() => open()}>
                <Plus /> Добавить первую
              </Button>
            }
          >
            Добавьте первый заработок — даже небольшой. Отсюда начнётся серия и статистика.
          </EmptyState>
        )}
      </Section>

      <RecordsCard records={stats.records} />

      <div className="md:col-span-3">
        <MilestonesCard state={stats.milestones} />
      </div>
    </div>
  )
}
