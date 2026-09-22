import { useState } from 'react'
import InboxList from './components/InboxList'
import MessageReader from './components/MessageReader'
import { MOCK_MESSAGES } from './data/mockMessages'

const INBOX_ADDRESS = 'inbox-user-8921@inbound.mail'

function App() {
  const [feedbackNotification, setFeedbackNotification] = useState('')
  const [selectedMessageId, setSelectedMessageId] = useState(null)

  const messages = MOCK_MESSAGES
  const activeMessage = messages.find((message) => message.id === selectedMessageId) ?? null

  const handleBack = () => {
    setSelectedMessageId(null)
  }

  const handleSelectMessage = (message) => {
    setSelectedMessageId(message.id)
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

      {activeMessage ? (
        <MessageReader
          message={activeMessage}
          inboxAddress={INBOX_ADDRESS}
          onBack={handleBack}
          onGenerateEmail={handleGenerateEmail}
          onDestroy={handleDestroy}
        />
      ) : (
        <InboxList
          messages={messages}
          inboxAddress={INBOX_ADDRESS}
          onSelectMessage={handleSelectMessage}
          onGenerateEmail={handleGenerateEmail}
        />
      )}
    </div>
  )
}

export default App
