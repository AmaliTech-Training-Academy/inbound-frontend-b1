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
      <div aria-hidden="true" className="absolute inset-0 bg-slate-900/30 dark:bg-black/60" onClick={onCancel} />
      <div className="relative flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-line-dark dark:bg-canvas-dark">
        <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
          <TriangleAlert size={20} aria-hidden="true" className="shrink-0" />
          <h3 id="confirm-destroy-title" className="text-base font-semibold text-slate-900 dark:text-ink-dark">
            Destroy Temporary Inbox?
          </h3>
        </div>
        <p id="confirm-destroy-body" className="text-sm leading-relaxed text-slate-500 dark:text-body-dark">
          This action is permanent and will delete all messages in{' '}
          {address ? (
            <span className="break-all font-mono text-slate-900 dark:text-ink-dark">{address}</span>
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
            <span className="mt-2 block font-mono text-[11px] text-slate-400 dark:text-muted-dark">
              (Note: Backend deletion API will be connected in future tickets.)
            </span>
          )}
        </p>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-line-dark dark:text-body-dark dark:hover:bg-surface-dark"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600"
          >
            Yes, destroy inbox
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
