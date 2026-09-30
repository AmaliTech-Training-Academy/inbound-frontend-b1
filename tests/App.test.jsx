import {describe,it,expect,vi,beforeEach} from 'vitest'
import {render,screen,fireEvent} from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../src/services/inboxApi.js', async () => {
  const actual = await vi.importActual('../src/services/inboxApi.js')
  return { ...actual, createInbox: vi.fn(), getInboxInfo: vi.fn() }
})

import App from '../src/App'
import { MOCK_MESSAGES } from '../src/data/mockMessages'
import { createInbox } from '../src/services/inboxApi.js'


const ADDRESS = 'inbox-user-8921@inbound.mail'

function newInbox(overrides = {}) {
  return {
    id: 'i1',
    address: ADDRESS,
    token: 'tok',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    ...overrides,
  }
}

// The reader only exists inside an active inbox, so each test generates an
// address first, the way the header's Generate Email button does.
async function openInbox() {
  const user = userEvent.setup()
  createInbox.mockResolvedValue(newInbox())

  render(<App />)
  await user.click(screen.getByRole('button', { name: /generate email/i }))
  await screen.findAllByText(ADDRESS)

  return user
}

const listItems = () => screen.getAllByRole('listitem')
const openMessage = (user, index) =>
  user.click(screen.getByText(MOCK_MESSAGES[index].subject).closest('button'))

describe('App', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
    // jsdom has no layout, so scrollIntoView is not implemented.
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('renders the inbox list for the address the header generated', async () => {
    await openInbox()

    expect(createInbox).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Inbox')
    expect(listItems()).toHaveLength(MOCK_MESSAGES.length)
    MOCK_MESSAGES.forEach((message) => {
      expect(screen.getByText(message.subject)).toBeInTheDocument()
    })
  })

  it('replaces the landing page once the inbox is active', async () => {
    await openInbox()

    expect(
      screen.queryByText(/Create a temporary email in seconds/i)
    ).toBeNull()
  })

  it('opens the selected message in the reader', async () => {
    const user = await openInbox()

    await openMessage(user, 2)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(MOCK_MESSAGES[2].subject)
    expect(screen.getByText(MOCK_MESSAGES[2].senderName)).toBeInTheDocument()
    expect(screen.getByText(/Build pipeline #4928 failed/)).toBeInTheDocument()
    expect(screen.queryByText(MOCK_MESSAGES[3].subject)).toBeNull()
  })

  it('returns to the inbox list without losing the other messages', async () => {
    const user = await openInbox()

    await openMessage(user, 1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(MOCK_MESSAGES[1].subject)

    await user.click(screen.getByLabelText('Back to inbox'))

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Inbox')
    expect(listItems()).toHaveLength(MOCK_MESSAGES.length)
    MOCK_MESSAGES.forEach((message) => {
      expect(screen.getByText(message.subject)).toBeInTheDocument()
    })
  })

  it('returns to the inbox list with escape', async () => {
    const user = await openInbox()

    await openMessage(user, 0)

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Inbox')
    expect(listItems()).toHaveLength(MOCK_MESSAGES.length)
  })

  it('opens a different message after returning to the list', async () => {
    const user = await openInbox()

    await openMessage(user, 0)
    await user.click(screen.getByLabelText('Back to inbox'))
    await openMessage(user, 4)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(MOCK_MESSAGES[4].subject)
    expect(screen.queryByText(MOCK_MESSAGES[0].subject)).toBeNull()
  })

  it('generates a new address from the inbox toolbar', async () => {
    const user = await openInbox()
    createInbox.mockResolvedValue(newInbox({ id: 'i2', address: 'second@inbound.dev' }))

    // A third would mean a component had brought its own header back.
    expect(screen.getAllByRole('button', { name: /generate/i })).toHaveLength(2)

    await user.click(screen.getByLabelText('Generate new temporary email'))

    expect(await screen.findAllByText('second@inbound.dev')).not.toHaveLength(0)
    expect(createInbox).toHaveBeenCalledTimes(2)
    expect(listItems()).toHaveLength(MOCK_MESSAGES.length)
  })

  it('destroys the inbox from the reader and returns to the landing page', async () => {
    const user = await openInbox()

    await openMessage(user, 0)
    await user.click(screen.getByLabelText('Destroy Inbox'))
    await user.click(screen.getByText('Yes, destroy inbox'))

    expect(
      screen.getByText(/Create a temporary email in seconds/i)
    ).toBeInTheDocument()
    expect(screen.queryByText(MOCK_MESSAGES[0].subject)).toBeNull()
  })
})
