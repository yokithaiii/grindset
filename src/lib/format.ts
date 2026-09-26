import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { fromISODate } from './dates'
import type { ISODate } from './types'

const moneyCache = new Map<string, Intl.NumberFormat>()

function moneyFormatter(currency: string, fraction: boolean, compact: boolean) {
  const key = `${currency}|${fraction}|${compact}`
  let f = moneyCache.get(key)
  if (!f) {
    f = new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      minimumFractionDigits: fraction ? 2 : 0,
      maximumFractionDigits: fraction ? 2 : compact ? 1 : 0,
      notation: compact ? 'compact' : 'standard',
    })
    moneyCache.set(key, f)
  }
  return f
}

/** Whole amounts without cents, fractional ones with two digits. */
export function formatMoney(amount: number, currency: string, opts: { compact?: boolean } = {}): string {
  const fraction = !opts.compact && Math.round(amount * 100) % 100 !== 0
  return moneyFormatter(currency, fraction, !!opts.compact).format(amount)
}

export function formatPercent(v: number, opts: { signed?: boolean; digits?: number } = {}): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'percent',
    maximumFractionDigits: opts.digits ?? 0,
    signDisplay: opts.signed ? 'exceptZero' : 'auto',
  }).format(v)
}

export function formatNumber(v: number, digits = 0): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(v)
}

export function formatDate(d: ISODate, pattern = 'd MMM yyyy'): string {
  return format(fromISODate(d), pattern, { locale: ru })
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (!h) return `${m} мин`
  return m ? `${h} ч ${m} мин` : `${h} ч`
}

/** 1 день, 2 дня, 5 дней */
export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

export const days = (n: number) => `${n} ${plural(n, 'день', 'дня', 'дней')}`

export const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']
export const WEEKDAYS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export function parseAmount(s: string): number {
  return Number(s.replace(/\s/g, '').replace(',', '.'))
}
