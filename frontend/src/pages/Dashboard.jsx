import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import useLoad from '../lib/useLoad'
import { getUser } from '../lib/auth'
import { currentMonth, money, monthLabel, percent } from '../lib/format'
import { Empty, ErrorBox, Loading, Metric, PrimaryButton, Status } from '../components/ui'
import PageHeader from '../components/PageHeader'

export default function Dashboard() {
  const navigate = useNavigate()

  const { data, loading, error } = useLoad(async () => {
    const month = currentMonth()
    const [campaigns, partners, distributions, finance] = await Promise.all([
      api.get('/api/campaigns'),
      api.get('/api/partners'),
      api.get('/api/distributions'),
      api.get(`/api/finance/summary?from=${month}&to=${month}`),
    ])
    return { campaigns, partners, distributions, finance }
  })

  const header = (
    <PageHeader
      eyebrow="CAMPAIGN OPERATIONS"
      title="Overview"
      actions={<PrimaryButton onClick={() => navigate('/campaigns/new')}>+ New campaign</PrimaryButton>}
    />
  )

  if (loading) return <>{header}<Loading /></>
  if (error) return <>{header}<ErrorBox message={error} /></>

  const { campaigns, partners, distributions, finance } = data

  const recent = [...campaigns].sort((a, b) => b.id - a.id).slice(0, 5)
  const liveCampaigns = campaigns.filter((c) => c.status === 'LIVE').length
  const activePartners = partners.filter((p) => p.active)
  const advertisers = activePartners.filter((p) => p.advertiser).length
  const publishers = activePartners.filter((p) => p.publisher).length
  const activeDistributions = distributions.filter((d) => d.status === 'ACTIVE').length

  const firstName = getUser()?.name?.split(' ')[0]

  return (
    <>
    {header}
    <div className="grid gap-[21px]">

      {/* Hero */}
      <section className="rounded-[14px] min-h-[200px] overflow-hidden p-[32px_38px] text-white bg-gradient-to-br from-[#1a3159] via-[#234381] to-[#3563e9] flex justify-between items-center gap-6">
        <div>
          <div className="text-[#abc1ff] font-extrabold text-[10px] tracking-[1.1px] mb-[6px]">
            YOUR WORKSPACE
          </div>

          <h2 className="m-0 text-[28px] tracking-[-.7px]">
            {firstName ? `Hi ${firstName}, everything is in motion.` : 'Everything is in motion.'}
          </h2>

          <p className="my-[10px] mb-5 max-w-[520px] text-[#cbd9f6] leading-[1.55] text-[13px]">
            Take campaigns from advertisers, distribute them to publishers, and enter what each
            distribution earns every month.
          </p>

          <button
            type="button"
            onClick={() => navigate('/campaigns/new')}
            className="border-0 rounded-lg px-[15px] py-[11px] bg-white text-[#3563e9] cursor-pointer text-[13px] font-bold hover:bg-[#edf2ff] transition"
          >
            Create campaign →
          </button>
        </div>

        <div className="hidden md:grid w-[120px] h-[120px] mr-[45px] shrink-0 border-[18px] border-[rgba(255,255,255,.16)] outline outline-1 outline-[rgba(255,255,255,.27)] rounded-full place-items-center bg-white text-[#3563e9] text-[32px] font-extrabold">
          ↗
        </div>
      </section>

      {/* This month's money */}
      <section className="grid gap-[10px]">
        <div className="flex items-center justify-between">
          <div className="text-[#3563e9] font-extrabold text-[10px] tracking-[1.1px]">
            {monthLabel(currentMonth()).toUpperCase()} · SO FAR
          </div>
          <button
            type="button"
            onClick={() => navigate('/finance')}
            className="border-0 bg-transparent cursor-pointer text-[#3563e9] font-bold text-xs"
          >
            Open finance →
          </button>
        </div>

        {finance.totals.length === 0 ? (
          <div className="bg-white border border-[#e6eaf0] rounded-[11px] p-[19px] text-[13px] text-[#667085]">
            No revenue or payouts entered for this month yet.
          </div>
        ) : (
          finance.totals.map((t) => (
            <div key={t.currency} className="grid grid-cols-[repeat(auto-fit,minmax(185px,1fr))] gap-[15px]">
              <Metric icon="↙" type="green" label={`Revenue · ${t.currency}`} value={money(t.revenue, t.currency)} note="From advertisers" />
              <Metric icon="↗" type="amber" label={`Cost · ${t.currency}`} value={money(t.cost, t.currency)} note="Paid to publishers" />
              <Metric icon="◆" type={Number(t.profit) >= 0 ? 'blue' : 'red'} label={`Net profit · ${t.currency}`} value={money(t.profit, t.currency)} note={`Margin ${percent(t.marginPct)}`} />
            </div>
          ))
        )}
      </section>

      {/* Metrics */}
      <section className="grid grid-cols-[repeat(auto-fit,minmax(185px,1fr))] gap-[15px]">
        <Metric icon="◫" type="blue" label="Total campaigns" value={campaigns.length} note="Across all statuses" />
        <Metric icon="↗" type="green" label="Live now" value={liveCampaigns} note="Actively running" />
        <Metric icon="◎" type="purple" label="Active partners" value={activePartners.length} note={`${advertisers} advertisers · ${publishers} publishers`} />
        <Metric icon="⇄" type="amber" label="Active distributions" value={activeDistributions} note={`${distributions.length} in total`} />
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(330px,1fr))] gap-[21px] items-start">

        {/* Recent campaigns */}
        <div className="bg-white border border-[#e6eaf0] rounded-[11px] p-[23px]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-[#3563e9] font-extrabold text-[10px] tracking-[1.1px] mb-[6px]">
                RECENT ACTIVITY
              </div>
              <h2 className="m-0 text-[18px] tracking-[-.25px]">Latest campaigns</h2>
            </div>

            <button
              type="button"
              onClick={() => navigate('/campaigns')}
              className="border-0 bg-transparent cursor-pointer text-[#3563e9] font-bold text-xs"
            >
              View all →
            </button>
          </div>

          {recent.length ? (
            recent.map((campaign) => (
              <button
                type="button"
                key={campaign.id}
                onClick={() => navigate(`/campaigns/${campaign.id}`)}
                className="w-full text-left bg-transparent border-0 border-b border-[#e6eaf0] cursor-pointer flex items-center gap-[10px] py-[11px] hover:bg-[#f8faff]"
              >
                <span className="w-[33px] h-[33px] shrink-0 grid place-items-center rounded-lg text-[#3563e9] bg-[#edf2ff] font-extrabold">
                  {campaign.name?.[0]?.toUpperCase()}
                </span>

                <div className="flex-1 min-w-0">
                  <strong className="overflow-hidden text-ellipsis whitespace-nowrap block text-[13px]">
                    {campaign.name}
                  </strong>
                  <small className="text-[#98a2b3]">
                    {campaign.direct ? 'Direct' : campaign.advertiserName || 'No advertiser'} · {campaign.pricingModel}
                  </small>
                </div>

                <Status status={campaign.status} />
              </button>
            ))
          ) : (
            <Empty title="No campaigns yet" text="Add a partner, then create your first campaign." />
          )}
        </div>

        {/* Quick start */}
        <div className="bg-white border border-[#e6eaf0] rounded-[11px] p-[23px]">
          <div className="text-[#3563e9] font-extrabold text-[10px] tracking-[1.1px] mb-[6px]">
            QUICK START
          </div>

          <h2 className="m-0 text-[18px] tracking-[-.25px]">How the money flows</h2>

          <div className="grid gap-[17px] mt-[19px]">
            <Check
              done={partners.length > 0}
              number="01"
              title="Add partners"
              text="Advertisers give us campaigns, publishers run them. One company can be both."
              onClick={() => navigate('/partners')}
            />
            <Check
              done={campaigns.length > 0}
              number="02"
              title="Create a campaign"
              text="Pick the advertiser (or mark it direct), pricing model and payout."
              onClick={() => navigate('/campaigns/new')}
            />
            <Check
              done={distributions.length > 0}
              number="03"
              title="Distribute it"
              text="Open the campaign and give it to one or more publishers."
              onClick={() => navigate('/campaigns')}
            />
            <Check
              done={false}
              number="04"
              title="Enter monthly numbers"
              text="Revenue on the campaign, events and payout on each distribution. Finance and partner totals update automatically."
            />
          </div>
        </div>

      </section>
    </div>
    </>
  )
}

function Check({ done, number, title, text, onClick }) {
  return (
    <div
      className={`flex gap-[10px] ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <span
        className={`w-6 h-6 shrink-0 grid place-items-center rounded-full font-extrabold text-[10px] ${
          done ? 'text-[#0f9f6e] bg-[#e7f8ef]' : 'text-[#667085] bg-[#eef1f5]'
        }`}
      >
        {done ? '✓' : number}
      </span>

      <div>
        <strong className="text-[13px]">{title}</strong>
        <p className="text-[#667085] text-[11px] leading-[1.5] mt-1 mb-0">{text}</p>
      </div>
    </div>
  )
}
