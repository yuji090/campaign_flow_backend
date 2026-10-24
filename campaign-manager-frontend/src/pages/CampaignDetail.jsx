import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api'
import useLoad from '../lib/useLoad'
import { currentMonth, dateLabel, money, monthLabel, number, percent } from '../lib/format'
import DistributionModal from '../components/DistributionModal'
import useConfirm from '../components/useConfirm'
import PageHeader from '../components/PageHeader'
import FlowStrip from '../components/FlowStrip'
import PeriodPicker from '../components/PeriodPicker'
import { makePeriod, periodLabel, periodQuery } from '../lib/period'
import {
  Card, Detail, Empty, ErrorBox, Field, Input, LinkButton, Loading, Metric, Money, PrimaryButton,
  Row, SecondaryButton, Status, Table, Tag, Td,
} from '../components/ui'

export default function CampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [confirm, confirmDialog] = useConfirm()

  const [period, setPeriod] = useState(() => makePeriod('all'))
  const query = periodQuery(period)

  const { data, loading, error, reload } = useLoad(
    async () => {
      const [campaign, months, distributions] = await Promise.all([
        api.get(`/api/campaigns/${id}`),
        api.get(`/api/campaigns/${id}/months`),
        api.get(`/api/distributions?campaignId=${id}`),
      ])
      return { campaign, months, distributions }
    },
    [id]
  )

  const { data: summary, reload: reloadSummary } = useLoad(
    () => api.get(`/api/campaigns/${id}/summary${query}`),
    [id, query]
  )

  const reloadAll = () => Promise.all([reload(), reloadSummary()])

  const [showModal, setShowModal] = useState(false)
  const [entry, setEntry] = useState(null) // revenue form, null = closed
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  if ((loading && !data) || !summary) return <Loading />
  if (error) return <ErrorBox message={error} />

  const { campaign, months, distributions } = data
  const currency = campaign.currency
  const totals = summary.totals

  const entryByMonth = Object.fromEntries(months.map((m) => [m.month, m]))
  const summaryByDistribution = Object.fromEntries(summary.distributions.map((d) => [d.distributionId, d]))

  const activeDistributions = distributions.filter((d) => d.status === 'ACTIVE').length
  const closed = ['PAUSED', 'EXPIRED', 'ARCHIVED'].includes(campaign.status)

  const openRevenue = (month) => {
    const existing = month ? entryByMonth[month] : null
    const used = new Set(months.map((m) => m.month))

    setActionError('')
    setEntry({
      month: month || (used.has(currentMonth()) ? '' : currentMonth()),
      events: existing ? String(existing.events) : '',
      revenue: existing ? String(existing.revenue) : '',
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
        notes: entry.notes,
        version: entry.version,
      })

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
      navigate('/campaigns')
    } catch (err) {
      setActionError(err.message)
    }
  }

  const hasMoney = summary.months.length > 0
  const publisherNames = [...new Set(distributions.map((d) => d.publisherName))]

  return (
    <>
    <PageHeader
      back="/campaigns"
      crumbs={[{ label: 'Campaigns', to: '/campaigns' }, { label: campaign.name }]}
      eyebrow={`CAMPAIGN #${campaign.id}`}
      title={campaign.name}
      badges={<><Status status={campaign.status} /><Tag>{campaign.pricingModel}</Tag></>}
      subtitle={campaign.direct ? 'Direct campaign' : `From ${campaign.advertiserName}`}
      actions={
        <>
          <SecondaryButton onClick={() => navigate(`/campaigns/${id}/edit`)}>Edit</SecondaryButton>
          <LinkButton danger onClick={deleteCampaign}>Delete</LinkButton>
        </>
      }
    />

    <div className="grid gap-[21px]">
      <ErrorBox message={actionError} />

      <FlowStrip
        steps={[
          campaign.advertiserId
            ? { caption: 'Advertiser', label: campaign.advertiserName, sub: campaign.direct ? 'Direct' : 'Gave us this campaign', to: `/partners/${campaign.advertiserId}`, tone: 'green' }
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

      {closed && activeDistributions > 0 && (
        <div className="rounded-[7px] border border-[#fedf89] bg-[#fffaeb] px-4 py-3 text-[13px] text-[#b54708]">
          This campaign is <b>{campaign.status}</b> but {activeDistributions} distribution
          {activeDistributions === 1 ? ' is' : 's are'} still <b>ACTIVE</b>. Pause or complete them below.
        </div>
      )}

      {/* Info */}
      <Card>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-5">
          <Detail label="Source">
            {campaign.direct && <Tag color="purple">Direct</Tag>}{' '}
            {campaign.advertiserId ? (
              <LinkButton onClick={() => navigate(`/partners/${campaign.advertiserId}`)}>
                {campaign.advertiserName}
              </LinkButton>
            ) : null}
          </Detail>
          <Detail label="Pricing model"><Tag>{campaign.pricingModel}</Tag></Detail>
          <Detail label="Payout">
            {campaign.payout != null ? money(campaign.payout, currency) : null}
          </Detail>
          <Detail label="Managed by">{campaign.managerName}</Detail>
          <Detail label="Start">{dateLabel(campaign.startDate)}</Detail>
          <Detail label="End">{campaign.endDate ? dateLabel(campaign.endDate) : 'Ongoing'}</Detail>
          <Detail label="Last updated">
            {campaign.updatedByName ? `${campaign.updatedByName} · ${dateLabel(campaign.updatedAt)}` : dateLabel(campaign.updatedAt)}
          </Detail>
        </div>

        {campaign.notes && (
          <div className="mt-5 pt-4 border-t border-[#eef1f5]">
            <Detail label="Notes"><span className="whitespace-pre-wrap">{campaign.notes}</span></Detail>
          </div>
        )}
      </Card>

      {/* Period */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[#3563e9] font-extrabold text-[10px] tracking-[1.1px]">
          MONEY · {periodLabel(period).toUpperCase()}
        </div>
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      {/* Totals */}
      {hasMoney && (
        <section className="grid grid-cols-[repeat(auto-fit,minmax(185px,1fr))] gap-[15px]">
          <Metric icon="↙" type="green" label={`Revenue · ${currency}`} value={money(totals.revenue, currency)} note={`${number(totals.advertiserEvents)} advertiser events`} />
          <Metric icon="↗" type="amber" label={`Cost · ${currency}`} value={money(totals.cost, currency)} note={`${number(totals.payableEvents)} payable of ${number(totals.totalEvents)} sent`} />
          <Metric icon="◆" type={Number(totals.profit) >= 0 ? 'blue' : 'red'} label={`Profit · ${currency}`} value={money(totals.profit, currency)} note="Revenue − cost" />
          <Metric icon="%" type="purple" label="Margin" value={percent(totals.marginPct)} note="Profit ÷ revenue" />
        </section>
      )}

      {/* Month by month */}
      <Card
        eyebrow="MONTH BY MONTH"
        title="Revenue, cost & profit"
        description="Enter the advertiser's revenue for each month. Cost is added up from the distributions below."
        actions={!entry && <PrimaryButton onClick={() => openRevenue(null)}>+ Add revenue</PrimaryButton>}
      >
        <div className="grid gap-4">
          {entry && (
            <form
              onSubmit={saveRevenue}
              className="border border-[#adc0ff] bg-[#f8faff] rounded-[9px] p-4 grid gap-[15px]"
            >
              <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[15px]">
                <Field label="Month" required>
                  <Input
                    type="month"
                    required
                    disabled={entry.fixedMonth}
                    value={entry.month}
                    onChange={(e) => setEntryField('month', e.target.value)}
                  />
                </Field>
                <Field label="Advertiser events" hint="Approved by the advertiser (optional)">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={entry.events}
                    onChange={(e) => setEntryField('events', e.target.value)}
                    placeholder="0"
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
              </div>

              <Field label="Notes">
                <Input
                  value={entry.notes}
                  onChange={(e) => setEntryField('notes', e.target.value)}
                  placeholder="e.g. advertiser final number, 50 events rejected"
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
            !entry && <Empty title={`No money recorded · ${periodLabel(period)}`} text="Add revenue here, and events and payout on each distribution." />
          ) : (
            <Table
              columns={[
                { label: 'Month' },
                { label: 'Adv. events', align: 'right' },
                { label: 'Pub. events', align: 'right' },
                { label: 'Revenue', align: 'right' },
                { label: 'Cost', align: 'right' },
                { label: 'Profit', align: 'right' },
                { label: 'Margin', align: 'right' },
                { label: '' },
              ]}
            >
              {[...summary.months].reverse().map((m) => (
                <Row key={m.month}>
                  <Td>
                    <strong>{monthLabel(m.month)}</strong>
                    {entryByMonth[m.month]?.notes && (
                      <div className="text-[#98a2b3] text-[11px] max-w-[220px]">{entryByMonth[m.month].notes}</div>
                    )}
                  </Td>
                  <Td align="right">{m.revenueEntered ? number(m.advertiserEvents) : '—'}</Td>
                  <Td align="right">
                    {number(m.payableEvents)}
                    {m.totalEvents > m.payableEvents && (
                      <div className="text-[#98a2b3] text-[11px]">of {number(m.totalEvents)}</div>
                    )}
                  </Td>
                  <Td align="right">
                    {m.revenueEntered
                      ? <Money value={m.revenue} currency={currency} />
                      : <span className="text-[#dc6803] text-xs font-bold">Not entered</span>}
                  </Td>
                  <Td align="right"><Money value={m.cost} currency={currency} /></Td>
                  <Td align="right"><Money value={m.profit} currency={currency} signed /></Td>
                  <Td align="right" className="text-[#667085]">{percent(m.marginPct)}</Td>
                  <Td className="whitespace-nowrap text-right">
                    <LinkButton onClick={() => openRevenue(m.month)}>
                      {m.revenueEntered ? 'Edit' : 'Enter revenue'}
                    </LinkButton>
                    {m.revenueEntered && (
                      <>
                        <span className="inline-block w-3" />
                        <LinkButton danger onClick={() => deleteRevenue(m.month)}>Delete</LinkButton>
                      </>
                    )}
                  </Td>
                </Row>
              ))}
            </Table>
          )}
        </div>
      </Card>

      {/* Distributions */}
      <Card
        eyebrow="DISTRIBUTION"
        title={`Running with ${distributions.length} publisher deal${distributions.length === 1 ? '' : 's'}`}
        description="Open a distribution to enter its events and payout month by month. Estimated revenue splits the campaign revenue by payable events."
        actions={<PrimaryButton onClick={() => setShowModal(true)}>+ Distribute</PrimaryButton>}
      >
        {distributions.length === 0 ? (
          <Empty title="Not distributed yet" text="Give this campaign to a publisher to start tracking payouts." />
        ) : (
          <Table
            columns={[
              { label: 'Publisher' },
              { label: 'Rate', align: 'right' },
              { label: 'Payable events', align: 'right' },
              { label: 'Payout', align: 'right' },
              { label: 'Est. revenue', align: 'right' },
              { label: 'Est. profit', align: 'right' },
              { label: 'Managed by' },
              { label: 'Status' },
            ]}
            footer={
              <tr className="font-bold">
                <Td>Total</Td>
                <Td />
                <Td align="right">{number(totals.payableEvents)}</Td>
                <Td align="right"><Money value={totals.cost} currency={currency} /></Td>
                <Td align="right"><Money value={totals.revenue} currency={currency} /></Td>
                <Td align="right"><Money value={totals.profit} currency={currency} signed /></Td>
                <Td />
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
                    <div className="text-[#98a2b3] text-[11px]">{d.label || `Distribution #${d.id}`}</div>
                  </Td>
                  <Td align="right">{d.payout != null ? money(d.payout, currency) : '—'}</Td>
                  <Td align="right">{number(s.payableEvents)}</Td>
                  <Td align="right"><Money value={s.payout} currency={currency} /></Td>
                  <Td align="right" className="text-[#667085]"><Money value={s.estimatedRevenue} currency={currency} /></Td>
                  <Td align="right"><Money value={s.estimatedProfit} currency={currency} signed /></Td>
                  <Td>{d.managerName || '—'}</Td>
                  <Td><Status status={d.status} /></Td>
                </Row>
              )
            })}
          </Table>
        )}
      </Card>

      {showModal && (
        <DistributionModal
          campaign={campaign}
          onClose={() => setShowModal(false)}
          onSaved={(saved) => navigate(`/distributions/${saved.id}`)}
        />
      )}

      {confirmDialog}
    </div>
    </>
  )
}
