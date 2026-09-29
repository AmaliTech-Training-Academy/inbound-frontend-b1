import { useCallback, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import Footer from './components/Footer.jsx'
import InboxFeed from './components/InboxFeed.jsx'
import MessageReader from './components/MessageReader'
import { MOCK_MESSAGES } from './data/mockMessages'
import { ROUTES, messageDetailsPath } from './router'
import { toReaderMessage } from './utils/message'
import { useInbox } from './state/useInbox.js'

// Shown when the reader is opened with no inbox behind it (a sample message).
const FALLBACK_ADDRESS = 'inbox-user-8921@inbound.mail'

function HomePage() {
  const navigate = useNavigate()

  // One session for the whole page. useInbox holds its own state, so calling
  // it separately in Header and Hero would give each its own session.
  const inbox = useInbox()

  // Each inbox's live feed, reported by its InboxFeed. Kept here, above the
  // screens, so switching inboxes loses nothing.
  const [feeds, setFeeds] = useState({})
  const onFeedUpdate = useCallback(
    (id, feed) => setFeeds((prev) => ({ ...prev, [id]: feed })),
    [],
  )

  // Messages opened in this tab. The socket's previews carry no read flag, so
  // "unread" is the server's word where it has one, and this otherwise. Kept
  // for every inbox, so the rail and the list agree.
  const [openedIds, setOpenedIds] = useState(() => new Set())
  const isUnread = useCallback(
    (message) => !message.isRead && !openedIds.has(message.id),
    [openedIds],
  )

  const activeFeed = inbox.inbox ? feeds[inbox.inbox.id] : null
  const unreadCounts = Object.fromEntries(
    inbox.inboxes.map((entry) => [
      entry.id,
      (feeds[entry.id]?.messages ?? []).filter(isUnread).length,
    ]),
  )

  // The row already holds the message it was rendered from, so hand it to the
  // details route instead of making that route look the id up again.
  const openMessage = (message) => {
    setOpenedIds((prev) => new Set(prev).add(message.id))
    navigate(messageDetailsPath(message.id), { state: { message } })
  }

  const header = {
    status: inbox.status,
    generate: inbox.generate,
    regenerate: inbox.regenerate,
    onAddInbox: inbox.addInbox,
    canAddInbox: inbox.canAddInbox,
  }

  // The warm glow belongs to the landing page alone; the inbox and the purged
  // card sit on the plain page, as in the design's inbox frames.
  const landing =
    inbox.status !== 'active' && inbox.status !== 'expired' && !inbox.regenerating

  return (
    <div className={`flex flex-1 flex-col ${landing ? 'app-backdrop' : ''}`}>
      {inbox.inboxes.map((entry) => (
        <InboxFeed key={entry.id} inbox={entry} onUpdate={onFeedUpdate} />
      ))}

      <Header {...header} />

      <main className="flex-1">
        <Hero
          {...inbox}
          messages={activeFeed?.messages ?? []}
          isUnread={isUnread}
          unreadCounts={unreadCounts}
          refresh={() => {
            inbox.refresh()
            activeFeed?.resync?.()
          }}
          onSelectMessage={openMessage}
        />
      </main>

      <Footer />

      {/* The reader is a child route of this page rather than a sibling, so it
          mounts over the inbox instead of replacing it. The address, the socket
          and the message list all live here. */}
      <Outlet
        context={{ header, address: inbox.inbox?.address }}
      />
    </div>
  )
}

function MessageDetailsPage({ onGenerateEmail, onDestroy }) {
  const { header, address } = useOutletContext() ?? {}
  const { messageId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  // A clicked row carries the message it was built from, which is the only way
  // a live message opens: the mock list never saw it. The id check keeps state
  // from an earlier row from rendering under a different url.
  const clicked = location.state?.message
  const source =
    clicked?.id === messageId
      ? clicked
      : MOCK_MESSAGES.find((candidate) => candidate.id === messageId)

  // A hand-typed or expired id has nothing to open, so send the visitor home
  // rather than render the reader around an empty message.
  if (!source) return <Navigate to={ROUTES.home} replace />

  return (
    // The reader renders into the home page's outlet, so it has to be lifted
    // out of the flow to cover it; scrolling still belongs to the reader.
    <div className="fixed inset-0 z-40 overflow-y-auto bg-page">
      {/* The same header as every other page, not the reader's own copy. */}
      <Header {...header} />
      <MessageReader
        showHeader={false}
        message={toReaderMessage(source)}
        inboxAddress={address ?? FALLBACK_ADDRESS}
        onBack={() => navigate(ROUTES.home)}
        onGenerateEmail={onGenerateEmail}
        onDestroy={onDestroy}
      />
    </div>
  )
}

function App() {
  const [feedbackNotification, setFeedbackNotification] = useState('')

  const notify = (text) => {
    setFeedbackNotification(text)
    setTimeout(() => setFeedbackNotification(''), 3000)
  }

  const handleGenerateEmail = () => {
    notify('Generate Email clicked (triggers parent email generator)')
  }

  const handleDestroy = () => {
    notify('onDestroy() called — triggers parent inbox destruction')
  }

  return (
    <div className="min-h-screen flex flex-col bg-page text-text-primary font-sans">
      {feedbackNotification && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 bg-dark-btn text-surface text-xs font-mono px-4 py-2.5 rounded-[6px] shadow-md border border-border-default/20"
        >
          {feedbackNotification}
        </div>
      )}

      <Routes>
        {/* The details route nests inside the home route: as a sibling it
            unmounted the inbox on the way in, so coming back landed on a home
            page still restoring itself, with nothing in it. */}
        <Route path={ROUTES.home} element={<HomePage />}>
          <Route
            path={ROUTES.messageDetails}
            element={
              <MessageDetailsPage
                onGenerateEmail={handleGenerateEmail}
                onDestroy={handleDestroy}
              />
            }
          />
        </Route>
        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
      </Routes>
    </div>
  )
}

export default App
