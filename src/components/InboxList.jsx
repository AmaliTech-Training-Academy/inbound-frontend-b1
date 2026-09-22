import Button from './Button'
import Badge from './Badge'
import Card from './Card'
import { formatRelativeTime } from '../utils/helpers'

const getInitials = (message) =>
  (message?.senderName || message?.senderEmail || 'Inbound')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')

function InboxList({ messages = [], inboxAddress, onSelectMessage, onGenerateEmail }) {
  return (
    <div className="min-h-screen w-full bg-page text-text-primary font-sans flex flex-col antialiased selection:bg-dark-btn selection:text-surface">
      <header className="w-full h-14 bg-header border-b border-border-default px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5 select-none">
          <span className="w-3 h-3 bg-dark-btn rounded-full inline-block" aria-hidden="true" />
          <span className="font-bold text-[15px] tracking-tight text-text-primary">Inbound</span>
        </div>

        <div className="flex items-center gap-2.5">
          {inboxAddress && (
            <div className="hidden sm:inline-flex items-center bg-surface border border-border-default rounded-[6px] text-xs overflow-hidden h-8">
              <div className="flex items-center gap-1.5 px-2.5 text-text-secondary h-full font-mono">
                <span className="text-text-tertiary" aria-hidden="true">@</span>
                <span
                  className="truncate max-w-[160px] sm:max-w-[220px] text-text-primary"
                  title={inboxAddress}
                >
                  {inboxAddress}
                </span>
              </div>
            </div>
          )}

          <Button
            variant="dark"
            onClick={onGenerateEmail}
            className="text-[13px] font-semibold px-3 py-1.5 gap-2"
            aria-label="Generate new temporary email"
          >
            <span>Generate Email</span>
            <kbd className="font-mono text-[10px] bg-dark-btn-hover text-surface px-1.5 py-0.5 rounded-[3px] border border-surface/20 select-none">
              G
            </kbd>
          </Button>
        </div>
      </header>

      <main className="w-full max-w-[1000px] mx-auto px-6 py-6 flex-1 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Inbox</h1>
          <Badge>
            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
          </Badge>
        </div>

        {messages.length === 0 ? (
          <Card className="p-10 text-center text-sm text-text-secondary">
            No messages yet. New mail will appear here automatically.
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((message) => (
              <li key={message.id}>
                <button
                  type="button"
                  onClick={() =>
                    typeof onSelectMessage === 'function' && onSelectMessage(message)
                  }
                  className="w-full text-left bg-surface border border-border-default rounded-[10px] p-4 sm:p-5 flex items-start gap-3 hover:border-border-strong transition-colors cursor-pointer"
                >
                  <div
                    className="w-10 h-10 rounded-[8px] bg-chip text-text-primary font-semibold text-sm flex items-center justify-center shrink-0 select-none"
                    aria-hidden="true"
                  >
                    {getInitials(message)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold text-sm text-text-primary truncate">
                        {message.senderName || 'Unknown Sender'}
                      </span>
                      <span className="font-mono text-[11px] text-text-tertiary shrink-0">
                        {formatRelativeTime(message.receivedAt)}
                      </span>
                    </div>

                    <div className="text-sm text-text-primary truncate mt-0.5">
                      {message.subject || '(No Subject)'}
                    </div>

                    <div className="flex items-center flex-wrap gap-2 mt-1.5">
                      {message.senderEmail && (
                        <span className="font-mono text-xs text-text-secondary truncate">
                          &lt;{message.senderEmail}&gt;
                        </span>
                      )}
                      {message.attachments?.length > 0 && (
                        <Badge>
                          {message.attachments.length}{' '}
                          {message.attachments.length === 1 ? 'file' : 'files'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

export default InboxList
