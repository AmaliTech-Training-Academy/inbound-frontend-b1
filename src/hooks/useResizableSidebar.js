import { useEffect, useRef, useState } from 'react'

const MIN_SIDEBAR_WIDTH = 240
const MAX_SIDEBAR_WIDTH = 480
const DEFAULT_SIDEBAR_WIDTH = 300

// The drag handle between the message list and the reader, on wide screens.
// Listeners go on the window rather than the handle, so the pointer can leave
// the few pixels of the handle mid-drag without the drag stopping.
export function useResizableSidebar() {
const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH)
const [isResizing, setIsResizing] = useState(false)
const sidebarRef = useRef(null)

const clampWidth = (width) => Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width))

useEffect(() => {
  if (!isResizing) return undefined
  const onMove = (e) => {
    const rect = sidebarRef.current?.getBoundingClientRect()
    if (rect) setSidebarWidth(clampWidth(e.clientX - rect.left))
  }
  const onUp = () => setIsResizing(false)
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
  return () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
}, [isResizing])

    return {
        sidebarWidth,
        isResizing,
        sidebarRef,
        startResizing: () => setIsResizing(true),
        // The handle is a slider, so the keyboard has to move it too.
        nudgeWidth: (by) => setSidebarWidth((w) => clampWidth(w + by)),
        minWidth: MIN_SIDEBAR_WIDTH,
        maxWidth: MAX_SIDEBAR_WIDTH,
    }
}
