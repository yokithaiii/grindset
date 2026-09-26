import type { Entry, Source } from './types'

function cell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** RFC 4180 CSV (comma, dot decimals) — opens in Excel, Google Sheets and Numbers. */
export function entriesToCsv(entries: readonly Entry[], sources: ReadonlyMap<string, Source>): string {
  const header = ['date', 'source', 'type', 'amount', 'minutes_spent', 'note']
  const rows = entries.map((e) => {
    const s = sources.get(e.source_id)
    return [e.date, s?.name ?? '', s?.type ?? '', e.amount.toFixed(2), e.minutes_spent, e.note].map(cell).join(',')
  })
  return [header.join(','), ...rows].join('\r\n') + '\r\n'
}

export function downloadCsv(filename: string, csv: string) {
  // BOM so Excel detects UTF-8 (Cyrillic source names and notes)
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
