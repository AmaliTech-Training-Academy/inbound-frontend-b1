import {describe,it,expect,vi} from 'vitest'
import {render,screen,fireEvent,within,act} from '@testing-library/react'
import MessageReader from '../src/components/MessageReader'
import { formatReceivedAt } from '../src/utils/helpers'

const baseMessage = {
  id: '849201a',
  senderName: 'Notion Team',
  senderEmail: 'notify@m.notion.so',
  recipientEmail: 'inbox-user-8921@inbound.mail',
  subject: 'Your Notion login code is 849 201',
  receivedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  verificationCode: '849 201',
  contextUrl: 'https://notion.so/login?code=849201',
  contextLabel: 'Notion Login',
  contextActionText: 'Open Notion Workspace',
  actionText: 'Log in to Notion',
  textBody: 'Use the code above to sign in.',
  attachments: [
    { id: 'att_01', filename: 'guide.pdf', type: 'PDF', size: '1.8 MB' },
    { id: 'att_02', filename: 'policy.pdf', type: 'PDF', size: '420 KB' },
    { id: 'att_03', filename: 'roster.csv', type: 'CSV', size: '64 KB' },
  ],
}

const textMessage = {
  ...baseMessage,
  verificationCode: undefined,
  contextUrl: undefined,
  contextLabel: undefined,
  contextActionText: undefined,
  actionText: undefined,
  attachments: [],
}

const htmlMessage = {
  ...textMessage,
  htmlBody: '<p>Rich email body</p>',
  textBody: 'Plain text fallback',
}

const stubClipboard = () => {
  const writeText = vi.fn()
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  return writeText
}

const subject = () => screen.getByRole('heading', { level: 2 })

describe('MessageReader', () => {
  describe('header and metadata', () => {
    it('renders the subject, sender and sender address of the message', () => {
      render(<MessageReader message={baseMessage} />)

      expect(subject()).toHaveTextContent('Your Notion login code is 849 201')
      expect(screen.getByText('Notion Team')).toBeInTheDocument()
      expect(screen.getByText('notify@m.notion.so')).toBeInTheDocument()
    })

    it('renders placeholders rather than a message of its own when none is given', () => {
      // No fallback message: an absent one must not render someone else's mail.
      render(<MessageReader />)

      expect(subject()).toHaveTextContent('(No Subject)')
      expect(screen.getByText('Unknown Sender')).toBeInTheDocument()
    })

    it('renders the received time and its relative age', () => {
      const { container } = render(<MessageReader message={baseMessage} />)

      const time = container.querySelector('time')
      expect(time).toHaveAttribute('datetime', baseMessage.receivedAt)
      expect(time).toHaveAttribute('title', formatReceivedAt(baseMessage.receivedAt))
      expect(time).toHaveTextContent('(12m ago)')
    })

    it('falls back to placeholder text when the message has no subject, sender or body', () => {
      render(<MessageReader message={{}} />)

      expect(subject()).toHaveTextContent('(No Subject)')
      expect(screen.getByText('Unknown Sender')).toBeInTheDocument()
      expect(screen.getByText('(Empty message body)')).toBeInTheDocument()
    })

    it('shows no time at all when the received time is missing', () => {
      const { container } = render(<MessageReader message={{}} />)

      expect(container.querySelector('time')).toBeNull()
      expect(screen.queryByText(/ago/)).toBeNull()
    })
  })

  describe('recipient', () => {
    it('says which inbox the message was sent to', () => {
      render(<MessageReader message={baseMessage} />)

      expect(screen.getByText('to inbox-user-8921@inbound.mail')).toBeInTheDocument()
    })

    it('falls back to the open inbox when the message names no recipient', () => {
      render(<MessageReader message={{ ...baseMessage, recipientEmail: null }} inboxAddress="open@inbound.mail" />)

      expect(screen.getByText('to open@inbound.mail')).toBeInTheDocument()
    })
  })

  describe('verification code', () => {
    it('shows the verification code section when the message has a code', () => {
      render(<MessageReader message={baseMessage} />)

      expect(screen.getByLabelText('Verification Code')).toBeInTheDocument()
      expect(within(screen.getByLabelText('Verification Code')).getByText('849 201')).toBeInTheDocument()
    })

    it('hides the verification code section when the message has no code', () => {
      render(<MessageReader message={textMessage} />)

      expect(screen.queryByLabelText('Verification Code')).toBeNull()
    })

    it('copies the verification code and confirms it temporarily', () => {
      vi.useFakeTimers()
      const writeText = stubClipboard()
      render(<MessageReader message={baseMessage} />)

      const copyButton = screen.getByLabelText('Copy verification code')
      expect(copyButton).toHaveTextContent('Copy Code')

      fireEvent.click(copyButton)

      expect(writeText).toHaveBeenCalledWith('849 201')
      expect(copyButton).toHaveTextContent('Copied')

      act(() => { vi.advanceTimersByTime(1500) })
      expect(copyButton).toHaveTextContent('Copy Code')
    })
  })

  describe('header actions', () => {
    it('prints the email when the print action is used', () => {
      const print = vi.spyOn(window, 'print').mockImplementation(() => {})
      render(<MessageReader message={baseMessage} />)

      fireEvent.click(screen.getByLabelText('Print email'))

      expect(print).toHaveBeenCalledTimes(1)
    })

    it('calls onBack when the back action is used', () => {
      const onBack = vi.fn()
      render(<MessageReader message={baseMessage} onBack={onBack} />)

      fireEvent.click(screen.getByLabelText('Back to inbox'))

      expect(onBack).toHaveBeenCalledTimes(1)
    })

    it('offers no way back when there is nowhere to go', () => {
      render(<MessageReader message={baseMessage} />)

      expect(screen.queryByLabelText('Back to inbox')).toBeNull()
    })
  })

  describe('fullscreen reader', () => {
    const fullscreen = () => screen.getByRole('dialog', { name: 'Fullscreen email reader' })

    it('expands the email into a full-screen reader', () => {
      render(<MessageReader message={baseMessage} />)
      expect(screen.queryByRole('dialog')).toBeNull()

      fireEvent.click(screen.getByLabelText('Expand email to full-screen view'))

      expect(within(fullscreen()).getByRole('heading', { level: 2 })).toHaveTextContent('Your Notion login code is 849 201')
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('closes the full-screen reader with the exit action', () => {
      render(<MessageReader message={baseMessage} />)
      fireEvent.click(screen.getByLabelText('Expand email to full-screen view'))

      fireEvent.click(screen.getByLabelText('Exit Fullscreen'))

      expect(screen.queryByRole('dialog')).toBeNull()
      expect(document.body.style.overflow).toBe('')
    })

    it('closes the full-screen reader when the backdrop is clicked', () => {
      render(<MessageReader message={baseMessage} />)
      fireEvent.click(screen.getByLabelText('Expand email to full-screen view'))

      fireEvent.click(fullscreen())

      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('keeps the full-screen reader open when its content is clicked', () => {
      render(<MessageReader message={baseMessage} />)
      fireEvent.click(screen.getByLabelText('Expand email to full-screen view'))

      fireEvent.click(within(fullscreen()).getByRole('heading', { level: 2 }))

      expect(fullscreen()).toBeInTheDocument()
    })

    it('toggles the full-screen reader with the f key', () => {
      render(<MessageReader message={baseMessage} />)

      fireEvent.keyDown(window, { key: 'f' })
      expect(fullscreen()).toBeInTheDocument()

      fireEvent.keyDown(window, { key: 'f' })
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('leaves ctrl+f to the browser', () => {
      render(<MessageReader message={baseMessage} />)

      fireEvent.keyDown(window, { key: 'f', ctrlKey: true })

      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('closes the full-screen reader with escape instead of leaving the inbox', () => {
      const onBack = vi.fn()
      render(<MessageReader message={baseMessage} onBack={onBack} />)
      fireEvent.keyDown(window, { key: 'f' })

      fireEvent.keyDown(window, { key: 'Escape' })

      expect(screen.queryByRole('dialog')).toBeNull()
      expect(onBack).not.toHaveBeenCalled()
    })
  })

  describe('keyboard shortcuts', () => {
    it('goes back to the inbox with escape when not in full-screen', () => {
      const onBack = vi.fn()
      render(<MessageReader message={baseMessage} onBack={onBack} />)

      fireEvent.keyDown(window, { key: 'Escape' })

      expect(onBack).toHaveBeenCalledTimes(1)
    })

    it('ignores keyboard shortcuts while typing in a text field', () => {
      const onBack = vi.fn()
      render(<MessageReader message={baseMessage} onBack={onBack} />)

      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()

      fireEvent.keyDown(window, { key: 'Escape' })
      fireEvent.keyDown(window, { key: 'f' })

      expect(onBack).not.toHaveBeenCalled()
      expect(screen.queryByRole('dialog')).toBeNull()
      input.remove()
    })

    it('leaves escape and f to another dialog that is open', () => {
      // The page's own dialogs (destroy, new inbox) close on escape; leaving the
      // message at the same time would be two things for one key.
      const onBack = vi.fn()
      render(<MessageReader message={baseMessage} onBack={onBack} />)

      const other = document.createElement('div')
      other.setAttribute('aria-modal', 'true')
      document.body.appendChild(other)

      fireEvent.keyDown(window, { key: 'Escape' })
      fireEvent.keyDown(window, { key: 'f' })

      expect(onBack).not.toHaveBeenCalled()
      expect(screen.queryByRole('dialog', { name: 'Fullscreen email reader' })).toBeNull()
      other.remove()
    })

    it('stops handling keyboard shortcuts once unmounted', () => {
      const onBack = vi.fn()
      const { unmount } = render(<MessageReader message={baseMessage} onBack={onBack} />)

      unmount()
      fireEvent.keyDown(window, { key: 'Escape' })

      expect(onBack).not.toHaveBeenCalled()
    })
  })

  describe('email body', () => {
    it('renders the plain text body when the message has no html body', () => {
      render(<MessageReader message={textMessage} />)

      expect(screen.getByText('Use the code above to sign in.')).toBeInTheDocument()
      expect(screen.queryByTitle('Sandboxed Email Content')).toBeNull()
    })

    it('preserves the line breaks of a plain text body', () => {
      const textBody = 'Hello,\n\nLine one.\n\nLine two.'
      render(<MessageReader message={{ ...textMessage, textBody }} />)

      const body = screen.getByText(/Line one\./)
      expect(body.textContent).toBe(textBody)
      expect(body).toHaveClass('whitespace-pre-wrap')
    })

    it('renders the html body in a sandboxed frame when present', () => {
      render(<MessageReader message={htmlMessage} />)

      expect(screen.getByTitle('Sandboxed Email Content')).toBeInTheDocument()
      expect(screen.queryByText('Plain text fallback')).toBeNull()
    })
  })

  describe('call to action', () => {
    it('renders a call to action link when the message has both text and a url', () => {
      render(
        <MessageReader
          message={{ ...textMessage, actionText: 'Reset password', contextUrl: 'https://example.org/reset' }}
        />
      )

      const link = screen.getByRole('link', { name: /Reset password/ })
      expect(link).toHaveAttribute('href', 'https://example.org/reset')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('omits the call to action link when the message has no url', () => {
      render(<MessageReader message={{ ...textMessage, actionText: 'Reset password' }} />)

      expect(screen.queryByRole('link', { name: /Reset password/ })).toBeNull()
    })

    it('labels the context link with the explicit action text', () => {
      render(<MessageReader message={baseMessage} />)

      expect(screen.getByRole('link', { name: /Open Notion Workspace/ })).toBeInTheDocument()
    })

    it('labels the context link from the context label when no action text is given', () => {
      render(<MessageReader message={{ ...baseMessage, contextActionText: undefined }} />)

      expect(screen.getByRole('link', { name: /Open Notion Login/ })).toBeInTheDocument()
    })

    it('falls back to a generic label when the message has no context label', () => {
      render(
        <MessageReader message={{ ...baseMessage, contextActionText: undefined, contextLabel: undefined }} />
      )

      expect(screen.getByRole('link', { name: /Open link/ })).toBeInTheDocument()
    })
  })

  describe('attachments', () => {
    it('lists the message attachments with their combined size', () => {
      render(<MessageReader message={baseMessage} />)

      expect(screen.getByText('guide.pdf')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '3 Attachments · 2.3 MB' })).toBeInTheDocument()
    })

    it('forwards an attachment download to the download handler', () => {
      const onDownloadAttachment = vi.fn()
      render(<MessageReader message={baseMessage} onDownloadAttachment={onDownloadAttachment} />)

      fireEvent.click(screen.getByLabelText('Download guide.pdf'))

      expect(onDownloadAttachment).toHaveBeenCalledWith(baseMessage.attachments[0])
    })

    it('forwards download all to the download all handler', () => {
      const onDownloadAll = vi.fn()
      render(<MessageReader message={baseMessage} onDownloadAll={onDownloadAll} />)

      fireEvent.click(screen.getByLabelText('Download all attachments as zip'))

      expect(onDownloadAll).toHaveBeenCalledTimes(1)
    })
  })

  describe('a message that did not load', () => {
    const notLoaded = { ...textMessage, textBody: undefined, incomplete: true }

    it('says so instead of showing an empty body', () => {
      render(<MessageReader message={notLoaded} />)

      expect(screen.getByText('This message didn’t load')).toBeInTheDocument()
      expect(screen.queryByText('(Empty message body)')).not.toBeInTheDocument()
      expect(screen.queryByText('No attachments')).not.toBeInTheDocument()
    })

    it('asks for the message again from Try again', () => {
      const onRetry = vi.fn()
      render(<MessageReader message={notLoaded} onRetry={onRetry} />)

      fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

      expect(onRetry).toHaveBeenCalledWith(notLoaded)
      expect(screen.getByRole('button', { name: 'Trying again…' })).toBeDisabled()
    })

    it('offers Try again again once the retry has failed', () => {
      const onRetry = vi.fn()
      const { rerender } = render(<MessageReader message={notLoaded} onRetry={onRetry} />)

      fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
      rerender(<MessageReader message={{ ...notLoaded }} onRetry={onRetry} />)

      expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled()
    })
  })
})
