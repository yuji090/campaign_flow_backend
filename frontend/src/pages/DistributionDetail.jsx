import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api'
import useLoad from '../lib/useLoad'
import { currentMonth, dateLabel, money, monthLabel, number } from '../lib/format'
import { toast } from '../lib/toast'
import { hasChanges, withSnapshot } from '../lib/draft'
import DistributionModal from '../components/DistributionModal'
import HistoryModal from '../components/HistoryModal'
import useConfirm from '../components/useConfirm'
import PageHeader from '../components/PageHeader'
import FlowStrip from '../components/FlowStrip'
import {
  Callout, Card, ClosedFlag, Empty, ErrorBox, Field, Flag, Input, LinkButton, Loading, Menu, Metric, Money,
  PrimaryButton, Row, SecondaryButton, Status, Table, Tag, Td,
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
  const [showHistory, setShowHistory] = useState(false)
  const [entry, setEntry] = useState(null) // month form, null = closed
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  const totals = useMemo(() => {
    const t = { totalEvents: 0, payableEvents: 0, approvedEvents: null, payout: 0, mismatches: 0 }

    for (const m of data?.months || []) {
      t.totalEvents += m.totalEvents
      t.payableEvents += m.payableEvents
      t.payout += Number(m.netPayout)
      if (m.approvedEvents != null) t.approvedEvents = (t.approvedEvents || 0) + m.approvedEvents
      if (m.payoutMismatch) t.mismatches += 1
    }

    return t
  }, [data])

  if (loading && !data) return <Loading />
  if (error) return <ErrorBox message={error} />

  const { distribution, months, campaign } = data
  const currency = distribution.currency
  const rate = distribution.payout != null ? Number(distribution.payout) : null

  const expectedPayout = (payableEvents) =>
    rate != null && payableEvents !== '' ? Math.round(Number(payableEvents) * rate * 100) / 100 : null

  // Payout follows payable events x rate until the user types their own amount
  const autoPayout = (payableEvents) => {
    const expected = expectedPayout(payableEvents)
    return expected != null ? String(expected) : ''
  }

  const openNewMonth = () => {
    const used = new Set(months.map((m) => m.month))

    setActionError('')
    setEntry(withSnapshot({
      month: used.has(currentMonth()) ? '' : currentMonth(),
      totalEvents: '',
      payableEvents: '',
      approvedEvents: '',
      payout: '',
      payoutEdited: false,
      adjustment: '',
      adjustmentNote: '',
      showAdjustment: false,
      notes: '',
      existing: false,
    }))
  }

  const openEditMonth = (m) => {
    setActionError('')
    setEntry(withSnapshot({
      month: m.month,
      totalEvents: String(m.totalEvents),
      payableEvents: String(m.payableEvents),
      approvedEvents: m.approvedEvents != null ? String(m.approvedEvents) : '',
      payout: String(m.payout),
      payoutEdited: true,
      adjustment: Number(m.adjustment) !== 0 ? String(m.adjustment) : '',
      adjustmentNote: m.adjustmentNote || '',
      showAdjustment: Number(m.adjustment) !== 0,
      notes: m.notes || '',
      version: m.version,
      existing: true,
    }))
  }

  // Ask before throwing away typed numbers
  const cancelEntry = async () => {
    if (hasChanges(entry)) {
      const ok = await confirm({
        title: 'Discard your changes?',
        message: 'What you typed in this form has not been saved.',
        confirmLabel: 'Discard',
        danger: true,
      })
      if (!ok) return
    }
    setEntry(null)
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

    if (entry.approvedEvents !== '' && Number(entry.approvedEvents) > Number(entry.totalEvents)) {
      setActionError('Approved events cannot be more than total events')
      return
    }

    if (Number(entry.adjustment || 0) !== 0 && !entry.adjustmentNote.trim()) {
      setActionError('Add a reason for the adjustment')
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
        approvedEvents: entry.approvedEvents === '' ? null : Number(entry.approvedEvents),
        payout: Number(entry.payout || 0),
        adjustment: Number(entry.adjustment || 0),
        adjustmentNote: entry.adjustmentNote,
        notes: entry.notes,
        version: entry.version,
      })

      toast(`${monthLabel(entry.month)} saved`)
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
      toast(`${monthLabel(month)} deleted`)
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
      toast('Distribution deleted')
      navigate(`/campaigns/${distribution.campaignId}`)
    } catch (err) {
      setActionError(err.message)
    }
  }

  const scrubbed = totals.totalEvents - totals.payableEvents
  const payableTooHigh = entry && Number(entry.payableEvents) > Number(entry.totalEvents)
  const expected = entry ? expectedPayout(entry.payableEvents) : null
  const entryMismatch = entry && expected != null && entry.payout !== '' &&
    Math.abs(Number(entry.payout) - expected) > Math.max(expected * 0.01, 0.01)
  const netPreview = Number(entry?.payout || 0) + Number(entry?.adjustment || 0)

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
      meta={[
        { label: 'Campaign', value: <LinkButton onClick={() => navigate(`/campaigns/${distribution.campaignId}`)}>{distribution.campaignName}</LinkButton> },
        { label: 'Publisher', value: <LinkButton onClick={() => navigate(`/partners/${distribution.publisherId}`)}>{distribution.publisherName}</LinkButton> },
        { label: 'Rate', value: rate != null ? `${money(rate, currency)} per payable event` : 'Not set' },
        { label: 'Managed by', value: distribution.managerName || '—' },
        { label: 'Runs', value: `${distribution.startDate ? dateLabel(distribution.startDate) : 'No start date'} → ${distribution.endDate ? dateLabel(distribution.endDate) : 'ongoing'}` },
      ]}
      actions={
        <>
          <SecondaryButton onClick={() => setShowHistory(true)}>History</SecondaryButton>
          <SecondaryButton onClick={() => setShowEdit(true)}>Edit</SecondaryButton>
          <Menu items={[{ label: 'Delete distribution', danger: true, onClick: deleteDistribution }]} />
        </>
      }
    />

    <div className="grid grid-cols-1 gap-[21px]">

      <FlowStrip
        steps={[
          campaign.advertiserId
            ? { caption: 'Advertiser', label: campaign.advertiserName, sub: 'Gave us the campaign', to: `/partners/${campaign.advertiserId}`, tone: 'green' }
            : { caption: 'Source', label: 'Direct', sub: 'Our own campaign', tone: 'green' },
          { caption: 'Campaign', label: distribution.campaignName, sub: `${campaign.pricingModel} · ${currency}`, to: `/campaigns/${distribution.campaignId}` },
          { caption: 'Publisher', label: distribution.publisherName, sub: distribution.label || 'Runs it for us', current: true, tone: 'purple' },
        ]}
      />

      {distribution.notes && (
        <div className="rounded-[10px] border border-[#e6eaf0] bg-white px-4 py-3 text-[13px] text-[#475467] whitespace-pre-wrap">
          <span className="text-[#98a2b3] text-[11px] font-bold uppercase tracking-[.5px] mr-2">Notes</span>
          {distribution.notes}
        </div>
      )}

      {totals.mismatches > 0 && (
        <Callout tone="warning" title={`${totals.mismatches} month${totals.mismatches === 1 ? '' : 's'} where payout ≠ payable × rate`}>
          Fine if the rate changed mid-month or you agreed a different amount; otherwise check for a typo. Rows are marked below.
        </Callout>
      )}

      {months.length > 0 && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-[15px]">
          <Metric icon="⇣" type="blue" label="Total events" value={number(totals.totalEvents)} note="Sent by the publisher" />
          <Metric icon="✓" type="green" label="Payable events" value={number(totals.payableEvents)} note={`${number(scrubbed)} scrubbed`} />
          <Metric
            icon="★"
            type="purple"
            label="Approved by advertiser"
            value={totals.approvedEvents != null ? number(totals.approvedEvents) : '—'}
            note={totals.approvedEvents != null ? 'Used to split campaign revenue' : 'Optional, improves estimates'}
          />
          <Metric icon="↗" type="amber" label={`Total payout · ${currency}`} value={money(totals.payout, currency)} note="Including adjustments" />
        </section>
      )}

      <Card
        eyebrow="MONTH BY MONTH"
        title="Events & payout"
        description={`What this publisher sent and what we pay them each month. Revenue is entered on the campaign "${campaign.name}".`}
        actions={!entry && <PrimaryButton onClick={openNewMonth}>+ Add month</PrimaryButton>}
      >
        <div className="grid grid-cols-1 gap-4">
          <ErrorBox message={actionError} />

          {entry && (
            <form
              onSubmit={saveMonth}
              onKeyDown={(e) => e.key === 'Escape' && cancelEntry()}
              className="border border-[#adc0ff] bg-[#f8faff] rounded-[10px] p-4 grid gap-[15px]"
            >
              <div className="flex items-center justify-between gap-3">
                <strong className="text-[14px]">{entry.existing ? `Edit ${monthLabel(entry.month)}` : 'Add month'}</strong>
                <span className="text-[12px] text-[#667085]">
                  We owe for this month: <b className="text-[#172033] tabular-nums">{money(netPreview, currency)}</b>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[15px]">
                <Field label="Month" required>
                  <Input
                    type="month"
                    required
                    max={currentMonth()}
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
                    ? entry.payoutEdited
                      ? entryMismatch ? `⚠ Expected ${money(expected, currency)}` : 'Matches payable × rate'
                      : `${number(entry.payableEvents || 0)} × ${money(rate, currency)}`
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
                    className={entryMismatch ? '!border-[#f79009]' : ''}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_3fr] gap-[15px]">
                <Field label="Approved by advertiser" hint="Optional, from the advertiser's report">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={entry.approvedEvents}
                    onChange={(e) => setEntryField('approvedEvents', e.target.value)}
                    placeholder="—"
                  />
                </Field>
                <Field label="Notes">
                  <Input
                    value={entry.notes}
                    onChange={(e) => setEntryField('notes', e.target.value)}
                    placeholder="e.g. 120 events scrubbed for fraud, rate changed on the 15th"
                  />
                </Field>
              </div>

              {entry.showAdjustment ? (
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_3fr] gap-[15px] rounded-[9px] border border-dashed border-[#c8d0dd] p-3 bg-white">
                  <Field label={`Adjustment (${currency})`} hint="Negative to deduct, positive to add">
                    <Input
                      type="number"
                      step="0.01"
                      value={entry.adjustment}
                      onChange={(e) => setEntryField('adjustment', e.target.value)}
                      placeholder="-300"
                    />
                  </Field>
                  <Field label="Reason" required={Number(entry.adjustment || 0) !== 0}>
                    <Input
                      value={entry.adjustmentNote}
                      onChange={(e) => setEntryField('adjustmentNote', e.target.value)}
                      placeholder="e.g. Sep fraud deduction, advertiser rejected 300 installs"
                    />
                  </Field>
                </div>
              ) : (
                <div>
                  <LinkButton onClick={() => setEntryField('showAdjustment', true)}>+ Add adjustment (deduction / bonus)</LinkButton>
                </div>
              )}

              <div className="flex gap-[10px] justify-end">
                <SecondaryButton onClick={cancelEntry}>Cancel</SecondaryButton>
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
                { label: 'Total', align: 'right' },
                { label: 'Payable', align: 'right' },
                { label: 'Scrubbed', align: 'right' },
                { label: 'Approved', align: 'right', tip: "Of this publisher's events, how many the advertiser accepted. Optional; makes the campaign's revenue split more accurate." },
                { label: 'Payout', align: 'right', tip: 'What we owe this publisher for the month, including any adjustment.' },
                { label: 'Updated by' },
                { label: '' },
              ]}
            >
              {[...months].reverse().map((m) => (
                <Row key={m.month}>
                  <Td>
                    <div className="flex items-center gap-[6px]">
                      <strong>{monthLabel(m.month)}</strong>
                      {m.closed && <ClosedFlag />}
                    </div>
                    {m.notes && <div className="text-[#98a2b3] text-[11px] max-w-[240px] truncate" title={m.notes}>{m.notes}</div>}
                  </Td>
                  <Td align="right">{number(m.totalEvents)}</Td>
                  <Td align="right">{number(m.payableEvents)}</Td>
                  <Td align="right" className={m.scrubbedEvents > 0 ? 'text-[#d92d20]' : 'text-[#98a2b3]'}>
                    {number(m.scrubbedEvents)}
                    {m.totalEvents > 0 && m.scrubbedEvents > 0 && (
                      <div className="text-[11px] text-[#98a2b3]">{((m.scrubbedEvents / m.totalEvents) * 100).toFixed(1)}%</div>
                    )}
                  </Td>
                  <Td align="right">{m.approvedEvents != null ? number(m.approvedEvents) : <span className="text-[#c8d0dd]">—</span>}</Td>
                  <Td align="right">
                    <Money value={m.netPayout} currency={m.currency} />
                    {Number(m.adjustment) !== 0 && (
                      <div className="text-[11px] text-[#667085]" title={m.adjustmentNote || ''}>
                        incl. {Number(m.adjustment) > 0 ? '+' : ''}{money(m.adjustment, m.currency)} adj.
                      </div>
                    )}
                    {m.payoutMismatch && (
                      <div className="mt-[2px]">
                        <Flag title={`Payable × rate = ${money(m.expectedPayout, m.currency)}`}>≠ {money(m.expectedPayout, m.currency)}</Flag>
                      </div>
                    )}
                  </Td>
                  <Td className="text-[#667085] text-xs whitespace-nowrap">{m.updatedByName || '—'}</Td>
                  <Td className="whitespace-nowrap text-right">
                    {m.closed ? (
                      <span className="text-[#98a2b3] text-[11px]">Locked</span>
                    ) : (
                      <>
                        <LinkButton onClick={() => openEditMonth(m)}>Edit</LinkButton>
                        <span className="inline-block w-3" />
                        <LinkButton danger onClick={() => deleteMonth(m.month)}>Delete</LinkButton>
                      </>
                    )}
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
            toast('Distribution saved')
            reload()
          }}
        />
      )}

      {showHistory && (
        <HistoryModal
          title={`History · ${distribution.publisherName}`}
          filter={{ distributionId: id }}
          onClose={() => setShowHistory(false)}
        />
      )}

      {confirmDialog}
    </div>
    </>
  )
}
