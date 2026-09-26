import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { BarChart3, LayoutDashboard, List, Plus, Settings, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEntryDialog } from '@/components/entry/EntryDialog'
import { cn } from '@/lib/utils'
import { ThemeToggle } from './ThemeToggle'

const NAV = [
  { to: '/', label: 'Дашборд', icon: LayoutDashboard },
  { to: '/analytics', label: 'Аналитика', icon: BarChart3 },
  { to: '/entries', label: 'Записи', icon: List },
  { to: '/goals', label: 'Цели', icon: Target },
  { to: '/settings', label: 'Настройки', icon: Settings },
]

export function AppShell() {
  const { open } = useEntryDialog()

  // "N" opens quick entry when not typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return
      if (document.querySelector('[role="dialog"]')) return
      if (e.key === 'n' || e.key === 'т' || e.key === '+') {
        e.preventDefault()
        open()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          <NavLink to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <img src="/favicon.svg" alt="" className="size-6" />
            grindset
          </NavLink>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm transition-colors',
                    isActive ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button onClick={() => open()} className="hidden md:inline-flex" title="Добавить запись (N)">
              <Plus /> Добавить
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-6 pb-32 md:pb-12">
        <Outlet />
      </main>

      {/* Mobile: floating add button + bottom navigation */}
      <Button
        onClick={() => open()}
        size="icon-lg"
        aria-label="Добавить запись"
        className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 size-14 rounded-full shadow-lg md:hidden [&_svg:not([class*='size-'])]:size-6"
      >
        <Plus />
      </Button>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 py-2 text-[11px]',
                  isActive ? 'text-foreground' : 'text-muted-foreground',
                )
              }
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
