import { describe, expect, it } from 'vitest'
import { entriesToCsv } from './csv'
import type { Entry, Source } from './types'

const source: Source = {
  id: 's1',
  user_id: 'u',
  name: 'Фриланс, дизайн',
  type: 'active',
  color: '#000000',
  is_archived: false,
  created_at: '',
}
const entry = (over: Partial<Entry>): Entry => ({
  id: 'e',
  user_id: 'u',
  source_id: 's1',
  amount: 85,
  date: '2026-09-15',
  minutes_spent: null,
  note: null,
  created_at: '',
  ...over,
})

describe('entriesToCsv', () => {
  it('writes a header and escapes special characters', () => {
    const csv = entriesToCsv(
      [entry({ note: 'сказал "спасибо"\nи ушёл', minutes_spent: 90 }), entry({ amount: 12.5 })],
      new Map([['s1', source]]),
    )
    expect(csv).toBe(
      'date,source,type,amount,minutes_spent,note\r\n' +
        '2026-09-15,"Фриланс, дизайн",active,85.00,90,"сказал ""спасибо""\nи ушёл"\r\n' +
        '2026-09-15,"Фриланс, дизайн",active,12.50,,\r\n',
    )
  })
})
