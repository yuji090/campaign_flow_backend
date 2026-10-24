export function money(value, currency = 'USD') {
  const amount = Number(value || 0)

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    // Unknown currency code
    return `${amount.toFixed(2)} ${currency || ''}`.trim()
  }
}

// '2026-10' -> 'Oct 2026'
export function monthLabel(yearMonth) {
  if (!yearMonth) return '—'

  const [year, month] = yearMonth.split('-').map(Number)

  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
}

// '2026-10-24' -> '24 Oct 2026'
export function dateLabel(isoDate) {
  if (!isoDate) return '—'

  return new Date(`${isoDate.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function clean(value) {
  if (typeof value !== 'string') return value ?? null
  return value.trim() || null
}

export function toNumberOrNull(value) {
  return value === '' || value === null || value === undefined ? null : Number(value)
}

// 12500 -> '12,500'
export function number(value) {
  return Number(value || 0).toLocaleString('en-US')
}

// 32.35 -> '32.4%', null -> '—'
export function percent(value) {
  return value === null || value === undefined ? '—' : `${Number(value).toFixed(1)}%`
}
