import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { EntryDialogProvider } from '@/components/entry/EntryDialog'
import { useAuth } from '@/hooks/useAuth'
import { useBootstrap } from '@/hooks/useSettings'
import { isSupabaseConfigured } from '@/lib/supabase'
import { LoginPage } from '@/pages/LoginPage'
import { SetupPage } from '@/pages/SetupPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { EntriesPage } from '@/pages/EntriesPage'
import { GoalsPage } from '@/pages/GoalsPage'
import { SettingsPage } from '@/pages/SettingsPage'

// Recharts is heavy — load analytics on demand.
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'))

function FullScreenSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}

function AuthedApp() {
  const bootstrap = useBootstrap()
  if (bootstrap.isPending) return <FullScreenSpinner />
  if (bootstrap.isError) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="font-medium">Не удалось подключиться к базе данных</p>
        <p className="mt-2 text-sm text-muted-foreground">{bootstrap.error.message}</p>
        <p className="mt-2 text-sm text-muted-foreground">Проверьте, что миграция применена (см. README).</p>
      </div>
    )
  }

  return (
    <EntryDialogProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route
            path="analytics"
            element={
              <Suspense fallback={<FullScreenSpinner />}>
                <AnalyticsPage />
              </Suspense>
            }
          />
          <Route path="entries" element={<EntriesPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </EntryDialogProvider>
  )
}

export function App() {
  const { session, loading } = useAuth()
  if (!isSupabaseConfigured) return <SetupPage />
  if (loading) return <FullScreenSpinner />
  if (!session) return <LoginPage />
  return <AuthedApp />
}
