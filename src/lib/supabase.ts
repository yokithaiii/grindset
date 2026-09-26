import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? ''
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? ''

// Empty values or the placeholders from .env.example mean "not configured yet":
// the app shows setup instructions instead of crashing on createClient.
export const isSupabaseConfigured = /^https?:\/\//.test(url) && !url.includes('YOUR-PROJECT') && anonKey !== '' && anonKey !== 'YOUR-ANON-KEY'

export const supabase = createClient<Database>(
  isSupabaseConfigured ? url : 'http://localhost:54321',
  isSupabaseConfigured ? anonKey : 'not-configured',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
)

/** Throw Supabase errors so TanStack Query sees them. */
export function unwrap<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data
}
