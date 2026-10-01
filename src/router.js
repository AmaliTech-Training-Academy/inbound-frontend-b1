/** Route table, so a <Route> path and any link built from it cannot drift. */
export const ROUTES = {
  home: '/',
  howItWorks: '/how-it-works',
  // One route for the list and the open message, so moving between them
  // keeps the inbox screen mounted rather than rebuilding it.
  inbox: '/inbox/:messageId?',
}

/** Url of the inbox with no message open. */
export const INBOX_PATH = '/inbox'

/** Url of the inbox with a single message open. */
export function messageDetailsPath(messageId) {
  return `${INBOX_PATH}/${encodeURIComponent(messageId)}`
}
