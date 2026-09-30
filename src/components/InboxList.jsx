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

function InboxList({ messages = [], onSelectMessage }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 px-2">
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
    </div>
  )
}

export default InboxList
