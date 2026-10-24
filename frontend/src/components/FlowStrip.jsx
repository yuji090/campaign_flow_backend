import { Fragment } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Shows where the current item sits in the money flow, e.g.
 *   [Advertiser: Adsterra] → [Campaign: Stable Money] → [Publisher: MobiPub]
 * The step marked `current` is highlighted; others link to their pages.
 *   steps: [{ caption, label, sub, to, current, tone }]
 */
export default function FlowStrip({ steps }) {
  const navigate = useNavigate()

  return (
    <div className="flex items-stretch gap-2 flex-wrap">
      {steps.map((step, index) => (
        <Fragment key={`${step.caption}-${index}`}>
          {index > 0 && (
            <div className="flex items-center text-[#98a2b3] text-[18px] px-1 select-none">→</div>
          )}

          <Step step={step} onClick={step.to && !step.current ? () => navigate(step.to) : null} />
        </Fragment>
      ))}
    </div>
  )
}

const tones = {
  blue: { dot: 'bg-[#3563e9]', ring: 'border-[#3563e9] bg-[#f5f8ff] shadow-[0_0_0_4px_#edf2ff]' },
  purple: { dot: 'bg-[#774bc4]', ring: 'border-[#774bc4] bg-[#faf7ff] shadow-[0_0_0_4px_#f3edff]' },
  green: { dot: 'bg-[#0f9f6e]', ring: 'border-[#0f9f6e] bg-[#f3fbf7] shadow-[0_0_0_4px_#e7f8ef]' },
}

function Step({ step, onClick }) {
  const tone = tones[step.tone] || tones.blue

  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick || undefined}
      className={`text-left min-w-[170px] max-w-[300px] rounded-[10px] border px-[14px] py-[10px] transition ${
        step.current
          ? tone.ring
          : `border-[#e6eaf0] bg-white ${onClick ? 'cursor-pointer hover:border-[#adc0ff] hover:shadow-[0_2px_8px_rgba(53,99,233,.1)]' : ''}`
      }`}
    >
      <div className="flex items-center gap-[6px] text-[10px] font-extrabold tracking-[.6px] uppercase text-[#98a2b3]">
        <span className={`w-[6px] h-[6px] rounded-full ${step.current ? tone.dot : 'bg-[#c8d0dd]'}`} />
        {step.caption}
        {step.current && <span className="text-[#3563e9] normal-case tracking-normal font-bold">· you are here</span>}
      </div>

      <div className={`mt-1 text-[14px] font-bold truncate ${onClick ? 'text-[#3563e9]' : 'text-[#172033]'}`}>
        {step.label}
      </div>

      {step.sub && <div className="text-[11px] text-[#667085] mt-[2px] truncate">{step.sub}</div>}
    </Tag>
  )
}
