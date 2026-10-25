import { useState } from 'react'

// Small (?) that explains a term on hover, focus or tap
export default function InfoTip({ text }) {
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-block align-middle normal-case tracking-normal font-normal">
      <button
        type="button"
        aria-label={text}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(!open)
        }}
        className="w-[14px] h-[14px] rounded-full border border-[#c8d0dd] bg-white text-[#98a2b3] text-[9px] font-bold leading-none cursor-help grid place-items-center hover:border-[#3563e9] hover:text-[#3563e9] p-0"
      >
        ?
      </button>

      {open && (
        <span
          role="tooltip"
          className="absolute z-50 top-[calc(100%+6px)] left-1/2 -translate-x-1/2 w-[230px] rounded-[8px] bg-[#101828] text-white text-[11px] leading-[1.45] font-medium px-3 py-2 shadow-[0_8px_24px_rgba(16,24,40,.24)] text-left whitespace-normal"
        >
          {text}
        </span>
      )}
    </span>
  )
}
