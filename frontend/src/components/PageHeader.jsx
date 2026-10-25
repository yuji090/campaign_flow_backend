import { Fragment } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Top of every page: back button + breadcrumbs, then the title with badges and actions.
 *   crumbs:  [{ label: 'Campaigns', to: '/campaigns' }, { label: 'Stable Money' }]
 *   back:    where the back button goes when there is no browser history
 *   meta:    key facts shown in one line under the title: [{ label: 'Payout', value: '$1.50' }]
 */
export default function PageHeader({ eyebrow, crumbs = [], back, title, badges, subtitle, meta, actions }) {
  const navigate = useNavigate()

  const goBack = () => {
    // React Router stores its position in history.state.idx; 0 means this is the first page
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate(back || '/dashboard')
  }

  return (
    <header className="pt-[22px] lg:pt-[26px] pb-[20px] mb-[22px] border-b border-[#e6eaf0]">
      {(back || crumbs.length > 0) && (
        <div className="flex items-center gap-3 mb-[14px] min-w-0">
          {back && (
            <button
              type="button"
              onClick={goBack}
              title="Back"
              className="shrink-0 h-8 pl-[9px] pr-3 rounded-full border border-[#e6eaf0] bg-white text-[#475467] cursor-pointer text-[12px] font-bold flex items-center gap-[6px] hover:border-[#adc0ff] hover:text-[#3563e9] hover:shadow-[0_2px_8px_rgba(53,99,233,.12)] transition"
            >
              <span className="text-[14px] leading-none">←</span>
              Back
            </button>
          )}

          <nav className="flex items-center gap-[6px] text-[12px] min-w-0 overflow-hidden">
            {crumbs.map((crumb, index) => {
              const last = index === crumbs.length - 1

              return (
                <Fragment key={`${crumb.label}-${index}`}>
                  {index > 0 && <span className="text-[#c8d0dd]">›</span>}
                  {crumb.to && !last ? (
                    <button
                      type="button"
                      onClick={() => navigate(crumb.to)}
                      className="border-0 bg-transparent p-0 cursor-pointer text-[#667085] font-semibold hover:text-[#3563e9] truncate max-w-[220px]"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className={`truncate max-w-[260px] ${last ? 'text-[#172033] font-bold' : 'text-[#667085]'}`}>
                      {crumb.label}
                    </span>
                  )}
                </Fragment>
              )
            })}
          </nav>
        </div>
      )}

      <div className="flex justify-between items-start gap-x-5 gap-y-3 flex-wrap">
        <div className="min-w-0 flex-1 basis-[320px]">
          {eyebrow && (
            <div className="text-[#3563e9] font-extrabold text-[10px] tracking-[1.1px] mb-[6px]">{eyebrow}</div>
          )}

          <div className="flex items-center gap-[10px] flex-wrap">
            <h1 className="m-0 tracking-[-.6px] text-[22px] sm:text-[26px] leading-tight font-extrabold break-words">{title}</h1>
            {badges}
          </div>

          {subtitle && <div className="mt-[6px] text-[#667085] text-[13px]">{subtitle}</div>}
        </div>

        {actions && <div className="flex gap-[10px] items-center flex-wrap sm:mt-[14px]">{actions}</div>}
      </div>

      {/* Key facts get the full width, so long values never push the actions down */}
      {meta && meta.length > 0 && (
        <dl className="m-0 mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[12px]">
          {meta.filter(Boolean).map((item) => (
            <div key={item.label} className="flex items-baseline gap-[6px] min-w-0">
              <dt className="text-[#98a2b3] font-semibold">{item.label}</dt>
              <dd className="m-0 text-[#344054] font-semibold truncate max-w-[280px]">{item.value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      )}
    </header>
  )
}
