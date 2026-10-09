import { SOCKET_STATUS } from '../services/inboxSocket.js'

// How the socket is doing, in two places and two registers: a word beside the
// address for the person watching the header, and a line in the empty inbox
// for the person waiting on mail that has not come.
//
// Both read the same status. Neither invents a state the socket does not
// report, so what the header says and what the list says can never disagree.

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

export { ConnectionState, LiveLine }
