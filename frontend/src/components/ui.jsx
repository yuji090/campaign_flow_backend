import { useEffect, useRef, useState } from 'react'
import { money } from '../lib/format'
import InfoTip from './InfoTip'

/* ----------------------------- */
/* Form controls                 */
/* ----------------------------- */

export const inputClass =
  'w-full min-h-10 px-[11px] py-[10px] border border-[#d7dce6] rounded-[7px] bg-white text-[#172033] text-[13px] outline-none focus:border-[#3563e9] focus:ring-2 focus:ring-[#edf2ff] disabled:bg-gray-50'

export function Input(props) {
  return <input {...props} className={`${inputClass} ${props.className || ''}`} />
}

export function Select({ children, ...props }) {
  return (
    <select {...props} className={`${inputClass} ${props.className || ''}`}>
      {children}
    </select>
  )
}

export function Textarea(props) {
  return (
    <textarea
      {...props}
      className={`${inputClass} min-h-[76px] resize-y leading-[1.45] ${props.className || ''}`}
    />
  )
}

export function Field({ label, required = false, full = false, hint, children }) {
  return (
    <label className={`grid grid-cols-1 gap-[7px] min-w-0 content-start ${full ? 'col-span-full' : ''}`}>
      <span className="text-[#475467] text-[11px] font-bold">
        {label}
        {required && <b className="text-[#d92d20]"> *</b>}
      </span>

      {children}

      {hint && <small className="text-[#98a2b3] text-[10px]">{hint}</small>}
    </label>
  )
}

export function FormGrid({ children }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[15px]">
      {children}
    </div>
  )
}

export function Toggle({ checked, onClick, disabled = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`border rounded-[7px] px-[10px] py-2 cursor-pointer text-xs flex gap-[7px] items-center transition disabled:opacity-60 disabled:cursor-not-allowed ${
        checked
          ? 'text-[#3563e9] border-[#adc0ff] bg-[#edf2ff]'
          : 'bg-white border-[#e6eaf0] text-[#667085] hover:border-[#cbd3e1]'
      }`}
    >
      <span
        className={`w-[14px] h-[14px] rounded-[3px] border grid place-items-center text-white text-[10px] ${
          checked ? 'bg-[#3563e9] border-[#3563e9]' : 'border-[#c8d0dd]'
        }`}
      >
        {checked ? '✓' : ''}
      </span>
      {children}
    </button>
  )
}

/* ----------------------------- */
/* Buttons                       */
/* ----------------------------- */

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`border-0 rounded-lg px-[15px] py-[11px] bg-[#3563e9] text-white cursor-pointer text-[13px] font-bold shadow-[0_7px_16px_rgba(53,99,233,.2)] hover:bg-[#2854d8] disabled:opacity-60 disabled:cursor-not-allowed transition ${className}`}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`border border-[#e6eaf0] rounded-lg px-[14px] py-[10px] bg-white text-[#475467] cursor-pointer font-bold text-[13px] hover:border-[#cbd3e1] disabled:opacity-60 transition ${className}`}
    >
      {children}
    </button>
  )
}

export function LinkButton({ children, danger = false, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`border-0 bg-transparent cursor-pointer font-bold text-xs p-0 ${
        danger ? 'text-[#d92d20]' : 'text-[#3563e9]'
      }`}
    >
      {children}
    </button>
  )
}

/* ----------------------------- */
/* Layout                        */
/* ----------------------------- */

export function Card({ eyebrow, title, description, actions, children, className = '' }) {
  return (
    <section className={`bg-white border border-[#e6eaf0] rounded-[11px] p-4 sm:p-[23px] min-w-0 ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div>
            {eyebrow && (
              <div className="text-[#3563e9] font-extrabold text-[10px] tracking-[1.1px] mb-[6px]">
                {eyebrow}
              </div>
            )}
            {title && <h3 className="m-0 text-[15px] font-bold">{title}</h3>}
            {description && (
              <p className="text-[#667085] text-xs leading-[1.55] mt-[6px] mb-0">{description}</p>
            )}
          </div>
          {actions && <div className="flex gap-2 items-center flex-wrap">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export function Metric({ icon, label, value, note, type = 'blue', valueClass = '' }) {
  const styles = {
    blue: 'text-[#3563e9] bg-[#3563e9]/10',
    green: 'text-[#0f9f6e] bg-[#0f9f6e]/10',
    purple: 'text-[#774bc4] bg-[#774bc4]/10',
    amber: 'text-[#dc6803] bg-[#dc6803]/10',
    red: 'text-[#d92d20] bg-[#d92d20]/10',
  }

  return (
    <div className="bg-white border border-[#e6eaf0] rounded-[11px] p-3 sm:p-[19px] flex gap-3 sm:gap-[14px] items-center min-w-0">
      <span className={`hidden sm:grid w-10 h-10 shrink-0 rounded-[9px] place-items-center text-xl font-extrabold ${styles[type]}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <strong className={`block text-[18px] sm:text-[22px] leading-none truncate tabular-nums ${valueClass}`}>{value}</strong>
        <div className="font-bold text-xs mt-1">{label}</div>
        {note && <small className="text-[#98a2b3] text-[10px] block mt-1">{note}</small>}
      </div>
    </div>
  )
}

export function Detail({ label, children }) {
  return (
    <div className="min-w-0">
      <div className="text-[#98a2b3] text-[10px] font-bold tracking-[.5px] uppercase mb-1">{label}</div>
      <div className="text-[13px] text-[#172033] break-words">{children || '—'}</div>
    </div>
  )
}

/* ----------------------------- */
/* Tables                        */
/* ----------------------------- */

export function Table({ columns, children, footer }) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:-mx-[23px] sm:px-[23px]">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th
                key={column.key || (typeof column.label === 'string' && column.label) || index}
                className={`text-[#667085] text-[10px] font-extrabold tracking-[.6px] uppercase py-[10px] px-3 border-b border-[#e6eaf0] whitespace-nowrap ${
                  column.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {column.label}
                {column.tip && <span className="ml-1"><InfoTip text={column.tip} /></span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
        {footer && <tfoot>{footer}</tfoot>}
      </table>
    </div>
  )
}

export function Td({ children, align, className = '', ...props }) {
  return (
    <td
      {...props}
      className={`py-[11px] px-3 border-b border-[#eef1f5] align-middle ${
        align === 'right' ? 'text-right tabular-nums whitespace-nowrap' : ''
      } ${className}`}
    >
      {children}
    </td>
  )
}

export function Row({ onClick, children }) {
  return (
    <tr onClick={onClick} className={onClick ? 'cursor-pointer hover:bg-[#f8faff]' : ''}>
      {children}
    </tr>
  )
}

/* ----------------------------- */
/* Values                        */
/* ----------------------------- */

const statusStyles = {
  LIVE: 'text-[#0f9f6e] bg-[#e8f8f1]',
  ACTIVE: 'text-[#0f9f6e] bg-[#e8f8f1]',
  PAUSED: 'text-[#dc6803] bg-[#fff7e5]',
  EXPIRED: 'text-[#d92d20] bg-[#fff0ef]',
  COMPLETED: 'text-[#3563e9] bg-[#edf2ff]',
  DRAFT: 'text-[#667085] bg-[#eef1f5]',
  ARCHIVED: 'text-[#667085] bg-[#eef1f5]',
  INACTIVE: 'text-[#667085] bg-[#eef1f5]',
}

export function Status({ status }) {
  return (
    <span
      className={`inline-block px-[7px] py-1 rounded-full font-extrabold tracking-[.3px] text-[9px] whitespace-nowrap ${
        statusStyles[status] || statusStyles.DRAFT
      }`}
    >
      {status || 'DRAFT'}
    </span>
  )
}

export function Tag({ children, color = 'blue' }) {
  const styles = {
    blue: 'text-[#3563e9] bg-[#edf2ff]',
    purple: 'text-[#774bc4] bg-[#f3edff]',
    gray: 'text-[#667085] bg-[#eef1f5]',
  }

  return (
    <span className={`inline-block px-[7px] py-[3px] rounded-[5px] font-bold text-[10px] whitespace-nowrap ${styles[color]}`}>
      {children}
    </span>
  )
}

// Green for positive, red for negative. null/undefined shows a dash when `dash` is set.
export function Money({ value, currency, signed = false, muted = false, dash = false }) {
  if (dash && (value === null || value === undefined)) {
    return <span className="text-[#c8d0dd]">—</span>
  }

  const amount = Number(value || 0)
  const color = signed && amount !== 0
    ? amount > 0 ? 'text-[#0f9f6e]' : 'text-[#d92d20]'
    : muted ? 'text-[#667085]' : ''

  return <span className={`tabular-nums font-semibold ${color}`}>{money(amount, currency)}</span>
}

/* ----------------------------- */
/* Flags & callouts              */
/* ----------------------------- */

const FLAG_TONES = {
  warning: 'text-[#b54708] bg-[#fffaeb] border-[#fedf89]',
  danger: 'text-[#b42318] bg-[#fff0ef] border-[#fecdca]',
  info: 'text-[#3563e9] bg-[#f5f8ff] border-[#d6e0ff]',
  success: 'text-[#067647] bg-[#ecfdf3] border-[#abefc6]',
  gray: 'text-[#475467] bg-[#f2f4f7] border-[#e4e7ec]',
}

// Small inline pill next to a value: "Revenue pending", "Closed"
export function Flag({ tone = 'warning', icon, children, title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 px-[6px] py-[2px] rounded-[5px] border text-[10px] font-bold whitespace-nowrap align-middle ${FLAG_TONES[tone]}`}
    >
      {icon && <span aria-hidden>{icon}</span>}
      {children}
    </span>
  )
}

export function ClosedFlag() {
  return <Flag tone="gray" icon="🔒" title="Closed: an admin has to reopen this month to change it">Closed</Flag>
}

// Full-width message: warnings, tips, next steps
export function Callout({ tone = 'warning', icon, title, children, action }) {
  const icons = { warning: '⚠', danger: '⛔', info: 'ℹ', success: '✓', gray: '•' }

  return (
    <div className={`rounded-[10px] border px-4 py-3 text-[13px] flex gap-3 items-start ${FLAG_TONES[tone]}`}>
      <span className="mt-[1px] shrink-0" aria-hidden>{icon || icons[tone]}</span>
      <div className="flex-1 min-w-0 leading-[1.5]">
        {title && <div className="font-bold">{title}</div>}
        {children && <div className={title ? 'opacity-90' : ''}>{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  )
}

/* ----------------------------- */
/* Menus & tabs                  */
/* ----------------------------- */

// "⋯" button with a dropdown, for rare or dangerous actions
//   items: [{ label, onClick, danger, hidden }]
export function Menu({ items, label = 'More actions' }) {
  const [open, setOpen] = useState(false)
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

  const visible = items.filter((item) => !item.hidden)
  if (visible.length === 0) return null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title={label}
        aria-label={label}
        onClick={() => setOpen(!open)}
        className="h-[40px] w-[40px] rounded-lg border border-[#e6eaf0] bg-white text-[#475467] cursor-pointer text-[18px] leading-none hover:border-[#cbd3e1] transition"
      >
        ⋯
      </button>

      {open && (
        <div className="absolute right-0 z-40 top-[calc(100%+6px)] min-w-[200px] bg-white border border-[#e6eaf0] rounded-[10px] shadow-[0_12px_32px_rgba(16,24,40,.14)] p-1">
          {visible.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
              className={`w-full text-left border-0 bg-transparent cursor-pointer rounded-[7px] px-3 py-[9px] text-[13px] font-semibold hover:bg-[#f5f7fa] ${
                item.danger ? 'text-[#d92d20]' : 'text-[#344054]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

//   tabs: [{ id, label, count }]
export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex gap-1 border-b border-[#e6eaf0] overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`border-0 bg-transparent cursor-pointer px-3 pb-[10px] pt-1 text-[13px] font-bold whitespace-nowrap -mb-px border-b-2 transition ${
            value === tab.id
              ? 'text-[#172033] border-[#3563e9]'
              : 'text-[#667085] border-transparent hover:text-[#172033]'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-[6px] px-[6px] py-[1px] rounded-full text-[10px] ${
              value === tab.id ? 'bg-[#edf2ff] text-[#3563e9]' : 'bg-[#f2f4f7] text-[#667085]'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/* ----------------------------- */
/* States                        */
/* ----------------------------- */

export function Empty({ title, text, action }) {
  return (
    <div className="min-h-[160px] grid justify-items-center content-center gap-2 text-center text-[#667085] text-xs py-6">
      <span className="text-lg">◌</span>
      <strong className="text-[#172033]">{title}</strong>
      {text && <p className="max-w-[320px] leading-[1.5] m-0">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

// Grey placeholder blocks in the shape of a page, so the layout does not jump when data arrives
export function Loading({ text = 'Loading…' }) {
  const bar = 'rounded-[8px] bg-[linear-gradient(90deg,#eef1f5_25%,#f6f8fb_50%,#eef1f5_75%)] bg-[length:200%_100%] animate-[shimmer_1.2s_linear_infinite]'

  return (
    <div className="grid grid-cols-1 gap-[15px] py-2" role="status" aria-label={text}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[15px]">
        {[0, 1, 2, 3].map((i) => <div key={i} className={`${bar} h-[84px]`} />)}
      </div>
      <div className={`${bar} h-[44px]`} />
      <div className={`${bar} h-[220px]`} />
      <span className="sr-only">{text}</span>
    </div>
  )
}

export function ErrorBox({ message }) {
  if (!message) return null

  return (
    <div className="rounded-[7px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#d92d20]">
      {message}
    </div>
  )
}

/* ----------------------------- */
/* Modal                         */
/* ----------------------------- */

export function Modal({ title, description, onClose, children, footer, wide = false }) {
  // Keep the page behind from scrolling while the modal is open
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-[rgba(16,24,40,.45)] grid place-items-center p-4 overflow-y-auto"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className={`w-full ${wide ? 'max-w-[760px]' : 'max-w-[520px]'} bg-white rounded-[11px] shadow-xl my-8`}>
        <div className="flex justify-between items-start gap-4 p-[23px] pb-0">
          <div>
            <h3 className="m-0 text-[17px] font-bold">{title}</h3>
            {description && <p className="text-[#667085] text-xs mt-[6px] mb-0">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border-0 bg-transparent text-[#98a2b3] text-xl cursor-pointer leading-none hover:text-[#172033]"
          >
            ×
          </button>
        </div>

        <div className="p-[23px]">{children}</div>

        {footer && (
          <div className="flex justify-end gap-[10px] px-[23px] pb-[23px]">{footer}</div>
        )}
      </div>
    </div>
  )
}
