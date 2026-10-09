import { Loader2, TimerOff } from 'lucide-react'
import { SiteFooter, SiteHero } from './SiteChrome.jsx'
import { EXTEND_MINUTES } from '../config.js'

// The whole page once there is no inbox left to show - either this one ran
// out, or the server stopped recognising the session. Not a placeholder in a
// pane: the workspace is gone by this point.

function Purged({ session, onGenerate, onLeave, creating, ended }) {
  return (
    // One screen tall: the hero takes what the footer leaves, so the footer
    // shows without scrolling on a laptop, and the page still scrolls when
    // its content needs more room.
    <div className="flex min-h-dvh flex-col text-ink dark:text-ink-dark">
      <SiteHero session={session} className="flex-1">
        <div className="flex flex-1 items-center justify-center px-4 pb-24">
          <div
            role="status"
            className="flex w-full max-w-md animate-fade-up flex-col items-center rounded-3xl border border-slate-200 bg-white/90 px-8 py-10 text-center dark:border-line-dark dark:bg-surface-dark"
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
              <TimerOff size={26} strokeWidth={2} aria-hidden="true" />
            </span>
            <h1 className="mt-6 text-2xl font-bold">
              {ended ? 'This session has ended' : 'This inbox has expired'}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-body-dark">
              {ended
                ? 'The server no longer recognises this session, so its inboxes can’t be opened any more.'
                : 'Its address no longer receives mail, and its messages and attachments have been permanently deleted.'}
            </p>

            <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={onGenerate}
                disabled={creating}
                aria-busy={creating || undefined}
                className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand px-6 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:hover:bg-brand"
              >
                {creating && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                {creating ? 'Generating' : 'Generate a new address'}
              </button>
              <button
                type="button"
                onClick={onLeave}
                className="flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-medium transition-colors hover:border-slate-300 dark:border-line-dark dark:bg-surface-dark dark:text-ink-dark dark:hover:border-slate-500"
              >
                Back to home
              </button>
            </div>

            {!ended && (
              <p className="mt-8 text-xs text-slate-400 dark:text-muted-dark">
                Need more time next time? Use +{EXTEND_MINUTES}m in the inbox before it runs out.
              </p>
            )}
          </div>
        </div>
      </SiteHero>
      <SiteFooter />
    </div>
  )
}

export default Purged
