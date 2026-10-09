import { Hourglass } from 'lucide-react'

// Shown while the server is refusing this network's requests and background
// checks are holding off. The countdown is left out of the live region, so a
// screen reader hears the notice once rather than every second.
export default function RateLimitNotice({ until, now }) {
  const seconds = Math.ceil((until - now) / 1000)
  if (!(seconds > 0)) return null

  return (
    <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 sm:px-6">
      <Hourglass size={14} aria-hidden="true" className="mt-px shrink-0 text-amber-600" />
      <p>
        <span role="status">Too many requests from your network, so new mail may be delayed.</span>{' '}
        <span aria-hidden="true">Checking again in {seconds}s.</span>
      </p>
    </div>
  )
}
