import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api'
import useLoad from '../lib/useLoad'
import { currentMonth, dateLabel, money, monthLabel, number, percent } from '../lib/format'
import { toast } from '../lib/toast'
import DistributionModal from '../components/DistributionModal'
import HistoryModal from '../components/HistoryModal'
import useConfirm from '../components/useConfirm'
import PageHeader from '../components/PageHeader'
import FlowStrip from '../components/FlowStrip'
import PeriodPicker from '../components/PeriodPicker'
import { addMonths, makePeriod, periodLabel, periodQuery } from '../lib/period'
import {
  Callout, Card, ClosedFlag, Empty, ErrorBox, Field, Flag, Input, LinkButton, Loading, Menu, Metric, Money,
  PrimaryButton, Row, SecondaryButton, Status, Table, Tag, Td,
} from '../components/ui'

export default function CampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [confirm, confirmDialog] = useConfirm()

  const [period, setPeriod] = useState(() => makePeriod('all'))
  const query = periodQuery(period)

  const { data, loading, error, reload } = useLoad(
    async () => {
      const [campaign, months, distributions, allTime] = await Promise.all([
        api.get(`/api/campaigns/${id}`),
        api.get(`/api/campaigns/${id}/months`),
        api.get(`/api/distributions?campaignId=${id}`),
        api.get(`/api/campaigns/${id}/summary`),
      ])
      return { campaign, months, distributions, allTime }
    },
    [id]
  )

  const { data: summary, reload: reloadSummary } = useLoad(
    () => api.get(`/api/campaigns/${id}/summary${query}`),
    [id, query]
  )

  const reloadAll = () => Promise.all([reload(), reloadSummary()])

  const [showModal, setShowModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [entry, setEntry] = useState(null) // revenue form, null = closed
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  if ((loading && !data) || !summary) return <Loading />
  if (error) return <ErrorBox message={error} />

  const { campaign, months, distributions, allTime } = data
  const currency = campaign.currency
  const totals = summary.totals

  const entryByMonth = Object.fromEntries(months.map((m) => [m.month, m]))
  const summaryByDistribution = Object.fromEntries(summary.distributions.map((d) => [d.distributionId, d]))

  const activeDistributions = distributions.filter((d) => d.status === 'ACTIVE').length
  const stopped = ['PAUSED', 'EXPIRED', 'ARCHIVED'].includes(campaign.status)

  // Months (all time) that still need something before their profit is real
  const missingRevenue = allTime.months.filter((m) => !m.revenueEntered && Number(m.cost) > 0 && !m.closed)
  const missingPayouts = allTime.months.filter((m) => m.missingPayouts && !m.closed)

  const openRevenue = (month) => {
    const existing = month ? entryByMonth[month] : null
    const used = new Set(months.map((m) => m.month))
    const suggested = [currentMonth(), addMonths(currentMonth(), -1)].find((m) => !used.has(m)) || ''

    setActionError('')
    setEntry({
      month: month || suggested,
      events: existing ? String(existing.events) : '',
      revenue: existing ? String(existing.revenue) : '',
      adjustment: existing && Number(existing.adjustment) !== 0 ? String(existing.adjustment) : '',
      adjustmentNote: existing?.adjustmentNote || '',
      showAdjustment: Boolean(existing && Number(existing.adjustment) !== 0),
      notes: existing?.notes || '',
      version: existing?.version,
      existing: Boolean(existing),
      fixedMonth: Boolean(month),
    })
  }

  const setEntryField = (field, value) => setEntry((old) => ({ ...old, [field]: value }))

  const saveRevenue = async (event) => {
    event.preventDefault()

    if (!entry.month) {
      setActionError('Pick a month')
      return
    }

    if (Number(entry.adjustment || 0) !== 0 && !entry.adjustmentNote.trim()) {
      setActionError('Add a reason for the adjustment')
      return
    }

    if (!entry.existing && entryByMonth[entry.month]) {
      const ok = await confirm({
        title: `${monthLabel(entry.month)} already has revenue`,
        message: 'Saving will overwrite the revenue entered for this month.',
        confirmLabel: 'Overwrite',
      })
      if (!ok) return
    }

    setSaving(true)
    setActionError('')

    try {
      await api.put(`/api/campaigns/${id}/months/${entry.month}`, {
        events: entry.events === '' ? 0 : Number(entry.events),
        revenue: Number(entry.revenue || 0),
        adjustment: Number(entry.adjustment || 0),
        adjustmentNote: entry.adjustmentNote,
        notes: entry.notes,
        version: entry.version,
      })

      toast(`${monthLabel(entry.month)} revenue saved`)
      setEntry(null)
      await reloadAll()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteRevenue = async (month) => {
    const ok = await confirm({
      title: `Delete ${monthLabel(month)} revenue?`,
      message: 'This month will show as "not entered" again. Distribution payouts are not affected.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return

    try {
      await api.delete(`/api/campaigns/${id}/months/${month}`)
      toast(`${monthLabel(month)} revenue deleted`)
      await reloadAll()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const deleteCampaign = async () => {
    const ok = await confirm({
      title: `Delete "${campaign.name}"?`,
      message: 'Only possible while it has no distributions or revenue. Otherwise set its status to ARCHIVED.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return

    try {
      await api.delete(`/api/campaigns/${id}`)
      toast('Campaign deleted')
      navigate('/campaigns')
    } catch (err) {
      setActionError(err.message)
    }
  }

  const hasMoney = summary.months.length > 0
  const publisherNames = [...new Set(distributions.map((d) => d.publisherName))]
  const netPreview = Number(entry?.revenue || 0) + Number(entry?.adjustment || 0)
  const pendingInPeriod = summary.months.filter((m) => !m.revenueEntered && Number(m.cost) > 0).length

  return (
    <>
    <PageHeader
      back="/campaigns"
      crumbs={[{ label: 'Campaigns', to: '/campaigns' }, { label: campaign.name }]}
      eyebrow={`CAMPAIGN #${campaign.id}`}
      title={campaign.name}
      badges={<><Status status={campaign.status} /><Tag>{campaign.pricingModel}</Tag></>}
      meta={[
        {
          label: 'Source',
          value: campaign.direct
            ? 'Direct'
            : <LinkButton onClick={() => navigate(`/partners/${campaign.advertiserId}`)}>{campaign.advertiserName}</LinkButton>,
        },
        { label: 'Payout', value: campaign.payout != null ? `${money(campaign.payout, currency)} / ${eventName(campaign.pricingModel)}` : '—' },
        { label: 'Currency', value: currency },
        { label: 'Managed by', value: campaign.managerName || '—' },
        { label: 'Runs', value: `${campaign.startDate ? dateLabel(campaign.startDate) : 'No start date'} → ${campaign.endDate ? dateLabel(campaign.endDate) : 'ongoing'}` },
      ]}
      actions={
        <>
          <SecondaryButton onClick={() => setShowHistory(true)}>History</SecondaryButton>
          <SecondaryButton onClick={() => navigate(`/campaigns/${id}/edit`)}>Edit</SecondaryButton>
          <Menu items={[{ label: 'Delete campaign', danger: true, onClick: deleteCampaign }]} />
        </>
      }
    />

    <div className="grid grid-cols-1 gap-[21px]">
      <ErrorBox message={actionError} />

      <FlowStrip
        steps={[
          campaign.advertiserId
            ? { caption: 'Advertiser', label: campaign.advertiserName, sub: 'Gave us this campaign', to: `/partners/${campaign.advertiserId}`, tone: 'green' }
            : { caption: 'Source', label: 'Direct', sub: 'Our own campaign', tone: 'green' },
          { caption: 'Campaign', label: campaign.name, sub: `${campaign.pricingModel} · ${campaign.currency}`, current: true },
          {
            caption: 'Publishers',
            label: distributions.length
              ? `${distributions.length} deal${distributions.length === 1 ? '' : 's'}`
              : 'Not distributed yet',
            sub: publisherNames.join(', ') || 'Use + Distribute below',
            tone: 'purple',
          },
        ]}
      />

      {campaign.notes && (
        <div className="rounded-[10px] border border-[#e6eaf0] bg-white px-4 py-3 text-[13px] text-[#475467] whitespace-pre-wrap">
          <span className="text-[#98a2b3] text-[11px] font-bold uppercase tracking-[.5px] mr-2">Notes</span>
          {campaign.notes}
        </div>
      )}

      {/* What still needs doing, so the numbers can be trusted */}
      {missingRevenue.length > 0 && (
        <Callout
          tone="warning"
          title={`Revenue not entered for ${missingRevenue.map((m) => monthLabel(m.month)).join(', ')}`}
          action={!entry && <PrimaryButton onClick={() => openRevenue(missingRevenue[missingRevenue.length - 1].month)}>Enter {monthLabel(missingRevenue[missingRevenue.length - 1].month)}</PrimaryButton>}
        >
          Publishers already have payouts for {missingRevenue.length === 1 ? 'this month' : 'these months'}, so profit looks lower than it really is.
        </Callout>
      )}

      {missingPayouts.length > 0 && (
        <Callout tone="warning" title={`Publisher payouts missing for ${missingPayouts.map((m) => monthLabel(m.month)).join(', ')}`}>
          Revenue is entered but a running distribution has no entry for {missingPayouts.length === 1 ? 'that month' : 'those months'}, so profit looks higher than it really is.
        </Callout>
      )}

      {stopped && activeDistributions > 0 && (
        <Callout tone="warning">
          This campaign is <b>{campaign.status}</b> but {activeDistributions} distribution
          {activeDistributions === 1 ? ' is' : 's are'} still <b>ACTIVE</b>. Pause or complete them below.
        </Callout>
      )}

      {/* Period */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[#3563e9] font-extrabold text-[10px] tracking-[1.1px]">
          MONEY · {periodLabel(period).toUpperCase()}
        </div>
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      {/* Totals */}
      {hasMoney && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-[15px]">
          <Metric icon="↙" type="green" label="Revenue" value={money(totals.revenue, currency)} note={`${number(totals.advertiserEvents)} approved by advertiser`} />
          <Metric icon="↗" type="amber" label="Cost" value={money(totals.cost, currency)} note={`${number(totals.payableEvents)} payable of ${number(totals.totalEvents)} sent`} />
          <Metric
            icon="◆"
            type={Number(totals.profit) >= 0 ? 'blue' : 'red'}
            label="Profit"
            value={money(totals.profit, currency)}
            valueClass={Number(totals.profit) < 0 ? 'text-[#d92d20]' : ''}
            note={pendingInPeriod ? `⚠ ${pendingInPeriod} month${pendingInPeriod === 1 ? '' : 's'} without revenue` : 'Revenue − cost'}
          />
          <Metric icon="%" type="purple" label="Margin" value={percent(totals.marginPct)} note="Profit ÷ revenue" />
        </section>
      )}

      {/* Month by month */}
      <Card
        eyebrow="MONTH BY MONTH"
        title="Revenue, cost & profit"
        description="Enter the advertiser's final number for each month. Cost adds up automatically from the distributions below."
        actions={!entry && <PrimaryButton onClick={() => openRevenue(null)}>+ Add revenue</PrimaryButton>}
      >
        <div className="grid grid-cols-1 gap-4">
          {entry && (
            <form
              onSubmit={saveRevenue}
              className="border border-[#adc0ff] bg-[#f8faff] rounded-[10px] p-4 grid gap-[15px]"
            >
              <div className="flex items-center justify-between gap-3">
                <strong className="text-[14px]">
                  {entry.existing ? `Edit ${monthLabel(entry.month)}` : 'Add month revenue'}
                </strong>
                <span className="text-[12px] text-[#667085]">
                  Counts in reports: <b className="text-[#172033] tabular-nums">{money(netPreview, currency)}</b>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-[15px]">
                <Field label="Month" required>
                  <Input
                    type="month"
                    required
                    max={currentMonth()}
                    disabled={entry.fixedMonth}
                    value={entry.month}
                    onChange={(e) => setEntryField('month', e.target.value)}
                  />
                </Field>
                <Field label={`Revenue (${currency})`} required hint="What the advertiser pays us">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    autoFocus
                    value={entry.revenue}
                    onChange={(e) => setEntryField('revenue', e.target.value)}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Approved events" hint="How many the advertiser approved (optional)">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={entry.events}
                    onChange={(e) => setEntryField('events', e.target.value)}
                    placeholder="0"
                  />
                </Field>
              </div>

              {entry.showAdjustment ? (
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-[15px] rounded-[9px] border border-dashed border-[#c8d0dd] p-3 bg-white">
                  <Field label={`Adjustment (${currency})`} hint="Negative for a clawback, positive for a bonus">
                    <Input
                      type="number"
                      step="0.01"
                      value={entry.adjustment}
                      onChange={(e) => setEntryField('adjustment', e.target.value)}
                      placeholder="-800"
                    />
                  </Field>
                  <Field label="Reason" required={Number(entry.adjustment || 0) !== 0}>
                    <Input
                      value={entry.adjustmentNote}
                      onChange={(e) => setEntryField('adjustmentNote', e.target.value)}
                      placeholder="e.g. Sep fraud clawback, 800 installs rejected"
                    />
                  </Field>
                </div>
              ) : (
                <div>
                  <LinkButton onClick={() => setEntryField('showAdjustment', true)}>+ Add adjustment (clawback / bonus)</LinkButton>
                </div>
              )}

              <Field label="Notes">
                <Input
                  value={entry.notes}
                  onChange={(e) => setEntryField('notes', e.target.value)}
                  placeholder="e.g. advertiser final number from the Oct report"
                />
              </Field>

              <div className="flex gap-[10px] justify-end">
                <SecondaryButton onClick={() => setEntry(null)}>Cancel</SecondaryButton>
                <PrimaryButton type="submit" disabled={saving}>
                  {saving ? 'Saving…' : `Save ${entry.month ? monthLabel(entry.month) : 'revenue'}`}
                </PrimaryButton>
              </div>
            </form>
          )}

          {!hasMoney ? (
            !entry && (
              <Empty
                title={`No money recorded · ${periodLabel(period)}`}
                text="Add revenue here, and events and payout on each distribution."
              />
            )
          ) : (
            <Table
              columns={[
                { label: 'Month' },
                { label: 'Approved', align: 'right' },
                { label: 'Payable', align: 'right' },
                { label: 'Revenue', align: 'right' },
                { label: 'Cost', align: 'right' },
                { label: 'Profit', align: 'right' },
                { label: 'Margin', align: 'right' },
                { label: '' },
              ]}
            >
              {[...summary.months].reverse().map((m) => {
                const saved = entryByMonth[m.month]
                const gap = eventGap(m)

                return (
                  <Row key={m.month}>
                    <Td>
                      <div className="flex items-center gap-[6px] flex-wrap">
                        <strong>{monthLabel(m.month)}</strong>
                        {m.closed && <ClosedFlag />}
                        {m.missingPayouts && <Flag title="Revenue entered but a distribution has no entry">Payouts missing</Flag>}
                      </div>
                      {saved?.notes && <div className="text-[#98a2b3] text-[11px] max-w-[240px] truncate" title={saved.notes}>{saved.notes}</div>}
                    </Td>
                    <Td align="right">
                      {m.revenueEntered && m.advertiserEvents > 0 ? number(m.advertiserEvents) : <span className="text-[#c8d0dd]">—</span>}
                    </Td>
                    <Td align="right">
                      {number(m.payableEvents)}
                      {gap !== null && Math.abs(gap) >= 10 && (
                        <div className={`text-[11px] font-semibold ${gap < 0 ? 'text-[#d92d20]' : 'text-[#667085]'}`} title="Advertiser-approved vs our payable events">
                          {gap > 0 ? '+' : ''}{gap.toFixed(0)}% vs approved
                        </div>
                      )}
                      {(gap === null || Math.abs(gap) < 10) && m.totalEvents > m.payableEvents && (
                        <div className="text-[#98a2b3] text-[11px]">of {number(m.totalEvents)}</div>
                      )}
                    </Td>
                    <Td align="right">
                      {m.revenueEntered ? (
                        <>
                          <Money value={m.revenue} currency={currency} />
                          {Number(m.adjustment) !== 0 && (
                            <div className="text-[11px] text-[#667085]" title={saved?.adjustmentNote || ''}>
                              incl. {Number(m.adjustment) > 0 ? '+' : ''}{money(m.adjustment, currency)} adj.
                            </div>
                          )}
                        </>
                      ) : (
                        <Flag>Not entered</Flag>
                      )}
                    </Td>
                    <Td align="right"><Money value={m.cost} currency={currency} /></Td>
                    <Td align="right">
                      {m.revenueEntered
                        ? <Money value={m.profit} currency={currency} signed />
                        : <span className="text-[#98a2b3] text-xs" title="Profit shows once revenue is entered">pending</span>}
                    </Td>
                    <Td align="right" className="text-[#667085]">{m.revenueEntered ? percent(m.marginPct) : '—'}</Td>
                    <Td className="whitespace-nowrap text-right">
                      {m.closed ? (
                        <span className="text-[#98a2b3] text-[11px]">Locked</span>
                      ) : (
                        <>
                          <LinkButton onClick={() => openRevenue(m.month)}>
                            {m.revenueEntered ? 'Edit' : 'Enter revenue'}
                          </LinkButton>
                          {m.revenueEntered && (
                            <>
                              <span className="inline-block w-3" />
                              <LinkButton danger onClick={() => deleteRevenue(m.month)}>Delete</LinkButton>
                            </>
                          )}
                        </>
                      )}
                    </Td>
                  </Row>
                )
              })}
            </Table>
          )}
        </div>
      </Card>

      {/* Distributions */}
      <Card
        eyebrow="DISTRIBUTION"
        title={`Running with ${distributions.length} publisher deal${distributions.length === 1 ? '' : 's'}`}
        description="Open a distribution to enter its events and payout month by month."
        actions={<PrimaryButton onClick={() => setShowModal(true)}>+ Distribute</PrimaryButton>}
      >
        {distributions.length === 0 ? (
          <Empty title="Not distributed yet" text="Give this campaign to a publisher to start tracking payouts." />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <Table
              columns={[
                { label: 'Publisher' },
                { label: 'Rate', align: 'right' },
                { label: 'Payable', align: 'right' },
                { label: 'Payout', align: 'right' },
                { label: 'Est. revenue', align: 'right' },
                { label: 'Est. profit', align: 'right' },
                { label: 'Status' },
              ]}
              footer={
                <tr className="font-bold bg-[#fafbfc]">
                  <Td>Total</Td>
                  <Td />
                  <Td align="right">{number(totals.payableEvents)}</Td>
                  <Td align="right"><Money value={totals.cost} currency={currency} /></Td>
                  <Td align="right"><Money value={Number(totals.revenue) - Number(totals.unallocatedRevenue)} currency={currency} /></Td>
                  <Td align="right">
                    <Money value={Number(totals.revenue) - Number(totals.unallocatedRevenue) - (Number(totals.cost) - Number(totals.pendingCost))} currency={currency} signed />
                  </Td>
                  <Td />
                </tr>
              }
            >
              {distributions.map((d) => {
                const s = summaryByDistribution[d.id] || {}

                return (
                  <Row key={d.id} onClick={() => navigate(`/distributions/${d.id}`)}>
                    <Td>
                      <strong>{d.publisherName}</strong>
                      <div className="text-[#98a2b3] text-[11px]">
                        {d.label || `Distribution #${d.id}`}{d.managerName ? ` · ${d.managerName}` : ''}
                      </div>
                    </Td>
                    <Td align="right">{d.payout != null ? money(d.payout, currency) : '—'}</Td>
                    <Td align="right">
                      {number(s.payableEvents)}
                      {s.approvedEvents != null && (
                        <div className="text-[#98a2b3] text-[11px]">{number(s.approvedEvents)} approved</div>
                      )}
                    </Td>
                    <Td align="right"><Money value={s.payout} currency={currency} /></Td>
                    <Td align="right"><Money value={s.estimatedRevenue} currency={currency} muted dash /></Td>
                    <Td align="right">
                      <Money value={s.estimatedProfit} currency={currency} signed dash />
                      {Number(s.pendingPayout) > 0 && (
                        <div className="text-[11px] text-[#b54708]" title="Payout in months whose revenue is not entered yet; left out of the estimate">
                          + {money(s.pendingPayout, currency)} pending
                        </div>
                      )}
                    </Td>
                    <Td><Status status={d.status} /></Td>
                  </Row>
                )
              })}
            </Table>

            <p className="m-0 text-[11px] text-[#98a2b3] leading-[1.5]">
              <b className="text-[#667085]">How estimates work:</b> each month's campaign revenue is split across that month's
              publishers by advertiser-approved events (when every publisher has them) or payable events. Months without
              revenue are left out and shown as pending. Estimates are for comparing publishers; they are not stored.
            </p>

            {Number(totals.unallocatedRevenue) > 0 && (
              <Callout tone="info">
                {money(totals.unallocatedRevenue, currency)} of revenue is not split to any publisher, because those months
                have no distribution events entered.
              </Callout>
            )}
          </div>
        )}
      </Card>

      {showModal && (
        <DistributionModal
          campaign={campaign}
          onClose={() => setShowModal(false)}
          onSaved={(saved) => navigate(`/distributions/${saved.id}`)}
        />
      )}

      {showHistory && (
        <HistoryModal title={`History · ${campaign.name}`} filter={{ campaignId: id }} onClose={() => setShowHistory(false)} />
      )}

      {confirmDialog}
    </div>
    </>
  )
}

// What one unit of the pricing model is called
function eventName(model) {
  return { CPI: 'install', CPA: 'action', CPL: 'lead', CPS: 'sale', CPC: 'click', CPM: '1000 views' }[model] || 'event'
}

// Our payable events vs what the advertiser approved, in %; null when the advertiser count is not entered
function eventGap(month) {
  if (!month.revenueEntered || !month.advertiserEvents) return null
  return ((month.payableEvents - month.advertiserEvents) / month.advertiserEvents) * 100
}
