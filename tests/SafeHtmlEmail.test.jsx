import {describe,it,expect} from 'vitest'
import {render,screen,fireEvent} from '@testing-library/react'
import SafeHtmlEmail from '../src/components/SafeHtmlEmail'


describe('SafeHtmlEmail', () => {
  it('renders the email body inside an iframe', () => {
    render(<SafeHtmlEmail htmlContent="<p>Hello from a rich email</p>" />)

    expect(screen.getByTitle('Sandboxed Email Content').tagName).toBe('IFRAME')
  })

  it('embeds the provided html content in the sandboxed document', () => {
    render(<SafeHtmlEmail htmlContent="<p>Hello from a rich email</p>" />)

    const frame = screen.getByTitle('Sandboxed Email Content')
    expect(frame.getAttribute('srcdoc')).toContain('<p>Hello from a rich email</p>')
  })

  it('lets images load but blocks scripts and every other remote asset', () => {
    render(<SafeHtmlEmail htmlContent="<p>Hello</p>" />)

    const doc = screen.getByTitle('Sandboxed Email Content').getAttribute('srcdoc')
    expect(doc).toContain('img-src https: http: data:')
    expect(doc).toContain("default-src 'none'")
    expect(doc).toContain("script-src 'none'")
    expect(doc).toContain("frame-src 'none'")
    expect(doc).toContain("connect-src 'none'")
    expect(doc).toContain("object-src 'none'")
    expect(doc).toContain("form-action 'none'")
  })

  it("leaves the sender's layout alone: no forced table borders, no hidden images", () => {
    render(<SafeHtmlEmail htmlContent="<p>Hello</p>" />)

    const doc = screen.getByTitle('Sandboxed Email Content').getAttribute('srcdoc')
    expect(doc).not.toContain('display: none')
    expect(doc).not.toMatch(/\btd\b[^{]*\{/)
    expect(doc).toContain('max-width: 100%')
  })

  // The frame does not inherit the page's CSS, so this one declaration is the
  // whole of the theme reaching the email.
  it('gives the email a dark default text colour when the page is dark', () => {
    document.documentElement.classList.add('dark')
    localStorage.setItem('inbound-theme', 'dark')

    try {
      render(<SafeHtmlEmail htmlContent="<p>Hello</p>" />)

      expect(screen.getByTitle('Sandboxed Email Content').getAttribute('srcdoc')).toContain(
        'color: #d3dae6',
      )
    } finally {
      document.documentElement.classList.remove('dark')
      localStorage.clear()
    }
  })

  // The dark default is chosen to be read on the reading pane. A mail that
  // paints its own panel would take that near-white onto its own light surface,
  // where it all but disappears, so it keeps the light default instead.
  it('keeps the light default on a mail that paints its own panel', () => {
    document.documentElement.classList.add('dark')
    localStorage.setItem('inbound-theme', 'dark')

    try {
      render(<SafeHtmlEmail htmlContent='<div style="background: #ffffff">Hello</div>' />)

      const doc = screen.getByTitle('Sandboxed Email Content').getAttribute('srcdoc')
      expect(doc).toContain('color: #111213')
      expect(doc).not.toContain('color: #d3dae6')
    } finally {
      document.documentElement.classList.remove('dark')
      localStorage.clear()
    }
  })

  it('sandboxes the frame without allowing scripts to run', () => {
    render(<SafeHtmlEmail htmlContent="<p>Hello</p>" />)

    const sandbox = screen.getByTitle('Sandboxed Email Content').getAttribute('sandbox')
    expect(sandbox).not.toContain('allow-scripts')
    expect(sandbox).not.toContain('allow-forms')
    expect(sandbox).not.toContain('allow-top-navigation')
  })

  it('cleans the email before it is shown: web links open in a new tab, scripts are gone', () => {
    render(
      <SafeHtmlEmail htmlContent='<a href="https://example.com/verify">Verify</a><script>alert(1)</script><a href="javascript:alert(2)">Bad</a>' />
    )

    const frame = screen.getByTitle('Sandboxed Email Content')
    const doc = frame.getAttribute('srcdoc')
    expect(doc).toContain('<a href="https://example.com/verify" target="_blank" rel="noopener noreferrer">Verify</a>')
    expect(doc).not.toContain('alert(1)')
    expect(doc).not.toContain('javascript:')
    expect(frame.getAttribute('sandbox')).toContain('allow-popups')
  })

  it("keeps the frame's own background, whatever the email's body asks for", () => {
    render(<SafeHtmlEmail htmlContent="<style>body { background: #ff0000 !important; }</style><p>Hi</p>" />)

    const doc = screen.getByTitle('Sandboxed Email Content').getAttribute('srcdoc')
    // The reader's rule comes after the sender's, so it wins the tie.
    expect(doc.lastIndexOf('background: transparent !important')).toBeGreaterThan(doc.indexOf('#ff0000'))
  })

  it('starts at a fixed height and resizes once the email content has loaded', () => {
    render(<SafeHtmlEmail htmlContent="<p>Hello</p>" />)

    const frame = screen.getByTitle('Sandboxed Email Content')
    expect(frame).toHaveStyle({ height: '220px' })

    fireEvent.load(frame)

    expect(frame.style.height).toBe('196px')
  })
})
