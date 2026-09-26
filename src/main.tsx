import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/useAuth'
import { ThemeProvider, useTheme } from '@/hooks/useTheme'
import { initTelegram } from '@/lib/telegram'
import { App } from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: true, retry: 1 },
  },
})

function ThemedToaster() {
  const { theme } = useTheme()
  return (
    <Toaster
      theme={theme}
      position="top-center"
      closeButton={false}
      // below the notch / Telegram header on phones
      mobileOffset={{ top: 'calc(var(--safe-top) + 0.5rem)', left: '0.75rem', right: '0.75rem' }}
      toastOptions={{ duration: 2500 }}
    />
  )
}

initTelegram()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider delayDuration={150}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
            <ThemedToaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
