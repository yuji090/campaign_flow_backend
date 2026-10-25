import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import useLoad from '../lib/useLoad'
import PageHeader from '../components/PageHeader'
import { currentMonth, monthLabel, money } from '../lib/format'
import {
  Card, Empty, ErrorBox, Input, Loading, PrimaryButton, Row, Select, Status, Table, Tag, Td,
} from '../components/ui'

const STATUSES = ['DRAFT', 'LIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED']

export default function Campaigns() {
  const navigate = useNavigate()

  const { data: campaigns, loading, error } = useLoad(() => api.get('/api/campaigns'))

  // This month's money per campaign, so the list shows what is performing
  const month = currentMonth()
  const { data: finance } = useLoad(() => api.get(`/api/finance/summary?from=${month}&to=${month}`), [month])
  const moneyByCampaign = Object.fromEntries((finance?.campaigns || []).map((c) => [c.campaignId, c]))

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return (campaigns || [])
      .filter((c) => !status || c.status === status)
      .filter((c) =>
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.advertiserName?.toLowerCase().includes(term)
      )
      .sort((a, b) => b.id - a.id)
  }, [campaigns, search, status])

  return (
    <>
    <PageHeader
      eyebrow="CAMPAIGN OPERATIONS"
      title="Campaigns"
      subtitle="Every campaign, where it came from and its status. Click one to see its money and distributions."
      actions={<PrimaryButton onClick={() => navigate('/campaigns/new')}>+ New campaign</PrimaryButton>}
    />
    <Card
      eyebrow="ALL CAMPAIGNS"
      title={`${filtered.length} campaign${filtered.length === 1 ? '' : 's'}`}
      actions={
        <>
          <Input
            placeholder="Search name or advertiser"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[230px]"
          />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-[140px]">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </>
      }
    >
      <ErrorBox message={error} />

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <Empty
          title="No campaigns found"
          text={campaigns?.length ? 'Try a different search or status.' : 'Create your first campaign to get started.'}
          action={!campaigns?.length && (
            <PrimaryButton onClick={() => navigate('/campaigns/new')}>Create campaign →</PrimaryButton>
          )}
        />
      ) : (
        <Table
          columns={[
            { label: 'Campaign' },
            { label: 'Source' },
            { label: 'Model' },
            { label: 'Payout', align: 'right' },
            { label: 'Manager' },
            { label: `Profit · ${monthLabel(month)}`, align: 'right' },
            { label: 'Status' },
          ]}
        >
          {filtered.map((c) => (
            <Row key={c.id} onClick={() => navigate(`/campaigns/${c.id}`)}>
              <Td>
                <strong>{c.name}</strong>
                <div className="text-[#98a2b3] text-[11px]">#{c.id}</div>
              </Td>
              <Td>
                {c.direct ? <Tag color="purple">Direct</Tag> : null}{' '}
                {c.advertiserName || (!c.direct && '—')}
              </Td>
              <Td><Tag>{c.pricingModel}</Tag></Td>
              <Td align="right">{c.payout != null ? money(c.payout, c.currency) : '—'}</Td>
              <Td>{c.managerName || '—'}</Td>
              <Td align="right">
                <CampaignMonth row={moneyByCampaign[c.id]} />
              </Td>
              <Td><Status status={c.status} /></Td>
            </Row>
          ))}
        </Table>
      )}
    </Card>
    </>
  )
}

// Profit this month, or what is still missing
function CampaignMonth({ row }) {
  if (!row) return <span className="text-[#c8d0dd]">—</span>

  if (Number(row.revenue) === 0) {
    return <span className="text-[11px] font-bold text-[#b54708]">Revenue not entered</span>
  }

  const profit = Number(row.profit)

  return (
    <>
      <div className={`font-semibold ${profit >= 0 ? 'text-[#0f9f6e]' : 'text-[#d92d20]'}`}>{money(profit, row.currency)}</div>
      <div className="text-[11px] text-[#98a2b3]">of {money(row.revenue, row.currency)}</div>
    </>
  )
}
