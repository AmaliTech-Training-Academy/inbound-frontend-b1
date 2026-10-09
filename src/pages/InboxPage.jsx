import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { Plus, RefreshCw, Search, Timer, Trash2, X } from 'lucide-react'
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
import { ConnectionState } from '../components/ConnectionState.jsx'
import {
  EmptyInbox,
  LoadingMessage,
  MissingMessage,
  NothingOpen,
} from '../components/InboxPlaceholders.jsx'
import Purged from '../components/PurgedInbox.jsx'
import NotificationStack from '../components/NotificationStack.jsx'
import { SOCKET_STATUS } from '../services/inboxSocket.js'
import { rateLimitedUntil } from '../services/inboxApi.js'
import { useAttachmentDownload } from '../hooks/useAttachmentDownload.js'
import { useInboxNotifications } from '../hooks/useInboxNotifications.js'
import { useNotifications } from '../hooks/useNotifications.js'
import { useNow } from '../hooks/useNow.js'
import { useResizableSidebar } from '../hooks/useResizableSidebar.js'
import { formatTimeLeft, isRunningOut } from '../utils/inboxProgress.js'
import { matches, toReaderMessage } from '../utils/message.js'
import { formatClock } from '../utils/time.js'
import { EXTEND_MINUTES } from '../config.js'
import { INBOX_PATH, ROUTES, messageDetailsPath } from '../router'


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

  // The five events QA asked for (IB-008). The watcher only ever reports
  // changes, so nothing is announced for state that was already true on load.
  const { notifications, notify, dismiss } = useNotifications()
  useInboxNotifications({ inboxes, feeds, notice, notify })
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

  // Downloading an attachment is its own small machine: an authenticated
  // fetch, a blob url, and an error that belongs to one message. See the hook.
  const { shownAttachmentError, onDownloadAttachment, onDownloadAll } = useAttachmentDownload({
    token: inbox.token,
    selected,
    selectedId,
    // A dead token means every other call is about to fail the same way, so
    // ask the server: refresh() tears the session down if it agrees.
    onSessionDead: refresh,
  })

  const { sidebarWidth, isResizing, sidebarRef, startResizing, nudgeWidth, minWidth, maxWidth } =
    useResizableSidebar()
  const addressRef = useRef(null)

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
          aria-valuemin={minWidth}
          aria-valuemax={maxWidth}
          aria-valuenow={sidebarWidth}
          tabIndex={0}
          onMouseDown={(e) => {
            e.preventDefault()
            startResizing()
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') nudgeWidth(-16)
            if (e.key === 'ArrowRight') nudgeWidth(16)
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
                className="shrink-0 rounded text-rose-500 hover:text-rose-800"
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
                    className="mx-6 mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700"
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

      <NotificationStack notifications={notifications} onDismiss={dismiss} />

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




// An empty list is only called empty once it has been checked, and the line
// under it says whether new mail can actually arrive right now.





// Where an inbox ends up once its time runs out, or once the server stops
// recognising the session: the site's own header and glow, and one card that
// says what happened and offers the two ways on.
