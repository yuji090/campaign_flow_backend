import { useEffect, useRef, useState } from 'react'
import { currentMonth } from '../lib/format'
import { addMonths, makePeriod } from '../lib/period'

const MODES = [
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom' },
]

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Compact period control: [Month | Year | All time | Custom] + ‹ Oct 2026 ›
export default function PeriodPicker({ value, onChange }) {
  const changeMode = (mode) => {
    if (mode === value.mode) return

    // Carry the visible month/year over when switching
    const base = value.mode === 'month'
      ? { month: value.month }
      : value.mode === 'year'
        ? { year: value.year, month: value.year === new Date().getFullYear() ? currentMonth() : `${value.year}-12` }
        : value.mode === 'custom'
          ? { from: value.from, to: value.to, month: value.to || currentMonth() }
          : {}

    onChange(makePeriod(mode, base))
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="inline-flex p-[3px] rounded-[9px] bg-[#eef1f5]">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => changeMode(mode.id)}
            className={`border-0 cursor-pointer rounded-[7px] px-[11px] h-[30px] text-[12px] font-bold transition ${
              value.mode === mode.id
                ? 'bg-white text-[#172033] shadow-[0_1px_3px_rgba(16,24,40,.12)]'
                : 'bg-transparent text-[#667085] hover:text-[#172033]'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {value.mode === 'month' && (
        <Stepper
          onPrev={() => onChange({ ...value, month: addMonths(value.month, -1) })}
          onNext={() => onChange({ ...value, month: addMonths(value.month, 1) })}
        >
          <MonthDropdown value={value.month} onChange={(month) => onChange({ ...value, month })} />
        </Stepper>
      )}

      {value.mode === 'year' && (
        <Stepper
          onPrev={() => onChange({ ...value, year: value.year - 1 })}
          onNext={() => onChange({ ...value, year: value.year + 1 })}
        >
          <span className="px-3 text-[13px] font-bold text-[#172033] tabular-nums">{value.year}</span>
        </Stepper>
      )}

      {value.mode === 'custom' && (
        <div className="inline-flex items-center gap-1 h-9 px-1 rounded-[9px] border border-[#e6eaf0] bg-white">
          <MonthDropdown value={value.from} onChange={(from) => onChange({ ...value, from })} />
          <span className="text-[#98a2b3] text-xs">→</span>
          <MonthDropdown value={value.to} onChange={(to) => onChange({ ...value, to })} />
        </div>
      )}
    </div>
  )
}

// Just the ‹ Oct 2026 › control, for pages that always show one month
export function MonthPicker({ value, onChange }) {
  return (
    <Stepper onPrev={() => onChange(addMonths(value, -1))} onNext={() => onChange(addMonths(value, 1))}>
      <MonthDropdown value={value} onChange={onChange} />
    </Stepper>
  )
}

function Stepper({ onPrev, onNext, children }) {
  const arrow =
    'w-8 h-full border-0 bg-transparent cursor-pointer text-[#667085] text-[15px] hover:text-[#3563e9] hover:bg-[#f5f7ff] transition'

  return (
    // No overflow-hidden here: the month dropdown has to escape this box
    <div className="inline-flex items-center h-9 rounded-[9px] border border-[#e6eaf0] bg-white">
      <button type="button" onClick={onPrev} className={`${arrow} rounded-l-[8px] border-r border-[#eef1f5]`} title="Previous">‹</button>
      {children}
      <button type="button" onClick={onNext} className={`${arrow} rounded-r-[8px] border-l border-[#eef1f5]`} title="Next">›</button>
    </div>
  )
}

// Button showing "Oct 2026" that opens a year + 12-month grid
function MonthDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => Number((value || currentMonth()).slice(0, 4)))
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return

    const close = (event) => !ref.current?.contains(event.target) && setOpen(false)
    const onKey = (event) => event.key === 'Escape' && setOpen(false)

    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const [selectedYear, selectedMonth] = value ? value.split('-').map(Number) : [null, null]
  const today = currentMonth()

  const toggle = () => {
    if (!open) setViewYear(selectedYear || Number(today.slice(0, 4)))
    setOpen(!open)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="border-0 bg-transparent cursor-pointer px-3 h-[34px] text-[13px] font-bold text-[#172033] hover:text-[#3563e9] flex items-center gap-[6px] whitespace-nowrap"
      >
        {value ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}` : 'Pick month'}
        <span className="text-[9px] text-[#98a2b3]">▼</span>
      </button>

      {open && (
        <div className="absolute z-40 top-[calc(100%+6px)] left-1/2 -translate-x-1/2 w-[236px] bg-white border border-[#e6eaf0] rounded-[11px] shadow-[0_12px_32px_rgba(16,24,40,.14)] p-3">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setViewYear(viewYear - 1)} className="border-0 bg-transparent cursor-pointer w-7 h-7 rounded-md text-[#667085] hover:bg-[#f2f4f7]">‹</button>
            <strong className="text-[13px] tabular-nums">{viewYear}</strong>
            <button type="button" onClick={() => setViewYear(viewYear + 1)} className="border-0 bg-transparent cursor-pointer w-7 h-7 rounded-md text-[#667085] hover:bg-[#f2f4f7]">›</button>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {MONTH_NAMES.map((name, index) => {
              const key = `${viewYear}-${String(index + 1).padStart(2, '0')}`
              const selected = key === value
              const isToday = key === today

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onChange(key)
                    setOpen(false)
                  }}
                  className={`border-0 cursor-pointer h-8 rounded-[7px] text-[12px] font-semibold transition ${
                    selected
                      ? 'bg-[#3563e9] text-white'
                      : isToday
                        ? 'bg-[#edf2ff] text-[#3563e9]'
                        : 'bg-transparent text-[#475467] hover:bg-[#f2f4f7]'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
