import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Button from './ui/Button'

// "Destroy Temporary Inbox?" - the confirmation from the message reader, shared
// so the inbox page's Destroy button asks the same question the same way.
// Focus starts on Cancel, so Enter never destroys by accident, and Esc closes.
export default function ConfirmDestroyDialog({
  open,
  onCancel,
  onConfirm,
  showBackendNote = false,
}) {
  const cancelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    cancelRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  // Portalled to <body>: an animated ancestor (the inbox's fade-in) creates a
  // containing block that would otherwise trap this fixed overlay inside it.
  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-destroy-title"
      aria-describedby="confirm-destroy-body"
      className="fixed inset-0 z-50 bg-text-primary/40 backdrop-blur-2xs flex items-center justify-center p-4"
    >
      <div className="bg-surface border border-border-default rounded-[10px] p-6 max-w-sm w-full shadow-lg flex flex-col gap-4">
        <div className="flex items-center gap-2.5 text-danger">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 id="confirm-destroy-title" className="font-bold text-sm text-text-primary">
            Destroy Temporary Inbox?
          </h3>
        </div>
        <p id="confirm-destroy-body" className="text-xs text-text-secondary leading-relaxed">
          This action is permanent and will delete all messages in this temporary address.
          {showBackendNote && (
            <span className="block mt-2 font-mono text-[11px] text-text-tertiary">
              (Note: Backend deletion API will be connected in future tickets.)
            </span>
          )}
        </p>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button ref={cancelRef} variant="light" onClick={onCancel} className="text-xs">
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} className="text-xs font-semibold">
            Yes, destroy inbox
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
