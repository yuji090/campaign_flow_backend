import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../services/api'
import useLoad from '../lib/useLoad'
import { currentMonth, money, monthLabel, number } from '../lib/format'
import { addMonths } from '../lib/period'
import { toast } from '../lib/toast'
import PageHeader from '../components/PageHeader'
import { MonthPicker } from '../components/PeriodPicker'
import InfoTip from '../components/InfoTip'
import {
  Callout, Card, Empty, ErrorBox, Input, Loading, PrimaryButton, SecondaryButton, Toggle,
} from '../components/ui'

// Advertiser numbers usually arrive in the first days of the next month
function defaultMonth() {
  return new Date().getDate() <= 10 ? addMonths(currentMonth(), -1) : currentMonth()
}

const cellInput = '!min-h-[36px] !py-[7px] !px-[9px] text-right tabular-nums'

export default function MonthlyEntry() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const month = params.get('month') || defaultMonth()
  const setMonth = (value) => setParams({ month: value }, { replace: true })

  const { data, loading, error } = useLoad(() => api.get(`/api/finance/entries/${month}`), [month])

  const [saved, setSaved] = useState({}) // row key -> latest saved entry (after saving here)
  const [drafts, setDrafts] = useState({}) // row key -> { field: string }
  const [rowErrors, setRowErrors] = useState({})
  const [savingKeys, setSavingKeys] = useState([])
  const [search, setSearch] = useState('')
  const [onlyMissing, setOnlyMissing] = useState(false)

  // A new month starts clean
  const [loadedMonth, setLoadedMonth] = useState(month)
  if (loadedMonth !== month) {
    setLoadedMonth(month)
    setSaved({})
    setDrafts({})
    setRowErrors({})
  }

  // Every editable row: one revenue row per campaign, one row per distribution
  const rows = useMemo(() => {
    const list = []

    for (const c of data?.campaigns || []) {
      list.push({ key: `c-${c.campaignId}`, type: 'campaign', campaign: c, entry: saved[`c-${c.campaignId}`] ?? c.entry })

      for (const d of c.distributions) {
        list.push({ key: `d-${d.distributionId}`, type: 'distribution', campaign: c, distribution: d, entry: saved[`d-${d.distributionId}`] ?? d.entry })
      }
    }

    return list
  }, [data, saved])

  const rowByKey = Object.fromEntries(rows.map((r) => [r.key, r]))

  // Current value of a field: the draft if typed, otherwise the saved value
  const valueOf = (row, field) => {
    const draft = drafts[row.key]?.[field]
    if (draft !== undefined) return draft
    return initialValue(row, field)
  }

  const isDirty = (row) => {
    const draft = drafts[row.key]
    if (!draft) return false
    return Object.keys(draft).some((field) => field !== 'payoutEdited' && draft[field] !== initialValue(row, field))
  }

  const dirtyRows = rows.filter(isDirty)

  // Warn before closing the tab with unsaved numbers
  useEffect(() => {
    if (dirtyRows.length === 0) return
    const warn = (event) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirtyRows.length])

  const setField = (row, field, value) => {
    setDrafts((old) => {
      const current = { ...(old[row.key] || {}) }
      current[field] = value

      if (row.type === 'distribution') {
        const previousTotal = old[row.key]?.totalEvents ?? initialValue(row, 'totalEvents')
        const previousPayable = old[row.key]?.payableEvents ?? initialValue(row, 'payableEvents')

        // Typing total first: assume nothing scrubbed until payable is typed
        if (field === 'totalEvents' && (previousPayable === '' || previousPayable === previousTotal)) {
          current.payableEvents = value
        }

        // Payout follows payable x rate until typed by hand (or when the saved payout already matched the rate)
        const followsRate = !current.payoutEdited && row.distribution.rate != null && !row.entry?.payoutMismatch

        if (field === 'payout') {
          current.payoutEdited = true
        } else if (followsRate && (field === 'payableEvents' || field === 'totalEvents')) {
          const payable = current.payableEvents ?? initialValue(row, 'payableEvents')
          current.payout = payable === '' ? '' : String(Math.round(Number(payable) * Number(row.distribution.rate) * 100) / 100)
        }
      }

      return { ...old, [row.key]: current }
    })
    setRowErrors((old) => ({ ...old, [row.key]: '' }))
  }

  const validate = (row) => {
    if (row.type === 'campaign') {
      return valueOf(row, 'revenue') === '' ? 'Enter the revenue' : ''
    }

    const total = valueOf(row, 'totalEvents')
    const payable = valueOf(row, 'payableEvents')
    const approved = valueOf(row, 'approvedEvents')

    if (total === '' || payable === '' || valueOf(row, 'payout') === '') return 'Fill total, payable and payout'
    if (Number(payable) > Number(total)) return 'Payable is more than total'
    if (approved !== '' && Number(approved) > Number(total)) return 'Approved is more than total'
    return ''
  }

  const saveRow = async (row) => {
    const problem = validate(row)
    if (problem) {
      setRowErrors((old) => ({ ...old, [row.key]: problem }))
      return false
    }

    setSavingKeys((old) => [...old, row.key])

    try {
      const entry = row.entry
      let response

      if (row.type === 'campaign') {
        response = await api.put(`/api/campaigns/${row.campaign.campaignId}/months/${month}`, {
          revenue: Number(valueOf(row, 'revenue')),
          events: valueOf(row, 'events') === '' ? 0 : Number(valueOf(row, 'events')),
          // Keep what is only editable on the campaign page
          adjustment: entry ? Number(entry.adjustment) : 0,
          adjustmentNote: entry?.adjustmentNote,
          notes: entry?.notes,
          version: entry?.version,
        })
      } else {
        response = await api.put(`/api/distributions/${row.distribution.distributionId}/months/${month}`, {
          totalEvents: Number(valueOf(row, 'totalEvents')),
          payableEvents: Number(valueOf(row, 'payableEvents')),
          approvedEvents: valueOf(row, 'approvedEvents') === '' ? null : Number(valueOf(row, 'approvedEvents')),
          payout: Number(valueOf(row, 'payout')),
          adjustment: entry ? Number(entry.adjustment) : 0,
          adjustmentNote: entry?.adjustmentNote,
          notes: entry?.notes,
          version: entry?.version,
        })
      }

      setSaved((old) => ({ ...old, [row.key]: response }))
      setDrafts((old) => {
        const next = { ...old }
        delete next[row.key]
        return next
      })
      return true
    } catch (err) {
      setRowErrors((old) => ({ ...old, [row.key]: err.message }))
      return false
    } finally {
      setSavingKeys((old) => old.filter((key) => key !== row.key))
    }
  }

  const saveAll = async () => {
    let ok = 0
    for (const row of dirtyRows) {
      if (await saveRow(row)) ok += 1
    }
    const failed = dirtyRows.length - ok
    toast(failed ? `${ok} saved, ${failed} need a fix` : `${ok} row${ok === 1 ? '' : 's'} saved`, failed ? 'error' : 'success')
  }

  const header = (
    <PageHeader
      eyebrow="MONEY"
      title="Monthly entry"
      subtitle="Fill in a whole month in one place: advertiser revenue and every publisher's events and payout."
      actions={
        <>
          <div className="inline-flex p-[3px] rounded-[9px] bg-[#eef1f5]">
            {[{ label: 'Last month', value: addMonths(currentMonth(), -1) }, { label: 'This month', value: currentMonth() }].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setMonth(option.value)}
                className={`border-0 cursor-pointer rounded-[7px] px-[11px] h-[30px] text-[12px] font-bold transition ${
                  month === option.value ? 'bg-white text-[#172033] shadow-[0_1px_3px_rgba(16,24,40,.12)]' : 'bg-transparent text-[#667085] hover:text-[#172033]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <MonthPicker value={month} onChange={setMonth} />
        </>
      }
    />
  )

  if (loading && !data) return <>{header}<Loading /></>
  if (error) return <>{header}<ErrorBox message={error} /></>

  const closed = data.closed
  const filled = rows.filter((r) => r.entry).length
  const term = search.trim().toLowerCase()

  const campaigns = data.campaigns.filter((c) => {
    if (term && !c.campaignName.toLowerCase().includes(term) && !c.advertiserName?.toLowerCase().includes(term) &&
      !c.distributions.some((d) => d.publisherName.toLowerCase().includes(term))) return false
    if (onlyMissing) {
      const keys = [`c-${c.campaignId}`, ...c.distributions.map((d) => `d-${d.distributionId}`)]
      return keys.some((key) => !rowByKey[key]?.entry)
    }
    return true
  })

  return (
    <>
      {header}

      <div className="grid grid-cols-1 gap-[18px]">
        {closed && (
          <Callout tone="gray" icon="🔒" title={`${monthLabel(month)} is closed`}>
            Numbers are shown read-only. An admin can reopen it from Month close; corrections can also go in as adjustments in an open month.
          </Callout>
        )}

        {/* Progress + save bar, sticks to the top while scrolling */}
        <div className="sticky top-[52px] lg:top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-[38px] px-4 sm:px-6 lg:px-[38px] py-3 bg-[#f6f8fb]/95 backdrop-blur border-b border-[#e6eaf0]">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[220px]">
              <div className="flex items-baseline justify-between text-[12px] mb-[6px]">
                <span className="font-bold text-[#172033]">{monthLabel(month)} · {filled} of {rows.length} entered</span>
                <span className="text-[#667085]">{rows.length ? Math.round((filled / rows.length) * 100) : 0}%</span>
              </div>
              <div className="h-[6px] rounded-full bg-[#e6eaf0] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#1baf7a] transition-all"
                  style={{ width: `${rows.length ? (filled / rows.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <Input placeholder="Search campaign or publisher" value={search} onChange={(e) => setSearch(e.target.value)} className="!w-[220px]" />
            <Toggle checked={onlyMissing} onClick={() => setOnlyMissing(!onlyMissing)}>Only missing</Toggle>

            {!closed && (
              <PrimaryButton onClick={saveAll} disabled={dirtyRows.length === 0 || savingKeys.length > 0}>
                {savingKeys.length > 0 ? 'Saving…' : dirtyRows.length ? `Save ${dirtyRows.length} change${dirtyRows.length === 1 ? '' : 's'}` : 'All saved'}
              </PrimaryButton>
            )}
          </div>
        </div>

        {campaigns.length === 0 ? (
          <Card>
            <Empty
              title={data.campaigns.length ? 'Nothing matches' : `Nothing running in ${monthLabel(month)}`}
              text={data.campaigns.length ? 'Try another search, or turn off "Only missing".' : 'Live campaigns and their active distributions show up here.'}
            />
          </Card>
        ) : campaigns.map((c) => (
          <CampaignBlock
            key={c.campaignId}
            campaign={c}
            closed={closed}
            rowByKey={rowByKey}
            valueOf={valueOf}
            setField={setField}
            isDirty={isDirty}
            rowErrors={rowErrors}
            savingKeys={savingKeys}
            saveRow={saveRow}
            navigate={navigate}
          />
        ))}

        <p className="m-0 text-[11px] text-[#98a2b3] px-1">
          Tip: press <kbd className="px-1 rounded border border-[#d7dce6] bg-white text-[10px]">Enter</kbd> in any box to save that row.
          Adjustments and notes are edited on the campaign or distribution page.
        </p>
      </div>
    </>
  )
}

/* ----------------------------- */
/* One campaign with its rows    */
/* ----------------------------- */

function CampaignBlock({ campaign, closed, rowByKey, valueOf, setField, isDirty, rowErrors, savingKeys, saveRow, navigate }) {
  const currency = campaign.currency
  const revenueRow = rowByKey[`c-${campaign.campaignId}`]
  const distributionRows = campaign.distributions.map((d) => rowByKey[`d-${d.distributionId}`])

  // Live preview from what is typed right now
  const revenue = Number(valueOf(revenueRow, 'revenue') || 0) + Number(revenueRow.entry?.adjustment || 0)
  const cost = distributionRows.reduce((sum, row) => sum + Number(valueOf(row, 'payout') || 0) + Number(row.entry?.adjustment || 0), 0)
  const profit = revenue - cost
  const revenueKnown = valueOf(revenueRow, 'revenue') !== ''

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 flex-wrap -mt-1 mb-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => navigate(`/campaigns/${campaign.campaignId}`)}
            className="border-0 bg-transparent p-0 cursor-pointer text-[15px] font-bold text-[#172033] hover:text-[#3563e9] text-left"
          >
            {campaign.campaignName}
          </button>
          <div className="text-[12px] text-[#667085] mt-[2px]">
            {campaign.direct ? 'Direct' : campaign.advertiserName} · {campaign.pricingModel} · {currency}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-[.6px] text-[#98a2b3]">Profit this month</div>
          <div className={`text-[18px] font-extrabold tabular-nums ${!revenueKnown ? 'text-[#98a2b3]' : profit >= 0 ? 'text-[#0f9f6e]' : 'text-[#d92d20]'}`}>
            {revenueKnown ? money(profit, currency) : 'needs revenue'}
          </div>
          {revenueKnown && <div className="text-[11px] text-[#98a2b3]">{money(revenue, currency)} − {money(cost, currency)}</div>}
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 sm:-mx-[23px] sm:px-[23px]">
        <table className="w-full border-collapse text-[13px] min-w-[860px]">
          <thead>
            <tr className="text-[#667085] text-[10px] font-extrabold tracking-[.6px] uppercase">
              <th className="text-left py-2 px-2 border-b border-[#e6eaf0] w-[26%]">Who</th>
              <th className="text-right py-2 px-2 border-b border-[#e6eaf0]">Total events</th>
              <th className="text-right py-2 px-2 border-b border-[#e6eaf0]">
                Payable <InfoTip text="Events we pay the publisher for, after removing fraud." />
              </th>
              <th className="text-right py-2 px-2 border-b border-[#e6eaf0]">
                Approved <InfoTip text="How many events the advertiser accepted (from their report). Optional, makes revenue estimates per publisher more accurate." />
              </th>
              <th className="text-right py-2 px-2 border-b border-[#e6eaf0]">Amount ({currency})</th>
              <th className="text-left py-2 px-2 border-b border-[#e6eaf0] w-[150px]">Status</th>
              <th className="py-2 px-2 border-b border-[#e6eaf0] w-[70px]" />
            </tr>
          </thead>
          <tbody>
            <EntryRow
              row={revenueRow}
              label={<><span className="text-[#0f9f6e]">↙</span> Revenue{campaign.advertiserName ? ` from ${campaign.advertiserName}` : ''}</>}
              sub="What the advertiser pays us"
              fields={[null, null, 'events', 'revenue']}
              {...{ closed, valueOf, setField, isDirty, rowErrors, savingKeys, saveRow }}
            />

            {distributionRows.map((row) => (
              <EntryRow
                key={row.key}
                row={row}
                label={<><span className="text-[#dc6803]">↗</span> {row.distribution.publisherName}</>}
                sub={[row.distribution.label, row.distribution.rate != null && `${money(row.distribution.rate, currency)} per payable`].filter(Boolean).join(' · ')}
                fields={['totalEvents', 'payableEvents', 'approvedEvents', 'payout']}
                {...{ closed, valueOf, setField, isDirty, rowErrors, savingKeys, saveRow }}
              />
            ))}

            {distributionRows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-3 px-2 text-[12px] text-[#98a2b3]">
                  No publisher running this campaign in this month.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function EntryRow({ row, label, sub, fields, closed, valueOf, setField, isDirty, rowErrors, savingKeys, saveRow }) {
  const dirty = isDirty(row)
  const saving = savingKeys.includes(row.key)
  const error = rowErrors[row.key]
  const payableTooHigh = row.type === 'distribution' && valueOf(row, 'payableEvents') !== '' &&
    Number(valueOf(row, 'payableEvents')) > Number(valueOf(row, 'totalEvents') || 0)

  const onKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      saveRow(row)
    }
  }

  return (
    <tr className={`${dirty ? 'bg-[#f5f8ff]' : ''} ${error ? 'bg-[#fff6f5]' : ''}`}>
      <td className="py-2 px-2 border-b border-[#eef1f5] align-middle">
        <div className="font-semibold text-[#172033] truncate max-w-[280px]">{label}</div>
        {sub && <div className="text-[11px] text-[#98a2b3] truncate max-w-[280px]">{sub}</div>}
      </td>

      {fields.map((field, index) => (
        <td key={field || index} className="py-2 px-2 border-b border-[#eef1f5] align-middle w-[130px]">
          {field && (
            <Input
              type="number"
              min="0"
              step={field === 'revenue' || field === 'payout' ? '0.01' : '1'}
              disabled={closed}
              value={valueOf(row, field)}
              onChange={(e) => setField(row, field, e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={field === 'approvedEvents' || field === 'events' ? 'optional' : '0'}
              aria-label={field}
              className={`${cellInput} ${field === 'payableEvents' && payableTooHigh ? '!border-[#d92d20]' : ''}`}
            />
          )}
        </td>
      ))}

      <td className="py-2 px-2 border-b border-[#eef1f5] align-middle text-[11px]">
        {error ? (
          <span className="text-[#d92d20] font-semibold">{error}</span>
        ) : dirty ? (
          <span className="text-[#3563e9] font-bold">● Not saved</span>
        ) : row.entry ? (
          <span className="text-[#067647] font-semibold" title={row.entry.updatedByName ? `Last saved by ${row.entry.updatedByName}` : ''}>
            ✓ Saved{row.entry.updatedByName ? ` · ${row.entry.updatedByName}` : ''}
            {Number(row.entry.adjustment) !== 0 && (
              <span className="block text-[#667085] font-normal">adj. {money(row.entry.adjustment, row.entry.currency)}</span>
            )}
          </span>
        ) : (
          <span className="text-[#b54708] font-semibold">Missing</span>
        )}
        {row.type === 'distribution' && row.entry?.payoutMismatch && !dirty && (
          <span className="block text-[#b54708]">≠ {number(row.entry.payableEvents)} × rate</span>
        )}
      </td>

      <td className="py-2 px-2 border-b border-[#eef1f5] align-middle text-right">
        {!closed && (dirty || error) && (
          <SecondaryButton onClick={() => saveRow(row)} disabled={saving} className="!py-[6px] !px-3 !text-[12px]">
            {saving ? '…' : 'Save'}
          </SecondaryButton>
        )}
      </td>
    </tr>
  )
}

// The value shown before anything is typed: the saved entry, or blank
function initialValue(row, field) {
  const entry = row.entry
  if (!entry) return ''

  const value = row.type === 'campaign'
    ? { revenue: entry.revenue, events: entry.events || '' }[field]
    : { totalEvents: entry.totalEvents, payableEvents: entry.payableEvents, approvedEvents: entry.approvedEvents, payout: entry.payout }[field]

  return value === null || value === undefined || value === '' ? '' : String(Number(value))
}
