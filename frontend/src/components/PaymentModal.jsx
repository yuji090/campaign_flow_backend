import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { money, todayIso } from '../lib/format'
import { toast } from '../lib/toast'
import {
  Callout, ErrorBox, Field, FormGrid, Input, Modal, PrimaryButton, SecondaryButton, Select, Textarea,
} from './ui'

const today = todayIso

/**
 * Record money received / paid, or write off a balance.
 *   partner:     fixed partner (from the partner page); otherwise a dropdown is shown
 *   payment:     edit an existing payment
 *   preset:      { direction, kind, amount, currency } to pre-fill, e.g. "Clear outstanding"
 *   outstanding: { receivable: { USD: 2600 }, payable: { USD: 0 } } shown as a guide
 */
export default function PaymentModal({ partner, payment, preset = {}, outstanding, onClose, onSaved }) {
  const editing = Boolean(payment)

  const [form, setForm] = useState(() => ({
    partnerId: payment ? String(payment.partnerId) : partner ? String(partner.id) : '',
    direction: payment?.direction || preset.direction || (partner && !partner.advertiser ? 'PAID' : 'RECEIVED'),
    kind: payment?.kind || preset.kind || 'PAYMENT',
    amount: payment ? String(payment.amount) : preset.amount != null ? String(preset.amount) : '',
    deduction: payment ? String(payment.deduction || '') : '',
    currency: payment?.currency || preset.currency || 'USD',
    date: payment?.date || today(),
    reference: payment?.reference || '',
    notes: payment?.notes || '',
  }))

  const [partners, setPartners] = useState(partner ? [partner] : [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (partner) return
    api.get('/api/partners')
      .then((data) => setPartners(data.filter((p) => p.active || p.id === payment?.partnerId)))
      .catch((err) => setError(err.message))
  }, [partner, payment?.partnerId])

  const setField = (field, value) => setForm((old) => ({ ...old, [field]: value }))

  const selected = partners.find((p) => String(p.id) === form.partnerId)
  const writeOff = form.kind === 'WRITE_OFF'
  const received = form.direction === 'RECEIVED'

  // Outstanding in the chosen direction and currency, as a guide while typing
  const open = outstanding?.[received ? 'receivable' : 'payable']?.[form.currency]
  const cleared = Number(form.amount || 0) + (writeOff ? 0 : Number(form.deduction || 0))

  const save = async () => {
    if (!form.partnerId) {
      setError('Select a partner')
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      partnerId: Number(form.partnerId),
      direction: form.direction,
      kind: form.kind,
      amount: Number(form.amount),
      deduction: writeOff ? 0 : Number(form.deduction || 0),
      currency: form.currency.trim().toUpperCase(),
      date: form.date,
      reference: form.reference,
      notes: form.notes,
      version: payment?.version,
    }

    try {
      const saved = editing
        ? await api.put(`/api/payments/${payment.id}`, payload)
        : await api.post('/api/payments', payload)

      toast(writeOff ? 'Write-off recorded' : received ? 'Payment received recorded' : 'Payment made recorded')
      onSaved(saved)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const title = editing
    ? 'Edit payment'
    : writeOff ? 'Write off balance' : received ? 'Record money received' : 'Record money paid'

  return (
    <Modal
      wide
      title={title}
      description={writeOff
        ? 'Clears part of the balance without money moving, e.g. a small difference you agreed to let go.'
        : 'Payments clear the partner’s total balance in this currency.'}
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={save} disabled={saving || !form.amount}>
            {saving ? 'Saving…' : editing ? 'Save changes' : writeOff ? 'Write off' : 'Record payment'}
          </PrimaryButton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4">
        <ErrorBox message={error} />

        <FormGrid>
          {!partner && (
            <Field label="Partner" required>
              <Select value={form.partnerId} onChange={(e) => setField('partnerId', e.target.value)}>
                <option value="">Select a partner</option>
                {partners.map((p) => <option key={p.id} value={p.id}>{p.companyName}</option>)}
              </Select>
            </Field>
          )}

          <Field label="Direction" required>
            <Select value={form.direction} onChange={(e) => setField('direction', e.target.value)}>
              <option value="RECEIVED" disabled={selected && !selected.advertiser}>They paid us (advertiser)</option>
              <option value="PAID" disabled={selected && !selected.publisher}>We paid them (publisher)</option>
            </Select>
          </Field>

          <Field label="Type">
            <Select value={form.kind} onChange={(e) => setField('kind', e.target.value)}>
              <option value="PAYMENT">Payment (money moved)</option>
              <option value="WRITE_OFF">Write-off (no money, clear balance)</option>
            </Select>
          </Field>

          <Field
            label={writeOff ? `Amount to write off (${form.currency})` : `Amount ${received ? 'received' : 'paid'} (${form.currency})`}
            required
            hint={open != null ? `Outstanding: ${money(open, form.currency)}` : null}
          >
            <Input
              type="number"
              min="0"
              step="0.01"
              autoFocus
              value={form.amount}
              onChange={(e) => setField('amount', e.target.value)}
              placeholder="0.00"
            />
          </Field>

          {!writeOff && (
            <Field label={`Deduction (${form.currency})`} hint="Tax withheld (TDS), bank or gateway fees">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.deduction}
                onChange={(e) => setField('deduction', e.target.value)}
                placeholder="0.00"
              />
            </Field>
          )}

          <Field label="Currency" required>
            <Input
              maxLength={3}
              value={form.currency}
              onChange={(e) => setField('currency', e.target.value.toUpperCase())}
            />
          </Field>

          <Field label="Date" required>
            <Input type="date" value={form.date} max={today()} onChange={(e) => setField('date', e.target.value)} />
          </Field>

          <Field label="Reference" hint="Invoice no., bank / UTR / transaction id">
            <Input value={form.reference} onChange={(e) => setField('reference', e.target.value)} placeholder="INV-0042" />
          </Field>

          <Field label={writeOff ? 'Reason' : 'Notes'} full>
            <Textarea
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder={writeOff ? 'e.g. agreed to let the last $200 go after the Sep dispute' : 'Anything to remember'}
            />
          </Field>
        </FormGrid>

        {cleared > 0 && open != null && (
          <Callout tone={cleared > Number(open) + 0.005 ? 'warning' : 'info'}>
            Clears <b>{money(cleared, form.currency)}</b> of {money(open, form.currency)} outstanding
            {cleared > Number(open) + 0.005
              ? ' — more than what is open, so the extra shows as an advance.'
              : `, leaving ${money(Number(open) - cleared, form.currency)}.`}
          </Callout>
        )}
      </div>
    </Modal>
  )
}
