import { useMemo, useState } from 'react'
import { api } from '../services/api'
import useLoad from '../lib/useLoad'
import { money } from '../lib/format'
import { makePeriod, periodLabel, periodQuery } from '../lib/period'
import { toast } from '../lib/toast'
import PageHeader from '../components/PageHeader'
import PeriodPicker from '../components/PeriodPicker'
import PaymentModal from '../components/PaymentModal'
import PaymentsTable from '../components/PaymentsTable'
import useConfirm from '../components/useConfirm'
import {
  Card, Empty, ErrorBox, Input, Loading, Metric, PrimaryButton, Select,
} from '../components/ui'

export default function Payments() {
  const [confirm, confirmDialog] = useConfirm()

  const [period, setPeriod] = useState(() => makePeriod('month'))
  const [direction, setDirection] = useState('')
  const [search, setSearch] = useState('')
  const [paymentForm, setPaymentForm] = useState(null) // { payment } or {}
  const [actionError, setActionError] = useState('')

  const query = periodQuery(period)
  const { data: payments, loading, error, reload } = useLoad(() => api.get(`/api/payments${query}`), [query])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return (payments || [])
      .filter((p) => !direction || (direction === 'WRITE_OFF' ? p.kind === 'WRITE_OFF' : p.direction === direction && p.kind === 'PAYMENT'))
      .filter((p) => !term || p.partnerName.toLowerCase().includes(term) || p.reference?.toLowerCase().includes(term))
  }, [payments, direction, search])

  // Cash in and out per currency (write-offs are not cash)
  const totals = useMemo(() => {
    const byCurrency = {}

    for (const p of payments || []) {
      const t = byCurrency[p.currency] || (byCurrency[p.currency] = { received: 0, paid: 0, deductions: 0, writtenOff: 0 })

      if (p.kind === 'WRITE_OFF') t.writtenOff += Number(p.amount)
      else if (p.direction === 'RECEIVED') t.received += Number(p.amount)
      else t.paid += Number(p.amount)

      t.deductions += Number(p.deduction || 0)
    }

    return Object.entries(byCurrency)
  }, [payments])

  const deletePayment = async (payment) => {
    const ok = await confirm({
      title: 'Delete this payment?',
      message: `${payment.partnerName}: ${money(payment.amount, payment.currency)}. Their balance goes back up by ${money(payment.cleared, payment.currency)}.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return

    try {
      await api.delete(`/api/payments/${payment.id}`)
      toast('Payment deleted')
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="MONEY"
        title="Payments"
        subtitle="Money that actually came in from advertisers and went out to publishers."
        actions={
          <>
            <PeriodPicker value={period} onChange={setPeriod} />
            <PrimaryButton onClick={() => setPaymentForm({})}>+ Record payment</PrimaryButton>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-[21px]">
        <ErrorBox message={error || actionError} />

        {totals.map(([currency, t]) => (
          <section key={currency} className="grid grid-cols-2 lg:grid-cols-4 gap-[15px]">
            <Metric icon="↙" type="green" label={`Received · ${currency}`} value={money(t.received, currency)} note="Cash in from advertisers" />
            <Metric icon="↗" type="amber" label={`Paid · ${currency}`} value={money(t.paid, currency)} note="Cash out to publishers" />
            <Metric
              icon="◆"
              type={t.received - t.paid >= 0 ? 'blue' : 'red'}
              label={`Net cash · ${currency}`}
              value={money(t.received - t.paid, currency)}
              valueClass={t.received - t.paid < 0 ? 'text-[#d92d20]' : ''}
              note="Received − paid"
            />
            <Metric icon="✕" type="purple" label={`Deductions & write-offs`} value={money(t.deductions + t.writtenOff, currency)} note={`${money(t.deductions, currency)} tax/fees · ${money(t.writtenOff, currency)} written off`} />
          </section>
        ))}

        <Card
          eyebrow={periodLabel(period).toUpperCase()}
          title={`${filtered.length} payment${filtered.length === 1 ? '' : 's'}`}
          actions={
            <>
              <Input placeholder="Search partner or reference" value={search} onChange={(e) => setSearch(e.target.value)} className="!w-[230px]" />
              <Select value={direction} onChange={(e) => setDirection(e.target.value)} className="!w-[150px]">
                <option value="">All types</option>
                <option value="RECEIVED">Received</option>
                <option value="PAID">Paid</option>
                <option value="WRITE_OFF">Write-offs</option>
              </Select>
            </>
          }
        >
          {loading && !payments ? (
            <Loading />
          ) : (
            <PaymentsTable
              showPartner
              payments={filtered}
              onEdit={(payment) => setPaymentForm({ payment })}
              onDelete={deletePayment}
              empty={
                <Empty
                  title={`No payments · ${periodLabel(period)}`}
                  text="Record money as it arrives or goes out. Partner balances update right away."
                  action={<PrimaryButton onClick={() => setPaymentForm({})}>+ Record payment</PrimaryButton>}
                />
              }
            />
          )}
        </Card>
      </div>

      {paymentForm && (
        <PaymentModal
          payment={paymentForm.payment}
          onClose={() => setPaymentForm(null)}
          onSaved={() => {
            setPaymentForm(null)
            reload()
          }}
        />
      )}

      {confirmDialog}
    </>
  )
}
