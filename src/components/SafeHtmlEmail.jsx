import { useMemo, useState } from 'react'
import { paintsOwnSurface, prepareEmail, setsDarkText } from '../utils/emailHtml.js'
import { useTheme } from '../state/useTheme.js'

// An HTML email, shown as its sender laid it out, inside a sandbox it cannot
// reach out of.
//
// What it may do: show its images (remote, or inlined as data: urls) and its
// own styles, and open web and mail links in a new tab. What it may not: run a
// script, submit a form, embed a frame, navigate the reader, or fetch anything
// that is not an image.
//
// Two layers do that. The email is cleaned before it is shown (prepareEmail),
// so nothing depends on winning a race with the page loading; and the frame it
// lands in is sandboxed without allow-scripts and under a strict CSP, so
// anything the cleaning missed still cannot run.
//
// Images are on by default, as in the backend's own preview and in Gmail. A
// remote image can be a tracking pixel, but on a throwaway address all it can
// tell the sender is that the mail was opened.
const CSP = [
  "default-src 'none'",
  'img-src https: http: data:',
  "style-src 'unsafe-inline'",
  "script-src 'none'",
  "frame-src 'none'",
  "connect-src 'none'",
  "media-src 'none'",
  "object-src 'none'",
  "font-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

function SafeHtmlEmail({ htmlContent }) {
  const [iframeHeight, setIframeHeight] = useState('220px')
  const { isDark } = useTheme()
  const content = useMemo(() => prepareEmail(htmlContent), [htmlContent])
  const ownSurface = useMemo(() => paintsOwnSurface(htmlContent), [htmlContent])
  const ownDarkText = useMemo(() => setsDarkText(htmlContent), [htmlContent])

  // A frame does not inherit the page's CSS, so the theme reaches the email
  // through this one declaration. The frame's canvas is the reading pane's, so
  // a mail with no surface of its own is read light-on-dark; one that painted
  // its own panel needs the light default, or the near-white would vanish on
  // it. A colour the sender set themselves wins over either.
  // Light-on-dark only when the mail brought neither a surface nor a dark
  // text colour of its own.
  const darkFrame = isDark && !ownSurface && !ownDarkText
  const defaultTextColor = darkFrame ? '#d3dae6' : '#111213'

  // The reader's own base styles come after the sender's, so the frame's
  // background stays the reader's: an email's `body { background }` paints its
  // own canvas, not ours. Everything else is the sender's to style; rules here
  // for tables, cells or headings would fight their layout.
  const secureSrcDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${CSP};">
</head>
<body>
${content}
<style>
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    /* A transparent background is not enough on its own: a frame's canvas is
       the browser's own, and under a light color-scheme that canvas is white,
       so the mail sat in a white panel with near-white text on it. This is
       what decides the canvas, and it follows the same condition as the text
       colour so the two can never disagree. */
    color-scheme: ${darkFrame ? 'dark' : 'light'};
  }
  body {
    /* Contains the children's margins. Without it the last element's bottom
       margin collapses out through the body and is missing from the height
       measured below, so the frame ends up a margin short of its content. */
    display: flow-root;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: ${defaultTextColor};
    overflow-wrap: break-word;
  }
  img {
    max-width: 100%;
    height: auto;
  }
  pre {
    white-space: pre-wrap;
  }
</style>
</body>
</html>`

  const handleLoad = (e) => {
    try {
      const iframe = e.target
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (doc) {
        // Measured on load, which waits for the images, so their height counts.
        //
        // Measured on the body, not on documentElement: a frame's root element
        // fills its viewport, so documentElement.scrollHeight can never report
        // less than the height the frame already has. Measuring it pinned the
        // frame at whatever it started as, and a short email kept a frame's
        // worth of blank space under it before the attachments. The body is
        // sized by its content - its margin is forced to 0 above - so it is the
        // honest measure, and it lets the frame shrink as well as grow.
        const measuredHeight = Math.max(
          doc.body?.scrollHeight || 0,
          Math.ceil(doc.body?.getBoundingClientRect().height || 0)
        )
        if (measuredHeight > 0) setIframeHeight(`${measuredHeight + 16}px`)
      }
    } catch (error) {
      // Sandboxed origin may restrict direct DOM inspection in some engines; fallback to minimum height
      console.error('Unable to measure sandboxed email height', error)
    }
  }

  return (
    <iframe
      title="Sandboxed Email Content"
      srcDoc={secureSrcDoc}
      // allow-same-origin lets the reader measure the email; without
      // allow-scripts that grants the email itself nothing. The popup flags
      // are what let a web link open in a new tab at all.
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      onLoad={handleLoad}
      className="w-full border-0 block"
      // No minimum: the measured height is the content's, and a floor would
      // put the blank space back under a short email.
      style={{ height: iframeHeight }}
    />
  )
}

export default SafeHtmlEmail
