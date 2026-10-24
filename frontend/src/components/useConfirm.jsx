import { useCallback, useState } from 'react'
import { Modal, PrimaryButton, SecondaryButton } from './ui'

// In-page replacement for window.confirm:
//   const [confirm, confirmDialog] = useConfirm()
//   if (!(await confirm({ title, message, confirmLabel, danger }))) return
//   ...render {confirmDialog} somewhere in the page
export default function useConfirm() {
  const [request, setRequest] = useState(null)

  const confirm = useCallback(
    (options) => new Promise((resolve) => setRequest({ ...options, resolve })),
    []
  )

  const close = (answer) => {
    request?.resolve(answer)
    setRequest(null)
  }

  const dialog = request && (
    <Modal
      title={request.title || 'Are you sure?'}
      onClose={() => close(false)}
      footer={
        <>
          <SecondaryButton onClick={() => close(false)}>Cancel</SecondaryButton>
          <PrimaryButton
            onClick={() => close(true)}
            className={request.danger ? '!bg-[#d92d20] hover:!bg-[#b42318] !shadow-none' : ''}
          >
            {request.confirmLabel || 'Confirm'}
          </PrimaryButton>
        </>
      }
    >
      <p className="m-0 text-[13px] text-[#475467] leading-[1.55]">{request.message}</p>
    </Modal>
  )

  return [confirm, dialog]
}
