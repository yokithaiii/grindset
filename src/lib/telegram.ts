import { supabase } from './supabase'

/** The part of Telegram.WebApp (telegram-web-app.js) the app uses. */
interface TelegramWebApp {
  initData: string
  version: string
  colorScheme: 'light' | 'dark'
  isVersionAtLeast(version: string): boolean
  ready(): void
  expand(): void
  disableVerticalSwipes?(): void
  setHeaderColor?(color: string): void
  setBackgroundColor?(color: string): void
  setBottomBarColor?(color: string): void
  onEvent(event: 'themeChanged', cb: () => void): void
  offEvent(event: 'themeChanged', cb: () => void): void
}

/** Data the Telegram Login Widget passes to its callback. */
export interface TelegramWidgetUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

/** Telegram.WebApp when running as a Mini App, otherwise null (the script is loaded only inside Telegram). */
export const tg: TelegramWebApp | null = window.Telegram?.WebApp?.initData ? window.Telegram.WebApp : null
export const isTelegram = tg !== null

export const TELEGRAM_BOT = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined)?.replace(/^@/, '').trim() ?? ''

/** Call once on startup inside Telegram. */
export function initTelegram() {
  if (!tg) return
  tg.ready()
  tg.expand()
  // Vertical swipes would close the app while scrolling
  if (tg.isVersionAtLeast('7.7')) tg.disableVerticalSwipes?.()
}

/** Paint Telegram's header and bottom bar in the app background color. */
export function setTelegramColors(dark: boolean) {
  if (!tg || !tg.isVersionAtLeast('6.1')) return
  const bg = dark ? '#0c0c0c' : '#fafafa'
  tg.setHeaderColor?.(bg)
  tg.setBackgroundColor?.(bg)
  if (tg.isVersionAtLeast('7.10')) tg.setBottomBarColor?.(bg)
}

/** Verify Telegram data on the server (edge function) and start a Supabase session. */
export async function signInWithTelegram(payload: { initData: string } | { widget: TelegramWidgetUser }) {
  const { data, error } = await supabase.functions.invoke<{ token_hash: string }>('telegram-auth', { body: payload })
  if (error || !data) {
    let message = error?.message ?? 'Нет ответа сервера'
    // FunctionsHttpError carries the response; our function returns { error }
    const res = (error as { context?: Response } | null)?.context
    if (res && typeof res.json === 'function') {
      const body = await res.json().catch(() => null)
      if (body?.error) message = body.error
    }
    throw new Error(message)
  }
  const { error: otpError } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: data.token_hash })
  if (otpError) throw new Error(otpError.message)
}
