/** Route table, so a <Route> path and any link built from it cannot drift. */
export const ROUTES = {
  home: '/',
  howItWorks: '/how-it-works',
  // One route for the list and the open message, so moving between them
  // keeps the inbox screen mounted rather than rebuilding it.
  inbox: '/inbox/:messageId?',
}

export const INBOX_PATH = '/inbox'

export function messageDetailsPath(messageId) {
  return `${INBOX_PATH}/${encodeURIComponent(messageId)}`
}
