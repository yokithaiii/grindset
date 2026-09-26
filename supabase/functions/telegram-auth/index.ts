// Sign in with Telegram → Supabase session.
//
// POST { initData: string }          — from a Telegram Mini App (Telegram.WebApp.initData)
// POST { widget: { id, hash, ... } } — from the Telegram Login Widget on the web
// → { token_hash }  — the client exchanges it with supabase.auth.verifyOtp({ type: 'magiclink', token_hash })
//
// Secrets: TELEGRAM_BOT_TOKEN (required), ALLOWED_TELEGRAM_IDS (comma-separated, optional but recommended).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
// Deploy with --no-verify-jwt: the caller is not signed in yet.

import { createClient } from 'npm:@supabase/supabase-js@2'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const ALLOWED = new Set(
  (Deno.env.get('ALLOWED_TELEGRAM_IDS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
)
/** Signed data older than this is rejected (replay protection). */
const MAX_AGE_SECONDS = 24 * 60 * 60
/** Placeholder address for accounts created via Telegram; no mail is ever sent to it. */
const emailFor = (telegramId: number) => `telegram-${telegramId}@grindset.kloai.ru`

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

interface TelegramUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
}

// ---------------------------------------------------------------------------
// Signature checks (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app,
//                   https://core.telegram.org/widgets/login#checking-authorization)
// ---------------------------------------------------------------------------

const enc = new TextEncoder()

async function hmacSha256(key: Uint8Array, data: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(data)))
}

const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** All fields except hash, sorted by key, as "key=value" lines. */
function dataCheckString(fields: Record<string, string>): string {
  return Object.keys(fields)
    .filter((k) => k !== 'hash')
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join('\n')
}

async function checkSigned(fields: Record<string, string>, secret: Uint8Array) {
  const hash = fields.hash
  if (!hash) throw new HttpError(401, 'Нет подписи Telegram')
  const expected = toHex(await hmacSha256(secret, dataCheckString(fields)))
  if (!timingSafeEqual(expected, hash.toLowerCase())) throw new HttpError(401, 'Неверная подпись Telegram')

  const authDate = Number(fields.auth_date)
  if (!Number.isFinite(authDate) || Date.now() / 1000 - authDate > MAX_AGE_SECONDS) {
    throw new HttpError(401, 'Данные Telegram устарели, откройте приложение заново')
  }
}

async function userFromInitData(initData: string): Promise<TelegramUser> {
  const fields = Object.fromEntries(new URLSearchParams(initData))
  // Mini App: secret = HMAC_SHA256(key "WebAppData", bot token)
  await checkSigned(fields, await hmacSha256(enc.encode('WebAppData'), BOT_TOKEN))
  if (!fields.user) throw new HttpError(400, 'В initData нет пользователя')
  return JSON.parse(fields.user) as TelegramUser
}

async function userFromWidget(widget: Record<string, unknown>): Promise<TelegramUser> {
  const fields: Record<string, string> = {}
  for (const [k, v] of Object.entries(widget)) if (v !== undefined && v !== null) fields[k] = String(v)
  // Login Widget: secret = SHA256(bot token)
  await checkSigned(fields, new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(BOT_TOKEN))))
  return {
    id: Number(fields.id),
    first_name: fields.first_name,
    last_name: fields.last_name,
    username: fields.username,
    photo_url: fields.photo_url,
  }
}

// ---------------------------------------------------------------------------
// Telegram user → Supabase user → one-time login token
// ---------------------------------------------------------------------------

async function loginToken(tg: TelegramUser): Promise<string> {
  const { data: link, error: linkError } = await admin
    .from('telegram_accounts')
    .select('user_id')
    .eq('telegram_id', tg.id)
    .maybeSingle()
  if (linkError) throw linkError

  let email: string
  if (link) {
    const { data, error } = await admin.auth.admin.getUserById(link.user_id)
    if (error || !data.user?.email) throw error ?? new Error('linked user has no email')
    email = data.user.email
  } else {
    email = emailFor(tg.id)
    const { error } = await admin.auth.admin.createUser({ email, email_confirm: true })
    if (error && error.code !== 'email_exists') throw error
  }

  // generateLink does not send an email; it only returns the token.
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw error

  if (!link) {
    const { error: insertError } = await admin
      .from('telegram_accounts')
      .upsert({ telegram_id: tg.id, user_id: data.user.id })
    if (insertError) throw insertError
  }

  await admin.auth.admin.updateUserById(data.user.id, {
    user_metadata: {
      telegram_id: tg.id,
      telegram_username: tg.username ?? null,
      full_name: [tg.first_name, tg.last_name].filter(Boolean).join(' ') || null,
      avatar_url: tg.photo_url ?? null,
    },
  })

  return data.properties.hashed_token
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
    if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not set')

    const body = await req.json().catch(() => ({}))
    let tg: TelegramUser
    if (typeof body.initData === 'string' && body.initData) tg = await userFromInitData(body.initData)
    else if (body.widget && typeof body.widget === 'object') tg = await userFromWidget(body.widget)
    else throw new HttpError(400, 'Нужен initData или данные виджета')

    if (!Number.isSafeInteger(tg.id)) throw new HttpError(400, 'Некорректный Telegram ID')
    if (ALLOWED.size > 0 && !ALLOWED.has(String(tg.id))) {
      throw new HttpError(403, `Доступ закрыт для Telegram ID ${tg.id}`)
    }

    return json({ token_hash: await loginToken(tg) })
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status)
    console.error(e)
    return json({ error: 'Ошибка входа через Telegram' }, 500)
  }
})
