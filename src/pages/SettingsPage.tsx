import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader, Section } from '@/components/common'
import { SourcesManager } from '@/components/SourcesManager'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'
import { useAuth } from '@/hooks/useAuth'
import { useTheme, type Theme } from '@/hooks/useTheme'
import { supabase } from '@/lib/supabase'
import { isTelegram } from '@/lib/telegram'
import type { AmountMode, WeekStart } from '@/lib/types'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'PLN', 'CZK', 'RUB', 'UAH', 'KZT', 'GEL', 'TRY', 'RSD', 'AED']

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Choice<T extends string>({
  value,
  onChange,
  options,
  className = 'w-36 sm:w-40',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  className?: string
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function SettingsPage() {
  const { settings } = useSettings()
  const update = useUpdateSettings()
  const { theme, setTheme } = useTheme()
  const { session } = useAuth()
  const meta = session?.user.user_metadata ?? {}
  const accountLabel = meta.telegram_username
    ? `Telegram: @${meta.telegram_username}`
    : meta.full_name
      ? `Telegram: ${meta.full_name}`
      : session?.user.email
  const { hash } = useLocation()

  useEffect(() => {
    if (hash) document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  return (
    <>
      <PageHeader title="Настройки" description={accountLabel} />
      <div className="grid gap-4">
        <Section title="Общие">
          <div className="divide-y">
            <Row label="Валюта" hint="Для отображения сумм">
              <Choice
                value={settings.currency}
                onChange={(currency) => update.mutate({ currency })}
                options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                className="w-28"
              />
            </Row>
            <Row label="Первый день недели" hint="Для недельных итогов и тепловой карты">
              <Choice
                value={String(settings.week_starts_on)}
                onChange={(v) => update.mutate({ week_starts_on: Number(v) as WeekStart })}
                options={[
                  { value: '1', label: 'Понедельник' },
                  { value: '0', label: 'Воскресенье' },
                  { value: '6', label: 'Суббота' },
                ]}
              />
            </Row>
            <Row label="Заморозок в месяц" hint="Сколько пропущенных дней можно простить серии">
              <Choice
                value={String(settings.freezes_per_month)}
                onChange={(v) => update.mutate({ freezes_per_month: Number(v) })}
                options={[0, 1, 2, 3, 4, 5, 7, 10].map((n) => ({ value: String(n), label: String(n) }))}
                className="w-20"
              />
            </Row>
            <Row label="Суммы" hint="Как вы вносите заработок">
              <Choice
                value={settings.amount_mode}
                onChange={(amount_mode: AmountMode) => update.mutate({ amount_mode })}
                options={[
                  { value: 'net', label: 'Чистыми' },
                  { value: 'gross', label: 'До вычетов' },
                ]}
              />
            </Row>
            <Row label="Тема">
              <Choice
                value={theme}
                onChange={(t: Theme) => setTheme(t)}
                options={[
                  { value: 'system', label: 'Системная' },
                  { value: 'light', label: 'Светлая' },
                  { value: 'dark', label: 'Тёмная' },
                ]}
              />
            </Row>
          </div>
        </Section>

        <SourcesManager />

        {/* inside Telegram the app signs in automatically again, so there is nothing to sign out to */}
        {!isTelegram && (
          <div>
            <Button variant="ghost" onClick={() => supabase.auth.signOut()}>
              <LogOut /> Выйти
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
