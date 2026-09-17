import { useState, useEffect } from 'react'
import Button from './Button'
import Card from './Card'
import Badge from './Badge'
import SafeHtmlEmail from './SafeHtmlEmail'
import { MOCK_MESSAGES } from '../data/mockMessages'

/**
 * Formats an ISO timestamp into a human-readable date/time string.
 * Example: '2026-09-14T07:22:15Z' -> 'Sep 14, 2026, 7:22 AM'
 * Automatically uses the user's local timezone.
 */
function formatReceivedAt(timestamp) {
  if (!timestamp) return 'Unknown time'
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return timestamp

  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date)
  } catch {
    return timestamp
  }
}

/**
 * Formats an ISO timestamp into a relative time string.
 * Examples: 'just now', '12m ago', '2h ago', '3d ago'
 */
function formatRelativeTime(receivedAt) {
  if (!receivedAt) return ''
  const date = new Date(receivedAt)
  if (isNaN(date.getTime())) return ''

  const diffMs = Date.now() - date.getTime()
  if (diffMs < 0) return 'just now'

  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMin < 1) {
    return 'just now'
  }
  if (diffHours < 1) {
    return `${diffMin}m ago`
  }
  if (diffDays < 1) {
    return `${diffHours}h ago`
  }
  if (diffDays < 30) {
    return `${diffDays}d ago`
  }
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) {
    return `${diffMonths}mo ago`
  }
  const diffYears = Math.floor(diffDays / 365)
  return `${diffYears}y ago`
}

/**
 * Calculates and formats total attachments size.
 * Example: [{size: '4.8 MB'}, {size: '1.4 MB'}] -> '6.2 MB'
 */
function formatTotalAttachmentSize(attachments = []) {
  if (!attachments || attachments.length === 0) return ''
  let totalBytes = 0
  let hasValidSize = false

  for (const att of attachments) {
    if (!att.size) continue
    const match = String(att.size).trim().match(/^([\d.]+)\s*(B|KB|MB|GB)?$/i)
    if (match) {
      hasValidSize = true
      const num = parseFloat(match[1])
      const unit = (match[2] || 'B').toUpperCase()
      if (unit === 'GB') totalBytes += num * 1024 * 1024 * 1024
      else if (unit === 'MB') totalBytes += num * 1024 * 1024
      else if (unit === 'KB') totalBytes += num * 1024
      else totalBytes += num
    }
  }

  if (!hasValidSize || totalBytes === 0) return ''
  if (totalBytes >= 1024 * 1024 * 1024) {
    return `${(totalBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
  if (totalBytes >= 1024 * 1024) {
    return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
  }
  if (totalBytes >= 1024) {
    return `${(totalBytes / 1024).toFixed(0)} KB`
  }
  return `${totalBytes} B`
}

function MessageReader({
  message = MOCK_MESSAGES[0],
  onBack,
  inboxAddress,
  onGenerateEmail,
  onDestroy,
  onDownloadAttachment,
  onDownloadAll,
  onViewAttachment,
}) {
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [showDestroyConfirm, setShowDestroyConfirm] = useState(false)

  const activeAddress = inboxAddress || message?.recipientEmail || 'temporary-inbox@inbound.mail'
  const relativeTime = formatRelativeTime(message?.receivedAt)

  // Keyboard shortcut listener: ESC to back / exit full-screen, F to toggle full-screen
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept shortcuts if user is inside an input/textarea
      const tag = document.activeElement?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return

      if (e.key === 'Escape') {
        if (isFullScreen) {
          setIsFullScreen(false)
        } else if (typeof onBack === 'function') {
          onBack()
        }
      } else if (e.key === 'f' || e.key === 'F') {
        setIsFullScreen((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullScreen, onBack])

  // Prevent outer background scroll when full-screen is open
  useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isFullScreen])

  const handleCopyCode = () => {
    if (message?.verificationCode) {
      navigator.clipboard?.writeText(message.verificationCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 1500)
    }
  }

  const handleCopyAddress = () => {
    if (activeAddress) {
      navigator.clipboard?.writeText(activeAddress)
      setCopiedAddress(true)
      setTimeout(() => setCopiedAddress(false), 1500)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleConfirmDestroy = () => {
    setShowDestroyConfirm(false)
    if (typeof onDestroy === 'function') {
      onDestroy()
    }
  }

  const senderInitials = (message?.senderName || message?.senderEmail || 'Inbound')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')

  const totalAttachmentSize = formatTotalAttachmentSize(message?.attachments)

  const contextButtonLabel =
    message?.contextActionText ||
    (message?.contextLabel ? `Open ${message.contextLabel}` : 'Open link')

  const getFileBadgeStyle = (type = '') => {
    const t = type.toUpperCase()
    if (t === 'PDF') return 'bg-danger/10 text-danger border-danger/30'
    if (t === 'PNG' || t === 'JPG' || t === 'JPEG') return 'bg-purple-50 text-purple-700 border-purple-200'
    if (t === 'ZIP' || t === 'TAR') return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-chip text-text-secondary border-border-default'
  }

  return (
    <div className="min-h-screen w-full bg-page text-text-primary font-sans flex flex-col antialiased selection:bg-dark-btn selection:text-surface">
      <header className="w-full h-14 bg-header border-b border-border-default px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5 select-none">
          <span className="w-3 h-3 bg-dark-btn rounded-full inline-block" aria-hidden="true" />
          <span className="font-bold text-[15px] tracking-tight text-text-primary">Inbound</span>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="dark"
            onClick={onGenerateEmail}
            className="text-[13px] font-semibold px-3 py-1.5 gap-2"
            aria-label="Generate new temporary email"
          >
            <span>Generate Email</span>
            <kbd className="font-mono text-[10px] bg-dark-btn-hover text-surface px-1.5 py-0.5 rounded-[3px] border border-surface/20 select-none">
              G
            </kbd>
          </Button>

          <Button
            variant="icon"
            aria-label="Toggle theme"
            title="Toggle theme (visual representation)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </Button>
        </div>
      </header>

      <main className="w-full max-w-[1000px] mx-auto px-6 py-6 flex-1 flex flex-col gap-4">
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3" aria-label="Inbox Actions">
          <div>
            <Button
              variant="light"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm text-text-primary"
              aria-label="Back to inbox"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to inbox</span>
              <kbd className="font-mono text-[10px] bg-chip border border-border-default text-text-secondary px-1.5 py-0.5 rounded-[3px] select-none ml-0.5">
                ESC
              </kbd>
            </Button>
          </div>

          <div className="flex items-center flex-wrap gap-2 sm:gap-2.5">
            <div className="inline-flex items-center bg-surface border border-border-default rounded-[6px] text-xs overflow-hidden h-8">
              <div className="flex items-center gap-1.5 px-2.5 text-text-secondary border-r border-border-default h-full font-mono">
                <span className="text-text-tertiary" aria-hidden="true">@</span>
                <span className="truncate max-w-[160px] sm:max-w-[220px] text-text-primary" title={activeAddress}>
                  {activeAddress}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyAddress}
                className="px-2.5 h-full text-xs font-medium text-text-primary hover:bg-page transition-colors cursor-pointer flex items-center gap-1"
                aria-label="Copy inbox address"
              >
                {copiedAddress ? (
                  <span className="text-success font-semibold">Copied</span>
                ) : (
                  <span>Copy</span>
                )}
              </button>
            </div>

            <Button
              variant="icon"
              onClick={handlePrint}
              aria-label="Print email"
              title="Print email"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </Button>

            <Button
              variant="danger"
              onClick={() => setShowDestroyConfirm(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium h-8"
              aria-label="Destroy Inbox"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Destroy Inbox</span>
            </Button>
          </div>
        </section>

        <Card className="p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <h1 className="text-xl sm:text-[22px] font-bold text-text-primary tracking-tight leading-snug break-words flex-1">
              {message?.subject || '(No Subject)'}
            </h1>

            {message?.id && (
              <Badge className="self-start sm:self-auto shrink-0 bg-chip text-text-secondary px-2.5 py-1 text-xs">
                ID: #{message.id}
              </Badge>
            )}
          </div>

          <div className="border-t border-border-default my-4" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-[8px] bg-chip text-text-primary font-semibold text-sm flex items-center justify-center shrink-0 select-none"
                aria-hidden="true"
              >
                {senderInitials}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-semibold text-sm sm:text-base text-text-primary truncate">
                    {message?.senderName || 'Unknown Sender'}
                  </span>
                  {message?.senderEmail && (
                    <span className="font-mono text-xs text-text-secondary truncate">
                      &lt;{message.senderEmail}&gt;
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 mt-0.5 text-xs text-text-secondary">
                  <span className="text-text-tertiary">to</span>
                  <span className="font-mono text-text-secondary truncate">
                    {message?.recipientEmail || activeAddress}
                  </span>
                </div>
              </div>
            </div>

            <div className="sm:text-right shrink-0">
              <time
                dateTime={message?.receivedAt}
                className="inline-flex items-center gap-1.5 font-mono text-xs text-text-secondary bg-page border border-border-default px-2.5 py-1 rounded-[4px]"
              >
                <svg className="w-3.5 h-3.5 text-text-tertiary shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{formatReceivedAt(message?.receivedAt)}</span>
              </time>
              {relativeTime && (
                <div className="font-mono text-[11px] text-text-tertiary mt-1 sm:text-right">
                  {relativeTime}
                </div>
              )}
            </div>
          </div>
        </Card>

        {message?.verificationCode && (
          <section
            aria-label="Verification Code"
            className="border-2 border-border-strong bg-surface rounded-[10px] p-6 flex flex-col gap-4"
          >
            <div className="flex items-center gap-2 font-mono text-xs font-semibold tracking-wider text-text-primary uppercase">
              <span className="w-2 h-2 rounded-full bg-border-strong" aria-hidden="true" />
              <span>VERIFICATION CODE (AUTO-EXTRACTED)</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="font-mono text-[30px] sm:text-[32px] font-bold tracking-widest text-text-primary bg-page border border-border-default rounded-[8px] px-6 py-2.5 select-all leading-none">
                  {message.verificationCode}
                </div>

                <Button
                  variant="dark"
                  onClick={handleCopyCode}
                  className="px-4 py-2 text-xs font-semibold h-11"
                  aria-label="Copy verification code"
                >
                  {copiedCode ? (
                    <span className="text-success flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Copied
                    </span>
                  ) : (
                    <span>Copy Code</span>
                  )}
                </Button>
              </div>

              {message?.contextUrl && (
                <a
                  href={message.contextUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-page hover:bg-chip border border-border-strong text-text-primary text-xs font-semibold px-3.5 py-2 rounded-[6px] transition-colors cursor-pointer self-start sm:self-center"
                >
                  <span>{contextButtonLabel}</span>
                  <span aria-hidden="true">→</span>
                </a>
              )}
            </div>
          </section>
        )}

        <Card className="overflow-hidden">
          <div className="bg-page border-b border-border-default px-5 py-2.5 sm:px-6 sm:py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-text-secondary">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-text-primary shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Images and remote assets sanitized for tracker protection. CSS strictly scoped.</span>
            </div>

            <button
              type="button"
              onClick={() => setIsFullScreen(true)}
              className="inline-flex items-center gap-1.5 font-medium text-text-primary hover:text-text-secondary transition-colors cursor-pointer shrink-0"
              aria-label="Expand email to full-screen view"
            >
              <span>Expand email</span>
              <kbd className="font-mono text-[10px] bg-surface border border-border-default text-text-secondary px-1.5 py-0.5 rounded-[3px] shadow-2xs select-none">
                F
              </kbd>
            </button>
          </div>

          <div className="p-6 sm:p-7">
            {message?.htmlBody ? (
              <SafeHtmlEmail htmlContent={message.htmlBody} />
            ) : (
              <div className="flex flex-col gap-4">
                <div className="font-sans text-text-primary text-sm leading-relaxed whitespace-pre-wrap break-words select-text">
                  {message?.textBody || message?.body || '(Empty message body)'}
                </div>

                {message?.actionText && message?.contextUrl && (
                  <div className="pt-2">
                    <a
                      href={message.contextUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-dark-btn hover:bg-dark-btn-hover text-surface text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-[6px] transition-colors cursor-pointer shadow-xs"
                    >
                      <span>{message.actionText}</span>
                      <span aria-hidden="true">→</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {message?.attachments && message.attachments.length > 0 && (
          <Card className="p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-text-primary shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <h2 className="text-sm sm:text-base font-bold text-text-primary">Attachments</h2>
                <Badge className="bg-chip text-text-secondary px-2 py-0.5 font-mono text-[11px]">
                  {message.attachments.length} {message.attachments.length === 1 ? 'file' : 'files'}
                  {totalAttachmentSize ? ` · ${totalAttachmentSize}` : ''}
                </Badge>
              </div>

              <Button
                variant="light"
                onClick={onDownloadAll}
                className="text-xs px-3 py-1.5 gap-1.5 self-start sm:self-auto"
                aria-label="Download all attachments as zip"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download All (.zip)</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {message.attachments.map((att) => (
                <div
                  key={att.id || att.filename}
                  className="bg-surface border border-border-default rounded-[8px] p-3 flex flex-col justify-between hover:border-border-strong transition-colors gap-2.5 min-w-0"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[3px] border uppercase shrink-0 ${getFileBadgeStyle(
                        att.type
                      )}`}
                    >
                      {att.type || 'FILE'}
                    </span>
                    <span
                      className="font-medium text-xs text-text-primary truncate block flex-1"
                      title={att.filename}
                    >
                      {att.filename}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-page text-[11px] text-text-secondary">
                    <span className="font-mono">{att.size || ''}</span>
                    <div className="flex items-center gap-1.5">
                      {typeof onViewAttachment === 'function' && (
                        <button
                          type="button"
                          onClick={() => onViewAttachment(att)}
                          className="hover:text-text-primary font-medium transition-colors cursor-pointer"
                        >
                          View
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => typeof onDownloadAttachment === 'function' && onDownloadAttachment(att)}
                        className="hover:text-text-primary font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                        aria-label={`Download ${att.filename}`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {message?.scanInfo && (
              <div className="mt-2 pt-3 border-t border-border-default flex items-center gap-2 text-xs font-mono text-text-secondary">
                <svg className="w-3.5 h-3.5 text-success shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{message.scanInfo}</span>
              </div>
            )}
          </Card>
        )}
      </main>

      {isFullScreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen email reader"
          className="fixed inset-0 z-50 bg-text-primary/40 backdrop-blur-md overflow-y-auto flex justify-center items-start p-0 sm:p-5 md:p-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsFullScreen(false)
          }}
        >
          <article
            className="bg-surface w-full max-w-[920px] min-h-full sm:min-h-[calc(100vh-4rem)] rounded-none sm:rounded-[10px] shadow-2xl border-0 sm:border border-border-default p-6 sm:p-10 md:p-12 flex flex-col gap-7 my-0 sm:my-auto transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex flex-col gap-4 pb-5 border-b border-border-default">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-[8px] bg-chip text-text-primary font-semibold text-sm flex items-center justify-center shrink-0 select-none"
                    aria-hidden="true"
                  >
                    {senderInitials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm sm:text-base text-text-primary truncate">
                        {message?.senderName || 'Unknown Sender'}
                      </span>
                      {message?.senderEmail && (
                        <span className="font-mono text-xs text-text-secondary truncate">
                          &lt;{message.senderEmail}&gt;
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-text-secondary">
                      <span className="text-text-tertiary">to</span>
                      <span className="font-mono truncate">
                        {message?.recipientEmail || activeAddress}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  <time
                    dateTime={message?.receivedAt}
                    className="font-mono text-xs text-text-secondary bg-page border border-border-default px-2.5 py-1 rounded-[4px]"
                  >
                    {formatReceivedAt(message?.receivedAt)}
                  </time>

                  <Button
                    variant="light"
                    onClick={() => setIsFullScreen(false)}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 text-text-primary"
                    aria-label="Exit Fullscreen"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Exit Fullscreen</span>
                    <kbd className="font-mono text-[10px] bg-chip border border-border-default text-text-secondary px-1.5 py-0.5 rounded-[3px] select-none">
                      ESC
                    </kbd>
                  </Button>
                </div>
              </div>

              <h1 className="text-xl sm:text-[26px] font-bold text-text-primary tracking-tight leading-snug">
                {message?.subject || '(No Subject)'}
              </h1>
            </header>

            <div className="text-text-primary leading-relaxed">
              {message?.htmlBody ? (
                <SafeHtmlEmail htmlContent={message.htmlBody} />
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="font-sans text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words select-text">
                    {message?.textBody || message?.body || '(Empty message body)'}
                  </div>

                  {message?.actionText && message?.contextUrl && (
                    <div className="pt-2">
                      <a
                        href={message.contextUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-dark-btn hover:bg-dark-btn-hover text-surface text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-[6px] transition-colors cursor-pointer shadow-xs"
                      >
                        <span>{message.actionText}</span>
                        <span aria-hidden="true">→</span>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {message?.verificationCode && (
              <section
                aria-label="Verification Code"
                className="border border-border-strong bg-surface-subtle rounded-[10px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-border-strong" aria-hidden="true" />
                  <div>
                    <div className="font-mono text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                      Verification Code (Auto-Extracted)
                    </div>
                    <div className="font-mono text-2xl font-bold text-text-primary tracking-widest mt-0.5">
                      {message.verificationCode}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Button
                    variant="dark"
                    onClick={handleCopyCode}
                    className="px-3.5 py-1.5 text-xs font-semibold h-9"
                    aria-label="Copy verification code"
                  >
                    {copiedCode ? (
                      <span className="text-success flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Copied
                      </span>
                    ) : (
                      <span>Copy Code</span>
                    )}
                  </Button>
                  {message?.contextUrl && (
                    <a
                      href={message.contextUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-page hover:bg-chip border border-border-strong text-text-primary text-xs font-semibold px-3.5 py-2 rounded-[6px] transition-colors cursor-pointer"
                    >
                      <span>{contextButtonLabel}</span>
                      <span aria-hidden="true">→</span>
                    </a>
                  )}
                </div>
              </section>
            )}

            {message?.attachments && message.attachments.length > 0 && (
              <section
                aria-label="Attachments"
                className="pt-5 border-t border-border-default flex flex-col gap-4 mt-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-text-primary shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <h3 className="text-sm font-bold text-text-primary">Attachments</h3>
                    <Badge className="bg-chip text-text-secondary px-2 py-0.5 font-mono text-[11px]">
                      {message.attachments.length} {message.attachments.length === 1 ? 'file' : 'files'}
                      {totalAttachmentSize ? ` · ${totalAttachmentSize}` : ''}
                    </Badge>
                  </div>

                  <Button
                    variant="light"
                    onClick={onDownloadAll}
                    className="text-xs px-2.5 py-1 gap-1.5"
                    aria-label="Download all attachments as zip"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download All</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {message.attachments.map((att) => (
                    <div
                      key={att.id || att.filename}
                      className="bg-surface-subtle border border-border-default rounded-[8px] p-3 flex flex-col justify-between hover:border-border-strong transition-colors gap-2.5 min-w-0"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span
                          className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[3px] border uppercase shrink-0 ${getFileBadgeStyle(
                            att.type
                          )}`}
                        >
                          {att.type || 'FILE'}
                        </span>
                        <span
                          className="font-medium text-xs text-text-primary truncate block flex-1"
                          title={att.filename}
                        >
                          {att.filename}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-page text-[11px] text-text-secondary">
                        <span className="font-mono">{att.size || ''}</span>
                        <div className="flex items-center gap-2">
                          {typeof onViewAttachment === 'function' && (
                            <button
                              type="button"
                              onClick={() => onViewAttachment(att)}
                              className="hover:text-text-primary font-medium transition-colors cursor-pointer"
                            >
                              View
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => typeof onDownloadAttachment === 'function' && onDownloadAttachment(att)}
                            className="hover:text-text-primary font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                            aria-label={`Download ${att.filename}`}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </article>
        </div>
      )}

      {showDestroyConfirm && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-text-primary/40 backdrop-blur-2xs flex items-center justify-center p-4"
        >
          <div className="bg-surface border border-border-default rounded-[10px] p-6 max-w-sm w-full shadow-lg flex flex-col gap-4">
            <div className="flex items-center gap-2.5 text-danger">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="font-bold text-sm text-text-primary">Destroy Temporary Inbox?</h3>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              This action is permanent and will delete all messages in this temporary address.
              {typeof onDestroy !== 'function' && (
                <span className="block mt-2 font-mono text-[11px] text-text-tertiary">
                  (Note: Backend deletion API will be connected in future tickets.)
                </span>
              )}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="light"
                onClick={() => setShowDestroyConfirm(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDestroy}
                className="text-xs font-semibold"
              >
                Yes, destroy inbox
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MessageReader
