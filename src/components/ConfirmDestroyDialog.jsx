import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { TriangleAlert } from 'lucide-react'

// "Destroy Temporary Inbox?" - asked before the inbox page's Destroy button
// throws an address away. Focus starts on Cancel, so Enter never destroys by
// accident, and Esc closes.
export default function ConfirmDestroyDialog({
  open,
  onCancel,
  onConfirm,
  showBackendNote = false,
  // Optional: which inbox, and how many others the session keeps.
  address = null,
  otherInboxCount = 0,
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

  // Portalled to <body>: an animated ancestor creates a containing block that
  // would otherwise trap this fixed overlay inside it.
  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-destroy-title"
      aria-describedby="confirm-destroy-body"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans"
    >
      <div aria-hidden="true" className="absolute inset-0 bg-slate-900/30" onClick={onCancel} />
      <div className="relative flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-2.5 text-rose-600">
          <TriangleAlert size={20} aria-hidden="true" className="shrink-0" />
          <h3 id="confirm-destroy-title" className="text-base font-semibold text-slate-900">
            Destroy Temporary Inbox?
          </h3>
        </div>
        <p id="confirm-destroy-body" className="text-sm leading-relaxed text-slate-500">
          This action is permanent and will delete all messages in{' '}
          {address ? (
            <span className="break-all font-mono text-slate-900">{address}</span>
          ) : (
            'this temporary address'
          )}
          .
          {otherInboxCount > 0 && (
            <span className="mt-2 block">
              Your other {otherInboxCount === 1 ? 'inbox stays' : `${otherInboxCount} inboxes stay`}.
            </span>
          )}
          {showBackendNote && (
            <span className="mt-2 block font-mono text-[11px] text-slate-400">
              (Note: Backend deletion API will be connected in future tickets.)
            </span>
          )}
        </p>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            Yes, destroy inbox
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
