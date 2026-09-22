import {describe,it,expect,vi} from 'vitest'
import {render,screen,fireEvent} from '@testing-library/react'
import App from '../src/App'
import { MOCK_MESSAGES } from '../src/data/mockMessages'


describe('App', () => {
  it('renders the inbox list on first paint', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Inbox')
    expect(screen.getAllByRole('listitem')).toHaveLength(MOCK_MESSAGES.length)
    MOCK_MESSAGES.forEach((message) => {
      expect(screen.getByText(message.subject)).toBeInTheDocument()
    })
  })

  it('does not show a feedback notification before any interaction', () => {
    render(<App />)

    expect(screen.queryByRole('status')).toBeNull()
  })

  it('opens the selected message in the reader', () => {
    render(<App />)

    fireEvent.click(screen.getByText(MOCK_MESSAGES[2].subject).closest('button'))

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(MOCK_MESSAGES[2].subject)
    expect(screen.getByText(MOCK_MESSAGES[2].senderName)).toBeInTheDocument()
    expect(screen.getByText(/Build pipeline #4928 failed/)).toBeInTheDocument()
    expect(screen.queryByText(MOCK_MESSAGES[3].subject)).toBeNull()
  })

  it('returns to the inbox list without losing the other messages', () => {
    render(<App />)

    fireEvent.click(screen.getByText(MOCK_MESSAGES[1].subject).closest('button'))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(MOCK_MESSAGES[1].subject)

    fireEvent.click(screen.getByLabelText('Back to inbox'))

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Inbox')
    expect(screen.getAllByRole('listitem')).toHaveLength(MOCK_MESSAGES.length)
    MOCK_MESSAGES.forEach((message) => {
      expect(screen.getByText(message.subject)).toBeInTheDocument()
    })
  })

  it('returns to the inbox list with escape', () => {
    render(<App />)

    fireEvent.click(screen.getByText(MOCK_MESSAGES[0].subject).closest('button'))

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Inbox')
    expect(screen.getAllByRole('listitem')).toHaveLength(MOCK_MESSAGES.length)
  })

  it('opens a different message after returning to the list', () => {
    render(<App />)

    fireEvent.click(screen.getByText(MOCK_MESSAGES[0].subject).closest('button'))
    fireEvent.click(screen.getByLabelText('Back to inbox'))
    fireEvent.click(screen.getByText(MOCK_MESSAGES[4].subject).closest('button'))

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(MOCK_MESSAGES[4].subject)
    expect(screen.queryByText(MOCK_MESSAGES[0].subject)).toBeNull()
  })

  it('shows feedback when a new email is generated', () => {
    vi.useFakeTimers()
    render(<App />)

    fireEvent.click(screen.getByLabelText('Generate new temporary email'))

    expect(screen.getByRole('status')).toHaveTextContent(
      'Generate Email clicked (triggers parent email generator)'
    )
  })

  it('shows feedback after the inbox destruction is confirmed', () => {
    vi.useFakeTimers()
    render(<App />)
    fireEvent.click(screen.getByText(MOCK_MESSAGES[0].subject).closest('button'))

    fireEvent.click(screen.getByLabelText('Destroy Inbox'))
    fireEvent.click(screen.getByText('Yes, destroy inbox'))

    expect(screen.getByRole('status')).toHaveTextContent(
      'onDestroy() called — triggers parent inbox destruction'
    )
  })
})
