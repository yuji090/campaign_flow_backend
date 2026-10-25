import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api'
import { getUser } from '../lib/auth'
import { clean, toNumberOrNull } from '../lib/format'
import PageHeader from '../components/PageHeader'
import {
  Callout, Card, ErrorBox, Field, FormGrid, Input, Loading, PrimaryButton, SecondaryButton, Select, Textarea, Toggle,
} from '../components/ui'

const PRICING_MODELS = ['CPI', 'CPA', 'CPL', 'CPS', 'CPC', 'CPM']
const STATUSES = ['DRAFT', 'LIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED']

// A function so the logged-in user is read at render time, not import time
const initialForm = () => ({
  name: '',
  pricingModel: 'CPI',
  direct: false,
  advertiserId: '',
  payout: '',
  currency: 'USD',
  status: 'LIVE',
  managerId: getUser()?.id ? String(getUser().id) : '',
  startDate: '',
  endDate: '',
  notes: '',
})

export default function CampaignForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const editing = Boolean(id)

  const [form, setForm] = useState(initialForm)
  const [originalName, setOriginalName] = useState('')
  const [version, setVersion] = useState(null)
  // Once revenue or distributions exist, advertiser, direct and currency are fixed
  const [locked, setLocked] = useState(false)
  const [advertisers, setAdvertisers] = useState([])
  const [users, setUsers] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [advertiserData, userData, campaign] = await Promise.all([
          api.get('/api/partners?role=ADVERTISER'),
          api.get('/api/users'),
          editing ? api.get(`/api/campaigns/${id}`) : null,
        ])

        setAdvertisers(advertiserData.filter((p) => p.active || p.id === campaign?.advertiserId))
        setUsers(userData.filter((u) => u.enabled))

        if (campaign) {
          setOriginalName(campaign.name)
          setVersion(campaign.version)
          setLocked(campaign.locked)
          setForm({
            name: campaign.name,
            pricingModel: campaign.pricingModel,
            direct: campaign.direct,
            advertiserId: campaign.advertiserId ? String(campaign.advertiserId) : '',
            payout: campaign.payout ?? '',
            currency: campaign.currency || 'USD',
            status: campaign.status,
            managerId: campaign.managerId ? String(campaign.managerId) : '',
            startDate: campaign.startDate || '',
            endDate: campaign.endDate || '',
            notes: campaign.notes || '',
          })
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [editing, id])

  const setField = (field, value) => setForm((old) => ({ ...old, [field]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.direct && !form.advertiserId) {
      setError('Select an advertiser, or mark the campaign as direct')
      return
    }

    const payload = {
      name: form.name.trim(),
      pricingModel: form.pricingModel,
      direct: form.direct,
      advertiserId: form.direct ? null : toNumberOrNull(form.advertiserId),
      payout: toNumberOrNull(form.payout),
      currency: clean(form.currency)?.toUpperCase(),
      status: form.status,
      managerId: toNumberOrNull(form.managerId),
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      notes: form.notes,
      version,
    }

    setSaving(true)
    setError('')

    try {
      const saved = editing
        ? await api.put(`/api/campaigns/${id}`, payload)
        : await api.post('/api/campaigns', payload)

      navigate(`/campaigns/${saved.id}`)
    } catch (err) {
      setError(err.message || 'Failed to save campaign')
    } finally {
      setSaving(false)
    }
  }


  const cancel = () => navigate(editing ? `/campaigns/${id}` : '/campaigns')

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader
        back={editing ? `/campaigns/${id}` : '/campaigns'}
        crumbs={editing
          ? [{ label: 'Campaigns', to: '/campaigns' }, { label: originalName || `#${id}`, to: `/campaigns/${id}` }, { label: 'Edit' }]
          : [{ label: 'Campaigns', to: '/campaigns' }, { label: 'New campaign' }]}
        eyebrow={editing ? 'EDIT CAMPAIGN' : 'NEW CAMPAIGN'}
        title={editing ? originalName || 'Edit campaign' : 'Create campaign'}
        subtitle="Monthly revenue is entered on the campaign page, publisher payouts on each distribution."
        actions={
          <>
            <SecondaryButton onClick={cancel}>Cancel</SecondaryButton>
            <PrimaryButton type="submit" disabled={saving || loading}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create campaign'} →
            </PrimaryButton>
          </>
        }
      />

      {loading ? <Loading /> : (
      <div className="grid grid-cols-1 gap-[21px] max-w-[980px]">

      <ErrorBox message={error} />

      <Card title="Basics" description="Name, pricing type and status.">
        <FormGrid>
          <Field label="Campaign name" required>
            <Input
              required
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="Stable Money - IN"
            />
          </Field>

          <Field label="Pricing model" required>
            <Select value={form.pricingModel} onChange={(e) => setField('pricingModel', e.target.value)}>
              {PRICING_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </Field>

          <Field label="Status" required>
            <Select value={form.status} onChange={(e) => setField('status', e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>

          <Field label="Managed by">
            <Select value={form.managerId} onChange={(e) => setField('managerId', e.target.value)}>
              <option value="">Nobody yet</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </Field>
        </FormGrid>
      </Card>

      <Card title="Source" description="Who gave us this campaign.">
        <div className="grid grid-cols-1 gap-4">
          {locked && (
            <Callout tone="info" icon="🔒">
              The source and currency are fixed because this campaign already has revenue or distributions.
              If it now comes from another advertiser, create a new campaign for it.
            </Callout>
          )}

          <FormGrid>
            <Field label="Campaign type">
              <div>
                <Toggle
                  checked={form.direct}
                  disabled={locked}
                  onClick={() => setForm((old) => ({ ...old, direct: !old.direct, advertiserId: old.direct ? old.advertiserId : '' }))}
                >
                  Direct campaign (our own, no advertiser)
                </Toggle>
              </div>
            </Field>

            {!form.direct && (
              <Field
                label="Advertiser"
                required
                hint={advertisers.length ? null : 'No advertisers yet. Add one under Partners first.'}
              >
                <Select disabled={locked} value={form.advertiserId} onChange={(e) => setField('advertiserId', e.target.value)}>
                  <option value="">Select an advertiser</option>
                  {advertisers.map((p) => <option key={p.id} value={p.id}>{p.companyName}</option>)}
                </Select>
              </Field>
            )}
          </FormGrid>
        </div>
      </Card>

      <Card title="Payout & schedule" description="What we get paid per event. For reference; monthly revenue is entered separately.">
        <FormGrid>
          <Field label="Payout">
            <Input
              type="number"
              min="0"
              step="0.0001"
              value={form.payout}
              onChange={(e) => setField('payout', e.target.value)}
              placeholder="1.50"
            />
          </Field>

          <Field label="Currency" hint="All money for this campaign uses this currency. Locked once distributions or revenue exist.">
            <Input
              maxLength={3}
              disabled={locked}
              value={form.currency}
              onChange={(e) => setField('currency', e.target.value.toUpperCase())}
              placeholder="USD"
            />
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
              placeholder="Payout per GEO, KPIs, caps, anything the team should know"
            />
          </Field>
        </FormGrid>
      </Card>

      </div>
      )}
    </form>
  )
}
