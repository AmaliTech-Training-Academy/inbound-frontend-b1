import {describe,it,expect,vi} from 'vitest'
import {render,screen,fireEvent} from '@testing-library/react'
import InboxList from '../src/components/InboxList'

const messages = [
  {
    id: '849201a',
    senderName: 'Notion Team',
    senderEmail: 'notify@m.notion.so',
    subject: 'Your Notion login code is 849 201',
    receivedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    attachments: [
      { id: 'att_01', filename: 'guide.pdf', type: 'PDF', size: '1.8 MB' },
      { id: 'att_02', filename: 'policy.pdf', type: 'PDF', size: '420 KB' },
    ],
  },
  {
    id: '5594aa2',
    senderName: 'CI/CD Build Cluster',
    senderEmail: 'builds@internal-ci.net',
    subject: 'Deployment pipeline failed: Test suite regression',
    receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    attachments: [],
  },
]


describe('InboxList', () => {
  it('renders a row for every message in the inbox', () => {
    render(<InboxList messages={messages} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('Notion Team')).toBeInTheDocument()
    expect(screen.getByText('CI/CD Build Cluster')).toBeInTheDocument()
  })

  it('shows the sender, subject and relative received time of each message', () => {
    render(<InboxList messages={messages} />)

    expect(screen.getByText('Your Notion login code is 849 201')).toBeInTheDocument()
    expect(screen.getByText('12m ago')).toBeInTheDocument()
    expect(screen.getByText('Deployment pipeline failed: Test suite regression')).toBeInTheDocument()
    expect(screen.getByText('2h ago')).toBeInTheDocument()
  })

  it('shows the sender address of each message', () => {
    render(<InboxList messages={messages} />)

    expect(screen.getByText('<notify@m.notion.so>')).toBeInTheDocument()
    expect(screen.getByText('<builds@internal-ci.net>')).toBeInTheDocument()
  })

  it('reports how many messages are in the inbox', () => {
    render(<InboxList messages={messages} />)

    expect(screen.getByText('2 messages')).toBeInTheDocument()
  })

  it('uses a singular label for a single message', () => {
    render(<InboxList messages={[messages[0]]} />)

    expect(screen.getByText('1 message')).toBeInTheDocument()
  })

  it('opens the selected message when a row is activated', () => {
    const onSelectMessage = vi.fn()
    render(<InboxList messages={messages} onSelectMessage={onSelectMessage} />)

    fireEvent.click(screen.getByText('Deployment pipeline failed: Test suite regression').closest('button'))

    expect(onSelectMessage).toHaveBeenCalledWith(messages[1])
  })

  it('does not throw when a row is activated without a handler', () => {
    render(<InboxList messages={messages} />)

    expect(() =>
      fireEvent.click(screen.getByText('Your Notion login code is 849 201').closest('button'))
    ).not.toThrow()
  })

  it('shows how many files are attached to a message', () => {
    render(<InboxList messages={messages} />)

    expect(screen.getByText('2 files')).toBeInTheDocument()
  })

  it('omits the file count for a message with no attachments', () => {
    render(<InboxList messages={[messages[1]]} />)

    expect(screen.queryByText(/files?/)).toBeNull()
  })

  it('shows the inbox address when one is provided', () => {
    render(<InboxList messages={messages} inboxAddress="inbox-user-8921@inbound.mail" />)

    expect(screen.getByTitle('inbox-user-8921@inbound.mail')).toBeInTheDocument()
  })

  it('calls onGenerateEmail when the generate action is used', () => {
    const onGenerateEmail = vi.fn()
    render(<InboxList messages={messages} onGenerateEmail={onGenerateEmail} />)

    fireEvent.click(screen.getByLabelText('Generate new temporary email'))

    expect(onGenerateEmail).toHaveBeenCalledTimes(1)
  })

  it('shows an empty state when the inbox has no messages', () => {
    render(<InboxList messages={[]} />)

    expect(
      screen.getByText('No messages yet. New mail will appear here automatically.')
    ).toBeInTheDocument()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })
})
