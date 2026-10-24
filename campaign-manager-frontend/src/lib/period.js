import { currentMonth, monthLabel } from './format'

// A period is one of:
//   { mode: 'month', month: '2026-10' }
//   { mode: 'year', year: 2026 }
//   { mode: 'all' }
//   { mode: 'custom', from: '2026-01', to: '2026-06' }

export function addMonths(yearMonth, delta) {
  const [year, month] = yearMonth.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function makePeriod(mode, base = {}) {
  const month = base.month || currentMonth()
  const year = base.year || Number(month.slice(0, 4))

  switch (mode) {
    case 'month':
      return { mode, month }
    case 'year':
      return { mode, year }
    case 'custom':
      return { mode, from: base.from || addMonths(month, -2), to: base.to || month }
    default:
      return { mode: 'all' }
  }
}

// The from/to query values for the API ('' = open ended)
export function periodRange(period) {
  switch (period.mode) {
    case 'month':
      return { from: period.month, to: period.month }
    case 'year':
      return { from: `${period.year}-01`, to: `${period.year}-12` }
    case 'custom':
      return { from: period.from || '', to: period.to || '' }
    default:
      return { from: '', to: '' }
  }
}

export function periodQuery(period) {
  const { from, to } = periodRange(period)
  const params = new URLSearchParams({ ...(from && { from }), ...(to && { to }) }).toString()
  return params ? `?${params}` : ''
}

export function periodLabel(period) {
  switch (period.mode) {
    case 'month':
      return monthLabel(period.month)
    case 'year':
      return String(period.year)
    case 'custom':
      return `${period.from ? monthLabel(period.from) : 'Start'} – ${period.to ? monthLabel(period.to) : 'Now'}`
    default:
      return 'All time'
  }
}
