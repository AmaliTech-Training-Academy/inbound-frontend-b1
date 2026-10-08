import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../state/useTheme.js'

// The light/dark switch. The icon is the theme it would take you to: the moon
// sits in light mode, the sun in dark.
export default function ThemeToggle({ className = '' }) {
  const { isDark, toggle } = useTheme()
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-ink dark:border-line-dark dark:bg-surface-dark dark:text-body-dark dark:hover:text-ink-dark ${className}`}
    >
      {isDark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
    </button>
  )
}
