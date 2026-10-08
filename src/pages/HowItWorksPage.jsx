import { useOutletContext } from 'react-router-dom'
import HowInboundWorks from '../components/HowInboundWorks.jsx'
import { SiteFooter, SiteHero } from '../components/SiteChrome.jsx'
import { INBOX_TTL_MINUTES } from '../config.js'

// "How Inbound Works", as a page of its own in the landing page's style. It
// only explains; getting an inbox is the nav's job here.
export default function HowItWorksPage() {
  const { session, unreadCounts } = useOutletContext()
  const unread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0)

  return (
    // One screen tall: the hero takes what the footer leaves, so the footer
    // shows without scrolling on a laptop, and the page still scrolls when
    // its content needs more room.
    <div className="flex min-h-dvh flex-col text-ink dark:text-ink-dark">
      <SiteHero session={session} unread={unread} className="flex-1">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 pb-10 pt-4 md:pt-6">
          <div className="mx-auto max-w-full rounded-full border border-slate-200 px-4 py-2 dark:border-line-dark">
            <span className="block truncate">
              No account. No tracking. Gone in {INBOX_TTL_MINUTES} minutes.
            </span>
          </div>

          <h1 className="mx-auto mt-8 text-center text-4xl font-bold md:text-6xl">
            How Inbound Works
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-slate-600 max-md:px-2 md:text-base dark:text-body-dark">
            Three steps, no sign-up, and nothing left behind.
          </p>

          <HowInboundWorks className="mt-10" />
        </div>
      </SiteHero>

      <SiteFooter />
    </div>
  )
}
