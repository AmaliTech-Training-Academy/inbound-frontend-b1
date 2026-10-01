import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Mail, Sparkles } from 'lucide-react'
import CopyButton from './CopyButton.jsx'
import SiteNav from './SiteNav.jsx'
import { INBOX_PATH } from '../router'

// What the landing page and How it works share, so the two read as one site:
// the warm backdrop and the nav over it, the Generate button, the pill a new
// address arrives in, and the footer.
//
// Nothing here animates on a loop. The design's drifting, heavily blurred glow
// and the shine across the Generate button repainted large areas every frame
// and made the page lag on ordinary laptops; the static glow in
// .landing-backdrop gives the same warmth for one paint.

export function SiteHero({ session, unread = 0, className = '', children }) {
  return (
    <section className={`landing-backdrop relative isolate flex w-full flex-col overflow-hidden text-sm ${className}`}>
      <SiteNav session={session} unread={unread} />
      {children}
    </section>
  )
}

export function GenerateButton({ onClick, creating, label = null }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={creating}
      aria-busy={creating || undefined}
      className="group flex items-center gap-3 rounded-full bg-brand py-2 pl-8 pr-2 text-base font-medium text-white transition-colors hover:bg-brand/90 disabled:hover:bg-brand"
    >
      <span>
        {creating ? 'Generating' : label || 'Generate Inbox'}
      </span>
      <span className="flex items-center justify-center rounded-full bg-white/20 p-3">
        {creating ? (
          <Loader2 size={20} strokeWidth={2.25} className="animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles
            size={20}
            strokeWidth={2.25}
            aria-hidden="true"
            className="transition-transform duration-300 ease-out group-hover:rotate-12"
          />
        )}
      </span>
    </button>
  )
}

export function ActiveAddress({ inbox, others = 0 }) {
  const addressRef = useRef(null)

  return (
    <div key="result" className="animate-fade-up">
      <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 p-2 pl-6 sm:pl-8">
        <span ref={addressRef} className="min-w-0 flex-1 truncate text-base text-ink">
          {inbox.address}
        </span>
        <CopyButton text={inbox.address} fallbackRef={addressRef} size={16} className="p-2" />
        <Link
          to={INBOX_PATH}
          className="group flex shrink-0 items-center gap-2 rounded-full bg-brand py-3 pl-5 pr-3 text-sm font-medium text-white transition-colors hover:bg-brand/90"
        >
          <span>Go to inbox</span>
          <Mail
            size={16}
            strokeWidth={2.25}
            aria-hidden="true"
            className="transition-transform duration-300 ease-out group-hover:-translate-y-0.5"
          />
        </Link>
      </div>
      {others > 0 && (
        <p className="mt-3 text-center text-xs text-slate-500">
          and {others} more {others === 1 ? 'inbox' : 'inboxes'} in this session
        </p>
      )}
    </div>
  )
}

export function ArrowIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 19 19" fill="none" aria-hidden="true">
      <path
        d="M3.959 9.5h11.083m0 0L9.501 3.958M15.042 9.5l-5.541 5.54"
        stroke="#ff5722"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SiteFooter() {
  return (
    <footer className="px-6 py-6 text-center text-xs text-slate-500">
      <span className="font-semibold text-ink">Inbound</span>
      <span aria-hidden="true" className="mx-2 text-slate-300">
        •
      </span>
      © 2026 Inbound. Zero logs, zero tracking. Ephemeral by architecture.
    </footer>
  )
}
