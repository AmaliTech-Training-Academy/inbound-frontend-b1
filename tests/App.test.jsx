// The whole shell: what the landing page shows, what the header's Generate
// button does to it, and how the reader opens over the live inbox and comes
// back. Driven through the real App, with the socket and the API mocked by
// their own modules.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../src/services/inboxApi.js', async () => {
  const actual = await vi.importActual('../src/services/inboxApi.js')
  return { ...actual, createInbox: vi.fn(), getInboxInfo: vi.fn() }
})

import App from '../src/App'
import { createInbox } from '../src/services/inboxApi.js'

const HOME_HEADING = 'Create a temporary email in seconds.'
const ADDRESS = 'inbox-user-8921@inbound.mail'

// What message:new announces. The mock fetchMessage answers every id with its
// own subject and sender, so the row and the reader are labelled from those
// rather than from this payload.
const ARRIVAL = {
  id: 'live-1',
  subject: 'Your verification code',
  sender: 'Ada Lovelace <ada@example.com>',
  fromAddress: 'ada@example.com',
  receivedAt: new Date().toISOString(),
}

const ROW_LABEL = 'Open message from Mock Sender: Mock message'
const READER_SUBJECT = 'Mock message'

const inboxHeading = () => screen.getByRole('heading', { name: 'Inbox' })

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
  await user.click(screen.getByRole('button', { name: /^generate email$/i }))
  await screen.findAllByText(ADDRESS)

  return user
}

/**
 * An inbox holding one message, and the row for it.
 *
 * The socket is created a tick after the inbox mounts, so an announcement can
 * land before anything is listening. Re-announcing is harmless - useMessages
 * claims an id before it fetches - so the call is repeated until the row lands
 * rather than guessing at a delay.
 */
async function openInboxWithOneMessage() {
  const user = await openInbox()

  const row = await waitFor(
    () => {
      window.__inboundSimulateMessage?.(ARRIVAL)
      return screen.getByLabelText(ROW_LABEL)
    },
    { timeout: 3000 },
  )

  return { user, row }
}

const goBack = (user) => user.click(screen.getByLabelText('Back to inbox'))

describe('App', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
    // jsdom has no layout, so scrollIntoView is not implemented.
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('renders the generator home page on first paint', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: HOME_HEADING })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /generate temporary email/i })
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Inbox' })).toBeNull()
  })

  it('replaces the landing page once the inbox is active', async () => {
    await openInbox()

    expect(createInbox).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(HOME_HEADING)).toBeNull()
    expect(inboxHeading()).toBeInTheDocument()
    // Nothing has arrived yet, so the list is the empty state.
    expect(screen.getByText('Your inbox is empty')).toBeInTheDocument()
  })

  it('opens a live message in the reader', async () => {
    const { user, row } = await openInboxWithOneMessage()

    await user.click(row)

    expect(
      await screen.findByRole('heading', { level: 1, name: READER_SUBJECT })
    ).toBeInTheDocument()
    expect(screen.getByText('Mock Sender')).toBeInTheDocument()
    expect(screen.getByText('This is a mock message body.')).toBeInTheDocument()
  })

  it('returns to the inbox list without losing the message', async () => {
    const { user, row } = await openInboxWithOneMessage()

    await user.click(row)
    await goBack(user)

    // The row is the one that was clicked, not a reload: the list is owned
    // above the reader, so the message survived the swap.
    expect(await screen.findByLabelText(ROW_LABEL)).toBeInTheDocument()
    expect(inboxHeading()).toBeInTheDocument()
  })

  it('returns to the inbox list with escape', async () => {
    const { user, row } = await openInboxWithOneMessage()

    await user.click(row)
    await screen.findByLabelText('Back to inbox')

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(await screen.findByLabelText(ROW_LABEL)).toBeInTheDocument()
    expect(inboxHeading()).toBeInTheDocument()
  })

  it('shows a single header while the reader is open', async () => {
    const { user, row } = await openInboxWithOneMessage()

    await user.click(row)
    await screen.findByLabelText('Back to inbox')

    // The reader draws no header of its own; the app's stays the only one.
    expect(screen.getAllByRole('banner')).toHaveLength(1)
  })

  it('generates a new address from the inbox toolbar', async () => {
    const user = await openInbox()
    createInbox.mockResolvedValue(
      newInbox({ id: 'i2', address: 'second@inbound.dev' })
    )

    // The header's and the toolbar's. A third would mean a component had
    // brought its own header back.
    expect(screen.getAllByRole('button', { name: /generate/i })).toHaveLength(2)

    await user.click(screen.getByLabelText('Generate new temporary email'))

    expect(await screen.findAllByText('second@inbound.dev')).not.toHaveLength(0)
    expect(createInbox).toHaveBeenCalledTimes(2)
  })

  it('destroys the inbox from the reader and returns to the landing page', async () => {
    const { user, row } = await openInboxWithOneMessage()

    await user.click(row)
    await user.click(screen.getByLabelText('Destroy Inbox'))
    await user.click(screen.getByText('Yes, destroy inbox'))

    expect(
      await screen.findByText(HOME_HEADING)
    ).toBeInTheDocument()
    expect(screen.queryByLabelText(ROW_LABEL)).toBeNull()
  })
})
