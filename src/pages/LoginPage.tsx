import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { isTelegram, signInWithTelegram, TELEGRAM_BOT, tg, type TelegramWidgetUser } from '@/lib/telegram'
import { supabase } from '@/lib/supabase'

declare global {
  interface Window {
    __onTelegramAuth?: (user: TelegramWidgetUser) => void
  }
}

/** Official Telegram Login Widget. Works only on the domain set for the bot via @BotFather → /setdomain. */
function TelegramLoginButton({ bot, onAuth }: { bot: string; onAuth: (user: TelegramWidgetUser) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const onAuthRef = useRef(onAuth)
  onAuthRef.current = onAuth

  useEffect(() => {
    const el = ref.current
    if (!el) return
    window.__onTelegramAuth = (user) => onAuthRef.current(user)
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', bot)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '8')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-onauth', '__onTelegramAuth(user)')
    el.appendChild(script)
    return () => {
      el.innerHTML = ''
      delete window.__onTelegramAuth
    }
  }, [bot])

  return <div ref={ref} className="flex min-h-10 justify-center" />
}

/** Email magic link — only in `npm run dev`: the Telegram widget doesn't work on localhost. */
function DevEmailLogin() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  return (
    <form
      className="mt-6 grid gap-2 border-t pt-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin } })
        setStatus(error ? error.message : 'Ссылка отправлена')
      }}
    >
      <p className="text-xs text-muted-foreground">Только для разработки: вход по почте</p>
      <div className="flex gap-2">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
        <Button type="submit" variant="outline">
          Ссылка
        </Button>
      </div>
      {status && <p className="text-xs text-muted-foreground">{status}</p>}
    </form>
  )
}

export function LoginPage() {
  const [pending, setPending] = useState(isTelegram)
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  const run = useCallback(async (payload: Parameters<typeof signInWithTelegram>[0]) => {
    setPending(true)
    setError(null)
    try {
      await signInWithTelegram(payload)
      // AuthProvider picks up the new session and the app renders
    } catch (e) {
      setError((e as Error).message)
      setPending(false)
    }
  }, [])

  // Inside Telegram: sign in automatically with the Mini App launch data
  useEffect(() => {
    if (!tg || started.current) return
    started.current = true
    void run({ initData: tg.initData })
  }, [run])

  return (
    <div className="flex min-h-dvh items-center justify-center p-4 pt-[calc(var(--safe-top)+1rem)]">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <img src="/logo.png" alt="" className="size-7 rounded-md" /> grindset
          </div>
          <CardTitle>Вход</CardTitle>
          <CardDescription>
            {isTelegram ? 'Входим через ваш аккаунт Telegram.' : 'Через Telegram — без паролей и почты.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pending ? (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Входим…
            </div>
          ) : isTelegram ? (
            <Button className="w-full" onClick={() => tg && run({ initData: tg.initData })}>
              <Send /> Повторить вход
            </Button>
          ) : TELEGRAM_BOT ? (
            <div className="grid gap-4">
              <TelegramLoginButton bot={TELEGRAM_BOT} onAuth={(user) => run({ widget: user })} />
              <p className="text-center text-xs text-muted-foreground">
                или откройте{' '}
                <a href={`https://t.me/${TELEGRAM_BOT}`} className="text-foreground underline underline-offset-4">
                  @{TELEGRAM_BOT}
                </a>{' '}
                в Telegram
              </p>
            </div>
          ) : (
            <p className="text-sm text-destructive">Не задан VITE_TELEGRAM_BOT_USERNAME.</p>
          )}

          {error && <p className="mt-3 text-center text-sm text-destructive">{error}</p>}

          {import.meta.env.DEV && !isTelegram && <DevEmailLogin />}
        </CardContent>
      </Card>
    </div>
  )
}
