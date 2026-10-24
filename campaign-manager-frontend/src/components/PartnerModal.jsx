import { useEffect, useState } from 'react'
import { api } from '../services/api'
import {
  ErrorBox, Field, FormGrid, Input, Modal, PrimaryButton, SecondaryButton, Select, Textarea, Toggle,
} from './ui'

const TYPES = [
  { value: 'AGENCY', label: 'Agency' },
  { value: 'NETWORK', label: 'Network' },
  { value: 'DIRECT_BRAND', label: 'Direct brand' },
]

// Create (no partner) or edit (pass partner)
export default function PartnerModal({ partner, onClose, onSaved }) {
  const editing = Boolean(partner)

  const [form, setForm] = useState(() => ({
    companyName: partner?.companyName || '',
    type: partner?.type || 'AGENCY',
    advertiser: partner?.advertiser ?? true,
    publisher: partner?.publisher ?? false,
    contactPerson: partner?.contactPerson || '',
    email: partner?.email || '',
    phone: partner?.phone || '',
    messenger: partner?.messenger || '',
    website: partner?.website || '',
    notes: partner?.notes || '',
    active: partner?.active ?? true,
    employeeIds: partner?.employees?.map((e) => e.id) || [],
  }))

  const [users, setUsers] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/users')
      .then((data) => setUsers(data.filter((u) => u.enabled || form.employeeIds.includes(u.id))))
      .catch((err) => setError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setField = (field, value) => setForm((old) => ({ ...old, [field]: value }))

  const toggleEmployee = (userId) =>
    setForm((old) => ({
      ...old,
      employeeIds: old.employeeIds.includes(userId)
        ? old.employeeIds.filter((idValue) => idValue !== userId)
        : [...old.employeeIds, userId],
    }))

  const save = async () => {
    if (!form.companyName.trim()) {
      setError('Company name is required')
      return
    }

    if (!form.advertiser && !form.publisher) {
      setError('Pick at least one role: advertiser, publisher, or both')
      return
    }

    const payload = {
      companyName: form.companyName.trim(),
      type: form.type,
      advertiser: form.advertiser,
      publisher: form.publisher,
      contactPerson: form.contactPerson,
      email: form.email.trim(),
      phone: form.phone,
      messenger: form.messenger,
      website: form.website,
      notes: form.notes,
      employeeIds: form.employeeIds,
      ...(editing && { active: form.active, version: partner.version }),
    }

    setSaving(true)
    setError('')

    try {
      const saved = editing
        ? await api.patch(`/api/partners/${partner.id}`, payload)
        : await api.post('/api/partners', payload)

      onSaved(saved)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal
      wide
      title={editing ? 'Edit partner' : 'New partner'}
      description="A partner can give us campaigns (advertiser), run our campaigns (publisher), or both."
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={save} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create partner'}
          </PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4">
        <ErrorBox message={error} />

        <FormGrid>
          <Field label="Company name" required>
            <Input
              autoFocus
              value={form.companyName}
              onChange={(e) => setField('companyName', e.target.value)}
              placeholder="AdAgency X"
            />
          </Field>

          <Field label="Type">
            <Select value={form.type} onChange={(e) => setField('type', e.target.value)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </Field>

          <Field label="Role" required full>
            <div className="flex gap-2 flex-wrap">
              <Toggle checked={form.advertiser} onClick={() => setField('advertiser', !form.advertiser)}>
                Advertiser · gives us campaigns
              </Toggle>
              <Toggle checked={form.publisher} onClick={() => setField('publisher', !form.publisher)}>
                Publisher · runs our campaigns
              </Toggle>
            </div>
          </Field>

          <Field label="Handled by" full hint="Employees who manage this partner">
            <div className="flex gap-2 flex-wrap">
              {users.length === 0 && <span className="text-[#667085] text-xs">No users yet.</span>}
              {users.map((u) => (
                <Toggle key={u.id} checked={form.employeeIds.includes(u.id)} onClick={() => toggleEmployee(u.id)}>
                  {u.name}
                </Toggle>
              ))}
            </div>
          </Field>

          <Field label="Contact person">
            <Input value={form.contactPerson} onChange={(e) => setField('contactPerson', e.target.value)} />
          </Field>

          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
          </Field>

          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
          </Field>

          <Field label="Skype / Telegram">
            <Input value={form.messenger} onChange={(e) => setField('messenger', e.target.value)} placeholder="@handle" />
          </Field>

          <Field label="Website">
            <Input value={form.website} onChange={(e) => setField('website', e.target.value)} placeholder="https://" />
          </Field>

          {editing && (
            <Field label="Status">
              <div>
                <Toggle checked={form.active} onClick={() => setField('active', !form.active)}>
                  Active
                </Toggle>
              </div>
            </Field>
          )}

          <Field label="Notes" full>
            <Textarea value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
          </Field>
        </FormGrid>
      </div>
    </Modal>
  )
}
