import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { getUser } from '../lib/auth'
import { toNumberOrNull } from '../lib/format'
import {
  ErrorBox, Field, FormGrid, Input, Modal, PrimaryButton, SecondaryButton, Select, Textarea,
} from './ui'

const STATUSES = ['ACTIVE', 'PAUSED', 'COMPLETED']

// Create (pass campaign) or edit (pass distribution) a distribution
export default function DistributionModal({ campaign, distribution, onClose, onSaved }) {
  const editing = Boolean(distribution)
  const currency = distribution?.currency || campaign?.currency || 'USD'

  // The campaign's advertiser cannot also be its publisher
  const advertiserId = campaign?.advertiserId

  const [form, setForm] = useState(() => ({
    publisherId: distribution ? String(distribution.publisherId) : '',
    label: distribution?.label || '',
    managerId: distribution?.managerId
      ? String(distribution.managerId)
      : getUser()?.id ? String(getUser().id) : '',
    payout: distribution?.payout ?? '',
    status: distribution?.status || 'ACTIVE',
    startDate: distribution?.startDate || '',
    endDate: distribution?.endDate || '',
    notes: distribution?.notes || '',
  }))

  const [publishers, setPublishers] = useState([])
  const [users, setUsers] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.get('/api/partners?role=PUBLISHER'), api.get('/api/users')])
      .then(([publisherData, userData]) => {
        setPublishers(publisherData.filter((p) =>
          (p.active || p.id === distribution?.publisherId) && p.id !== advertiserId
        ))
        setUsers(userData.filter((u) => u.enabled))
      })
      .catch((err) => setError(err.message))
  }, [distribution?.publisherId, advertiserId])

  const setField = (field, value) => setForm((old) => ({ ...old, [field]: value }))

  const save = async () => {
    if (!form.publisherId) {
      setError('Select a publisher')
      return
    }

    const payload = {
      publisherId: Number(form.publisherId),
      label: form.label,
      managerId: toNumberOrNull(form.managerId),
      payout: toNumberOrNull(form.payout),
      status: form.status,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      notes: form.notes,
    }

    setSaving(true)
    setError('')

    try {
      const saved = editing
        ? await api.put(`/api/distributions/${distribution.id}`, payload)
        : await api.post('/api/distributions', { ...payload, campaignId: campaign.id })

      onSaved(saved)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal
      wide
      title={editing ? 'Edit distribution' : 'Distribute campaign'}
      description={editing
        ? `${distribution.campaignName} → ${distribution.publisherName}`
        : `Give ${campaign.name} to a publisher`}
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={save} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create distribution'}
          </PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4">
        <ErrorBox message={error} />

        <FormGrid>
          <Field
            label="Publisher"
            required
            hint={editing
              ? 'Cannot be changed once months are entered'
              : publishers.length ? null : 'No publishers yet. Add one under Partners first.'}
          >
            <Select value={form.publisherId} onChange={(e) => setField('publisherId', e.target.value)}>
              <option value="">Select a publisher</option>
              {publishers.map((p) => <option key={p.id} value={p.id}>{p.companyName}</option>)}
            </Select>
          </Field>

          <Field label="Label" hint="Tells apart several deals with the same publisher">
            <Input
              value={form.label}
              onChange={(e) => setField('label', e.target.value)}
              placeholder="e.g. Adsterra - BR"
            />
          </Field>

          <Field label={`Rate per payable event (${currency})`} hint="Pre-fills the monthly payout">
            <Input
              type="number"
              min="0"
              step="0.0001"
              value={form.payout}
              onChange={(e) => setField('payout', e.target.value)}
              placeholder="1.00"
            />
          </Field>

          <Field label="Managed by">
            <Select value={form.managerId} onChange={(e) => setField('managerId', e.target.value)}>
              <option value="">Nobody yet</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </Field>

          <Field label="Status">
            <Select value={form.status} onChange={(e) => setField('status', e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>

          <Field label="Start date">
            <Input type="date" value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} />
          </Field>

          <Field label="End date">
            <Input type="date" value={form.endDate} onChange={(e) => setField('endDate', e.target.value)} />
          </Field>

          <Field label="Notes" full>
            <Textarea
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Payout terms, caps, anything to remember"
            />
          </Field>
        </FormGrid>
      </div>
    </Modal>
  )
}
