// Cleans an HTML email before SafeHtmlEmail shows it. See the notes there for
// what an email may and may not do; this is the first of its two layers.

// Links that may open. javascript:, data: and the rest are not just blocked
// inside the frame: a link opened in a new tab escapes the sandbox, so one of
// those must never be clickable at all.
const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])
const SAFE_IMAGE_PROTOCOLS = new Set(['http:', 'https:', 'data:'])

// Elements that can only run code, fetch something, navigate the frame (a meta
// refresh, a base href) or embed another page.
const REMOVED_ELEMENTS = 'script, noscript, meta, base, link, iframe, frame, frameset, object, embed, applet'

// The pixel a sender embeds to learn the mail was opened: an image nobody is
// meant to see. Real images load (IND-10 asks that tracking pixels do not);
// one that is a couple of pixels wide, or hidden, is dropped before it can be
// fetched.
const PIXEL_MAX = 2

function isTinyLength(value) {
  if (value === null || value === undefined || value === '') return false
  const match = String(value).trim().match(/^(\d+(?:\.\d+)?)(px)?$/i)
  return match ? parseFloat(match[1]) <= PIXEL_MAX : false
}

function isTrackingPixel(img) {
  const style = img.style ?? {}
  return (
    isTinyLength(img.getAttribute('width')) ||
    isTinyLength(img.getAttribute('height')) ||
    isTinyLength(style.width) ||
    isTinyLength(style.height) ||
    /^none$/i.test(style.display ?? '') ||
    /^hidden$/i.test(style.visibility ?? '') ||
    String(style.opacity ?? '').trim() === '0'
  )
}

function protocolOf(url) {
  try {
    // Relative urls resolve against a base that is safe to fail on.
    return new URL(url, 'https://relative.invalid/').protocol
  } catch {
    return ''
  }
}

/**
 * The email's markup, cleaned for showing: the sender's <style> blocks kept
 * (emails lean on them), the body's content, and nothing that runs or escapes.
 *
 * DOMParser builds an inert document - its scripts never run and its images are
 * never fetched - so cleaning it is safe even before anything is removed.
 */
export function prepareEmail(html) {
  if (!html) return ''
  if (typeof DOMParser === 'undefined') return html

  const doc = new DOMParser().parseFromString(html, 'text/html')

  doc.querySelectorAll(REMOVED_ELEMENTS).forEach((el) => el.remove())

  // Tag-splitting tricks like "<scr<script>ipt>" parse into an element named
  // "scr<script". It is inert, but it has no business in the output either.
  // Unwrapped, not removed: it is never closed, so everything after it in the
  // email ends up inside it.
  doc.querySelectorAll('*').forEach((el) => {
    if (!/^[a-z][a-z0-9-]*$/i.test(el.localName)) el.replaceWith(...el.childNodes)
  })

  // Comments carry nothing a reader shows, and Outlook's conditional comments
  // hide markup inside them.
  const comments = doc.createTreeWalker(doc, 0x80 /* NodeFilter.SHOW_COMMENT */)
  const found = []
  while (comments.nextNode()) found.push(comments.currentNode)
  found.forEach((comment) => comment.remove())

  doc.querySelectorAll('*').forEach((el) => {
    for (const { name } of [...el.attributes]) {
      // onclick, onerror, onload, onmouseover...
      if (/^on/i.test(name)) el.removeAttribute(name)
    }
    // A fixed or sticky box could cover the reader's own controls.
    if (/^(fixed|sticky)$/i.test(el.style?.position ?? '')) el.style.position = 'static'
  })

  doc.querySelectorAll('a[href], area[href]').forEach((link) => {
    if (SAFE_LINK_PROTOCOLS.has(protocolOf(link.getAttribute('href')))) {
      // A link must leave the reader, not load the sender's page inside it.
      link.setAttribute('target', '_blank')
      link.setAttribute('rel', 'noopener noreferrer')
    } else {
      link.removeAttribute('href')
    }
  })

  doc.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src')
    if (
      !src ||
      !SAFE_IMAGE_PROTOCOLS.has(protocolOf(src)) ||
      !/^(https?:|data:)/i.test(src.trim()) ||
      isTrackingPixel(img)
    ) {
      img.remove()
    }
  })

  // A form cannot be submitted from the sandbox, but its fields can still
  // collect a password from someone who believes they can.
  doc.querySelectorAll('form').forEach((form) => form.removeAttribute('action'))
  doc.querySelectorAll('input, textarea, select, button').forEach((field) => {
    field.setAttribute('disabled', '')
  })

  const styles = [...doc.querySelectorAll('style')].map((style) => style.outerHTML).join('\n')
  doc.querySelectorAll('style').forEach((style) => style.remove())

  return `${styles}\n${doc.body.innerHTML}`
}

// A background the mail paints on <body> or <html> never shows: the frame keeps
// the reading pane's canvas behind the mail, whatever the sender asks for. One
// painted further in - a white panel, a coloured banner, a background image -
// does show, and SafeHtmlEmail's default text colour is laid over it.
const DECLARES_BACKGROUND =
  /background(?:-color|-image)?\s*:\s*(?!(?:none|transparent|inherit|initial|unset)\b)[^;\s]/i

const PAGE_ONLY = /^(?:html|body|:root)$/i

function styleBlocksPaintSurface(styles) {
  // `selector { declarations }`, innermost first: an @media wrapper never
  // matches, because the selector and the braces either side of it are what
  // this reads and an at-rule has another rule in between.
  for (const [, selector, body] of styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!DECLARES_BACKGROUND.test(body)) continue
    if (selector.split(',').every((part) => PAGE_ONLY.test(part.trim()))) continue
    return true
  }
  return false
}

/**
 * Whether the mail paints a surface of its own for its text to sit on.
 *
 * The frame's canvas is the reading pane's, so the reader lends the mail the
 * theme's text colour. That colour is chosen to be read on the pane: on a panel
 * the mail painted itself - nearly always a light one - the dark theme's
 * near-white all but disappears. This is what tells the two apart.
 */
export function paintsOwnSurface(html) {
  if (!html || typeof DOMParser === 'undefined') return false

  const doc = new DOMParser().parseFromString(html, 'text/html')

  const styled = [...doc.querySelectorAll('style')].some((style) =>
    styleBlocksPaintSurface(style.textContent ?? ''),
  )
  if (styled) return true

  const template = doc.createElement('template')
  template.innerHTML = html

  return [...template.content.querySelectorAll('*')].some(
    (el) =>
      !PAGE_ONLY.test(el.tagName) &&
      (el.hasAttribute('bgcolor') ||
        el.hasAttribute('background') ||
        DECLARES_BACKGROUND.test(el.getAttribute('style') ?? '')),
  )
}
