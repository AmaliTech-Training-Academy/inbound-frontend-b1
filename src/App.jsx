import { useState } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import Footer from './components/Footer.jsx'
import MessageReader from './components/MessageReader'
import { MOCK_MESSAGES } from './data/mockMessages'
import { ROUTES } from './router'

const INBOX_ADDRESS = 'inbox-user-8921@inbound.mail'

function HomePage() {
  return (
    <>
      <Header />

      <main className="flex-1">
        <Hero />
      </main>

      <Footer />
    </>
  )
}

function MessageDetailsPage({ onGenerateEmail, onDestroy }) {
  const { messageId } = useParams()
  const navigate = useNavigate()
  const message = MOCK_MESSAGES.find((candidate) => candidate.id === messageId)

  // A hand-typed or stale id has nothing to open, so send the visitor home
  // rather than render the reader around an empty message.
  if (!message) return <Navigate to={ROUTES.home} replace />

  return (
    <MessageReader
      message={message}
      inboxAddress={INBOX_ADDRESS}
      onBack={() => navigate(ROUTES.home)}
      onGenerateEmail={onGenerateEmail}
      onDestroy={onDestroy}
    />
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
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route
          path={ROUTES.messageDetails}
          element={
            <MessageDetailsPage
              onGenerateEmail={handleGenerateEmail}
              onDestroy={handleDestroy}
            />
          }
        />
        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
      </Routes>
    </div>
  )
}

export default App
