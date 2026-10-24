import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import useLoad from '../lib/useLoad'
import { getUser } from '../lib/auth'
import { currentMonth, money, monthLabel, percent } from '../lib/format'
import { addMonths } from '../lib/period'
import PageHeader from '../components/PageHeader'
import { MonthPicker } from '../components/PeriodPicker'
import TrendChart from '../components/TrendChart'
import { Card, Empty, ErrorBox, LinkButton, Loading, Money, PrimaryButton, Row, Table, Td } from '../components/ui'

const TREND_MONTHS = 6

export default function Dashboard() {
  const navigate = useNavigate()
  const [month, setMonth] = useState(currentMonth())
  const prevMonth = addMonths(month, -1)

  const { data: lists, error: listsError } = useLoad(async () => {
    const [campaigns, partners, distributions] = await Promise.all([
      api.get('/api/campaigns'),
      api.get('/api/partners'),
      api.get('/api/distributions'),
    ])
    return { campaigns, partners, distributions }
  })

  const { data: money6, loading, error } = useLoad(async () => {
    const [current, previous, trend] = await Promise.all([
      api.get(`/api/finance/summary?from=${month}&to=${month}`),
      api.get(`/api/finance/summary?from=${prevMonth}&to=${prevMonth}`),
      api.get(`/api/finance/summary?from=${addMonths(month, -(TREND_MONTHS - 1))}&to=${month}`),
    ])
    return { current, previous, trend }
  }, [month])

  const firstName = getUser()?.name?.split(' ')[0]
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  const header = (
    <PageHeader
      eyebrow="CAMPAIGN OPERATIONS"
      title="Overview"
      subtitle={`${firstName ? `Hi ${firstName} · ` : ''}${today}`}
      actions={
        <>
          <MonthPicker value={month} onChange={setMonth} />
          <PrimaryButton onClick={() => navigate('/campaigns/new')}>+ New campaign</PrimaryButton>
        </>
      }
    />
  )

  if ((loading && !money6) || !lists) {
    return <>{header}<ErrorBox message={error || listsError} />{!(error || listsError) && <Loading />}</>
  }

  const { campaigns, partners, distributions } = lists
  const { current, previous, trend } = money6

  // Empty app: guide the first steps instead of showing zeros
  if (campaigns.length === 0) {
    return <>{header}<GettingStarted partners={partners} navigate={navigate} /></>
  }

  const currency = mainCurrency(trend)
  const totals = current.totals.find((t) => t.currency === currency) || zeroTotals(currency)
  const prevTotals = previous.totals.find((t) => t.currency === currency) || zeroTotals(currency)
  const otherCurrencies = current.totals.filter((t) => t.currency !== currency)

  return (
    <>
      {header}

      <div className={`grid gap-[21px] transition-opacity ${loading ? 'opacity-60' : ''}`}>

        {/* KPIs vs previous month */}
        <section className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[15px]">
          <Kpi label="Revenue" value={money(totals.revenue, currency)} change={pctChange(totals.revenue, prevTotals.revenue)} goodWhenUp prevMonth={prevMonth} />
          <Kpi label="Cost" value={money(totals.cost, currency)} change={pctChange(totals.cost, prevTotals.cost)} prevMonth={prevMonth} />
          <Kpi
            label="Net profit"
            value={money(totals.profit, currency)}
            valueClass={Number(totals.profit) < 0 ? 'text-[#d92d20]' : ''}
            change={absChange(totals.profit, prevTotals.profit, currency)}
            goodWhenUp
            prevMonth={prevMonth}
          />
          <Kpi label="Margin" value={percent(totals.marginPct)} change={ppChange(totals.marginPct, prevTotals.marginPct)} goodWhenUp prevMonth={prevMonth} />
        </section>

        {otherCurrencies.length > 0 && (
          <div className="text-[12px] text-[#667085] -mt-2">
            Also this month:{' '}
            {otherCurrencies.map((t) => `${money(t.revenue, t.currency)} revenue / ${money(t.profit, t.currency)} profit`).join(' · ')}
          </div>
        )}

        {/* Trend + attention */}
        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] gap-[21px] items-start">
          <Card eyebrow={`LAST ${TREND_MONTHS} MONTHS · ${currency}`} title="Revenue, cost & profit">
            <TrendChart rows={trendRows(trend, month, currency)} currency={currency} />
          </Card>

          <Attention
            items={attentionItems({ current, previous, month, prevMonth, campaigns, distributions })}
            navigate={navigate}
          />
        </section>

        {/* Top campaigns + partner balances */}
        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(300px,2fr)] gap-[21px] items-start">
          <Card
            eyebrow={monthLabel(month).toUpperCase()}
            title="Top campaigns"
            actions={<LinkButton onClick={() => navigate('/finance')}>All in finance →</LinkButton>}
          >
            {current.campaigns.length === 0 ? (
              <Empty title={`Nothing entered for ${monthLabel(month)}`} />
            ) : (
              <Table
                columns={[
                  { label: 'Campaign' },
                  { label: 'Revenue', align: 'right' },
                  { label: 'Cost', align: 'right' },
                  { label: 'Profit', align: 'right' },
                ]}
              >
                {[...current.campaigns]
                  .sort((a, b) => Number(b.profit) - Number(a.profit))
                  .slice(0, 5)
                  .map((c) => (
                    <Row key={c.campaignId} onClick={() => navigate(`/campaigns/${c.campaignId}`)}>
                      <Td>
                        <strong>{c.campaignName}</strong>
                        <div className="text-[#98a2b3] text-[11px]">{c.direct ? 'Direct' : c.advertiserName}</div>
                      </Td>
                      <Td align="right">
                        {Number(c.revenue) > 0
                          ? <Money value={c.revenue} currency={c.currency} />
                          : <span className="text-[#dc6803] text-xs font-bold">Not entered</span>}
                      </Td>
                      <Td align="right"><Money value={c.cost} currency={c.currency} /></Td>
                      <Td align="right"><Money value={c.profit} currency={c.currency} signed /></Td>
                    </Row>
                  ))}
              </Table>
            )}
          </Card>

          <Card eyebrow={monthLabel(month).toUpperCase()} title="Partner balances">
            {current.partners.length === 0 ? (
              <Empty title="No partner money this month" />
            ) : (
              <div className="grid">
                {current.partners.slice(0, 6).map((p) => {
                  const net = Number(p.net)

                  return (
                    <button
                      type="button"
                      key={`${p.partnerId}-${p.currency}`}
                      onClick={() => navigate(`/partners/${p.partnerId}`)}
                      className="flex items-center justify-between gap-3 py-[11px] border-0 border-b border-[#eef1f5] bg-transparent cursor-pointer text-left hover:bg-[#f8faff] -mx-2 px-2 rounded-[6px]"
                    >
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold truncate">{p.partnerName}</div>
                        <div className="text-[11px] text-[#98a2b3]">
                          {Number(p.receivable) > 0 && `Receive ${money(p.receivable, p.currency)}`}
                          {Number(p.receivable) > 0 && Number(p.payable) > 0 && ' · '}
                          {Number(p.payable) > 0 && `Pay ${money(p.payable, p.currency)}`}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-[13px] font-bold tabular-nums ${net >= 0 ? 'text-[#0f9f6e]' : 'text-[#d92d20]'}`}>
                          {money(Math.abs(net), p.currency)}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-[.4px] text-[#98a2b3]">
                          {net >= 0 ? 'owes us' : 'we owe'}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </Card>
        </section>

        {/* Counts strip */}
        <section className="flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-[#667085] px-1">
          <CountLink label="campaigns" value={campaigns.length} extra={`${campaigns.filter((c) => c.status === 'LIVE').length} live`} onClick={() => navigate('/campaigns')} />
          <CountLink label="active partners" value={partners.filter((p) => p.active).length} onClick={() => navigate('/partners')} />
          <CountLink label="active distributions" value={distributions.filter((d) => d.status === 'ACTIVE').length} extra={`${distributions.length} total`} onClick={() => navigate('/campaigns')} />
        </section>
      </div>
    </>
  )
}

/* ----------------------------- */
/* KPI card                      */
/* ----------------------------- */

function Kpi({ label, value, valueClass = '', change, goodWhenUp = false, prevMonth }) {
  // Up is green only where up is good (revenue, profit, margin); cost changes stay neutral
  const tone = !change || change.direction === 0
    ? 'text-[#98a2b3]'
    : !goodWhenUp
      ? 'text-[#667085]'
      : change.direction > 0 ? 'text-[#0f9f6e]' : 'text-[#d92d20]'

  return (
    <div className="bg-white border border-[#e6eaf0] rounded-[11px] p-[19px] min-w-0">
      <div className="text-[#667085] text-[11px] font-bold uppercase tracking-[.6px]">{label}</div>
      <div className={`mt-2 text-[26px] font-extrabold tracking-[-.5px] leading-none tabular-nums truncate ${valueClass}`}>
        {value}
      </div>
      <div className={`mt-[10px] text-[11px] font-semibold ${tone}`}>
        {change ? (
          <>
            {change.direction > 0 ? '▲' : change.direction < 0 ? '▼' : '•'} {change.text}
            <span className="text-[#98a2b3] font-medium"> vs {monthLabel(prevMonth).split(' ')[0]}</span>
          </>
        ) : (
          <span>No data for {monthLabel(prevMonth)}</span>
        )}
      </div>
    </div>
  )
}

/* ----------------------------- */
/* Needs attention               */
/* ----------------------------- */

function Attention({ items, navigate }) {
  const visible = items.slice(0, 6)

  return (
    <Card eyebrow="TO DO" title="Needs attention">
      {items.length === 0 ? (
        <div className="flex items-center gap-3 py-6 justify-center text-[13px] text-[#0f9f6e] font-semibold">
          <span className="w-7 h-7 rounded-full bg-[#e7f8ef] grid place-items-center">✓</span>
          All clear, nothing pending
        </div>
      ) : (
        <div className="grid gap-[2px]">
          {visible.map((item) => (
            <button
              type="button"
              key={item.key}
              onClick={() => navigate(item.to)}
              className="flex items-start gap-[10px] text-left border-0 bg-transparent cursor-pointer rounded-[8px] px-2 py-[9px] -mx-2 hover:bg-[#f8faff]"
            >
              <span className={`mt-[1px] w-[22px] h-[22px] shrink-0 rounded-full grid place-items-center text-[11px] font-extrabold ${item.tone}`}>
                {item.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-[#172033]">{item.title}</span>
                <span className="block text-[11px] text-[#667085] truncate">{item.detail}</span>
              </span>
              <span className="text-[#3563e9] text-[11px] font-bold whitespace-nowrap mt-[3px]">{item.action} →</span>
            </button>
          ))}
          {items.length > visible.length && (
            <div className="text-[11px] text-[#98a2b3] px-2 pt-2">+{items.length - visible.length} more</div>
          )}
        </div>
      )}
    </Card>
  )
}

const TONES = {
  warning: 'text-[#b54708] bg-[#fffaeb]',
  critical: 'text-[#d92d20] bg-[#fff0ef]',
  info: 'text-[#3563e9] bg-[#edf2ff]',
}

function attentionItems({ current, previous, month, prevMonth, campaigns, distributions }) {
  const items = []

  // Payout entered but revenue missing: profit is understated
  for (const [summary, m] of [[current, month], [previous, prevMonth]]) {
    for (const c of summary.campaigns) {
      if (Number(c.cost) > 0 && Number(c.revenue) === 0) {
        items.push({
          key: `missing-${m}-${c.campaignId}`,
          icon: '!',
          tone: TONES.warning,
          title: `${monthLabel(m)} revenue missing`,
          detail: `${c.campaignName} has ${money(c.cost, c.currency)} payout but no revenue`,
          action: 'Enter',
          to: `/campaigns/${c.campaignId}`,
        })
      }
    }
  }

  // Losing money this month (revenue entered, still negative)
  for (const c of current.campaigns) {
    if (Number(c.revenue) > 0 && Number(c.profit) < 0) {
      items.push({
        key: `loss-${c.campaignId}`,
        icon: '▼',
        tone: TONES.critical,
        title: `Losing money in ${monthLabel(month)}`,
        detail: `${c.campaignName}: ${money(c.profit, c.currency)}`,
        action: 'Open',
        to: `/campaigns/${c.campaignId}`,
      })
    }
  }

  const activeByCampaign = {}
  const countByCampaign = {}

  for (const d of distributions) {
    countByCampaign[d.campaignId] = (countByCampaign[d.campaignId] || 0) + 1
    if (d.status === 'ACTIVE') activeByCampaign[d.campaignId] = (activeByCampaign[d.campaignId] || 0) + 1
  }

  for (const c of campaigns) {
    // Closed campaign still being run by publishers
    if (['PAUSED', 'EXPIRED', 'ARCHIVED'].includes(c.status) && activeByCampaign[c.id]) {
      items.push({
        key: `closed-${c.id}`,
        icon: '⏸',
        tone: TONES.warning,
        title: `${c.status.toLowerCase()} but still distributed`,
        detail: `${c.name} has ${activeByCampaign[c.id]} active distribution${activeByCampaign[c.id] === 1 ? '' : 's'}`,
        action: 'Fix',
        to: `/campaigns/${c.id}`,
      })
    }

    // Live but nobody is running it
    if (c.status === 'LIVE' && !countByCampaign[c.id]) {
      items.push({
        key: `undistributed-${c.id}`,
        icon: '→',
        tone: TONES.info,
        title: 'Live but not distributed',
        detail: c.name,
        action: 'Distribute',
        to: `/campaigns/${c.id}`,
      })
    }
  }

  return items
}

/* ----------------------------- */
/* Small pieces                  */
/* ----------------------------- */

function CountLink({ label, value, extra, onClick }) {
  return (
    <button type="button" onClick={onClick} className="border-0 bg-transparent p-0 cursor-pointer text-[#667085] hover:text-[#3563e9]">
      <b className="text-[#172033]">{value}</b> {label}
      {extra && <span className="text-[#98a2b3]"> · {extra}</span>}
    </button>
  )
}

function GettingStarted({ partners, navigate }) {
  const steps = [
    { done: partners.length > 0, title: 'Add partners', text: 'Advertisers give us campaigns, publishers run them. One company can be both.', to: '/partners' },
    { done: false, title: 'Create a campaign', text: 'Pick the advertiser (or mark it direct), pricing model and payout.', to: '/campaigns/new' },
    { done: false, title: 'Distribute it', text: 'Open the campaign and give it to one or more publishers.' },
    { done: false, title: 'Enter monthly numbers', text: 'Revenue on the campaign, events and payout on each distribution.' },
  ]

  return (
    <Card eyebrow="GETTING STARTED" title="How the money flows" className="max-w-[640px]">
      <div className="grid gap-[17px]">
        {steps.map((step, index) => (
          <div
            key={step.title}
            onClick={step.to ? () => navigate(step.to) : undefined}
            className={`flex gap-[10px] ${step.to ? 'cursor-pointer' : ''}`}
          >
            <span className={`w-6 h-6 shrink-0 grid place-items-center rounded-full font-extrabold text-[10px] ${
              step.done ? 'text-[#0f9f6e] bg-[#e7f8ef]' : 'text-[#667085] bg-[#eef1f5]'
            }`}>
              {step.done ? '✓' : `0${index + 1}`}
            </span>
            <div>
              <strong className="text-[13px]">{step.title}</strong>
              <p className="text-[#667085] text-[11px] leading-[1.5] mt-1 mb-0">{step.text}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ----------------------------- */
/* Calculations                  */
/* ----------------------------- */

// The currency with the most revenue in the trend window (USD when there is no data)
function mainCurrency(trend) {
  const top = [...trend.totals].sort((a, b) => Number(b.revenue) - Number(a.revenue))[0]
  return top?.currency || 'USD'
}

// Six consecutive months for the chart, zero-filled where nothing was entered
function trendRows(trend, month, currency) {
  const byMonth = Object.fromEntries(
    trend.months.filter((m) => m.currency === currency).map((m) => [m.month, m])
  )

  return Array.from({ length: TREND_MONTHS }, (_, i) => {
    const key = addMonths(month, i - (TREND_MONTHS - 1))
    const row = byMonth[key]
    return {
      month: key,
      revenue: Number(row?.revenue || 0),
      cost: Number(row?.cost || 0),
      profit: Number(row?.profit || 0),
    }
  })
}

function zeroTotals(currency) {
  return { currency, revenue: 0, cost: 0, profit: 0, marginPct: null }
}

function pctChange(now, before) {
  const a = Number(now)
  const b = Number(before)

  if (b === 0) return a === 0 ? null : { direction: 1, text: 'new' }

  const change = ((a - b) / Math.abs(b)) * 100
  return { direction: Math.sign(Math.round(change)), text: `${Math.abs(change).toFixed(0)}%` }
}

function absChange(now, before, currency) {
  const diff = Number(now) - Number(before)
  if (Number(now) === 0 && Number(before) === 0) return null
  return { direction: Math.sign(diff), text: money(Math.abs(diff), currency) }
}

function ppChange(now, before) {
  if (now === null || now === undefined || before === null || before === undefined) return null
  const diff = Number(now) - Number(before)
  return { direction: Math.sign(Math.round(diff * 10)), text: `${Math.abs(diff).toFixed(1)} pts` }
}
