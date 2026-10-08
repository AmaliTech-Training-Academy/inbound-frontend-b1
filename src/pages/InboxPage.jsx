import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { CloudOff, Loader2, MailOpen, Plus, RefreshCw, Search, Timer, TimerOff, Trash2, X } from 'lucide-react'
import Avatar from '../components/Avatar.jsx'
import BrandMark from '../components/BrandMark.jsx'
import CopyButton from '../components/CopyButton.jsx'
import MessageList from '../components/MessageList.jsx'
import MessageReader from '../components/MessageReader.jsx'
import InboxRail from '../components/InboxRail.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import NewInboxDialog from '../components/NewInboxDialog.jsx'
import ConfirmDestroyDialog from '../components/ConfirmDestroyDialog.jsx'
import RateLimitNotice from '../components/RateLimitNotice.jsx'
import { SiteFooter, SiteHero } from '../components/SiteChrome.jsx'
import { ApiError, downloadAttachment } from '../services/inboxApi.js'
import { SOCKET_STATUS } from '../services/inboxSocket.js'
import { rateLimitedUntil } from '../services/inboxApi.js'
import { useNow } from '../state/useNow.js'
import { formatTimeLeft, isRunningOut } from '../utils/inboxProgress.js'
import { toReaderMessage } from '../utils/message.js'
import { EXTEND_MINUTES } from '../config.js'
import { INBOX_PATH, ROUTES, messageDetailsPath } from '../router'

const MIN_SIDEBAR_WIDTH = 240
const MAX_SIDEBAR_WIDTH = 480
const DEFAULT_SIDEBAR_WIDTH = 300

// The inbox from the design (app/inbox/page.tsx): the message list on the
// left, the open message in the middle, the session's inboxes down the right.
export default function InboxPage() {
  const context = useOutletContext()
  const navigate = useNavigate()
  const { status, inbox, regenerating, regenerate, reset } = context.session

  if (status === 'expired' || status === 'ended' || regenerating) {
    return (
      <Purged
        session={context.session}
        ended={status === 'ended'}
        creating={status === 'creating'}
        onGenerate={async () => {
          await regenerate()
          navigate(INBOX_PATH, { replace: true })
        }}
        // Leaving clears the expired session, so home shows its usual hero
        // rather than repeating that the inbox is gone.
        onLeave={() => {
          reset()
          navigate(ROUTES.home)
        }}
      />
    )
  }

  // No session to show: the landing page is where one starts.
  if (status !== 'active' || !inbox) return <Navigate to={ROUTES.home} replace />

  return <InboxWorkspace {...context} />
}

function InboxWorkspace({ session, feeds, isUnread, markOpened, unreadCounts }) {
  const {
    inbox,
    inboxes,
    activeId,
    select,
    addInbox,
    adding,
    canAddInbox,
    extend,
    refresh,
    destroy,
    canExtend,
    busy,
    error,
    dismissError,
    notice,
    maxInboxes,
    atInboxLimit,
  } = session
  const { messageId } = useParams()
  const navigate = useNavigate()
  const now = useNow(1000)

  const feed = feeds[inbox.id]
  const messages = useMemo(() => (feed?.messages ?? []).map(toReaderMessage), [feed?.messages])

  const [query, setQuery] = useState('')
  const visible = useMemo(() => messages.filter((m) => matches(m, query)), [messages, query])

  // The url only ever holds text, so the id is compared as text: a numeric id
  // from the server would otherwise never match its own link.
  const selected = messageId ? (messages.find((m) => String(m.id) === messageId) ?? null) : null
  const selectedId = selected?.id

  // Opened is opened, however it got on screen: a click or a link.
  useEffect(() => {
    if (selectedId) markOpened(selectedId)
  }, [selectedId, markOpened])

  const [addOpen, setAddOpen] = useState(false)
  const [confirmingDestroy, setConfirmingDestroy] = useState(false)
  // { messageId, text }. An attachment failure belongs to the message it
  // happened in, so it is stored with that id and only drawn while that
  // message is open - no effect needed to clear it on the way out.
  const [attachmentError, setAttachmentError] = useState(null)
  // Both sides are undefined at once when there is no error and nothing is
  // open, so the error itself has to be checked before its id is compared.
  const shownAttachmentError =
    attachmentError && attachmentError.messageId === selectedId ? attachmentError.text : null

  const openMessage = (message) => navigate(messageDetailsPath(message.id))
  const closeMessage = useCallback(() => navigate(INBOX_PATH), [navigate])

  // A message url belongs to the inbox it was opened in.
  const leaveMessage = useCallback(() => {
    if (messageId) navigate(INBOX_PATH, { replace: true })
  }, [messageId, navigate])

  // So when another inbox takes over by itself - the open one expired, or the
  // server's list dropped it - the url goes back to the list too.
  const shownInboxId = useRef(inbox.id)
  useEffect(() => {
    if (shownInboxId.current === inbox.id) return
    shownInboxId.current = inbox.id
    leaveMessage()
  }, [inbox.id, leaveMessage])

  // Until the list has been checked, a message url that matches nothing may
  // simply not have loaded yet (a reload with a message open).
  const listPending =
    !feed?.synced && !feed?.sweepError && feed?.connection !== SOCKET_STATUS.ERROR

  // One click on the rail is the switch: no profile step in between.
  const switchTo = (id) => {
    select(id)
    leaveMessage()
  }

  // A new inbox becomes the open one, so any message open belongs elsewhere.
  const createInbox = useCallback(async () => {
    const created = await addInbox()
    if (created) leaveMessage()
    return created
  }, [addInbox, leaveMessage])

  // The dialog has already said why an inbox could not be added, so the same
  // error is not left behind it on the page.
  const closeAdd = useCallback(() => {
    setAddOpen(false)
    dismissError()
  }, [dismissError])
  const cancelDestroy = useCallback(() => setConfirmingDestroy(false), [])

  const confirmDestroy = () => {
    setConfirmingDestroy(false)
    destroy()
    leaveMessage()
  }

  const onRefresh = () => {
    refresh()
    feed?.resync?.()
  }

  // --- Attachments ----------------------------------------------------
  // The download endpoint is authenticated, so a plain <a download> cannot be
  // used: it would send no Authorization header and come back 401. The bytes
  // are fetched here instead and handed to the browser as a blob url.
  //
  // One object url per file, revoked on a delay rather than at once: revoking
  // immediately can cancel the download (or blank the tab) the click just
  // started, since the browser has not finished reading it yet.
  const withAttachmentUrl = useCallback(
    async (attachment, handOff) => {
      setAttachmentError(null)
      try {
        const { blob, filename } = await downloadAttachment(attachment.id, inbox.token, {
          fallbackName: attachment.filename,
        })
        const url = URL.createObjectURL(blob)
        try {
          handOff(url, filename)
        } finally {
          setTimeout(() => URL.revokeObjectURL(url), 60_000)
        }
        return true
      } catch (err) {
        console.error('[InboxPage] attachment request failed', err)

        // A dead token means every other call is about to fail the same way,
        // so ask the server: refresh() tears the session down if it agrees.
        // isSessionDead rather than isDead, because a 404 here is one missing
        // file, not the end of the session.
        if (err instanceof ApiError && err.isSessionDead) {
          refresh()
        }

        setAttachmentError({
          messageId: selectedId,
          text:
            err?.status === 404
              ? `${attachment.filename} is no longer available.`
              : (err?.message ?? 'That attachment could not be downloaded.'),
        })
        return false
      }
    },
    [inbox.token, selectedId, setAttachmentError, refresh],
  )

  const saveToDisk = (url, filename) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const onDownloadAttachment = useCallback(
    (attachment) => withAttachmentUrl(attachment, saveToDisk),
    [withAttachmentUrl],
  )

  // No view action on purpose. Opening an attachment inline would mean
  // navigating to a blob: url, and a blob: url runs in this page's origin -
  // so an emailed text/html or image/svg+xml attachment would execute script
  // here, with the session token sitting in sessionStorage. The server guards
  // against this with Content-Disposition: attachment and nosniff; re-wrapping
  // the bytes in our own blob throws both away. Anyone can email a disposable
  // address, so that is a vector, not a corner case.
  //
  // Previewing is worth having, but only by constructing the blob with a type
  // we have chosen from an allowlist (images, pdf) rather than the one the
  // response carried. That is its own piece of work.

  // One request at a time: the API serves a single attachment per call, and
  // firing them in parallel is what makes a browser treat the page as a
  // multi-download attack and block the rest. Stops at the first failure,
  // which withAttachmentUrl has already reported.
  const onDownloadAll = useCallback(async () => {
    for (const attachment of selected?.attachments ?? []) {
      const ok = await withAttachmentUrl(attachment, saveToDisk)
      if (!ok) break
    }
  }, [selected?.attachments, withAttachmentUrl])

  // --- The resizable list, as in the design (wide screens only) ---
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef(null)
  const addressRef = useRef(null)

  const clampWidth = (width) => Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width))

  useEffect(() => {
    if (!isResizing) return undefined
    const onMove = (e) => {
      const rect = sidebarRef.current?.getBoundingClientRect()
      if (rect) setSidebarWidth(clampWidth(e.clientX - rect.left))
    }
    const onUp = () => setIsResizing(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isResizing])

  const ending = isRunningOut(inbox, now)
  const extending = busy === 'extending'
  const refreshing = busy === 'refreshing'

  return (
    <div
      className={`flex h-screen w-full flex-col overflow-hidden bg-white font-sans text-[13px] text-slate-700 antialiased lg:flex-row print:block print:h-auto print:overflow-visible dark:bg-canvas-dark dark:text-body-dark ${
        isResizing ? 'cursor-col-resize select-none' : ''
      }`}
    >
      {/* The list. On a phone it is the page until a message is opened. */}
      <aside
        ref={sidebarRef}
        aria-label="Messages"
        style={{ '--sidebar-w': `${sidebarWidth}px` }}
        className={`relative order-2 min-h-0 w-full flex-col border-slate-200 bg-white lg:order-none lg:w-(--sidebar-w) lg:flex-none lg:shrink-0 lg:border-r print:hidden dark:border-line-dark dark:bg-canvas-dark ${
          selected ? 'hidden lg:flex' : 'flex flex-1'
        }`}
      >
        <div className="px-4 pb-4 pt-5 sm:px-5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-ink-dark">Inbox</h1>
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-slate-400 dark:text-muted-dark">
            <span ref={addressRef} className="truncate">
              {inbox.address}
            </span>
            <CopyButton text={inbox.address} fallbackRef={addressRef} size={12} />
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-muted-dark">
            <span>Inbox expires {formatClock(inbox.expiresAt)}</span>
            <span aria-hidden="true">·</span>
            <ConnectionState connection={feed?.connection} error={feed?.error} />
          </p>
        </div>

        <div className="px-4 pb-4 sm:px-5">
          <label className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-slate-400 dark:bg-surface-dark dark:text-muted-dark">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Search messages</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400 dark:text-body-dark dark:placeholder:text-muted-dark"
            />
          </label>
        </div>

        {/* Where the rail has no room: switch straight from the list. */}
        <InboxRail
          orientation="horizontal"
          label="Switch inbox"
          className="border-y border-slate-100 lg:hidden dark:border-line-soft-dark"
          inboxes={inboxes}
          activeId={activeId}
          onOpen={switchTo}
          onAdd={() => setAddOpen(true)}
          canAdd={canAddInbox}
          adding={adding}
          limit={maxInboxes}
          unreadCounts={unreadCounts}
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {visible.length > 0 ? (
            <MessageList
              messages={visible}
              selectedId={selectedId}
              isUnread={isUnread}
              onSelectMessage={openMessage}
            />
          ) : messages.length > 0 ? (
            <p className="px-6 py-10 text-center text-xs text-slate-400 dark:text-muted-dark">
              No messages match “{query.trim()}”.
            </p>
          ) : (
            <EmptyInbox address={inbox.address} feed={feed} />
          )}
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize message list"
          aria-valuemin={MIN_SIDEBAR_WIDTH}
          aria-valuemax={MAX_SIDEBAR_WIDTH}
          aria-valuenow={sidebarWidth}
          tabIndex={0}
          onMouseDown={(e) => {
            e.preventDefault()
            setIsResizing(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setSidebarWidth((w) => clampWidth(w - 16))
            if (e.key === 'ArrowRight') setSidebarWidth((w) => clampWidth(w + 16))
          }}
          className="group absolute inset-y-0 -right-1.5 z-10 hidden w-3 cursor-col-resize items-center justify-center focus-visible:outline-none lg:flex"
        >
          <div
            className={`h-10 w-1 rounded-full transition-colors group-focus-visible:bg-slate-500 dark:group-focus-visible:bg-slate-400 ${
              isResizing
                ? 'bg-slate-400 dark:bg-slate-500'
                : 'bg-slate-200 group-hover:bg-slate-300 dark:bg-line-dark dark:group-hover:bg-slate-600'
            }`}
          />
        </div>
      </aside>

      <div
        className={`order-1 flex min-w-0 overflow-hidden lg:order-none lg:min-h-0 lg:flex-1 print:block ${
          selected ? 'min-h-0 flex-1' : 'flex-none'
        }`}
      >
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 text-slate-500 sm:gap-4 sm:px-6 print:hidden dark:border-line-dark dark:text-muted-dark">
            <Link
              to={ROUTES.home}
              className="mr-auto flex items-center gap-2 text-sm font-semibold tracking-tight text-ink dark:text-ink-dark"
            >
              <BrandMark size={20} />
              <span className="max-sm:sr-only">Inbound</span>
            </Link>
            <span
              title="Time until this inbox self-destructs"
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${
                ending
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-surface-dark dark:text-body-dark'
              }`}
            >
              <Timer size={13} aria-hidden="true" />
              {formatTimeLeft(inbox.expiresAt, now)}
              <span className="sr-only"> left</span>
            </span>
            <button
              type="button"
              onClick={extend}
              disabled={!canExtend || busy !== null}
              title={canExtend ? undefined : 'This inbox cannot be extended any further.'}
              className="text-xs font-medium enabled:hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:enabled:hover:text-ink-dark"
            >
              {extending ? 'Extending…' : `+${EXTEND_MINUTES}m`}
              <span className="sr-only"> extend inbox</span>
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={busy !== null}
              className="enabled:hover:text-slate-800 disabled:opacity-40 dark:enabled:hover:text-ink-dark"
              aria-label={refreshing ? 'Refreshing inbox' : 'Refresh inbox'}
            >
              <RefreshCw size={17} aria-hidden="true" className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDestroy(true)}
              disabled={busy !== null}
              className="text-rose-600 enabled:hover:text-rose-700 disabled:opacity-40 dark:text-rose-400 dark:enabled:hover:text-rose-300"
              aria-label="Destroy inbox"
            >
              <Trash2 size={17} aria-hidden="true" />
            </button>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              disabled={!canAddInbox}
              title={atInboxLimit ? `Inbox limit reached: ${inboxes.length} of ${maxInboxes}` : undefined}
              className="relative ml-1 rounded-full disabled:opacity-60"
              aria-label={atInboxLimit ? `Inbox limit reached: ${inboxes.length} of ${maxInboxes}` : 'Add an inbox'}
            >
              <Avatar seed={inbox.address} size={36} />
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-white ring-2 ring-white dark:bg-ink-dark dark:text-canvas-dark dark:ring-canvas-dark"
              >
                <Plus size={10} />
              </span>
            </button>
          </div>

          <RateLimitNotice until={rateLimitedUntil()} now={now} />

          {error && (
            <div className="flex items-start gap-3 border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700 sm:px-6 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              <p role="alert" className="min-w-0 flex-1">
                {error.message}
              </p>
              <button
                type="button"
                onClick={dismissError}
                className="shrink-0 rounded text-rose-500 hover:text-rose-800 dark:text-rose-300 dark:hover:text-rose-200"
                aria-label="Dismiss error"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          )}

          <div
            className={`min-h-0 flex-1 overflow-y-auto print:overflow-visible ${
              selected || messageId ? '' : 'hidden lg:block'
            }`}
          >
            {selected ? (
              <>
                {shownAttachmentError && (
                  <p
                    role="alert"
                    className="mx-6 mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                  >
                    {shownAttachmentError}
                  </p>
                )}
                <MessageReader
                  key={selected.id}
                  message={selected}
                  inboxAddress={inbox.address}
                  onBack={closeMessage}
                  onRetry={feed?.retry}
                  onDownloadAttachment={onDownloadAttachment}
                  onDownloadAll={selected.attachments?.length > 1 ? onDownloadAll : undefined}
                />
              </>
            ) : messageId ? (
              listPending ? <LoadingMessage /> : <MissingMessage />
            ) : (
              <NothingOpen address={inbox.address} count={messages.length} />
            )}
          </div>
        </main>
      </div>

      <InboxRail
        className="order-3 hidden w-16 shrink-0 border-l border-slate-200 lg:order-none lg:flex print:hidden dark:border-line-dark"
        inboxes={inboxes}
        activeId={activeId}
        onOpen={switchTo}
        onAdd={() => setAddOpen(true)}
        canAdd={canAddInbox}
        adding={adding}
        limit={maxInboxes}
        unreadCounts={unreadCounts}
      />

      {notice && (
        // Top right, under the header and clear of the inbox rail, where a
        // notification is looked for; full width at the top on a phone.
        <p
          role="status"
          className="fixed inset-x-4 top-16 z-40 flex animate-fade-up items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 shadow-sm sm:inset-x-auto sm:right-4 sm:w-80 lg:right-20 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          <TimerOff size={16} aria-hidden="true" className="mt-px shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="min-w-0 break-words">
            {notice.addresses.map((address, index) => (
              <span key={address}>
                {index > 0 && (index === notice.addresses.length - 1 ? ' and ' : ', ')}
                <span className="font-mono">{address}</span>
              </span>
            ))}{' '}
            expired.
            {notice.switched && ' Switched to your next inbox.'}
          </span>
        </p>
      )}

      {addOpen && (
        <NewInboxDialog
          onClose={closeAdd}
          onCreate={createInbox}
          count={inboxes.length}
          limit={maxInboxes}
          errorMessage={error?.message}
        />
      )}

      <ConfirmDestroyDialog
        open={confirmingDestroy}
        address={inbox.address}
        otherInboxCount={Math.max(0, inboxes.length - 1)}
        onCancel={cancelDestroy}
        onConfirm={confirmDestroy}
      />
    </div>
  )
}

function matches(message, query) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const body = (message.textBody || message.htmlBody || '').replace(/<[^>]+>/g, ' ')
  return [message.senderName, message.senderEmail, message.subject, body, message.verificationCode].some(
    (value) => typeof value === 'string' && value.toLowerCase().includes(needle),
  )
}

function formatClock(timestamp) {
  const date = new Date(timestamp ?? '')
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function ConnectionState({ connection, error }) {
  if (connection === SOCKET_STATUS.JOINED) {
    return (
      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />
        Live
      </span>
    )
  }
  if (connection === SOCKET_STATUS.ERROR) {
    return (
      <span className="text-rose-600 dark:text-rose-400" title={error?.message}>
        Offline — retrying
      </span>
    )
  }
  return (
    <span className="text-amber-600 dark:text-amber-400">
      {connection === SOCKET_STATUS.DISCONNECTED ? 'Reconnecting…' : 'Connecting…'}
    </span>
  )
}

// An empty list is only called empty once it has been checked, and the line
// under it says whether new mail can actually arrive right now.
function EmptyInbox({ address, feed }) {
  if (feed?.sweepError) {
    return (
      <div role="alert" className="flex flex-col items-center px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <CloudOff size={20} aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-sm font-medium text-slate-900">Couldn’t check for messages</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Mail that arrived before this page loaded may be missing.
        </p>
        <button
          type="button"
          onClick={() => feed.resync?.()}
          className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800"
        >
          Try again
        </button>
      </div>
    )
  }

  const offline = feed?.connection === SOCKET_STATUS.ERROR
  if (!feed?.synced && !offline) {
    return (
      <div role="status" className="flex flex-col items-center px-6 py-16 text-center text-xs text-slate-500">
        <Loader2 size={20} className="animate-spin text-slate-400" aria-hidden="true" />
        <p className="mt-3">Checking for messages…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-surface-dark dark:text-body-dark">
        <MailOpen size={20} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-sm font-medium text-slate-900 dark:text-ink-dark">Your inbox is empty</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-muted-dark">
        New messages and verification codes sent to{' '}
        <span className="break-all font-mono text-slate-600 dark:text-body-dark">{address}</span> will appear here
        in real-time without refreshing.
      </p>
      <LiveLine connection={feed?.connection} />
    </div>
  )
}

function LiveLine({ connection }) {
  const [dot, text] =
    connection === SOCKET_STATUS.JOINED
      ? ['animate-pulse bg-emerald-500', 'Waiting for incoming mail…']
      : connection === SOCKET_STATUS.ERROR
        ? ['bg-rose-500', 'Not connected. New mail will appear once the connection is back.']
        : connection === SOCKET_STATUS.DISCONNECTED
          ? ['bg-amber-500', 'Reconnecting…']
          : ['bg-amber-500', 'Connecting…']
  return (
    <p role="status" className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-muted-dark">
      <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${dot}`} />
      {text}
    </p>
  )
}

function NothingOpen({ address, count }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <Avatar seed={address} size={72} animate="always" />
      <p className="mt-4 text-sm font-medium text-slate-900 dark:text-ink-dark">
        {count > 0 ? 'Select a message to read it' : 'Nothing here yet'}
      </p>
      <p className="mt-1 max-w-xs text-xs text-slate-400 dark:text-muted-dark">
        {count > 0
          ? `${count} ${count === 1 ? 'message' : 'messages'} in this inbox.`
          : 'Mail sent to this address shows up the moment it arrives.'}
      </p>
    </div>
  )
}

function LoadingMessage() {
  return (
    <div role="status" className="flex h-full flex-col items-center justify-center px-6 py-16 text-center text-xs text-slate-500">
      <Loader2 size={20} className="animate-spin text-slate-400" aria-hidden="true" />
      <p className="mt-3">Loading message…</p>
    </div>
  )
}

function MissingMessage() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-sm font-medium text-slate-900 dark:text-ink-dark">This message isn’t here</p>
      <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-muted-dark">
        It may belong to another of your inboxes, or it has expired.
      </p>
      <Link to={INBOX_PATH} className="mt-4 text-xs font-medium text-sky-600 hover:underline dark:text-sky-400">
        Back to inbox
      </Link>
    </div>
  )
}

// Where an inbox ends up once its time runs out, or once the server stops
// recognising the session: the site's own header and glow, and one card that
// says what happened and offers the two ways on.
function Purged({ session, onGenerate, onLeave, creating, ended }) {
  return (
    // One screen tall: the hero takes what the footer leaves, so the footer
    // shows without scrolling on a laptop, and the page still scrolls when
    // its content needs more room.
    <div className="flex min-h-dvh flex-col text-ink dark:text-ink-dark">
      <SiteHero session={session} className="flex-1">
        <div className="flex flex-1 items-center justify-center px-4 pb-24">
          <div
            role="status"
            className="flex w-full max-w-md animate-fade-up flex-col items-center rounded-3xl border border-slate-200 bg-white/90 px-8 py-10 text-center dark:border-line-dark dark:bg-surface-dark"
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
              <TimerOff size={26} strokeWidth={2} aria-hidden="true" />
            </span>
            <h1 className="mt-6 text-2xl font-bold">
              {ended ? 'This session has ended' : 'This inbox has expired'}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-body-dark">
              {ended
                ? 'The server no longer recognises this session, so its inboxes can’t be opened any more.'
                : 'Its address no longer receives mail, and its messages and attachments have been permanently deleted.'}
            </p>

            <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={onGenerate}
                disabled={creating}
                aria-busy={creating || undefined}
                className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand px-6 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:hover:bg-brand"
              >
                {creating && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                {creating ? 'Generating' : 'Generate a new address'}
              </button>
              <button
                type="button"
                onClick={onLeave}
                className="flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-medium transition-colors hover:border-slate-300 dark:border-line-dark dark:bg-surface-dark dark:text-ink-dark dark:hover:border-slate-500"
              >
                Back to home
              </button>
            </div>

            {!ended && (
              <p className="mt-8 text-xs text-slate-400 dark:text-muted-dark">
                Need more time next time? Use +{EXTEND_MINUTES}m in the inbox before it runs out.
              </p>
            )}
          </div>
        </div>
      </SiteHero>
      <SiteFooter />
    </div>
  )
}
