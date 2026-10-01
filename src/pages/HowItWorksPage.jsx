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
    <div className="font-poppins text-slate-900">
      <SiteHero session={session} unread={unread} className="min-h-screen">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 pb-20 pt-6 md:pt-10">
          <div className="mx-auto max-w-full rounded-full border border-slate-300 px-4 py-2">
            <span className="block truncate">
              No account. No tracking. Gone in {INBOX_TTL_MINUTES} minutes.
            </span>
          </div>

          <h1 className="mx-auto mt-8 text-center text-4xl font-medium md:text-6xl">
            How Inbound Works
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-center text-sm max-md:px-2 md:text-base">
            Engineered for absolute frictionlessness and mathematical privacy.
          </p>

          <HowInboundWorks className="mt-12" />
        </div>
      </SiteHero>

      <SiteFooter />
    </div>
  )
}
