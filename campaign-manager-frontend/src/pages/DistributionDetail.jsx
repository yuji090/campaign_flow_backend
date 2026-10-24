import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api'
import useLoad from '../lib/useLoad'
import { currentMonth, dateLabel, money, monthLabel, number } from '../lib/format'
import DistributionModal from '../components/DistributionModal'
import useConfirm from '../components/useConfirm'
import PageHeader from '../components/PageHeader'
import FlowStrip from '../components/FlowStrip'
import {
  Card, Detail, Empty, ErrorBox, Field, Input, LinkButton, Loading, Metric, Money, PrimaryButton,
  Row, SecondaryButton, Status, Table, Tag, Td,
} from '../components/ui'

export default function DistributionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [confirm, confirmDialog] = useConfirm()

  const { data, loading, error, reload } = useLoad(
    async () => {
      const [distribution, months] = await Promise.all([
        api.get(`/api/distributions/${id}`),
        api.get(`/api/distributions/${id}/months`),
      ])
      const campaign = await api.get(`/api/campaigns/${distribution.campaignId}`)
      return { distribution, months, campaign }
    },
    [id]
  )

  const [showEdit, setShowEdit] = useState(false)
  const [entry, setEntry] = useState(null) // month form, null = closed
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  const totals = useMemo(() => {
    const t = { totalEvents: 0, payableEvents: 0, payout: 0 }

    for (const m of data?.months || []) {
      t.totalEvents += m.totalEvents
      t.payableEvents += m.payableEvents
      t.payout += Number(m.payout)
    }

    return t
  }, [data])

  if (loading && !data) return <Loading />
  if (error) return <ErrorBox message={error} />

  const { distribution, months, campaign } = data
  const currency = distribution.currency
  const rate = distribution.payout != null ? Number(distribution.payout) : null

  // Payout follows payable events x rate until the user types their own amount
  const autoPayout = (payableEvents) =>
    rate != null && payableEvents !== '' ? String(Math.round(Number(payableEvents) * rate * 100) / 100) : ''

  const openNewMonth = () => {
    const used = new Set(months.map((m) => m.month))

    setActionError('')
    setEntry({
      month: used.has(currentMonth()) ? '' : currentMonth(),
      totalEvents: '',
      payableEvents: '',
      payout: '',
      payoutEdited: false,
      notes: '',
      existing: false,
    })
  }

  const openEditMonth = (m) => {
    setActionError('')
    setEntry({
      month: m.month,
      totalEvents: String(m.totalEvents),
      payableEvents: String(m.payableEvents),
      payout: String(m.payout),
      payoutEdited: true,
      notes: m.notes || '',
      existing: true,
    })
  }

  const setEntryField = (field, value) => setEntry((old) => {
    const next = { ...old, [field]: value }

    // Typing total first: assume nothing scrubbed until payable is entered
    if (field === 'totalEvents' && (old.payableEvents === '' || old.payableEvents === old.totalEvents)) {
      next.payableEvents = value
    }

    if (field === 'payout') {
      next.payoutEdited = true
    } else if (!next.payoutEdited && (field === 'payableEvents' || field === 'totalEvents')) {
      next.payout = autoPayout(next.payableEvents)
    }

    return next
  })

  const saveMonth = async (event) => {
    event.preventDefault()

    if (!entry.month) {
      setActionError('Pick a month')
      return
    }

    if (Number(entry.payableEvents) > Number(entry.totalEvents)) {
      setActionError('Payable events cannot be more than total events')
      return
    }

    // Saving a month that already exists overwrites it, so make that explicit
    if (!entry.existing && months.some((m) => m.month === entry.month)) {
      const ok = await confirm({
        title: `${monthLabel(entry.month)} already has data`,
        message: 'Saving will overwrite the existing entry for this month.',
        confirmLabel: 'Overwrite',
      })
      if (!ok) return
    }

    setSaving(true)
    setActionError('')

    try {
      await api.put(`/api/distributions/${id}/months/${entry.month}`, {
        totalEvents: Number(entry.totalEvents || 0),
        payableEvents: Number(entry.payableEvents || 0),
        payout: Number(entry.payout || 0),
        notes: entry.notes,
      })

      setEntry(null)
      await reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteMonth = async (month) => {
    const ok = await confirm({
      title: `Delete ${monthLabel(month)}?`,
      message: 'The events and payout for this month will be removed from every report.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return

    try {
      await api.delete(`/api/distributions/${id}/months/${month}`)
      if (entry?.month === month) setEntry(null)
      await reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const deleteDistribution = async () => {
    const ok = await confirm({
      title: 'Delete this distribution?',
      message: 'Only possible while it has no monthly data. Otherwise mark it COMPLETED.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return

    try {
      await api.delete(`/api/distributions/${id}`)
      navigate(`/campaigns/${distribution.campaignId}`)
    } catch (err) {
      setActionError(err.message)
    }
  }

  const scrubbed = totals.totalEvents - totals.payableEvents
  const payableTooHigh = entry && Number(entry.payableEvents) > Number(entry.totalEvents)

  return (
    <>
    <PageHeader
      back={`/campaigns/${distribution.campaignId}`}
      crumbs={[
        { label: 'Campaigns', to: '/campaigns' },
        { label: distribution.campaignName, to: `/campaigns/${distribution.campaignId}` },
        { label: distribution.label || distribution.publisherName },
      ]}
      eyebrow={`DISTRIBUTION #${distribution.id}`}
      title={distribution.publisherName}
      badges={<><Status status={distribution.status} />{distribution.label && <Tag color="gray">{distribution.label}</Tag>}</>}
      subtitle={<>Running campaign <b className="text-[#172033]">{distribution.campaignName}</b></>}
      actions={
        <>
          <SecondaryButton onClick={() => setShowEdit(true)}>Edit</SecondaryButton>
          <LinkButton danger onClick={deleteDistribution}>Delete</LinkButton>
        </>
      }
    />

    <div className="grid gap-[21px]">

      <FlowStrip
        steps={[
          campaign.advertiserId
            ? { caption: 'Advertiser', label: campaign.advertiserName, sub: 'Gave us the campaign', to: `/partners/${campaign.advertiserId}`, tone: 'green' }
            : { caption: 'Source', label: 'Direct', sub: 'Our own campaign', tone: 'green' },
          { caption: 'Campaign', label: distribution.campaignName, sub: `${campaign.pricingModel} · ${currency}`, to: `/campaigns/${distribution.campaignId}` },
          { caption: 'Publisher', label: distribution.publisherName, sub: distribution.label || 'Runs it for us', current: true, tone: 'purple' },
        ]}
      />

      <Card>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-5">
          <Detail label="Campaign">
            <LinkButton onClick={() => navigate(`/campaigns/${distribution.campaignId}`)}>
              {distribution.campaignName}
            </LinkButton>
          </Detail>
          <Detail label="Publisher">
            <LinkButton onClick={() => navigate(`/partners/${distribution.publisherId}`)}>
              {distribution.publisherName}
            </LinkButton>
          </Detail>
          <Detail label="Rate per payable event">
            {rate != null ? money(rate, currency) : null}
          </Detail>
          <Detail label="Managed by">{distribution.managerName}</Detail>
          <Detail label="Start">{dateLabel(distribution.startDate)}</Detail>
          <Detail label="End">{distribution.endDate ? dateLabel(distribution.endDate) : 'Ongoing'}</Detail>
        </div>

        {distribution.notes && (
          <div className="mt-5 pt-4 border-t border-[#eef1f5]">
            <Detail label="Notes"><span className="whitespace-pre-wrap">{distribution.notes}</span></Detail>
          </div>
        )}
      </Card>

      {months.length > 0 && (
        <section className="grid grid-cols-[repeat(auto-fit,minmax(185px,1fr))] gap-[15px]">
          <Metric icon="⇣" type="blue" label="Total events" value={number(totals.totalEvents)} note="Sent by the publisher" />
          <Metric icon="✓" type="green" label="Payable events" value={number(totals.payableEvents)} note={`${number(scrubbed)} scrubbed`} />
          <Metric icon="↗" type="amber" label={`Total payout · ${currency}`} value={money(totals.payout, currency)} note="What we owe this publisher" />
        </section>
      )}

      <Card
        eyebrow="MONTH BY MONTH"
        title="Events & payout"
        description={`Enter what this publisher sent and what we pay them each month. Revenue is entered on the campaign "${campaign.name}".`}
        actions={!entry && <PrimaryButton onClick={openNewMonth}>+ Add month</PrimaryButton>}
      >
        <div className="grid gap-4">
          <ErrorBox message={actionError} />

          {entry && (
            <form
              onSubmit={saveMonth}
              className="border border-[#adc0ff] bg-[#f8faff] rounded-[9px] p-4 grid gap-[15px]"
            >
              <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[15px]">
                <Field label="Month" required>
                  <Input
                    type="month"
                    required
                    disabled={entry.existing}
                    value={entry.month}
                    onChange={(e) => setEntryField('month', e.target.value)}
                  />
                </Field>
                <Field label="Total events" required hint="Sent by the publisher">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    required
                    autoFocus
                    value={entry.totalEvents}
                    onChange={(e) => setEntryField('totalEvents', e.target.value)}
                    placeholder="0"
                  />
                </Field>
                <Field label="Payable events" required hint={
                  entry.totalEvents !== '' && entry.payableEvents !== '' && !payableTooHigh
                    ? `${number(Number(entry.totalEvents) - Number(entry.payableEvents))} scrubbed`
                    : 'After removing fraud'
                }>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={entry.payableEvents}
                    onChange={(e) => setEntryField('payableEvents', e.target.value)}
                    placeholder="0"
                    className={payableTooHigh ? '!border-[#d92d20]' : ''}
                  />
                </Field>
                <Field
                  label={`Payout (${currency})`}
                  required
                  hint={rate != null
                    ? entry.payoutEdited ? 'Edited by hand' : `${number(entry.payableEvents || 0)} × ${money(rate, currency)}`
                    : 'No rate set on this distribution'}
                >
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={entry.payout}
                    onChange={(e) => setEntryField('payout', e.target.value)}
                    placeholder="0.00"
                  />
                </Field>
              </div>

              <Field label="Notes">
                <Input
                  value={entry.notes}
                  onChange={(e) => setEntryField('notes', e.target.value)}
                  placeholder="e.g. 120 events scrubbed for fraud, rate changed on the 15th"
                />
              </Field>

              <div className="flex gap-[10px] justify-end">
                <SecondaryButton onClick={() => setEntry(null)}>Cancel</SecondaryButton>
                <PrimaryButton type="submit" disabled={saving}>
                  {saving ? 'Saving…' : `Save ${entry.month ? monthLabel(entry.month) : 'month'}`}
                </PrimaryButton>
              </div>
            </form>
          )}

          {months.length === 0 ? (
            !entry && <Empty title="No months entered yet" text="Add the first month's events and payout." />
          ) : (
            <Table
              columns={[
                { label: 'Month' },
                { label: 'Total events', align: 'right' },
                { label: 'Payable', align: 'right' },
                { label: 'Scrubbed', align: 'right' },
                { label: 'Payout', align: 'right' },
                { label: 'Notes' },
                { label: 'Updated by' },
                { label: '' },
              ]}
            >
              {[...months].reverse().map((m) => (
                <Row key={m.month}>
                  <Td><strong>{monthLabel(m.month)}</strong></Td>
                  <Td align="right">{number(m.totalEvents)}</Td>
                  <Td align="right">{number(m.payableEvents)}</Td>
                  <Td align="right" className={m.scrubbedEvents > 0 ? 'text-[#d92d20]' : 'text-[#98a2b3]'}>
                    {number(m.scrubbedEvents)}
                  </Td>
                  <Td align="right"><Money value={m.payout} currency={m.currency} /></Td>
                  <Td className="text-[#667085] text-xs max-w-[260px]">{m.notes || ''}</Td>
                  <Td className="text-[#667085] text-xs whitespace-nowrap">{m.updatedByName || '—'}</Td>
                  <Td className="whitespace-nowrap text-right">
                    <LinkButton onClick={() => openEditMonth(m)}>Edit</LinkButton>
                    <span className="inline-block w-3" />
                    <LinkButton danger onClick={() => deleteMonth(m.month)}>Delete</LinkButton>
                  </Td>
                </Row>
              ))}
            </Table>
          )}
        </div>
      </Card>

      {showEdit && (
        <DistributionModal
          campaign={campaign}
          distribution={distribution}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false)
            reload()
          }}
        />
      )}

      {confirmDialog}
    </div>
    </>
  )
}
