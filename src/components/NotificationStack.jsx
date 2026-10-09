import { BellRing, Mail, Plus, TimerOff, TimerReset, X } from 'lucide-react'

// Same place the expiry notice has always used: top right, under the header
// and clear of the inbox rail, full width at the top on a phone. In the
// reader's full-screen view the Exit control sits at top-4 right-4, so the
// stack starts below it rather than over it.
const ICONS = {
  message: Mail,
  'running-out': TimerOff,
  extended: TimerReset,
  added: Plus,
  expired: TimerOff,
}

const TONES = {
  message: 'border-slate-200 bg-white text-slate-700 dark:border-line-dark dark:bg-surface-dark dark:text-body-dark',
  'running-out':
    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
  extended:
    'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  added: 'border-slate-200 bg-white text-slate-700 dark:border-line-dark dark:bg-surface-dark dark:text-body-dark',
  expired:
    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
}

/**
 * The session's notifications, newest last.
 *
 * One live region around the whole stack rather than one per notice, and
 * polite rather than assertive: mail arriving should wait for a reader to
 * finish its sentence, not cut in. The region is always in the tree, empty or
 * not - one added later is not reliably announced by every screen reader.
 */
export default function NotificationStack({ notifications, onDismiss }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-4 top-16 z-40 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-80 lg:right-20"
    >
      {notifications.map(({ key, kind, text, inboxAddress }) => {
        const Icon = ICONS[kind] ?? BellRing
        return (
          <div
            key={key}
            // motion-reduce drops the slide; the notice still appears, it just
            // does not travel to get there.
            className={`pointer-events-auto flex animate-fade-up items-start gap-2.5 rounded-2xl border px-4 py-3 text-xs shadow-sm motion-reduce:animate-none ${TONES[kind] ?? TONES.message}`}
          >
            <Icon size={16} aria-hidden="true" className="mt-px shrink-0" />
            <span className="min-w-0 flex-1">
              {text}
              {inboxAddress && (
                <span className="mt-0.5 block truncate font-mono text-[11px] opacity-70">{inboxAddress}</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => onDismiss(key)}
              aria-label={`Dismiss: ${text}`}
              className="shrink-0 rounded opacity-60 transition-opacity hover:opacity-100"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
