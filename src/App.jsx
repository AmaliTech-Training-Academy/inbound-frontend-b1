import { useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import Footer from './components/Footer.jsx'
import MessageReader from './components/MessageReader'
import { MOCK_MESSAGES } from './data/mockMessages'
import { ROUTES, messageDetailsPath } from './router'
import { toReaderMessage } from './utils/message'

const INBOX_ADDRESS = 'inbox-user-8921@inbound.mail'

function HomePage() {
  const navigate = useNavigate()

  // The row already holds the message it was rendered from, so hand it to the
  // details route instead of making that route look the id up again.
  const openMessage = (message) =>
    navigate(messageDetailsPath(message.id), { state: { message } })

  return (
    <>
      <Header />

      <main className="flex-1">
        <Hero onSelectMessage={openMessage} />
      </main>

      <Footer />

      {/* The reader is a child route of this page rather than a sibling, so it
          mounts over the inbox instead of replacing it. The address, the socket
          and the message list all live here. */}
      <Outlet />
    </>
  )
}

function MessageDetailsPage({ onGenerateEmail, onDestroy }) {
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
      <MessageReader
        message={toReaderMessage(source)}
        inboxAddress={INBOX_ADDRESS}
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
