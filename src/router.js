/** Route table, so a <Route> path and any link built from it cannot drift. */
export const ROUTES = {
  home: '/',
  messageDetails: '/inbox/:messageId',
}

/** Url of the details screen for a single message. */
export function messageDetailsPath(messageId) {
  return `/inbox/${encodeURIComponent(messageId)}`
}
