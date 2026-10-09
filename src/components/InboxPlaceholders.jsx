import { Link } from 'react-router-dom'
import { CloudOff, Loader2, MailOpen } from 'lucide-react'
import Avatar from './Avatar.jsx'
import { LiveLine } from './ConnectionState.jsx'
import { SOCKET_STATUS } from '../services/inboxSocket.js'
import { INBOX_PATH } from '../router'

// The four states the inbox has when there is nothing to read: an inbox with
// no mail in it, a reading pane with no message open, a message still on its
// way, and a message url that matches nothing.

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

export { EmptyInbox, LoadingMessage, MissingMessage, NothingOpen }
