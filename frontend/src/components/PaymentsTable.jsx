import { isAdmin } from '../lib/auth'
import { dateLabel } from '../lib/format'
import { LinkButton, Money, Row, Table, Td } from './ui'

/* ----------------------------- */
/* Payments list                 */
/* ----------------------------- */

const KIND_LABELS = {
  RECEIVED: { label: 'Received', className: 'text-[#067647] bg-[#ecfdf3]' },
  PAID: { label: 'Paid', className: 'text-[#b54708] bg-[#fffaeb]' },
  WRITE_OFF: { label: 'Write-off', className: 'text-[#475467] bg-[#f2f4f7]' },
}

// Payments with edit (everyone) and delete (admins)
export default function PaymentsTable({ payments, onEdit, onDelete, showPartner = false, empty }) {
  if (payments.length === 0) return empty || null

  return (
    <Table
      columns={[
        { label: 'Date' },
        ...(showPartner ? [{ label: 'Partner' }] : []),
        { label: 'Type' },
        { label: 'Amount', align: 'right' },
        { label: 'Deduction', align: 'right' },
        { label: 'Clears', align: 'right' },
        { label: 'Reference' },
        { label: 'Added by' },
        { label: '' },
      ]}
    >
      {payments.map((p) => {
        const kind = p.kind === 'WRITE_OFF' ? KIND_LABELS.WRITE_OFF : KIND_LABELS[p.direction]

        return (
          <Row key={p.id}>
            <Td className="whitespace-nowrap"><strong>{dateLabel(p.date)}</strong></Td>
            {showPartner && <Td>{p.partnerName}</Td>}
            <Td>
              <span className={`inline-block px-[7px] py-[3px] rounded-[5px] text-[10px] font-bold ${kind.className}`}>{kind.label}</span>
              {p.kind === 'WRITE_OFF' && (
                <span className="text-[11px] text-[#98a2b3] ml-1">{p.direction === 'RECEIVED' ? 'they owed us' : 'we owed them'}</span>
              )}
            </Td>
            <Td align="right"><Money value={p.amount} currency={p.currency} /></Td>
            <Td align="right">{Number(p.deduction) > 0 ? <Money value={p.deduction} currency={p.currency} muted /> : <span className="text-[#c8d0dd]">—</span>}</Td>
            <Td align="right"><Money value={p.cleared} currency={p.currency} /></Td>
            <Td className="text-xs text-[#667085] max-w-[200px]">
              {p.reference || '—'}
              {p.notes && <div className="text-[#98a2b3] truncate" title={p.notes}>{p.notes}</div>}
            </Td>
            <Td className="text-xs text-[#667085] whitespace-nowrap">{p.createdByName || '—'}</Td>
            <Td className="whitespace-nowrap text-right">
              <LinkButton onClick={() => onEdit(p)}>Edit</LinkButton>
              {isAdmin() && (
                <>
                  <span className="inline-block w-3" />
                  <LinkButton danger onClick={() => onDelete(p)}>Delete</LinkButton>
                </>
              )}
            </Td>
          </Row>
        )
      })}
    </Table>
  )
}
