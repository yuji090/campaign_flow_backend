import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api'
import useLoad from '../lib/useLoad'
import { isAdmin } from '../lib/auth'
import { dateLabel, money, monthLabel, number } from '../lib/format'
import { toast } from '../lib/toast'
import PartnerModal from '../components/PartnerModal'
import PaymentModal from '../components/PaymentModal'
import HistoryModal from '../components/HistoryModal'
import PaymentsTable from '../components/PaymentsTable'
import useConfirm from '../components/useConfirm'
import PageHeader from '../components/PageHeader'
import PeriodPicker from '../components/PeriodPicker'
import { makePeriod, periodLabel, periodQuery } from '../lib/period'
import {
  Card, Empty, ErrorBox, Loading, Menu, Metric, Money, PrimaryButton, Row, SecondaryButton,
  Status, Table, Tabs, Tag, Td,
} from '../components/ui'

const TYPE_LABELS = { AGENCY: 'Agency', NETWORK: 'Network', DIRECT_BRAND: 'Direct brand' }

export default function PartnerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [confirm, confirmDialog] = useConfirm()

  const [period, setPeriod] = useState(() => makePeriod('all'))
  const [tab, setTab] = useState('months')
  const [showEdit, setShowEdit] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [paymentForm, setPaymentForm] = useState(null) // { preset } or { payment }
  const [actionError, setActionError] = useState('')

  const { data: partner, loading, error, reload } = useLoad(() => api.get(`/api/partners/${id}`), [id])

  const query = periodQuery(period)

  const { data: summary, loading: summaryLoading, error: summaryError, reload: reloadSummary } = useLoad(
    () => api.get(`/api/partners/${id}/summary${query}`),
    [id, query]
  )

  const { data: payments, reload: reloadPayments } = useLoad(() => api.get(`/api/payments?partnerId=${id}`), [id])

  if (loading && !partner) return <Loading />
  if (error) return <ErrorBox message={error} />

  const deactivate = async () => {
    const ok = await confirm({
      title: `Deactivate ${partner.companyName}?`,
      message: 'They will be hidden from dropdowns. All their campaigns, distributions and history are kept.',
      confirmLabel: 'Deactivate',
      danger: true,
    })
    if (!ok) return

    try {
      await api.delete(`/api/partners/${id}`)
      toast(`${partner.companyName} deactivated`)
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const deletePayment = async (payment) => {
    const ok = await confirm({
      title: 'Delete this payment?',
      message: `${money(payment.amount, payment.currency)} on ${dateLabel(payment.date)}. The balance goes back up by ${money(payment.cleared, payment.currency)}.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return

    try {
      await api.delete(`/api/payments/${payment.id}`)
      toast('Payment deleted')
      await Promise.all([reloadPayments(), reloadSummary()])
    } catch (err) {
      setActionError(err.message)
    }
  }

  const roles = [partner.advertiser && 'gives us campaigns', partner.publisher && 'runs our campaigns'].filter(Boolean)
  const balances = summary?.balances || []

  // { receivable: { USD: 2600 }, payable: { USD: 0 } } for the payment form
  const outstanding = {
    receivable: Object.fromEntries(balances.map((b) => [b.currency, Number(b.outstandingReceivable)])),
    payable: Object.fromEntries(balances.map((b) => [b.currency, Number(b.outstandingPayable)])),
  }

  return (
    <>
    <PageHeader
      back="/partners"
      crumbs={[{ label: 'Partners', to: '/partners' }, { label: partner.companyName }]}
      eyebrow={TYPE_LABELS[partner.type]?.toUpperCase() || 'PARTNER'}
      title={partner.companyName}
      badges={
        <>
          {partner.advertiser && <Tag>Advertiser</Tag>}
          {partner.publisher && <Tag color="purple">Publisher</Tag>}
          <Status status={partner.active ? 'ACTIVE' : 'INACTIVE'} />
        </>
      }
      subtitle={`${TYPE_LABELS[partner.type] || 'Partner'} that ${roles.join(' and ')}`}
      meta={[
        { label: 'Handled by', value: partner.employees.map((e) => e.name).join(', ') || '—' },
        partner.contactPerson && { label: 'Contact', value: partner.contactPerson },
        partner.email && { label: 'Email', value: <a className="text-[#3563e9] no-underline" href={`mailto:${partner.email}`}>{partner.email}</a> },
        partner.phone && { label: 'Phone', value: partner.phone },
        partner.messenger && { label: 'Skype / Telegram', value: partner.messenger },
        partner.website && { label: 'Website', value: partner.website },
      ].filter(Boolean)}
      actions={
        <>
          <SecondaryButton onClick={() => setShowHistory(true)}>History</SecondaryButton>
          <SecondaryButton onClick={() => setShowEdit(true)}>Edit</SecondaryButton>
          <PrimaryButton onClick={() => setPaymentForm({ preset: {} })}>+ Record payment</PrimaryButton>
          <Menu items={[{ label: 'Deactivate partner', danger: true, hidden: !isAdmin() || !partner.active, onClick: deactivate }]} />
        </>
      }
    />

    <div className="grid grid-cols-1 gap-[21px]">
      <ErrorBox message={actionError} />

      {partner.notes && (
        <div className="rounded-[10px] border border-[#e6eaf0] bg-white px-4 py-3 text-[13px] text-[#475467] whitespace-pre-wrap">
          <span className="text-[#98a2b3] text-[11px] font-bold uppercase tracking-[.5px] mr-2">Notes</span>
          {partner.notes}
        </div>
      )}

      {/* Balance today: all time, after payments */}
      <Card
        eyebrow="BALANCE TODAY · ALL TIME"
        title="What is still open"
        description="Everything billed so far, minus payments and write-offs. Not affected by the period below."
      >
        {balances.length === 0 ? (
          <Empty title="Nothing billed or paid yet" text="Balances appear once revenue, payouts or payments are entered." />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {balances.map((b) => (
              <div key={b.currency} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {(partner.advertiser || Number(b.billedReceivable) !== 0) && (
                  <BalanceSide
                    title="They owe us"
                    tone="green"
                    currency={b.currency}
                    billed={b.billedReceivable}
                    settled={b.received}
                    writtenOff={b.writtenOffReceivable}
                    outstanding={b.outstandingReceivable}
                    settledLabel="Received"
                    onPay={() => setPaymentForm({ preset: { direction: 'RECEIVED', currency: b.currency } })}
                    payLabel="Record receipt"
                    onClear={() => setPaymentForm({ preset: { direction: 'RECEIVED', kind: 'WRITE_OFF', currency: b.currency, amount: Number(b.outstandingReceivable) } })}
                  />
                )}
                {(partner.publisher || Number(b.billedPayable) !== 0) && (
                  <BalanceSide
                    title="We owe them"
                    tone="amber"
                    currency={b.currency}
                    billed={b.billedPayable}
                    settled={b.paid}
                    writtenOff={b.writtenOffPayable}
                    outstanding={b.outstandingPayable}
                    settledLabel="Paid"
                    onPay={() => setPaymentForm({ preset: { direction: 'PAID', currency: b.currency, amount: Math.max(0, Number(b.outstandingPayable)) } })}
                    payLabel="Record payout"
                    onClear={() => setPaymentForm({ preset: { direction: 'PAID', kind: 'WRITE_OFF', currency: b.currency, amount: Number(b.outstandingPayable) } })}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Period */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[#3563e9] font-extrabold text-[10px] tracking-[1.1px]">
          ACTIVITY · {periodLabel(period).toUpperCase()}
        </div>
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      <ErrorBox message={summaryError} />

      {summaryLoading && !summary ? (
        <Loading />
      ) : summary && (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-[15px]">
            <Metric icon="◫" type="blue" label="Campaigns taken" value={summary.campaignsTaken} note={`${summary.campaignsTakenLive} live · we took from them`} />
            <Metric icon="⇄" type="purple" label="Campaigns running" value={summary.campaignsRunning} note={`${summary.campaignsRunningActive} active · they run for us`} />
            {summary.totals.map((t) => (
              <Metric
                key={`r-${t.currency}`}
                icon="↙"
                type="green"
                label={`Billed to them · ${t.currency}`}
                value={money(t.receivable, t.currency)}
                note="Revenue from their campaigns"
              />
            ))}
            {summary.totals.map((t) => (
              <Metric
                key={`p-${t.currency}`}
                icon="↗"
                type="amber"
                label={`Billed by them · ${t.currency}`}
                value={money(t.payable, t.currency)}
                note="Payout on their distributions"
              />
            ))}
          </section>

          <Card>
            <div className="-mt-2 mb-4">
              <Tabs
                value={tab}
                onChange={setTab}
                tabs={[
                  { id: 'months', label: 'Month by month', count: summary.months.length },
                  partner.advertiser && { id: 'campaigns', label: 'Campaigns from them', count: summary.campaigns.length },
                  partner.publisher && { id: 'distributions', label: 'Running for us', count: summary.distributions.length },
                  { id: 'payments', label: 'Payments', count: payments?.length ?? 0 },
                ].filter(Boolean)}
              />
            </div>

            {tab === 'months' && (
              summary.months.length === 0 ? (
                <Empty title="No money recorded" text="Nothing has been entered for this period yet." />
              ) : (
                <Table
                  columns={[
                    { label: 'Month' },
                    { label: 'Billed to them', align: 'right' },
                    { label: 'Billed by them', align: 'right' },
                    { label: 'Net', align: 'right' },
                  ]}
                >
                  {[...summary.months].reverse().map((m) => (
                    <Row key={`${m.month}-${m.currency}`}>
                      <Td><strong>{monthLabel(m.month)}</strong></Td>
                      <Td align="right"><Money value={m.receivable} currency={m.currency} /></Td>
                      <Td align="right"><Money value={m.payable} currency={m.currency} /></Td>
                      <Td align="right"><Money value={m.net} currency={m.currency} signed /></Td>
                    </Row>
                  ))}
                </Table>
              )
            )}

            {tab === 'campaigns' && (
              summary.campaigns.length === 0 ? (
                <Empty title="No campaigns from them yet" />
              ) : (
                <Table columns={[{ label: 'Campaign' }, { label: 'Status' }, { label: 'Approved events', align: 'right' }, { label: 'Revenue', align: 'right' }]}>
                  {summary.campaigns.map((c) => (
                    <Row key={c.campaignId} onClick={() => navigate(`/campaigns/${c.campaignId}`)}>
                      <Td><strong>{c.campaignName}</strong></Td>
                      <Td><Status status={c.status} /></Td>
                      <Td align="right">{number(c.events)}</Td>
                      <Td align="right">
                        {Number(c.revenue) !== 0
                          ? <Money value={c.revenue} currency={c.currency} />
                          : <span className="text-[#98a2b3] text-xs">No revenue entered</span>}
                      </Td>
                    </Row>
                  ))}
                </Table>
              )
            )}

            {tab === 'distributions' && (
              summary.distributions.length === 0 ? (
                <Empty title="Nothing distributed to them yet" />
              ) : (
                <Table
                  columns={[
                    { label: 'Campaign' },
                    { label: 'Status' },
                    { label: 'Total events', align: 'right' },
                    { label: 'Payable', align: 'right' },
                    { label: 'Payout', align: 'right' },
                  ]}
                >
                  {summary.distributions.map((d) => (
                    <Row key={d.distributionId} onClick={() => navigate(`/distributions/${d.distributionId}`)}>
                      <Td>
                        <strong>{d.campaignName}</strong>
                        <div className="text-[#98a2b3] text-[11px]">{d.label || `Distribution #${d.distributionId}`}</div>
                      </Td>
                      <Td><Status status={d.status} /></Td>
                      <Td align="right">{number(d.totalEvents)}</Td>
                      <Td align="right">{number(d.payableEvents)}</Td>
                      <Td align="right"><Money value={d.payout} currency={d.currency} /></Td>
                    </Row>
                  ))}
                </Table>
              )
            )}

            {tab === 'payments' && (
              <PaymentsTable
                payments={payments || []}
                onEdit={(payment) => setPaymentForm({ payment })}
                onDelete={deletePayment}
                empty={<Empty title="No payments yet" text="Record money received or paid with + Record payment." />}
              />
            )}
          </Card>
        </>
      )}

      {showEdit && (
        <PartnerModal
          partner={partner}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false)
            toast('Partner saved')
            reload()
          }}
        />
      )}

      {paymentForm && (
        <PaymentModal
          partner={partner}
          payment={paymentForm.payment}
          preset={paymentForm.preset}
          outstanding={outstanding}
          onClose={() => setPaymentForm(null)}
          onSaved={() => {
            setPaymentForm(null)
            setTab('payments')
            reloadPayments()
            reloadSummary()
          }}
        />
      )}

      {showHistory && (
        <HistoryModal title={`History · ${partner.companyName}`} filter={{ partnerId: id }} onClose={() => setShowHistory(false)} />
      )}

      {confirmDialog}
    </div>
    </>
  )
}

/* ----------------------------- */
/* One side of the balance       */
/* ----------------------------- */

function BalanceSide({ title, tone, currency, billed, settled, writtenOff, outstanding, settledLabel, onPay, payLabel, onClear }) {
  const open = Number(outstanding)
  const accent = tone === 'green' ? 'text-[#0f9f6e]' : 'text-[#dc6803]'

  return (
    <div className="rounded-[10px] border border-[#e6eaf0] p-4 grid gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[.6px] text-[#667085]">{title} · {currency}</div>
          <div className={`text-[26px] font-extrabold tracking-[-.5px] tabular-nums mt-1 ${open === 0 ? 'text-[#98a2b3]' : open < 0 ? 'text-[#3563e9]' : accent}`}>
            {money(Math.abs(open), currency)}
          </div>
          <div className="text-[11px] text-[#98a2b3] mt-[2px]">
            {open === 0 ? 'Settled' : open < 0 ? 'Paid in advance (more than billed)' : 'Outstanding'}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <SecondaryButton onClick={onPay} className="!py-2 !px-3 !text-[12px]">{payLabel}</SecondaryButton>
          {open > 0 && (
            <SecondaryButton onClick={onClear} className="!py-2 !px-3 !text-[12px]" title="Write off what is left, e.g. a small difference">
              Clear outstanding
            </SecondaryButton>
          )}
        </div>
      </div>

      <dl className="m-0 grid grid-cols-3 gap-2 text-[12px] border-t border-[#eef1f5] pt-3">
        <div>
          <dt className="text-[#98a2b3]">Billed</dt>
          <dd className="m-0 font-semibold tabular-nums">{money(billed, currency)}</dd>
        </div>
        <div>
          <dt className="text-[#98a2b3]">{settledLabel}</dt>
          <dd className="m-0 font-semibold tabular-nums">{money(settled, currency)}</dd>
        </div>
        <div>
          <dt className="text-[#98a2b3]">Written off</dt>
          <dd className="m-0 font-semibold tabular-nums">{money(writtenOff, currency)}</dd>
        </div>
      </dl>
    </div>
  )
}
