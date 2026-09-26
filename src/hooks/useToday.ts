import { useEffect, useState } from 'react'
import { todayISO } from '@/lib/dates'
import type { ISODate } from '@/lib/types'

/** Local date that rolls over at midnight and when the tab becomes visible again. */
export function useToday(): ISODate {
  const [today, setToday] = useState(todayISO)

  useEffect(() => {
    const refresh = () => setToday(todayISO())
    const now = new Date()
    const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()
    const timer = setTimeout(refresh, msToMidnight + 1000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [today])

  return today
}
