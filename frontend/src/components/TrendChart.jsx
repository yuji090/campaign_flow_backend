import { useEffect, useRef, useState } from 'react'
import { money, monthLabel } from '../lib/format'

// Validated categorical slots 1-3 (dataviz reference palette, light mode).
// Aqua sits below 3:1 on white, so the chart always offers a table view.
const COLORS = {
  revenue: '#2a78d6',
  cost: '#eb6834',
  profit: '#1baf7a',
}

const SERIES = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'cost', label: 'Cost' },
  { key: 'profit', label: 'Profit' },
]

const HEIGHT = 240
const PAD = { top: 16, right: 16, bottom: 30, left: 56 }

/**
 * Revenue and cost as grouped bars, profit as a line, all on one money axis.
 *   rows: [{ month: '2026-10', revenue, cost, profit }] oldest first
 */
export default function TrendChart({ rows, currency }) {
  const [view, setView] = useState('chart')

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Legend />
        <div className="inline-flex p-[3px] rounded-[8px] bg-[#eef1f5]">
          {['chart', 'table'].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={`border-0 cursor-pointer rounded-[6px] px-[10px] h-[26px] text-[11px] font-bold capitalize ${
                view === mode ? 'bg-white text-[#172033] shadow-[0_1px_3px_rgba(16,24,40,.12)]' : 'bg-transparent text-[#667085]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {view === 'chart' ? <Chart rows={rows} currency={currency} /> : <TableView rows={rows} currency={currency} />}
    </div>
  )
}

function Legend() {
  return (
    <div className="flex items-center gap-4 text-[11px] text-[#475467] font-semibold">
      {SERIES.map((series) => (
        <span key={series.key} className="flex items-center gap-[6px]">
          {series.key === 'profit' ? (
            <span className="relative w-4 h-[2px] rounded-full" style={{ background: COLORS.profit }}>
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[6px] h-[6px] rounded-full" style={{ background: COLORS.profit }} />
            </span>
          ) : (
            <span className="w-[10px] h-[10px] rounded-[3px]" style={{ background: COLORS[series.key] }} />
          )}
          {series.label}
        </span>
      ))}
    </div>
  )
}

function Chart({ rows, currency }) {
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(640)
  const [hover, setHover] = useState(null)

  // Draw at the real pixel width so text stays crisp
  useEffect(() => {
    const element = wrapRef.current
    if (!element) return

    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(320, entry.contentRect.width)))
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  const values = rows.flatMap((r) => [r.revenue, r.cost, r.profit])
  const { min, max, ticks } = niceScale(Math.min(0, ...values), Math.max(0, ...values))

  const plotWidth = width - PAD.left - PAD.right
  const plotHeight = HEIGHT - PAD.top - PAD.bottom
  const y = (value) => PAD.top + ((max - value) / (max - min || 1)) * plotHeight
  const band = plotWidth / rows.length
  const barWidth = Math.min(22, (band - 24) / 2)
  const centerX = (index) => PAD.left + band * index + band / 2

  const profitPoints = rows.map((r, i) => [centerX(i), y(r.profit)])
  const last = rows.length - 1

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg width={width} height={HEIGHT} role="img" aria-label="Revenue, cost and profit for the last six months">
        {/* Grid and y axis */}
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke={tick === 0 ? '#c8d0dd' : '#eef1f5'}
              strokeWidth="1"
            />
            <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" fontSize="10" fill="#98a2b3">
              {compactMoney(tick, currency)}
            </text>
          </g>
        ))}

        {rows.map((row, i) => (
          <g key={row.month}>
            {/* Hover column */}
            {hover === i && (
              <rect x={PAD.left + band * i + 4} y={PAD.top} width={band - 8} height={plotHeight} rx="6" fill="#f5f8ff" />
            )}

            {/* Revenue and cost bars, 2px gap between them, rounded data end */}
            <Bar x={centerX(i) - barWidth - 1} width={barWidth} top={y(row.revenue)} base={y(0)} color={COLORS.revenue} />
            <Bar x={centerX(i) + 1} width={barWidth} top={y(row.cost)} base={y(0)} color={COLORS.cost} />

            <text x={centerX(i)} y={HEIGHT - 10} textAnchor="middle" fontSize="11" fill={hover === i ? '#172033' : '#667085'} fontWeight={hover === i ? 700 : 500}>
              {monthLabel(row.month).split(' ')[0]}
            </text>
          </g>
        ))}

        {/* Profit line */}
        <polyline
          points={profitPoints.map((p) => p.join(',')).join(' ')}
          fill="none"
          stroke={COLORS.profit}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {profitPoints.map(([px, py], i) => (
          <circle key={rows[i].month} cx={px} cy={py} r={hover === i ? 5 : 4} fill={COLORS.profit} stroke="#fff" strokeWidth="2" />
        ))}

        {/* One direct label: the latest profit, haloed so it stays readable over the bars */}
        <text
          x={profitPoints[last][0] - 9}
          y={profitPoints[last][1]}
          dy="0.32em"
          textAnchor="end"
          fontSize="11"
          fontWeight="700"
          fill="#172033"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          {compactMoney(rows[last].profit, currency)}
        </text>

        {/* Hit targets: the whole month column */}
        {rows.map((row, i) => (
          <rect
            key={`hit-${row.month}`}
            x={PAD.left + band * i}
            y={PAD.top}
            width={band}
            height={plotHeight + PAD.bottom}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>

      {hover !== null && (
        <Tooltip
          row={rows[hover]}
          currency={currency}
          left={Math.min(Math.max(centerX(hover), 90), width - 90)}
        />
      )}
    </div>
  )
}

// Bar with a 4px rounded top, square at the baseline
function Bar({ x, width, top, base, color }) {
  const height = Math.max(0, base - top)
  if (height === 0 || width <= 0) return null

  const r = Math.min(4, height, width / 2)

  return (
    <path
      d={`M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + width - r} Q${x + width},${top} ${x + width},${top + r} V${base} Z`}
      fill={color}
    />
  )
}

function Tooltip({ row, currency, left }) {
  return (
    <div
      className="pointer-events-none absolute top-2 -translate-x-1/2 bg-white border border-[#e6eaf0] rounded-[9px] shadow-[0_8px_24px_rgba(16,24,40,.12)] px-3 py-[10px] min-w-[170px]"
      style={{ left }}
    >
      <div className="text-[11px] font-bold text-[#172033] mb-[6px]">{monthLabel(row.month)}</div>
      {SERIES.map((series) => (
        <div key={series.key} className="flex items-center justify-between gap-4 text-[12px] leading-[1.7]">
          <span className="flex items-center gap-[6px] text-[#667085]">
            <span className="w-2 h-2 rounded-[2px]" style={{ background: COLORS[series.key] }} />
            {series.label}
          </span>
          <span className="tabular-nums font-semibold text-[#172033]">{money(row[series.key], currency)}</span>
        </div>
      ))}
    </div>
  )
}

function TableView({ rows, currency }) {
  return (
    <table className="w-full border-collapse text-[12px]">
      <thead>
        <tr className="text-[10px] uppercase tracking-[.6px] text-[#667085]">
          <th className="text-left py-2 border-b border-[#e6eaf0]">Month</th>
          {SERIES.map((s) => <th key={s.key} className="text-right py-2 border-b border-[#e6eaf0]">{s.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {[...rows].reverse().map((row) => (
          <tr key={row.month}>
            <td className="py-2 border-b border-[#eef1f5] font-semibold">{monthLabel(row.month)}</td>
            {SERIES.map((s) => (
              <td key={s.key} className="py-2 border-b border-[#eef1f5] text-right tabular-nums">{money(row[s.key], currency)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Round axis bounds to 1/2/2.5/5 x 10^n steps
function niceScale(minValue, maxValue, tickCount = 4) {
  if (minValue === maxValue) {
    return { min: 0, max: maxValue || 1, ticks: [0, maxValue || 1] }
  }

  const rawStep = (maxValue - minValue) / tickCount
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep)

  const min = Math.floor(minValue / step) * step
  const max = Math.ceil(maxValue / step) * step
  const ticks = []

  for (let value = min; value <= max + step / 2; value += step) {
    ticks.push(Math.round(value * 100) / 100)
  }

  return { min, max, ticks }
}

// 12500 -> $12.5k
function compactMoney(value, currency) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  } catch {
    return String(Math.round(value))
  }
}
