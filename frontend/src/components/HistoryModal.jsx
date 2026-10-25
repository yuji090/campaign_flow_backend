import { api } from '../services/api'
import useLoad from '../lib/useLoad'
import { monthLabel } from '../lib/format'
import { Empty, ErrorBox, Loading, Modal } from './ui'

const ACTION_STYLES = {
  CREATE: 'bg-[#ecfdf3] text-[#067647]',
  UPDATE: 'bg-[#f5f8ff] text-[#3563e9]',
  DELETE: 'bg-[#fff0ef] text-[#b42318]',
}

const ACTION_LABELS = { CREATE: 'Added', UPDATE: 'Edited', DELETE: 'Deleted' }

// Who changed which number, when, with old → new values.
//   filter: { campaignId } | { distributionId } | { partnerId } | {} for company-wide
export default function HistoryModal({ title = 'Change history', filter = {}, onClose }) {
  const query = new URLSearchParams(Object.entries(filter).filter(([, v]) => v != null)).toString()

  const { data, loading, error } = useLoad(() => api.get(`/api/history${query ? `?${query}` : ''}`), [query])

  return (
    <Modal wide title={title} description="Every change to money, newest first. Old → new values." onClose={onClose}>
      <ErrorBox message={error} />

      {loading && !data ? (
        <Loading />
      ) : !data?.length ? (
        <Empty title="No changes yet" text="Edits to revenue, payouts, payments and rates will show up here." />
      ) : (
        <ol className="m-0 p-0 list-none grid max-h-[60vh] overflow-y-auto -mx-[23px] px-[23px]">
          {data.map((row) => (
            <li key={row.id} className="flex gap-3 py-3 border-b border-[#eef1f5] last:border-0">
              <span className={`shrink-0 h-[22px] px-2 rounded-full text-[10px] font-extrabold uppercase tracking-[.4px] grid place-items-center ${ACTION_STYLES[row.action] || ACTION_STYLES.UPDATE}`}>
                {ACTION_LABELS[row.action] || row.action}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-[#172033] leading-[1.5] break-words">{row.summary}</div>
                <div className="text-[11px] text-[#98a2b3] mt-[2px]">
                  {row.byName || 'System'} · {formatDateTime(row.at)}
                  {row.month && <> · for {monthLabel(row.month)}</>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  )
}

function formatDateTime(value) {
  if (!value) return ''

  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
