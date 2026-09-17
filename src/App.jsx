import { useState } from 'react'
import MessageReader from './components/MessageReader'
import { MOCK_MESSAGES } from './data/mockMessages'

function App() {
  const [feedbackNotification, setFeedbackNotification] = useState('')

  const activeMessage = MOCK_MESSAGES[0]

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
    <div className="min-h-screen bg-page text-text-primary flex flex-col font-sans">
      {feedbackNotification && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 bg-dark-btn text-surface text-xs font-mono px-4 py-2.5 rounded-[6px] shadow-md border border-border-default/20"
        >
          {feedbackNotification}
        </div>
      )}

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
