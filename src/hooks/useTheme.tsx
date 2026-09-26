import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { setTelegramColors, tg } from '@/lib/telegram'

export type Theme = 'light' | 'dark' | 'system'

const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: 'system',
  setTheme: () => {},
})

/** "System" means Telegram's theme inside the Mini App and the OS theme on the web. */
const systemDark = () => (tg ? tg.colorScheme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches)

function apply(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && systemDark())
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0c0c0c' : '#fafafa')
  setTelegramColors(dark)
}

function readTheme(): Theme {
  try {
    return (localStorage.getItem('theme') as Theme | null) ?? 'system'
  } catch {
    return 'system'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readTheme)

  useEffect(() => {
    apply(theme)
    if (theme !== 'system') return
    const onChange = () => apply('system')
    if (tg) {
      tg.onEvent('themeChanged', onChange)
      return () => tg?.offEvent('themeChanged', onChange)
    }
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    try {
      localStorage.setItem('theme', t)
    } catch {
      // storage unavailable: theme applies for this session only
    }
    setThemeState(t)
  }, [])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
