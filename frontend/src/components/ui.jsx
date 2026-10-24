import { useEffect } from 'react'
import { money } from '../lib/format'

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
    <label className={`grid gap-[7px] min-w-0 content-start ${full ? 'col-span-full' : ''}`}>
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

export function Toggle({ checked, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border rounded-[7px] px-[10px] py-2 cursor-pointer text-xs flex gap-[7px] items-center transition ${
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
    <section className={`bg-white border border-[#e6eaf0] rounded-[11px] p-[23px] min-w-0 ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div>
            {eyebrow && (
              <div className="text-[#3563e9] font-extrabold text-[10px] tracking-[1.1px] mb-[6px]">
                {eyebrow}
              </div>
            )}
            {title && <h3 className="m-0 text-[15px]">{title}</h3>}
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

export function Metric({ icon, label, value, note, type = 'blue' }) {
  const styles = {
    blue: 'text-[#3563e9] bg-[#3563e9]/10',
    green: 'text-[#0f9f6e] bg-[#0f9f6e]/10',
    purple: 'text-[#774bc4] bg-[#774bc4]/10',
    amber: 'text-[#dc6803] bg-[#dc6803]/10',
    red: 'text-[#d92d20] bg-[#d92d20]/10',
  }

  return (
    <div className="bg-white border border-[#e6eaf0] rounded-[11px] p-[19px] flex gap-[14px] items-center min-w-0">
      <span className={`w-10 h-10 shrink-0 rounded-[9px] grid place-items-center text-xl font-extrabold ${styles[type]}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <strong className="block text-[22px] leading-none truncate">{value}</strong>
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
    <div className="overflow-x-auto -mx-[23px] px-[23px]">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.label}
                className={`text-[#667085] text-[10px] font-extrabold tracking-[.6px] uppercase py-[10px] px-3 border-b border-[#e6eaf0] whitespace-nowrap ${
                  column.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {column.label}
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

// Green for positive, red for negative
export function Money({ value, currency, signed = false }) {
  const amount = Number(value || 0)
  const color = !signed || amount === 0 ? '' : amount > 0 ? 'text-[#0f9f6e]' : 'text-[#d92d20]'

  return <span className={`tabular-nums font-semibold ${color}`}>{money(amount, currency)}</span>
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

export function Loading({ text = 'Loading…' }) {
  return <div className="text-[#667085] text-xs py-10 text-center">{text}</div>
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
            <h3 className="m-0 text-[17px]">{title}</h3>
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
