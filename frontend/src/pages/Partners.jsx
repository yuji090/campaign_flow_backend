import { useMemo, useState } from 'react'
import { money } from '../lib/format'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import useLoad from '../lib/useLoad'
import PartnerModal from '../components/PartnerModal'
import PageHeader from '../components/PageHeader'
import {
  Card, Empty, ErrorBox, Input, Loading, PrimaryButton, Row, Select, Status, Table, Tag, Td,
} from '../components/ui'

const TYPE_LABELS = { AGENCY: 'Agency', NETWORK: 'Network', DIRECT_BRAND: 'Direct brand' }

export default function Partners() {
  const navigate = useNavigate()

  const [role, setRole] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const query = new URLSearchParams({
    ...(role && { role }),
    ...(employeeId && { employeeId }),
  }).toString()

  const { data: partners, loading, error } = useLoad(
    () => api.get(`/api/partners${query ? `?${query}` : ''}`),
    [query]
  )

  const { data: users } = useLoad(() => api.get('/api/users'))

  // All-time outstanding per partner, from the company summary
  const { data: finance } = useLoad(() => api.get('/api/finance/summary'))
  const balancesByPartner = {}
  for (const b of finance?.partners || []) {
    (balancesByPartner[b.partnerId] ||= []).push(b)
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return (partners || [])
      .filter((p) => showInactive || p.active)
      .filter((p) => !term || p.companyName.toLowerCase().includes(term))
      .sort((a, b) => a.companyName.localeCompare(b.companyName))
  }, [partners, search, showInactive])

  return (
    <>
      <PageHeader
        eyebrow="CAMPAIGN OPERATIONS"
        title="Partners"
        subtitle="Advertisers give us campaigns, publishers run them. One company can be both."
        actions={<PrimaryButton onClick={() => setShowModal(true)}>+ New partner</PrimaryButton>}
      />
      <Card
        eyebrow="ADVERTISERS & PUBLISHERS"
        title={`${filtered.length} partner${filtered.length === 1 ? '' : 's'}`}
        actions={
          <>
            <Input
              placeholder="Search company"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[180px]"
            />
            <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-[140px]">
              <option value="">All roles</option>
              <option value="ADVERTISER">Advertisers</option>
              <option value="PUBLISHER">Publishers</option>
            </Select>
            <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-[160px]">
              <option value="">All employees</option>
              {(users || []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
            <label className="text-xs text-[#667085] flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
              Inactive
            </label>
          </>
        }
      >
        <ErrorBox message={error} />

        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <Empty
            title="No partners found"
            text={partners?.length ? 'Try different filters.' : 'Add the agencies and networks you work with.'}
          />
        ) : (
          <Table
            columns={[
              { label: 'Company' },
              { label: 'Role' },
              { label: 'Type' },
              { label: 'Contact' },
              { label: 'Handled by' },
              { label: 'Open balance', align: 'right' },
              { label: 'Status' },
            ]}
          >
            {filtered.map((p) => (
              <Row key={p.id} onClick={() => navigate(`/partners/${p.id}`)}>
                <Td><strong>{p.companyName}</strong></Td>
                <Td className="whitespace-nowrap">
                  {p.advertiser && <Tag>Advertiser</Tag>}{' '}
                  {p.publisher && <Tag color="purple">Publisher</Tag>}
                </Td>
                <Td>{TYPE_LABELS[p.type] || p.type}</Td>
                <Td className="text-xs">
                  {p.contactPerson || '—'}
                  {p.email && <div className="text-[#98a2b3]">{p.email}</div>}
                </Td>
                <Td className="text-xs">{p.employees.map((e) => e.name).join(', ') || '—'}</Td>
                <Td align="right"><Balance rows={balancesByPartner[p.id]} /></Td>
                <Td><Status status={p.active ? 'ACTIVE' : 'INACTIVE'} /></Td>
              </Row>
            ))}
          </Table>
        )}
      </Card>

      {showModal && (
        <PartnerModal
          onClose={() => setShowModal(false)}
          onSaved={(saved) => navigate(`/partners/${saved.id}`)}
        />
      )}
    </>
  )
}

// "owes us $2,600" / "we owe $350", one line per side and currency
function Balance({ rows }) {
  const lines = (rows || []).flatMap((b) => [
    Number(b.outstandingReceivable) !== 0 && { key: `r-${b.currency}`, text: `${money(b.outstandingReceivable, b.currency)} owes us`, className: 'text-[#0f9f6e]' },
    Number(b.outstandingPayable) !== 0 && { key: `p-${b.currency}`, text: `${money(b.outstandingPayable, b.currency)} we owe`, className: 'text-[#dc6803]' },
  ]).filter(Boolean)

  if (lines.length === 0) return <span className="text-[#c8d0dd]">—</span>

  return lines.map((line) => (
    <div key={line.key} className={`text-[12px] font-semibold ${line.className}`}>{line.text}</div>
  ))
}
