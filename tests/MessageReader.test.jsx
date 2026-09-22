import {describe,it,expect,vi} from 'vitest'
import {render,screen,fireEvent,within,act} from '@testing-library/react'
import MessageReader from '../src/components/MessageReader'
import { MOCK_MESSAGES } from '../src/data/mockMessages'
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


describe('MessageReader', () => {
  it('renders the subject, sender and sender address of the message', () => {
    render(<MessageReader message={baseMessage} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your Notion login code is 849 201')
    expect(screen.getByText('Notion Team')).toBeInTheDocument()
    expect(screen.getByText('<notify@m.notion.so>')).toBeInTheDocument()
  })

  it('renders the first mock message when no message prop is provided', () => {
    render(<MessageReader />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(MOCK_MESSAGES[0].subject)
  })

  it('shows the message identifier badge', () => {
    render(<MessageReader message={baseMessage} />)

    expect(screen.getByText('ID: #849201a')).toBeInTheDocument()
  })

  it('hides the identifier badge when the message has no id', () => {
    render(<MessageReader message={{ ...baseMessage, id: undefined }} />)

    expect(screen.queryByText(/ID: #/)).toBeNull()
  })

  it('renders the received time and its relative age', () => {
    const { container } = render(<MessageReader message={baseMessage} />)

    const time = container.querySelector('time')
    expect(time).toHaveAttribute('datetime', baseMessage.receivedAt)
    expect(time).toHaveTextContent(formatReceivedAt(baseMessage.receivedAt))
    expect(screen.getByText('12m ago')).toBeInTheDocument()
  })

  it('falls back to placeholder text when the message has no subject, sender or body', () => {
    render(<MessageReader message={{}} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('(No Subject)')
    expect(screen.getByText('Unknown Sender')).toBeInTheDocument()
    expect(screen.getByText('(Empty message body)')).toBeInTheDocument()
  })

  it('does not render a relative age when the received time is missing', () => {
    render(<MessageReader message={{}} />)

    expect(screen.getByText('Unknown time')).toBeInTheDocument()
    expect(screen.queryByText(/ago/)).toBeNull()
  })

  it('renders the message recipient in the address bar and the delivery line', () => {
    render(<MessageReader message={baseMessage} />)

    expect(screen.getAllByText('inbox-user-8921@inbound.mail')).toHaveLength(2)
  })

  it('falls back to a default inbox address when none is available', () => {
    render(<MessageReader message={{}} />)

    expect(screen.getAllByText('temporary-inbox@inbound.mail')).toHaveLength(2)
  })

  it('prefers an explicit inbox address in the address bar', () => {
    render(<MessageReader message={baseMessage} inboxAddress="custom-inbox@inbound.mail" />)

    expect(screen.getByTitle('custom-inbox@inbound.mail')).toBeInTheDocument()
  })

  it('builds sender initials from the first two words of the sender name', () => {
    render(<MessageReader message={baseMessage} />)

    expect(screen.getByText('NT')).toBeInTheDocument()
  })

  it('builds a single initial for a one word sender name', () => {
    render(<MessageReader message={{ ...baseMessage, senderName: 'Notion' }} />)

    expect(screen.getByText('N')).toBeInTheDocument()
  })

  it('shows the verification code section when the message has a code', () => {
    render(<MessageReader message={baseMessage} />)

    expect(screen.getByLabelText('Verification Code')).toBeInTheDocument()
    expect(screen.getByText('849 201')).toBeInTheDocument()
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

  it('copies the inbox address and confirms it temporarily', () => {
    vi.useFakeTimers()
    const writeText = stubClipboard()
    render(<MessageReader message={baseMessage} />)

    const copyButton = screen.getByLabelText('Copy inbox address')
    expect(copyButton).toHaveTextContent('Copy')

    fireEvent.click(copyButton)

    expect(writeText).toHaveBeenCalledWith('inbox-user-8921@inbound.mail')
    expect(copyButton).toHaveTextContent('Copied')

    act(() => { vi.advanceTimersByTime(1500) })

    expect(copyButton).toHaveTextContent('Copy')
  })

  it('prints the email when the print action is used', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    render(<MessageReader message={baseMessage} />)

    fireEvent.click(screen.getByLabelText('Print email'))

    expect(print).toHaveBeenCalledTimes(1)
  })

  it('calls onGenerateEmail when the generate action is used', () => {
    const onGenerateEmail = vi.fn()
    render(<MessageReader message={baseMessage} onGenerateEmail={onGenerateEmail} />)

    fireEvent.click(screen.getByLabelText('Generate new temporary email'))

    expect(onGenerateEmail).toHaveBeenCalledTimes(1)
  })

  it('calls onBack when the back action is used', () => {
    const onBack = vi.fn()
    render(<MessageReader message={baseMessage} onBack={onBack} />)

    fireEvent.click(screen.getByLabelText('Back to inbox'))

    expect(onBack).toHaveBeenCalledTimes(1)
  })
})


describe('MessageReader', () => {
  it('expands the email into a full-screen reader', () => {
    render(<MessageReader message={baseMessage} />)
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByLabelText('Expand email to full-screen view'))

    const dialog = screen.getByRole('dialog', { name: 'Fullscreen email reader' })
    expect(within(dialog).getByRole('heading', { level: 1 })).toHaveTextContent('Your Notion login code is 849 201')
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

    fireEvent.click(screen.getByRole('dialog', { name: 'Fullscreen email reader' }))

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps the full-screen reader open when its content is clicked', () => {
    render(<MessageReader message={baseMessage} />)
    fireEvent.click(screen.getByLabelText('Expand email to full-screen view'))

    const dialog = screen.getByRole('dialog', { name: 'Fullscreen email reader' })
    fireEvent.click(within(dialog).getByRole('heading', { level: 1 }))

    expect(screen.getByRole('dialog', { name: 'Fullscreen email reader' })).toBeInTheDocument()
  })

  it('toggles the full-screen reader with the f key', () => {
    render(<MessageReader message={baseMessage} />)

    fireEvent.keyDown(window, { key: 'f' })
    expect(screen.getByRole('dialog', { name: 'Fullscreen email reader' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'f' })
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

  it('stops handling keyboard shortcuts once unmounted', () => {
    const onBack = vi.fn()
    const { unmount } = render(<MessageReader message={baseMessage} onBack={onBack} />)

    unmount()
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onBack).not.toHaveBeenCalled()
  })
})


describe('MessageReader', () => {
  it('asks for confirmation before destroying the inbox', () => {
    const onDestroy = vi.fn()
    render(<MessageReader message={baseMessage} onDestroy={onDestroy} />)

    fireEvent.click(screen.getByLabelText('Destroy Inbox'))

    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByText('Destroy Temporary Inbox?')).toBeInTheDocument()
  })

  it('does not destroy the inbox when the confirmation is cancelled', () => {
    const onDestroy = vi.fn()
    render(<MessageReader message={baseMessage} onDestroy={onDestroy} />)
    fireEvent.click(screen.getByLabelText('Destroy Inbox'))

    fireEvent.click(screen.getByText('Cancel'))

    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(onDestroy).not.toHaveBeenCalled()
  })

  it('destroys the inbox when the confirmation is accepted', () => {
    const onDestroy = vi.fn()
    render(<MessageReader message={baseMessage} onDestroy={onDestroy} />)
    fireEvent.click(screen.getByLabelText('Destroy Inbox'))

    fireEvent.click(screen.getByText('Yes, destroy inbox'))

    expect(onDestroy).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('notes that deletion is not wired up when no destroy handler is given', () => {
    render(<MessageReader message={baseMessage} />)

    fireEvent.click(screen.getByLabelText('Destroy Inbox'))

    expect(screen.getByText(/Backend deletion API/, { selector: 'span' })).toBeInTheDocument()
  })
})


describe('MessageReader', () => {
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

  it('lists the message attachments with their combined size', () => {
    render(<MessageReader message={baseMessage} />)

    expect(screen.getByText('guide.pdf')).toBeInTheDocument()
    expect(screen.getByText(/3 files/)).toHaveTextContent('3 files · 2.3 MB')
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
