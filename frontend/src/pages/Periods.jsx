import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import useLoad from '../lib/useLoad'
import { isAdmin } from '../lib/auth'
import { currentMonth, dateLabel, money, monthLabel } from '../lib/format'
import { addMonths } from '../lib/period'
import { toast } from '../lib/toast'
import useConfirm from '../components/useConfirm'
import PageHeader from '../components/PageHeader'
import {
  Callout, Card, ErrorBox, Flag, Input, Loading, Money, PrimaryButton, Row, SecondaryButton, Table, Td,
} from '../components/ui'

const MONTHS_SHOWN = 12

export default function Periods() {
  const navigate = useNavigate()
  const [confirm, confirmDialog] = useConfirm()
  const [actionError, setActionError] = useState('')

  const to = currentMonth()
  const from = addMonths(to, -(MONTHS_SHOWN - 1))

  const { data, loading, error, reload } = useLoad(async () => {
    const [summary, closed, rates] = await Promise.all([
      api.get(`/api/finance/summary?from=${from}&to=${to}`),
      api.get('/api/periods/closed'),
      api.get(`/api/periods/rates?from=${from}&to=${to}`),
    ])
    return { summary, closed, rates }
  }, [from, to])

  const header = (
    <PageHeader
      eyebrow="MONEY"
      title="Month close"
      subtitle="Once a month's numbers are final and invoiced, close it so nobody changes them by accident."
    />
  )

  if (loading && !data) return <>{header}<Loading /></>
  if (error) return <>{header}<ErrorBox message={error} /></>

  const { summary, closed, rates } = data
  const base = summary.baseCurrency
  const closedByMonth = Object.fromEntries(closed.map((c) => [c.month, c]))
  const convertedByMonth = Object.fromEntries(summary.convertedMonths.map((m) => [m.month, m]))

  // Per month: warnings that make closing premature
  const checks = {}
  for (const m of summary.months) {
    const c = checks[m.month] || (checks[m.month] = { missingRevenue: 0, missingPayouts: 0 })
    c.missingRevenue += m.campaignsMissingRevenue
    c.missingPayouts += m.campaignsMissingPayouts
  }

  const foreign = [...new Set(summary.months.map((m) => m.currency).filter((c) => c !== base))].sort()
  const rateByKey = Object.fromEntries(rates.map((r) => [`${r.month}|${r.currency}`, r]))
  const monthList = Array.from({ length: MONTHS_SHOWN }, (_, i) => addMonths(to, -i))

  const closeMonth = async (month) => {
    const c = checks[month] || { missingRevenue: 0, missingPayouts: 0 }
    const missingRates = foreign.filter((cur) => summary.months.some((m) => m.month === month && m.currency === cur) && !rateByKey[`${month}|${cur}`])

    const warnings = [
      c.missingRevenue && `${c.missingRevenue} campaign${c.missingRevenue === 1 ? '' : 's'} without revenue`,
      c.missingPayouts && `${c.missingPayouts} campaign${c.missingPayouts === 1 ? '' : 's'} without publisher payouts`,
      missingRates.length && `no ${missingRates.join(', ')} rate`,
    ].filter(Boolean)

    const ok = await confirm({
      title: `Close ${monthLabel(month)}?`,
      message: warnings.length
        ? `Heads up: ${warnings.join(', ')}. Close anyway? Revenue, payouts and rates for ${monthLabel(month)} will be locked until an admin reopens it.`
        : `Revenue, payouts and rates for ${monthLabel(month)} will be locked until an admin reopens it. Later corrections can be booked as adjustments in an open month.`,
      confirmLabel: 'Close month',
      danger: warnings.length > 0,
    })
    if (!ok) return

    try {
      await api.put(`/api/periods/${month}/close`, {})
      toast(`${monthLabel(month)} closed`)
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const reopenMonth = async (month) => {
    const ok = await confirm({
      title: `Reopen ${monthLabel(month)}?`,
      message: 'Its numbers become editable again. The reopen is recorded in the history.',
      confirmLabel: 'Reopen',
    })
    if (!ok) return

    try {
      await api.delete(`/api/periods/${month}/close`)
      toast(`${monthLabel(month)} reopened`)
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  return (
    <>
      {header}

      <div className="grid grid-cols-1 gap-[21px]">
        <ErrorBox message={actionError} />

        {!isAdmin() && (
          <Callout tone="info">Only admins can close or reopen a month. You can see which months are locked here.</Callout>
        )}

        <Card
          eyebrow={`LAST ${MONTHS_SHOWN} MONTHS · ${base}`}
          title="Month status"
          description="Checks flag what is still missing before a month's profit is final."
        >
          <Table
            columns={[
              { label: 'Month' },
              { label: 'Revenue', align: 'right' },
              { label: 'Cost', align: 'right' },
              { label: 'Profit', align: 'right' },
              { label: 'Checks' },
              { label: 'Status' },
              { label: '' },
            ]}
          >
            {monthList.map((month) => {
              const converted = convertedByMonth[month]
              const c = checks[month]
              const close = closedByMonth[month]
              const hasData = Boolean(converted)
              const missingRates = foreign.filter((cur) => summary.months.some((m) => m.month === month && m.currency === cur) && !rateByKey[`${month}|${cur}`])

              return (
                <Row key={month} onClick={hasData ? () => navigate(`/finance?month=${month}`) : undefined}>
                  <Td><strong>{monthLabel(month)}</strong>{month === to && <span className="text-[11px] text-[#98a2b3]"> · this month</span>}</Td>
                  <Td align="right">{hasData ? <Money value={converted.revenue} currency={base} /> : <span className="text-[#c8d0dd]">—</span>}</Td>
                  <Td align="right">{hasData ? <Money value={converted.cost} currency={base} /> : <span className="text-[#c8d0dd]">—</span>}</Td>
                  <Td align="right">{hasData ? <Money value={converted.profit} currency={base} signed /> : <span className="text-[#c8d0dd]">—</span>}</Td>
                  <Td>
                    <div className="flex gap-1 flex-wrap">
                      {!hasData && <span className="text-[11px] text-[#98a2b3]">Nothing entered</span>}
                      {c?.missingRevenue > 0 && <Flag>{c.missingRevenue} missing revenue</Flag>}
                      {c?.missingPayouts > 0 && <Flag>{c.missingPayouts} missing payouts</Flag>}
                      {missingRates.length > 0 && <Flag tone="info">No {missingRates.join(', ')} rate</Flag>}
                      {hasData && !c?.missingRevenue && !c?.missingPayouts && missingRates.length === 0 && (
                        month === to
                          ? <Flag tone="gray">In progress</Flag>
                          : <Flag tone="success" icon="✓">Complete</Flag>
                      )}
                    </div>
                  </Td>
                  <Td className="text-xs">
                    {close ? (
                      <span className="text-[#475467]">
                        🔒 Closed
                        <span className="block text-[11px] text-[#98a2b3]">{close.closedByName} · {dateLabel(close.closedAt)}</span>
                      </span>
                    ) : (
                      <span className="text-[#98a2b3]">Open</span>
                    )}
                  </Td>
                  <Td className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {isAdmin() && (close ? (
                      <SecondaryButton onClick={() => reopenMonth(month)} className="!py-[6px] !px-3 !text-[12px]">Reopen</SecondaryButton>
                    ) : hasData && month !== to ? (
                      <PrimaryButton onClick={() => closeMonth(month)} className="!py-[7px] !px-3 !text-[12px] !shadow-none">Close</PrimaryButton>
                    ) : null)}
                  </Td>
                </Row>
              )
            })}
          </Table>
        </Card>

        <RatesCard
          base={base}
          currencies={foreign}
          months={monthList}
          rateByKey={rateByKey}
          closedByMonth={closedByMonth}
          onSaved={reload}
          onError={setActionError}
        />
      </div>

      {confirmDialog}
    </>
  )
}

/* ----------------------------- */
/* Exchange rates                */
/* ----------------------------- */

function RatesCard({ base, currencies, months, rateByKey, closedByMonth, onSaved, onError }) {
  const [drafts, setDrafts] = useState({})
  const [saving, setSaving] = useState('')

  if (currencies.length === 0) {
    return (
      <Card eyebrow="EXCHANGE RATES" title={`Everything is in ${base}`}>
        <p className="m-0 text-[13px] text-[#667085]">
          No campaign uses another currency, so no rates are needed. If you add a campaign in another currency, enter its
          monthly rate here and company totals will add up in {base}.
        </p>
      </Card>
    )
  }

  const save = async (month, currency) => {
    const key = `${month}|${currency}`
    const value = drafts[key]
    if (!value) return

    setSaving(key)
    try {
      await api.put(`/api/periods/${month}/rates/${currency}`, { rate: Number(value), version: rateByKey[key]?.version })
      toast(`${currency} rate for ${monthLabel(month)} saved`)
      setDrafts((old) => ({ ...old, [key]: undefined }))
      onSaved()
    } catch (err) {
      onError(err.message)
    } finally {
      setSaving('')
    }
  }

  return (
    <Card
      eyebrow="EXCHANGE RATES"
      title={`Monthly rates into ${base}`}
      description={`1 unit of each currency = how many ${base}. Used only to add company totals into one number.`}
    >
      <Table columns={[{ label: 'Month' }, ...currencies.map((c) => ({ label: `1 ${c} = ? ${base}` }))]}>
        {months.map((month) => (
          <Row key={month}>
            <Td><strong>{monthLabel(month)}</strong></Td>
            {currencies.map((currency) => {
              const key = `${month}|${currency}`
              const saved = rateByKey[key]
              const locked = Boolean(closedByMonth[month])
              const draft = drafts[key]

              return (
                <Td key={currency}>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.0001"
                      disabled={locked || !isAdmin()}
                      value={draft ?? (saved ? String(Number(saved.rate)) : '')}
                      onChange={(e) => setDrafts((old) => ({ ...old, [key]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && save(month, currency)}
                      placeholder="—"
                      className="!w-[120px] !min-h-[34px] !py-[6px]"
                    />
                    {draft !== undefined && draft !== '' && (
                      <SecondaryButton onClick={() => save(month, currency)} disabled={saving === key} className="!py-[6px] !px-3 !text-[12px]">
                        {saving === key ? '…' : 'Save'}
                      </SecondaryButton>
                    )}
                    {saved && draft === undefined && (
                      <span className="text-[11px] text-[#98a2b3]">{money(1, currency)} = {money(saved.rate, base)}</span>
                    )}
                  </div>
                </Td>
              )
            })}
          </Row>
        ))}
      </Table>
    </Card>
  )
}
