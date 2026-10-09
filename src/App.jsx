import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import ClickSpark from './components/fx/ClickSpark.jsx'
import InboxFeed from './components/InboxFeed.jsx'
import LandingPage from './pages/LandingPage.jsx'
import HowItWorksPage from './pages/HowItWorksPage.jsx'
import InboxPage from './pages/InboxPage.jsx'
import { ROUTES } from './router'
import { useInbox } from './state/useInbox.js'

// Everything that has to outlive a single screen. The landing page and the
// inbox read the same session, and each inbox's feed - its socket, its list,
// its reconnect recovery - stays mounted here, so going from one screen to the
// other never drops a connection or a message already on screen.
function SessionLayout() {
  const session = useInbox()

  // A new page starts at its top, as it would on a full page load.
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  // Each inbox's live feed, reported by its InboxFeed.
  const [feeds, setFeeds] = useState({})
  const onFeedUpdate = useCallback(
    (id, feed) => setFeeds((prev) => ({ ...prev, [id]: feed })),
    [],
  )

  // Messages opened in this tab. The socket's previews carry no read flag, so
  // "unread" is the server's word where it has one, and this otherwise. Kept
  // for every inbox, so the rail, the list and the landing page agree.
  const [openedIds, setOpenedIds] = useState(() => new Set())
  const isUnread = useCallback(
    (message) => !message.isRead && !openedIds.has(message.id),
    [openedIds],
  )
  const markOpened = useCallback(
    (id) =>
      setOpenedIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id))),
    [],
  )

  const unreadCounts = useMemo(
    () =>
      Object.fromEntries(
        session.inboxes.map((entry) => [
          entry.id,
          (feeds[entry.id]?.messages ?? []).filter(isUnread).length,
        ]),
      ),
    [session.inboxes, feeds, isUnread],
  )

  return (
    <ClickSpark sparkColor="#050040" sparkSize={8} sparkRadius={18}>
      {session.inboxes.map((entry) => (
        <InboxFeed key={entry.id} inbox={entry} onUpdate={onFeedUpdate} />
      ))}
      <Outlet context={{ session, feeds, isUnread, markOpened, unreadCounts }} />
    </ClickSpark>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<SessionLayout />}>
        <Route path={ROUTES.home} element={<LandingPage />} />
        <Route path={ROUTES.howItWorks} element={<HowItWorksPage />} />
        <Route path={ROUTES.inbox} element={<InboxPage />} />
      </Route>
      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Routes>
  )
}

export default App
