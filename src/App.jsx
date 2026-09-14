import { useState } from 'react'
import MessageReader from './components/MessageReader'
import { MOCK_MESSAGES } from './data/mockMessages'

/**
 * App Root Component
 * Scoped strictly to IND-8: Read a Message (US3)
 * Assumes the user has selected an email from their inbox and renders the MessageReader.
 */
function App() {
  const [feedbackNotification, setFeedbackNotification] = useState('')

  // Default to the rich full-scenario mock email
  const activeMessage = MOCK_MESSAGES[0]

  // Back to inbox action callback (parent router/inbox will handle view transition)
  const handleBack = () => {
    setFeedbackNotification('onBack() called — returning to inbox')
    setTimeout(() => setFeedbackNotification(''), 3000)
  }

  const handleGenerateEmail = () => {
    setFeedbackNotification('Generate Email clicked (triggers parent email generator)')
    setTimeout(() => setFeedbackNotification(''), 3000)
  }

  const handleDestroy = () => {
    setFeedbackNotification('onDestroy() called — triggers parent inbox destruction')
    setTimeout(() => setFeedbackNotification(''), 3000)
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#111213] flex flex-col font-sans">
      {/* Interactive feedback toast for callbacks */}
      {feedbackNotification && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 bg-[#111111] text-white text-xs font-mono px-4 py-2.5 rounded-[6px] shadow-md border border-[#e4e5e9]/20"
        >
          {feedbackNotification}
        </div>
      )}

      {/* Main Message Reader UI */}
      <MessageReader
        message={activeMessage}
        inboxAddress="inbox-user-8921@inbound.mail"
        onBack={handleBack}
        onGenerateEmail={handleGenerateEmail}
        onDestroy={handleDestroy}
      />
    </div>
  )
}

export default App
