import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../services/api'
import useLoad from '../lib/useLoad'
import { isAdmin } from '../lib/auth'
import { money, monthLabel, percent } from '../lib/format'
import { makePeriod, periodLabel, periodQuery } from '../lib/period'
import { toast } from '../lib/toast'
import PageHeader from '../components/PageHeader'
import PeriodPicker from '../components/PeriodPicker'
import useConfirm from '../components/useConfirm'
import {
  Callout, Card, ClosedFlag, Empty, ErrorBox, Flag, LinkButton, Loading, Metric, Money, Row,
  SecondaryButton, Status, Table, Tag, Td,
} from '../components/ui'

export default function Finance() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [confirm, confirmDialog] = useConfirm()

  // /finance?month=2026-09 opens that month (links from Month close)
  const [period, setPeriod] = useState(() =>
    params.get('month') ? makePeriod('month', { month: params.get('month') }) : makePeriod('month')
  )
  const query = periodQuery(period)

  const { data: summary, loading, error, reload } = useLoad(() => api.get(`/api/finance/summary${query}`), [query])
  const [actionError, setActionError] = useState('')

  const label = periodLabel(period)
  const singleMonth = period.mode === 'month'
  const monthRow = singleMonth ? summary?.months.find((m) => m.month === period.month) : null
  const multiCurrency = (summary?.totals.length || 0) > 1

  const toggleClose = async () => {
    const closing = !monthRow?.closed

    const ok = await confirm({
      title: `${closing ? 'Close' : 'Reopen'} ${monthLabel(period.month)}?`,
      message: closing
        ? 'Revenue, payouts and rates for this month will be locked until an admin reopens it.'
        : 'Its numbers become editable again. The reopen is recorded in the history.',
      confirmLabel: closing ? 'Close month' : 'Reopen',
    })
    if (!ok) return

    try {
      if (closing) await api.put(`/api/periods/${period.month}/close`, {})
      else await api.delete(`/api/periods/${period.month}/close`)
      toast(`${monthLabel(period.month)} ${closing ? 'closed' : 'reopened'}`)
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const outstanding = (summary?.partners || []).filter(
    (p) => Number(p.outstandingReceivable) !== 0 || Number(p.outstandingPayable) !== 0
  )

  return (
    <>
      <PageHeader
        eyebrow="THE DIGITAL SOLE"
        title="Finance"
        badges={monthRow?.closed && <ClosedFlag />}
        subtitle="Revenue from advertisers, cost of publishers, and what the company keeps."
        actions={
          <>
            <PeriodPicker value={period} onChange={setPeriod} />
            {singleMonth && isAdmin() && monthRow && (
              <SecondaryButton onClick={toggleClose}>{monthRow.closed ? 'Reopen month' : 'Close month'}</SecondaryButton>
            )}
          </>
        }
      />

      <ErrorBox message={error || actionError} />

      {loading && !summary ? (
        <Loading />
      ) : summary && (
        <div className={`grid grid-cols-1 gap-[21px] transition-opacity ${loading ? 'opacity-60' : ''}`}>

          <div className="text-[#3563e9] font-extrabold text-[10px] tracking-[1.1px]">
            {label.toUpperCase()}
          </div>

          {summary.totals.length === 0 ? (
            <Card>
              <Empty
                title={`No money recorded · ${label}`}
                text="Enter revenue on campaigns and payouts on distributions, and the company totals show up here."
              />
            </Card>
          ) : (
            <>
              {/* All currencies added up in the base currency */}
              {multiCurrency && summary.converted && (
                <section className="rounded-[11px] border border-[#d6e0ff] bg-[#f5f8ff] p-[19px] grid gap-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-[11px] font-extrabold tracking-[.8px] text-[#3563e9]">ALL CURRENCIES IN {summary.converted.currency}</div>
                    {summary.converted.missingRates.length > 0 && (
                      <LinkButton onClick={() => navigate('/periods')}>
                        ⚠ Missing rates: {summary.converted.missingRates.join(', ')} →
                      </LinkButton>
                    )}
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <BigNumber label="Revenue" value={money(summary.converted.revenue, summary.converted.currency)} />
                    <BigNumber label="Cost" value={money(summary.converted.cost, summary.converted.currency)} />
                    <BigNumber label="Net profit" value={money(summary.converted.profit, summary.converted.currency)} negative={Number(summary.converted.profit) < 0} />
                    <BigNumber label="Margin" value={percent(summary.converted.marginPct)} />
                  </div>
                </section>
              )}

              {/* Totals per currency */}
              {summary.totals.map((t) => (
                <div key={t.currency} className="grid grid-cols-1 gap-[10px]">
                  <section className="grid grid-cols-2 lg:grid-cols-4 gap-[15px]">
                    <Metric icon="↙" type="green" label={`Revenue · ${t.currency}`} value={money(t.revenue, t.currency)} note="Billed to advertisers" />
                    <Metric icon="↗" type="amber" label={`Cost · ${t.currency}`} value={money(t.cost, t.currency)} note="Billed by publishers" />
                    <Metric
                      icon="◆"
                      type={Number(t.profit) >= 0 ? 'blue' : 'red'}
                      label={`Net profit · ${t.currency}`}
                      value={money(t.profit, t.currency)}
                      valueClass={Number(t.profit) < 0 ? 'text-[#d92d20]' : ''}
                      note="Revenue − cost"
                    />
                    <Metric icon="%" type="purple" label={`Margin · ${t.currency}`} value={percent(t.marginPct)} note="Profit ÷ revenue" />
                  </section>
                  {(Number(t.received) > 0 || Number(t.paid) > 0) && (
                    <div className="text-[12px] text-[#667085] px-1">
                      Cash in {label}: <b className="text-[#0f9f6e]">{money(t.received, t.currency)}</b> received ·{' '}
                      <b className="text-[#dc6803]">{money(t.paid, t.currency)}</b> paid ·{' '}
                      <LinkButton onClick={() => navigate('/payments')}>see payments →</LinkButton>
                    </div>
                  )}
                </div>
              ))}

              <CompletenessWarnings months={summary.months} />

              {/* Month by month (not needed when looking at a single month) */}
              {!singleMonth && (
                <Card
                  eyebrow="MONTH BY MONTH"
                  title="Company revenue & profit"
                  description="Click a month to open it."
                >
                  <Table
                    columns={[
                      { label: 'Month' },
                      { label: 'Revenue', align: 'right' },
                      { label: 'Cost', align: 'right' },
                      { label: 'Net profit', align: 'right' },
                      { label: 'Margin', align: 'right' },
                      { label: '' },
                    ]}
                  >
                    {[...summary.months].reverse().map((m) => (
                      <Row
                        key={`${m.month}-${m.currency}`}
                        onClick={() => setPeriod({ mode: 'month', month: m.month })}
                      >
                        <Td>
                          <div className="flex items-center gap-[6px]">
                            <strong>{monthLabel(m.month)}</strong>
                            {multiCurrency && <span className="text-[#98a2b3] text-[11px]">{m.currency}</span>}
                            {m.closed && <ClosedFlag />}
                          </div>
                        </Td>
                        <Td align="right"><Money value={m.revenue} currency={m.currency} /></Td>
                        <Td align="right"><Money value={m.cost} currency={m.currency} /></Td>
                        <Td align="right"><Money value={m.profit} currency={m.currency} signed /></Td>
                        <Td align="right" className="text-[#667085]">{percent(m.marginPct)}</Td>
                        <Td className="text-right whitespace-nowrap">
                          <span className="inline-flex gap-1 mr-3">
                            {m.campaignsMissingRevenue > 0 && <Flag>{m.campaignsMissingRevenue} missing revenue</Flag>}
                            {m.campaignsMissingPayouts > 0 && <Flag>{m.campaignsMissingPayouts} missing payouts</Flag>}
                          </span>
                          <span className="text-[#98a2b3]">›</span>
                        </Td>
                      </Row>
                    ))}
                  </Table>
                </Card>
              )}

              {/* Campaign-wise */}
              <Card
                eyebrow="CAMPAIGN-WISE"
                title={`Campaigns · ${label}`}
                description="Click a campaign to see its distributions and monthly numbers."
              >
                {summary.campaigns.length === 0 ? (
                  <Empty title="No campaigns with money in this period" />
                ) : (
                  <Table
                    columns={[
                      { label: 'Campaign' },
                      { label: 'Source' },
                      { label: 'Revenue', align: 'right' },
                      { label: 'Cost', align: 'right' },
                      { label: 'Profit', align: 'right' },
                      { label: 'Margin', align: 'right' },
                      { label: 'Status' },
                    ]}
                  >
                    {summary.campaigns.map((c) => (
                      <Row key={c.campaignId} onClick={() => navigate(`/campaigns/${c.campaignId}`)}>
                        <Td><strong>{c.campaignName}</strong></Td>
                        <Td>{c.direct ? <Tag color="purple">Direct</Tag> : c.advertiserName}</Td>
                        <Td align="right">
                          {Number(c.revenue) !== 0
                            ? <Money value={c.revenue} currency={c.currency} />
                            : <Flag>Not entered</Flag>}
                        </Td>
                        <Td align="right"><Money value={c.cost} currency={c.currency} /></Td>
                        <Td align="right"><Money value={c.profit} currency={c.currency} signed /></Td>
                        <Td align="right" className="text-[#667085]">{percent(c.marginPct)}</Td>
                        <Td><Status status={c.status} /></Td>
                      </Row>
                    ))}
                  </Table>
                )}
              </Card>
            </>
          )}

          {/* Who owes what today */}
          <Card
            eyebrow="OUTSTANDING TODAY · ALL TIME"
            title="Who owes what"
            description="Billed minus payments and write-offs, whatever period is selected above."
            actions={<LinkButton onClick={() => navigate('/payments')}>Payments →</LinkButton>}
          >
            {outstanding.length === 0 ? (
              <Empty title="Everything is settled" text="No open balances with any partner." />
            ) : (
              <Table
                columns={[
                  { label: 'Partner' },
                  { label: 'They owe us', align: 'right' },
                  { label: 'We owe them', align: 'right' },
                  { label: `Billed · ${label}`, align: 'right' },
                ]}
              >
                {outstanding.map((p) => (
                  <Row key={`${p.partnerId}-${p.currency}`} onClick={() => navigate(`/partners/${p.partnerId}`)}>
                    <Td>
                      <strong>{p.partnerName}</strong>
                      {multiCurrency && <span className="text-[#98a2b3] text-[11px]"> · {p.currency}</span>}
                    </Td>
                    <Td align="right">
                      {Number(p.outstandingReceivable) !== 0
                        ? <span className="text-[#0f9f6e] font-semibold tabular-nums">{money(p.outstandingReceivable, p.currency)}</span>
                        : <span className="text-[#c8d0dd]">—</span>}
                    </Td>
                    <Td align="right">
                      {Number(p.outstandingPayable) !== 0
                        ? <span className="text-[#dc6803] font-semibold tabular-nums">{money(p.outstandingPayable, p.currency)}</span>
                        : <span className="text-[#c8d0dd]">—</span>}
                    </Td>
                    <Td align="right" className="text-[12px] text-[#667085]">
                      {Number(p.receivable) > 0 && <div>to them {money(p.receivable, p.currency)}</div>}
                      {Number(p.payable) > 0 && <div>by them {money(p.payable, p.currency)}</div>}
                      {Number(p.receivable) === 0 && Number(p.payable) === 0 && '—'}
                    </Td>
                  </Row>
                ))}
              </Table>
            )}
          </Card>
        </div>
      )}

      {confirmDialog}
    </>
  )
}

function BigNumber({ label, value, negative = false }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-bold text-[#667085]">{label}</div>
      <div className={`text-[24px] font-extrabold tracking-[-.5px] tabular-nums truncate ${negative ? 'text-[#d92d20]' : 'text-[#172033]'}`}>{value}</div>
    </div>
  )
}

function CompletenessWarnings({ months }) {
  const missingRevenue = months.filter((m) => m.campaignsMissingRevenue > 0 && !m.closed)
  const missingPayouts = months.filter((m) => m.campaignsMissingPayouts > 0 && !m.closed)

  if (missingRevenue.length === 0 && missingPayouts.length === 0) return null

  const count = (list, field) => list.reduce((sum, m) => sum + m[field], 0)

  return (
    <div className="grid grid-cols-1 gap-[10px]">
      {missingRevenue.length > 0 && (
        <Callout tone="warning" title="Profit looks lower than it is">
          {count(missingRevenue, 'campaignsMissingRevenue')} campaign-month{count(missingRevenue, 'campaignsMissingRevenue') === 1 ? ' has' : 's have'} publisher
          payouts but no revenue entered ({missingRevenue.map((m) => monthLabel(m.month)).join(', ')}).
        </Callout>
      )}
      {missingPayouts.length > 0 && (
        <Callout tone="warning" title="Profit looks higher than it is">
          {count(missingPayouts, 'campaignsMissingPayouts')} campaign-month{count(missingPayouts, 'campaignsMissingPayouts') === 1 ? ' has' : 's have'} revenue
          but a running distribution has no payout entered ({missingPayouts.map((m) => monthLabel(m.month)).join(', ')}).
        </Callout>
      )}
    </div>
  )
}
