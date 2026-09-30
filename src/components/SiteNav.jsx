import { Link, NavLink, useNavigate } from 'react-router-dom'
import { INBOX_PATH, ROUTES } from '../router'

// The top bar of the public pages, from the design's landing nav: the brand,
// the page links, and one call to action - into the inbox when there is one,
// otherwise to make one.
//
// Stacked above the hero on purpose: the hero is pulled up under the bar (as
// designed), and without its own layer the bar's buttons sat beneath the
// hero's box and never received a click.
export default function SiteNav({ session, unread = 0 }) {
  const navigate = useNavigate()
  const { status, inbox, generate } = session
  const active = status === 'active' && inbox
  const creating = status === 'creating'

  const start = async () => {
    await generate()
    // The new address is shown on the landing page.
    navigate(ROUTES.home)
  }

  const link = ({ isActive }) =>
    `whitespace-nowrap font-medium transition-colors ${
      isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'
    }`

  return (
    <nav className="relative z-20 flex w-full items-center justify-between gap-4 p-4 md:px-16 md:py-6 lg:px-24 xl:px-32">
      <Link to={ROUTES.home} className="flex shrink-0 items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
        <span aria-hidden="true" className="size-2.5 rounded-full bg-slate-900" />
        Inbound
      </Link>

      <div className="flex items-center gap-4 sm:gap-8">
        <NavLink to={ROUTES.home} end className={({ isActive }) => `${link({ isActive })} max-sm:hidden`}>
          Home
        </NavLink>
        <NavLink to={ROUTES.howItWorks} className={link}>
          How it works
        </NavLink>

        {active ? (
          <Link
            to={INBOX_PATH}
            className="flex items-center gap-2 whitespace-nowrap rounded-full bg-gray-800 px-4 py-2.5 font-medium text-white transition hover:bg-black sm:px-6 sm:py-3"
          >
            Open inbox
            {unread > 0 && <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{unread}</span>}
          </Link>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={creating}
            className="whitespace-nowrap rounded-full bg-gray-800 px-4 py-2.5 font-medium text-white transition hover:bg-black disabled:opacity-70 sm:px-6 sm:py-3"
          >
            {creating ? 'Generating…' : 'Get an inbox'}
          </button>
        )}
      </div>
    </nav>
  )
}
