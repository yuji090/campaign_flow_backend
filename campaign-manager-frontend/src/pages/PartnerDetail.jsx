import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api'
import useLoad from '../lib/useLoad'
import { isAdmin } from '../lib/auth'
import { money, monthLabel, number } from '../lib/format'
import PartnerModal from '../components/PartnerModal'
import useConfirm from '../components/useConfirm'
import PageHeader from '../components/PageHeader'
import PeriodPicker from '../components/PeriodPicker'
import { makePeriod, periodLabel, periodQuery } from '../lib/period'
import {
  Card, Detail, Empty, ErrorBox, LinkButton, Loading, Metric, Money, Row, SecondaryButton,
  Status, Table, Tag, Td,
} from '../components/ui'

const TYPE_LABELS = { AGENCY: 'Agency', NETWORK: 'Network', DIRECT_BRAND: 'Direct brand' }

export default function PartnerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [confirm, confirmDialog] = useConfirm()

  const [period, setPeriod] = useState(() => makePeriod('all'))
  const [showEdit, setShowEdit] = useState(false)
  const [actionError, setActionError] = useState('')

  const { data: partner, loading, error, reload } = useLoad(() => api.get(`/api/partners/${id}`), [id])

  const query = periodQuery(period)

  const { data: summary, loading: summaryLoading, error: summaryError } = useLoad(
    () => api.get(`/api/partners/${id}/summary${query}`),
    [id, query]
  )

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
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const roles = [partner.advertiser && 'gives us campaigns', partner.publisher && 'runs our campaigns'].filter(Boolean)

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
      actions={
        <>
          <SecondaryButton onClick={() => setShowEdit(true)}>Edit</SecondaryButton>
          {isAdmin() && partner.active && <LinkButton danger onClick={deactivate}>Deactivate</LinkButton>}
        </>
      }
    />

    <div className="grid gap-[21px]">
      <ErrorBox message={actionError} />

      {/* Partner info */}
      <Card>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-5">
          <Detail label="Handled by">{partner.employees.map((e) => e.name).join(', ')}</Detail>
          <Detail label="Contact person">{partner.contactPerson}</Detail>
          <Detail label="Email">{partner.email}</Detail>
          <Detail label="Phone">{partner.phone}</Detail>
          <Detail label="Skype / Telegram">{partner.messenger}</Detail>
          <Detail label="Website">{partner.website}</Detail>
        </div>

        {partner.notes && (
          <div className="mt-5 pt-4 border-t border-[#eef1f5]">
            <Detail label="Notes"><span className="whitespace-pre-wrap">{partner.notes}</span></Detail>
          </div>
        )}
      </Card>

      {/* Period */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[#3563e9] font-extrabold text-[10px] tracking-[1.1px]">
          MONEY · {periodLabel(period).toUpperCase()}
        </div>
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      <ErrorBox message={summaryError} />

      {summaryLoading && !summary ? (
        <Loading />
      ) : summary && (
        <>
          {/* Counts + money */}
          <section className="grid grid-cols-[repeat(auto-fit,minmax(185px,1fr))] gap-[15px]">
            <Metric icon="◫" type="blue" label="Campaigns taken" value={summary.campaignsTaken} note={`${summary.campaignsTakenLive} live · we took from them`} />
            <Metric icon="⇄" type="purple" label="Campaigns running" value={summary.campaignsRunning} note={`${summary.campaignsRunningActive} active · they run for us`} />
          </section>

          {summary.totals.map((t) => (
            <section key={t.currency} className="grid grid-cols-[repeat(auto-fit,minmax(185px,1fr))] gap-[15px]">
              <Metric icon="↙" type="green" label={`To receive · ${t.currency}`} value={money(t.receivable, t.currency)} note="Revenue from their campaigns" />
              <Metric icon="↗" type="amber" label={`To pay · ${t.currency}`} value={money(t.payable, t.currency)} note="Payout on their distributions" />
              <Metric icon="◆" type={Number(t.net) >= 0 ? 'blue' : 'red'} label={`Net · ${t.currency}`} value={money(t.net, t.currency)} note={Number(t.net) >= 0 ? 'They owe us overall' : 'We owe them overall'} />
            </section>
          ))}

          {/* Month by month */}
          <Card eyebrow="MONTH BY MONTH" title="To receive vs to pay">
            {summary.months.length === 0 ? (
              <Empty title="No money recorded" text="Nothing has been entered for this period yet." />
            ) : (
              <Table
                columns={[
                  { label: 'Month' },
                  { label: 'To receive', align: 'right' },
                  { label: 'To pay', align: 'right' },
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
            )}
          </Card>

          {/* Advertiser side: campaign-wise */}
          {partner.advertiser && (
            <Card
              eyebrow="AS ADVERTISER · CAMPAIGN-WISE"
              title="Campaigns we took from them"
              description="Revenue they owe us, from each campaign's monthly revenue."
            >
              {summary.campaigns.length === 0 ? (
                <Empty title="No campaigns from them yet" />
              ) : (
                <Table columns={[{ label: 'Campaign' }, { label: 'Status' }, { label: 'Events', align: 'right' }, { label: 'Revenue', align: 'right' }]}>
                  {summary.campaigns.map((c) => (
                    <Row key={c.campaignId} onClick={() => navigate(`/campaigns/${c.campaignId}`)}>
                      <Td><strong>{c.campaignName}</strong></Td>
                      <Td><Status status={c.status} /></Td>
                      <Td align="right">{number(c.events)}</Td>
                      <Td align="right">
                        {Number(c.revenue) > 0
                          ? <Money value={c.revenue} currency={c.currency} />
                          : <span className="text-[#98a2b3] text-xs">No revenue entered</span>}
                      </Td>
                    </Row>
                  ))}
                </Table>
              )}
            </Card>
          )}

          {/* Publisher side: distribution-wise */}
          {partner.publisher && (
            <Card
              eyebrow="AS PUBLISHER · DISTRIBUTION-WISE"
              title="Our campaigns they are running"
              description="Payout we owe them, from each distribution's monthly entries."
            >
              {summary.distributions.length === 0 ? (
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
              )}
            </Card>
          )}
        </>
      )}

      {showEdit && (
        <PartnerModal
          partner={partner}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false)
            reload()
          }}
        />
      )}

      {confirmDialog}
    </div>
    </>
  )
}
