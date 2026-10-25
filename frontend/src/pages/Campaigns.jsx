import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import useLoad from '../lib/useLoad'
import PageHeader from '../components/PageHeader'
import { currentMonth, monthLabel, money } from '../lib/format'
import {
  Card, Empty, ErrorBox, Input, Loading, PrimaryButton, Row, Select, Status, Table, Tabs, Tag, Td,
} from '../components/ui'

// Status tabs; "Ended" groups expired and archived
const TABS = [
  { id: '', label: 'All', match: () => true },
  { id: 'LIVE', label: 'Live', match: (c) => c.status === 'LIVE' },
  { id: 'PAUSED', label: 'Paused', match: (c) => c.status === 'PAUSED' },
  { id: 'DRAFT', label: 'Draft', match: (c) => c.status === 'DRAFT' },
  { id: 'ENDED', label: 'Ended', match: (c) => ['EXPIRED', 'ARCHIVED'].includes(c.status) },
]

const SORTS = {
  newest: { label: 'Newest first', compare: (a, b) => b.id - a.id },
  name: { label: 'Name A–Z', compare: (a, b) => a.name.localeCompare(b.name) },
  profit: { label: 'Profit this month', compare: null },
}

export default function Campaigns() {
  const navigate = useNavigate()

  const { data: campaigns, loading, error } = useLoad(() => api.get('/api/campaigns'))

  // This month's money per campaign, so the list shows what is performing
  const month = currentMonth()
  const { data: finance } = useLoad(() => api.get(`/api/finance/summary?from=${month}&to=${month}`), [month])
  const moneyByCampaign = Object.fromEntries((finance?.campaigns || []).map((c) => [c.campaignId, c]))

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('LIVE')
  const [sort, setSort] = useState('newest')

  const tab = TABS.find((t) => t.id === status) || TABS[0]

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const profitOf = (c) => Number(moneyByCampaign[c.id]?.profit ?? -Infinity)
    const compare = SORTS[sort].compare || ((a, b) => profitOf(b) - profitOf(a))

    return (campaigns || [])
      .filter(tab.match)
      .filter((c) =>
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.advertiserName?.toLowerCase().includes(term)
      )
      .sort(compare)
  }, [campaigns, search, tab, sort, moneyByCampaign])

  return (
    <>
    <PageHeader
      eyebrow="CAMPAIGN OPERATIONS"
      title="Campaigns"
      subtitle="Every campaign, where it came from and its status. Click one to see its money and distributions."
      actions={<PrimaryButton onClick={() => navigate('/campaigns/new')}>+ New campaign</PrimaryButton>}
    />
    <Card>
      <div className="flex items-end justify-between gap-3 flex-wrap -mt-1 mb-4">
        <div className="flex-1 min-w-[280px]">
          <Tabs
            value={status}
            onChange={setStatus}
            tabs={TABS.map((t) => ({ id: t.id, label: t.label, count: (campaigns || []).filter(t.match).length }))}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Search name or advertiser"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="!w-[230px]"
          />
          <Select value={sort} onChange={(e) => setSort(e.target.value)} className="!w-[170px]" aria-label="Sort">
            {Object.entries(SORTS).map(([id, option]) => <option key={id} value={id}>{option.label}</option>)}
          </Select>
        </div>
      </div>

      <ErrorBox message={error} />

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <Empty
          title="No campaigns found"
          text={campaigns?.length ? `No ${tab.label.toLowerCase()} campaigns${search ? ` matching "${search}"` : ''}.` : 'Create your first campaign to get started.'}
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
