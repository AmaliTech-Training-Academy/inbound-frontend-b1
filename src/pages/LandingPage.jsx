import { Link, useOutletContext } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { ActiveAddress, ArrowIcon, GenerateButton, SiteFooter, SiteHero } from '../components/SiteChrome.jsx'
import { INBOX_TTL_MINUTES } from '../config.js'
import { INBOX_PATH, ROUTES } from '../router'

// The landing page from the design (homePage.tsx), driven by the session.
// Generating shows the new address in place, with the way into the inbox; a
// session already open shows its address straight away.
export default function LandingPage() {
  const { session, unreadCounts } = useOutletContext()
  const { status, inbox, inboxes, error, generate } = session

  const creating = status === 'creating'
  const active = status === 'active' && inbox
  // An expired inbox is the inbox page's to report. Home always offers a
  // fresh start, so coming back here never repeats that the inbox is gone.
  const unread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0)

  return (
    <div className="text-ink">
      <SiteHero session={session} unread={unread} className="min-h-screen">
        <div className="relative -top-8 flex flex-1 flex-col items-center justify-center px-4 md:-top-24">
          <div className="mx-auto flex max-w-full items-center gap-2 rounded-full border border-slate-200 px-4 py-2 hover:border-slate-300">
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-brand" />
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

          <div className="relative mx-auto mt-8 w-full max-w-212.5">
            <h1 className="text-center text-4xl font-bold md:text-7xl">
              Generate{' '}
              {/* The stamp hangs off the end of this word rather than the
                  container's corner, so it clears the "y" however the
                  headline wraps. */}
              <span className="relative inline-block">
                Temporary
                <ExpiryStamp />
              </span>{' '}
              Emails For Every{' '}
              {/* The design sets the last word in the brand colour, over two
                  hand-drawn strokes. */}
              <span className="relative inline-block text-brand">
                Need
                <svg
                  aria-hidden="true"
                  viewBox="0 0 120 22"
                  fill="none"
                  className="absolute -bottom-4 left-0 h-auto w-full md:-bottom-6"
                >
                  <path
                    d="M3 8.5C19 2.5 41 2 57 7c16 5 40 4.5 60-2"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8 17.5C23 12 43 11.5 58 16c15 4.5 37 4 54-1.5"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
          </div>

          <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-slate-600 max-md:px-2 md:text-base">
            Protect your inbox with a disposable email address for sign-ups,
            verification codes, and temporary testing.
          </p>

          <div className="mx-auto mt-8 w-full max-w-xl">
            {active ? (
              <ActiveAddress inbox={inbox} others={inboxes.length - 1} />
            ) : (
              <div key="actions" className="flex animate-fade-up flex-wrap items-center justify-center gap-4">
                <GenerateButton
                  onClick={generate}
                  creating={creating}
                  label={status === 'error' ? 'Try Again' : null}
                />
                <Link
                  to={ROUTES.howItWorks}
                  className="group flex items-center gap-3 rounded-full border border-slate-200 py-2 pl-8 pr-2 text-base font-medium text-ink transition hover:border-slate-300"
                >
                  <span>Learn More</span>
                  <span className="flex items-center justify-center rounded-full border border-slate-200 bg-white p-3 text-ink transition-transform duration-300 ease-out group-hover:translate-x-0.5">
                    <ArrowUpRight size={20} strokeWidth={2.25} aria-hidden="true" />
                  </span>
                </Link>
              </div>
            )}

            {status === 'error' && (
              <p role="alert" className="mt-3 text-center text-sm text-rose-600">
                {error?.message || 'Could not create an inbox. Try again in a moment.'}
              </p>
            )}
          </div>
        </div>
      </SiteHero>

      <SiteFooter />
    </div>
  )
}

// The tilted stamp the design sets at the right of the headline's first line:
// a dashed circle around the expiry clock. Drawn as SVG rather than shipped as
// an image so it takes its colour from the brand token. It sits just past the
// end of "Temporary" and above its cap height, and only from laptop width up:
// narrower, there is no room beside the headline and it would cover letters.
function ExpiryStamp() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -top-10 left-full ml-1 hidden size-20 -rotate-8 text-brand lg:block"
    >
      <svg viewBox="0 0 100 100" className="size-full">
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.5"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <text
          x="50"
          y="47"
          textAnchor="middle"
          fill="currentColor"
          fontSize="23"
          fontWeight="700"
        >
          10:00
        </text>
        <text
          x="50"
          y="65"
          textAnchor="middle"
          fill="currentColor"
          fontSize="8.5"
          fontWeight="600"
          letterSpacing="0.9"
        >
          EXPIRES
        </text>
      </svg>
    </span>
  )
}
