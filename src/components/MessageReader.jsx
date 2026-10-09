import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { ArrowLeft, Check, Loader2, Maximize2, Printer, X } from 'lucide-react'
import Avatar from './Avatar.jsx'
import SafeHtmlEmail from './SafeHtmlEmail'
import Attachments from './Attachments'
import { formatReceivedAt, formatRelativeTime, formatTotalAttachmentSize } from '../utils/helpers'

// Another dialog on screen (destroy, new inbox) owns the keyboard while it is
// open; the reader's own full-screen view is the one it may close itself.
function otherDialogOpen() {
  return Boolean(document.querySelector('[aria-modal="true"]:not([data-reader-fullscreen])'))
}

function formatClock(timestamp) {
  const date = new Date(timestamp ?? '')
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

// The reading pane from the design's inbox: sender, subject, body and files,
// with the verification code pulled out above the body. `F` opens the message
// full screen, `Esc` closes it and then goes back to the list.
function MessageReader({
  // No fallback message: an absent one must not render someone else's mail.
  message,
  onBack,
  onRetry,
  inboxAddress,
  onDownloadAttachment,
  onDownloadAll,
  onViewAttachment,
}) {
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const copiedTimer = useRef(null)
  // The row a retry was asked for. Any new row - loaded, or failed again -
  // ends the "trying" state on its own.
  const [retriedRow, setRetriedRow] = useState(null)
  const retrying = retriedRow !== null && retriedRow === message

  const recipient = message?.recipientEmail || inboxAddress || null
  const relativeTime = formatRelativeTime(message?.receivedAt)
  const clock = formatClock(message?.receivedAt)

  const handleKeyDown = useEffectEvent((e) => {
    // Don't intercept shortcuts if user is inside an input/textarea
    const tag = document.activeElement?.tagName?.toLowerCase()
    if (tag === 'input' || tag === 'textarea') return
    if (e.ctrlKey || e.metaKey || e.altKey) return

    if (e.key === 'Escape') {
      if (isFullScreen) {
        setIsFullScreen(false)
      } else if (!otherDialogOpen() && typeof onBack === 'function') {
        onBack()
      }
    } else if (e.key === 'f' || e.key === 'F') {
      if (!isFullScreen && otherDialogOpen()) return
      setIsFullScreen((prev) => !prev)
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => () => clearTimeout(copiedTimer.current), [])

  // Prevent outer background scroll when full-screen is open
  useEffect(() => {
    if (!isFullScreen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isFullScreen])

  const handleCopyCode = () => {
    if (message?.verificationCode) {
      navigator.clipboard?.writeText(message.verificationCode)
      setCopiedCode(true)
      clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopiedCode(false), 1500)
    }
  }

  const totalAttachmentSize = formatTotalAttachmentSize(message?.attachments)

  const contextButtonLabel =
    message?.contextActionText ||
    (message?.contextLabel ? `Open ${message.contextLabel}` : 'Open link')

  const sender = (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar seed={message?.senderEmail || message?.senderName} size={42} />
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900 dark:text-ink-dark">
          {message?.senderName || 'Unknown Sender'}
        </p>
        <p className="truncate text-xs text-slate-400 dark:text-muted-dark">
          {message?.senderEmail}
          {message?.senderEmail && recipient && <span aria-hidden="true"> · </span>}
          {recipient && <span>to {recipient}</span>}
        </p>
      </div>
    </div>
  )

  const received = message?.receivedAt && (
    <time dateTime={message.receivedAt} title={formatReceivedAt(message.receivedAt)} className="text-xs">
      {clock}
      {relativeTime && ` (${relativeTime})`}
    </time>
  )

  const codeCard = message?.verificationCode && (
    <section
      aria-label="Verification Code"
      className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-line-dark dark:bg-surface-dark"
    >
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-muted-dark">
          Verification code · auto-extracted
        </p>
        <p className="mt-1 select-all break-all font-mono text-2xl font-semibold tracking-widest text-slate-900 sm:text-3xl dark:text-ink-dark">
          {message.verificationCode}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleCopyCode}
          className="flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white ring-1 ring-transparent transition-colors hover:bg-slate-800 dark:bg-surface-dark dark:text-ink-dark dark:ring-line-dark dark:hover:bg-line-dark"
          aria-label="Copy verification code"
        >
          {copiedCode ? (
            <span className="flex items-center gap-1.5 text-emerald-300">
              <Check size={15} aria-hidden="true" />
              Copied
            </span>
          ) : (
            <span>Copy Code</span>
          )}
        </button>
        {message?.contextUrl && (
          <a
            href={message.contextUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-line-dark dark:bg-surface-dark dark:text-body-dark dark:hover:bg-line-dark"
          >
            {contextButtonLabel} <span aria-hidden="true">→</span>
          </a>
        )}
      </div>
    </section>
  )

  const body = (
    <div className="mt-6">
      {message?.htmlBody ? (
        <SafeHtmlEmail htmlContent={message.htmlBody} />
      ) : (
        <div className="space-y-4">
          <div className="whitespace-pre-wrap wrap-break-word leading-relaxed text-slate-600 select-text dark:text-body-dark">
            {message?.textBody || message?.body || '(Empty message body)'}
          </div>
          {message?.actionText && message?.contextUrl && (
            <a
              href={message.contextUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white ring-1 ring-transparent transition-colors hover:bg-slate-800 dark:bg-surface-dark dark:text-ink-dark dark:ring-line-dark dark:hover:bg-line-dark"
            >
              <span>{message.actionText}</span>
              <span aria-hidden="true">→</span>
            </a>
          )}
        </div>
      )}
    </div>
  )

  const attachments = (
    <Attachments
      attachments={message?.attachments}
      totalAttachmentSize={totalAttachmentSize}
      scanInfo={message?.scanInfo}
      onDownloadAll={onDownloadAll}
      onDownloadAttachment={onDownloadAttachment}
      onViewAttachment={onViewAttachment}
    />
  )

  const notLoaded = (
    <div role="status" className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-8 text-center">
      <p className="text-sm font-medium text-slate-900">This message didn’t load</p>
      <p className="mt-1 text-xs text-slate-500">
        It arrived, but its content couldn’t be fetched. Inbound keeps trying for a little while.
      </p>
      {typeof onRetry === 'function' && (
        <button
          type="button"
          onClick={() => {
            setRetriedRow(message)
            onRetry(message)
          }}
          disabled={retrying}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
        >
          {retrying && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
          {retrying ? 'Trying again…' : 'Try again'}
        </button>
      )}
    </div>
  )

  const content = message?.incomplete ? (
    notLoaded
  ) : (
    <>
      {body}
      {attachments}
    </>
  )

  return (
    <>
      <article className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 md:px-8 md:py-8">
        {typeof onBack === 'function' && (
          <button
            type="button"
            onClick={onBack}
            className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 lg:hidden print:hidden dark:text-muted-dark dark:hover:text-ink-dark"
            aria-label="Back to inbox"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Inbox
          </button>
        )}

        <div className="flex flex-wrap items-start justify-between gap-3">
          {sender}
          <div className="flex shrink-0 items-center gap-3 pt-1 text-slate-400 sm:gap-4 dark:text-muted-dark">
            {received && <span className="hidden sm:inline">{received}</span>}
            <button
              type="button"
              onClick={() => window.print()}
              className="hover:text-slate-700 print:hidden dark:hover:text-ink-dark"
              aria-label="Print email"
              title="Print email"
            >
              <Printer size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setIsFullScreen(true)}
              className="hover:text-slate-700 print:hidden dark:hover:text-ink-dark"
              aria-label="Expand email to full-screen view"
              title="Expand (F)"
            >
              <Maximize2 size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <h2 className="mt-6 wrap-break-word text-lg font-semibold text-slate-900 sm:text-xl dark:text-ink-dark">
          {message?.subject || '(No Subject)'}
        </h2>

        {codeCard}
        {content}
      </article>

      {/* Two layers. The tinted, blurred backdrop sits still underneath; the
          email scrolls on a clear layer above it. With the blur on the layer
          that scrolls (as it was), the browser redrew the blur on every
          scroll frame and scrolling dragged. Same look, blur drawn once. */}
      {isFullScreen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm dark:bg-black/60"
        />
      )}
      {isFullScreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen email reader"
          data-reader-fullscreen=""
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain p-0 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsFullScreen(false)
          }}
        >
          {/* Pinned to the window's top right rather than sitting in the
              header, so it stays where it is looked for as the email scrolls. */}
          <button
            type="button"
            onClick={() => setIsFullScreen(false)}
            className="fixed top-4 right-4 z-10 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 dark:border-line-dark dark:bg-surface-dark dark:text-body-dark dark:hover:bg-line-dark"
            aria-label="Exit Fullscreen"
          >
            <X size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Exit fullscreen</span>
          </button>
          <article
            className="min-h-full w-full max-w-3xl border-slate-200 bg-white p-6 shadow-2xl sm:min-h-0 sm:rounded-3xl sm:border sm:p-10 dark:border-line-dark dark:bg-canvas-dark"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5 dark:border-line-soft-dark">
              {sender}
              <div className="flex shrink-0 items-center gap-3 text-slate-400 dark:text-muted-dark">{received}</div>
            </header>

            <h2 className="mt-6 wrap-break-word text-xl font-semibold text-slate-900 sm:text-2xl dark:text-ink-dark">
              {message?.subject || '(No Subject)'}
            </h2>

            {codeCard}
            {content}
          </article>
        </div>
      )}
    </>
  )
}

export default MessageReader
