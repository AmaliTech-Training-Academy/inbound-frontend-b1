import { Link, useOutletContext } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import SplitText from '../components/fx/SplitText.jsx'
import { ActiveAddress, ArrowIcon, GenerateButton, SiteFooter, SiteHero } from '../components/SiteChrome.jsx'
import { INBOX_TTL_MINUTES } from '../config.js'
import { INBOX_PATH, ROUTES } from '../router'

// The landing page from the design (homePage.tsx), driven by the session.
// Generating shows the new address in place, with the way into the inbox; a
// session already open shows its address straight away.
export default function LandingPage() {
  const { session, unreadCounts } = useOutletContext()
  const { status, inbox, inboxes, error, generate, regenerate, regenerating } = session

  const creating = status === 'creating'
  const active = status === 'active' && inbox
  // The purged note stays up while its replacement is on the way.
  const purged = status === 'expired' || regenerating
  const unread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0)

  return (
    <div className="font-poppins text-slate-900">
      <SiteHero session={session} unread={unread} className="min-h-screen">
        <div className="relative -top-8 flex flex-1 flex-col items-center justify-center px-4 md:-top-24">
          <div className="mx-auto flex max-w-full items-center gap-2 rounded-full border border-slate-300 px-4 py-2 hover:border-slate-400/70">
            {active ? (
              <>
                <span className="truncate">
                  {unread > 0
                    ? `${unread} unread ${unread === 1 ? 'message' : 'messages'} waiting`
                    : 'Your inbox is live'}
                </span>
                <Link to={INBOX_PATH} className="flex shrink-0 items-center gap-1 font-medium">
                  <span>Open</span>
                  <ArrowIcon />
                </Link>
              </>
            ) : (
              <>
                <span className="truncate">No sign-up. Self-destructs in {INBOX_TTL_MINUTES} min.</span>
                <Link to={ROUTES.howItWorks} className="flex shrink-0 items-center gap-1 font-medium">
                  <span>Read more</span>
                  <ArrowIcon />
                </Link>
              </>
            )}
          </div>

          <SplitText
            text="Generate Temporary Emails For Every Need"
            tag="h1"
            className="mx-auto mt-8 max-w-212.5 text-center text-4xl font-medium md:text-7xl"
          />

          <p className="mx-auto mt-6 max-w-2xl text-center text-sm max-md:px-2 md:text-base">
            Protect your inbox with a disposable email address for sign-ups,
            verification codes, and temporary testing.
          </p>

          <div className="mx-auto mt-8 w-full max-w-xl">
            {active ? (
              <ActiveAddress inbox={inbox} others={inboxes.length - 1} />
            ) : purged ? (
              <div key="purged" className="flex animate-fade-up flex-col items-center gap-4 text-center">
                <p className="font-mono text-xs tracking-wide text-rose-600">INBOX PURGED</p>
                <p className="max-w-md text-sm text-slate-600">
                  Your last inbox expired. Its messages and attachments are
                  unrecoverable.
                </p>
                <GenerateButton onClick={regenerate} creating={creating} label="Generate a new address" />
              </div>
            ) : (
              <div key="actions" className="flex animate-fade-up flex-wrap items-center justify-center gap-4">
                <GenerateButton
                  onClick={generate}
                  creating={creating}
                  label={status === 'error' ? 'Try Again' : null}
                />
                <Link
                  to={ROUTES.howItWorks}
                  className="group flex items-center gap-3 rounded-full border border-slate-300 py-2 pl-8 pr-2 text-base font-medium transition hover:border-slate-400/70"
                >
                  <span>Learn More</span>
                  <span className="flex items-center justify-center rounded-full border border-slate-300 bg-white p-3 text-slate-800 transition-transform duration-300 ease-out group-hover:translate-x-0.5">
                    <ArrowUpRight size={20} strokeWidth={2.25} aria-hidden="true" />
                  </span>
                </Link>
              </div>
            )}

            {status === 'error' && (
              <p role="alert" className="mt-3 text-center text-sm text-rose-600">
                {error?.message || 'Could not create an inbox.'} Check your
                connection and try again.
              </p>
            )}
          </div>
        </div>
      </SiteHero>

      <SiteFooter />
    </div>
  )
}
