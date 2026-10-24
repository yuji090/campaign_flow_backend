import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import useLoad from '../lib/useLoad'
import { money, monthLabel, percent } from '../lib/format'
import { makePeriod, periodLabel, periodQuery } from '../lib/period'
import PageHeader from '../components/PageHeader'
import PeriodPicker from '../components/PeriodPicker'
import {
  Card, Empty, ErrorBox, Loading, Metric, Money, Row, Status, Table, Tag, Td,
} from '../components/ui'

export default function Finance() {
  const navigate = useNavigate()

  const [period, setPeriod] = useState(() => makePeriod('month'))
  const query = periodQuery(period)

  const { data: summary, loading, error } = useLoad(() => api.get(`/api/finance/summary${query}`), [query])

  const label = periodLabel(period)
  const singleMonth = period.mode === 'month'

  return (
    <>
      <PageHeader
        eyebrow="THE DIGITAL SOLE"
        title="Finance"
        subtitle="Revenue from advertisers, cost paid to publishers, and what the company keeps."
        actions={<PeriodPicker value={period} onChange={setPeriod} />}
      />

      <ErrorBox message={error} />

      {loading && !summary ? (
        <Loading />
      ) : summary && (
        <div className={`grid gap-[21px] transition-opacity ${loading ? 'opacity-60' : ''}`}>

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
              {/* Totals */}
              {summary.totals.map((t) => (
                <section key={t.currency} className="grid grid-cols-[repeat(auto-fit,minmax(185px,1fr))] gap-[15px]">
                  <Metric icon="↙" type="green" label={`Revenue · ${t.currency}`} value={money(t.revenue, t.currency)} note="From advertisers" />
                  <Metric icon="↗" type="amber" label={`Cost · ${t.currency}`} value={money(t.cost, t.currency)} note="Paid to publishers" />
                  <Metric icon="◆" type={Number(t.profit) >= 0 ? 'blue' : 'red'} label={`Net profit · ${t.currency}`} value={money(t.profit, t.currency)} note="Revenue − cost" />
                  <Metric icon="%" type="purple" label={`Margin · ${t.currency}`} value={percent(t.marginPct)} note="Profit ÷ revenue" />
                </section>
              ))}

              <MissingRevenueWarning months={summary.months} />

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
                          <strong>{monthLabel(m.month)}</strong>
                          {summary.totals.length > 1 && <span className="text-[#98a2b3] text-[11px]"> · {m.currency}</span>}
                        </Td>
                        <Td align="right"><Money value={m.revenue} currency={m.currency} /></Td>
                        <Td align="right"><Money value={m.cost} currency={m.currency} /></Td>
                        <Td align="right"><Money value={m.profit} currency={m.currency} signed /></Td>
                        <Td align="right" className="text-[#667085]">{percent(m.marginPct)}</Td>
                        <Td className="text-right whitespace-nowrap">
                          {m.campaignsMissingRevenue > 0 && (
                            <span className="text-[#dc6803] text-[11px] font-bold mr-3">
                              {m.campaignsMissingRevenue} missing revenue
                            </span>
                          )}
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
                        <Td>{c.direct && <Tag color="purple">Direct</Tag>} {c.advertiserName}</Td>
                        <Td align="right">
                          {Number(c.revenue) > 0
                            ? <Money value={c.revenue} currency={c.currency} />
                            : <span className="text-[#dc6803] text-xs font-bold">Not entered</span>}
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
        </div>
      )}
    </>
  )
}

function MissingRevenueWarning({ months }) {
  const missing = months.filter((m) => m.campaignsMissingRevenue > 0)

  if (missing.length === 0) return null

  const count = missing.reduce((sum, m) => sum + m.campaignsMissingRevenue, 0)

  return (
    <div className="rounded-[9px] border border-[#fedf89] bg-[#fffaeb] px-4 py-3 text-[13px] text-[#b54708] flex gap-2 items-start">
      <span>⚠</span>
      <span>
        {count} campaign-month{count === 1 ? ' has' : 's have'} payouts but <b>no revenue entered</b>
        {' '}({missing.map((m) => monthLabel(m.month)).join(', ')}), so profit looks lower than it really is.
      </span>
    </div>
  )
}
