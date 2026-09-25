import {describe,it,expect,vi} from 'vitest'
import {render,screen,fireEvent} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import App from '../src/App'
import { MOCK_MESSAGES } from '../src/data/mockMessages'

const HOME_HEADING = 'Create a temporary email in seconds.'
const DETAILS_MESSAGE = MOCK_MESSAGES[2]
// What a row of the live inbox holds: the API's shape, and an id no mock
// message carries.
const LIVE_MESSAGE = {
  id: 'live-1',
  sender: 'Ada Lovelace <ada@example.com>',
  subject: 'Your verification code',
  receivedAt: new Date().toISOString(),
  body: 'Hello from the API.',
}

const detailsPath = (message) => `/inbox/${message.id}`

/** The real entry point mounts a BrowserRouter, so the tests supply their own. */
function renderApp(path = '/', state) {
  return render(
    <MemoryRouter initialEntries={[state ? { pathname: path, state } : path]}>
      <App />
    </MemoryRouter>
  )
}

function expectHomePage() {
  expect(screen.getByRole('heading', { level: 1, name: HOME_HEADING })).toBeInTheDocument()
}


describe('App', () => {
  it('renders the generator home page on first paint', () => {
    renderApp()

    expectHomePage()
    expect(
      screen.getByRole('button', { name: /Generate temporary email/ })
    ).toBeInTheDocument()
  })

  it('does not show a feedback notification before any interaction', () => {
    renderApp()

    expect(screen.queryByRole('status')).toBeNull()
  })

  it('opens the message named in the details url', () => {
    renderApp(detailsPath(DETAILS_MESSAGE))

    // Named, because the reader no longer replaces the home page: the home page
    // stays mounted behind it, so with no inbox here the landing hero is a
    // second level-1 heading in the document. See the route table in App.jsx.
    expect(
      screen.getByRole('heading', { level: 1, name: DETAILS_MESSAGE.subject })
    ).toBeInTheDocument()
    expect(screen.getByText(DETAILS_MESSAGE.senderName)).toBeInTheDocument()
    expect(screen.getByText(/Build pipeline #4928 failed/)).toBeInTheDocument()
    // The reader covering that page is what the visitor actually sees.
    expect(screen.getByLabelText('Back to inbox')).toBeInTheDocument()
  })

  it('opens a live message handed over by the row that was clicked', () => {
    // No mock message carries this id, so the state a click leaves behind is
    // the only thing that can open it.
    expect(MOCK_MESSAGES.some((message) => message.id === LIVE_MESSAGE.id)).toBe(false)

    renderApp(detailsPath(LIVE_MESSAGE), { message: LIVE_MESSAGE })

    expect(
      screen.getByRole('heading', { level: 1, name: LIVE_MESSAGE.subject })
    ).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Hello from the API.')).toBeInTheDocument()
  })

  it('ignores state left behind by a different message', () => {
    renderApp('/inbox/not-a-real-message', { message: LIVE_MESSAGE })

    expectHomePage()
  })

  it('returns to the home page when back is used', () => {    renderApp(detailsPath(MOCK_MESSAGES[1]))

    fireEvent.click(screen.getByLabelText('Back to inbox'))

    expectHomePage()
  })

  it('returns to the home page with escape', () => {
    renderApp(detailsPath(MOCK_MESSAGES[0]))

    fireEvent.keyDown(window, { key: 'Escape' })

    expectHomePage()
  })

  it('sends an unknown message id back to the home page', () => {
    renderApp('/inbox/not-a-real-message')

    expectHomePage()
  })

  it('sends an unknown url back to the home page', () => {
    renderApp('/not-a-real-page')

    expectHomePage()
  })

  it('shows feedback when a new email is generated', () => {
    vi.useFakeTimers()
    renderApp(detailsPath(MOCK_MESSAGES[0]))

    fireEvent.click(screen.getByLabelText('Generate new temporary email'))

    expect(screen.getByRole('status')).toHaveTextContent(
      'Generate Email clicked (triggers parent email generator)'
    )
  })

  it('shows feedback after the inbox destruction is confirmed', () => {
    vi.useFakeTimers()
    renderApp(detailsPath(MOCK_MESSAGES[0]))

    fireEvent.click(screen.getByLabelText('Destroy Inbox'))
    fireEvent.click(screen.getByText('Yes, destroy inbox'))

    expect(screen.getByRole('status')).toHaveTextContent(
      'onDestroy() called — triggers parent inbox destruction'
    )
  })
})
