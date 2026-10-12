import { useRef } from 'react'
import { Loader2, Mail, Pencil } from 'lucide-react'
import BrandMark from './BrandMark.jsx'
import CopyButton from './CopyButton.jsx'
import SiteNav from './SiteNav.jsx'

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

// Text only, with no decorative icon beside the label. The spinner appears
// only while the inbox is being made.
export function GenerateButton({ onClick, creating, label = null }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={creating}
      aria-busy={creating || undefined}
      className="flex min-h-13.5 items-center gap-2.5 rounded-full bg-brand px-8 text-base font-medium text-white transition-colors hover:bg-brand/90 disabled:hover:bg-brand"
    >
      {creating && <Loader2 size={18} strokeWidth={2.25} className="animate-spin" aria-hidden="true" />}
      <span>{creating ? 'Generating' : label || 'Generate Inbox'}</span>
    </button>
  )
}

export function ActiveAddress({ inbox, others = 0, onCustomize }) {
  const addressRef = useRef(null)

  return (
    <div key="result" className="animate-fade-up">
      <div className="relative">
        {onCustomize && (
          // A nudge pointing at Customize; non-interactive, so it never steals the tap.
          <div className="pointer-events-none absolute -top-9 right-14 z-10 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-black">
            Want a different name? Customize it
            <span aria-hidden="true" className="absolute -bottom-1 right-6 size-2 rotate-45 bg-slate-900 dark:bg-black" />
          </div>
        )}
        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 p-2 pl-3 dark:border-line-dark dark:bg-surface-dark/90">
          <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Mail size={18} strokeWidth={2.25} />
          </span>
          <span ref={addressRef} className="min-w-0 flex-1 truncate px-1 text-base text-ink dark:text-ink-dark">
            {inbox.address}
          </span>
          {onCustomize && (
            <button
              type="button"
              onClick={onCustomize}
              className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-slate-50 dark:border-line-dark dark:text-ink-dark dark:hover:bg-surface-dark"
            >
              <Pencil size={15} strokeWidth={2.25} aria-hidden="true" />
              <span>Customize</span>
            </button>
          )}
          <CopyButton text={inbox.address} fallbackRef={addressRef} size={16} className="p-2" />
        </div>
      </div>
      {others > 0 && (
        <p className="mt-3 text-center text-xs text-slate-500 dark:text-muted-dark">
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
    <footer className="px-6 py-6 text-center text-xs text-slate-500 dark:text-muted-dark">
      <span className="inline-flex items-center gap-1.5 align-middle font-semibold text-ink dark:text-ink-dark">
        <BrandMark size={14} />
        Inbound
      </span>
      <span aria-hidden="true" className="mx-2 text-slate-300 dark:text-slate-600">
        •
      </span>
      © 2026 Inbound. No logs, no tracking. Gone when you close the tab.
    </footer>
  )
}
