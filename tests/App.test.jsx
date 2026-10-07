import {describe,it,expect,beforeEach,afterEach} from 'vitest'
import {render,screen,fireEvent,within,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import App from '../src/App'

// Driven through the real App and its route table, against the in-browser
// mock backend the test environment pins (VITE_USE_MOCK).

const HOME_HEADING = 'Generate Temporary Emails For Every Need'
const SESSION_KEY = 'inbound.session'

const inMinutes = (minutes) => new Date(Date.now() + minutes * 60_000).toISOString()

/** A session with one live inbox, as useInbox stores it. */
function seedSession(expiresAt = inMinutes(10)) {
  const session = {
    token: 'token-app-1',
    expiresAt,
    inboxes: [{ id: 'inbox-app-1', address: 'seeded@inbound.mail', createdAt: new Date().toISOString(), expiresAt, extendCount: 0 }],
    activeId: 'inbox-app-1',
    hiddenIds: [],
  }
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

/** The real entry point mounts a BrowserRouter, so the tests supply their own. */
function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  )
}

function expectHomePage() {
  expect(screen.getByRole('heading', { level: 1, name: HOME_HEADING })).toBeInTheDocument()
}

// The public pages carry one nav; the inbox's rails are the named ones.
const nav = () => screen.getByRole('navigation')

describe('App', () => {
  beforeEach(() => window.sessionStorage.clear())
  afterEach(() => window.sessionStorage.clear())

  describe('the landing page', () => {
    it('renders the generator on first paint', () => {
      renderApp()

      expectHomePage()
      expect(screen.getByRole('button', { name: 'Generate Inbox' })).toBeInTheDocument()
    })

    it('shows the new address in place, with the way into the inbox', async () => {
      renderApp()

      fireEvent.click(screen.getByRole('button', { name: 'Generate Inbox' }))

      const goToInbox = await screen.findByRole('link', { name: 'Go to inbox' })
      expect(screen.getByText(/@tempmail\.dev$/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Copy mock-.+@tempmail\.dev$/ })).toBeInTheDocument()

      fireEvent.click(goToInbox)

      expect(await screen.findByRole('heading', { level: 1, name: 'Inbox' })).toBeInTheDocument()
    })

    it('shows an open session straight away, and links the nav to it', () => {
      seedSession()
      renderApp()

      expect(screen.getByText('seeded@inbound.mail')).toBeInTheDocument()

      // Covered by the hero before it had a layer of its own, and did nothing.
      fireEvent.click(within(nav()).getByRole('link', { name: 'Open inbox' }))

      expect(screen.getByRole('heading', { level: 1, name: 'Inbox' })).toBeInTheDocument()
    })

    it('makes an inbox from the nav when there is none', async () => {
      renderApp()

      fireEvent.click(within(nav()).getByRole('button', { name: 'Get an inbox' }))

      expect(await screen.findByRole('link', { name: 'Go to inbox' })).toBeInTheDocument()
      expect(within(nav()).getByRole('link', { name: 'Open inbox' })).toBeInTheDocument()
    })
  })

  describe('how it works', () => {
    it('is a page of its own, reached from the nav', () => {
      renderApp()

      fireEvent.click(within(nav()).getByRole('link', { name: 'How it works' }))

      expect(screen.getByRole('heading', { level: 1, name: 'How Inbound Works' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { level: 1, name: HOME_HEADING })).toBeNull()
      expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
        'Click Generate',
        'Receive Codes & Links',
        'Everything Disappears',
      ])
    })

    it('is where Learn More leads', () => {
      renderApp()

      // Learn More is the only way in from the landing page: the pill that
      // used to carry a second link to the same place no longer does.
      expect(screen.queryByRole('link', { name: /Read more/ })).toBeNull()

      fireEvent.click(screen.getByRole('link', { name: /Learn More/ }))
      expect(screen.getByRole('heading', { level: 1, name: 'How Inbound Works' })).toBeInTheDocument()

      // There is no Home link; the brand is the way back.
      expect(within(nav()).queryByRole('link', { name: 'Home' })).toBeNull()
      fireEvent.click(within(nav()).getByRole('link', { name: 'Inbound' }))
      expect(screen.getByRole('heading', { level: 1, name: /Generate/ })).toBeInTheDocument()
    })

    it('only explains: getting an inbox is left to the nav', () => {
      renderApp('/how-it-works')

      expect(screen.queryByRole('button', { name: 'Generate Inbox' })).toBeNull()
      expect(within(nav()).getByRole('button', { name: 'Get an inbox' })).toBeInTheDocument()
    })
  })

  describe('routing', () => {
    it('sends the inbox back to the landing page when there is no inbox', () => {
      renderApp('/inbox')

      expectHomePage()
    })

    it('sends a message url back to the landing page when there is no inbox', () => {
      renderApp('/inbox/some-message')

      expectHomePage()
    })

    it('sends an unknown url back to the landing page', () => {
      renderApp('/not-a-real-page')

      expectHomePage()
    })

    it('says so when a message url names nothing in the open inbox', async () => {
      seedSession()
      renderApp('/inbox/not-a-real-message')

      expect(await screen.findByText('This message isn’t here')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('link', { name: 'Back to inbox' }))

      expect(screen.queryByText('This message isn’t here')).toBeNull()
      expect(await screen.findByText('Your inbox is empty')).toBeInTheDocument()
    })

    it('shows a message url as loading until the inbox has been checked', async () => {
      // A reload with a message open: the list is rebuilt from the server
      // first, so "not here" would be said too soon.
      seedSession()
      renderApp('/inbox/not-a-real-message')

      expect(screen.getByText('Loading message…')).toBeInTheDocument()
      expect(screen.queryByText('This message isn’t here')).toBeNull()

      expect(await screen.findByText('This message isn’t here')).toBeInTheDocument()
    })

    it('goes back to the list when the open inbox expires with a message open', async () => {
      const soon = new Date(Date.now() + 300).toISOString()
      window.sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          token: 'token-app-1',
          expiresAt: inMinutes(10),
          inboxes: [
            { id: 'inbox-a', address: 'going@inbound.mail', createdAt: new Date().toISOString(), expiresAt: soon, extendCount: 0 },
            { id: 'inbox-b', address: 'staying@inbound.mail', createdAt: new Date().toISOString(), expiresAt: inMinutes(10), extendCount: 0 },
          ],
          activeId: 'inbox-a',
          hiddenIds: [],
        }),
      )
      renderApp('/inbox/a-message-in-inbox-a')

      expect(await screen.findByText('Nothing here yet')).toBeInTheDocument()
      expect(screen.queryByText('This message isn’t here')).toBeNull()
      expect(screen.queryByText('Loading message…')).toBeNull()
    })

    it('leads from the inbox back to the landing page', () => {
      seedSession()
      renderApp('/inbox')

      fireEvent.click(screen.getByRole('link', { name: 'Inbound' }))

      expectHomePage()
    })
  })

  describe('the end of an inbox', () => {
    it('ends on the landing page once the last inbox is destroyed', () => {
      seedSession()
      renderApp('/inbox')

      fireEvent.click(screen.getByRole('button', { name: 'Destroy inbox' }))
      const dialog = screen.getByRole('alertdialog')
      expect(dialog).toHaveTextContent('seeded@inbound.mail')
      fireEvent.click(within(dialog).getByRole('button', { name: 'Yes, destroy inbox' }))

      expectHomePage()
      expect(window.sessionStorage.getItem(SESSION_KEY)).toBeNull()
    })

    it('keeps the inbox when the destroy is cancelled', () => {
      seedSession()
      renderApp('/inbox')

      fireEvent.click(screen.getByRole('button', { name: 'Destroy inbox' }))
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(screen.queryByRole('alertdialog')).toBeNull()
      expect(screen.getByRole('heading', { level: 1, name: 'Inbox' })).toBeInTheDocument()
    })

    it('shows the purged card when the inbox runs out, and starts again from it', async () => {
      seedSession(new Date(Date.now() + 300).toISOString())
      renderApp('/inbox')

      expect(await screen.findByRole('heading', { level: 1, name: 'This inbox has expired' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Generate a new address' }))

      await waitFor(() =>
        expect(screen.getByRole('heading', { level: 1, name: 'Inbox' })).toBeInTheDocument()
      )
      // A fresh address, where the expired one was.
      expect(screen.getAllByText(/^mock-.+@tempmail\.dev$/)).not.toHaveLength(0)
      expect(screen.queryByText('seeded@inbound.mail')).toBeNull()
    })

    it('goes back to a normal home page from the purged card', async () => {
      seedSession(new Date(Date.now() + 300).toISOString())
      renderApp('/inbox')

      await screen.findByRole('heading', { level: 1, name: 'This inbox has expired' })
      fireEvent.click(screen.getByRole('button', { name: 'Back to home' }))

      // The usual hero, with nothing about the expired inbox left on it.
      expectHomePage()
      expect(screen.queryByText(/expired/i)).toBeNull()
      expect(screen.getByRole('button', { name: 'Generate Inbox' })).toBeInTheDocument()
    })
  })
})
