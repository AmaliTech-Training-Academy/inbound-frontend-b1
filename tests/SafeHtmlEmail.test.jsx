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

  it('grows to the height of the email body once it has loaded', () => {
    render(<SafeHtmlEmail htmlContent="<p>Hello</p>" />)

    const frame = screen.getByTitle('Sandboxed Email Content')
    expect(frame).toHaveStyle({ height: '220px' })

    // jsdom does not lay the frame out, so the measurement is supplied here.
    // The body is what is measured, not documentElement: a frame's root fills
    // its viewport, so documentElement can never report less than the height
    // the frame already has and the frame could never shrink.
    const body = frame.contentDocument.body
    Object.defineProperty(body, 'scrollHeight', { value: 300, configurable: true })

    fireEvent.load(frame)

    expect(frame.style.height).toBe('316px')
  })

  it('keeps its starting height when the body cannot be measured', () => {
    // An engine that refuses to let the frame be inspected, or one that has
    // not laid it out yet, measures zero. Collapsing the frame to nothing is
    // worse than leaving it at the height it opened with.
    render(<SafeHtmlEmail htmlContent="<p>Hello</p>" />)

    const frame = screen.getByTitle('Sandboxed Email Content')
    fireEvent.load(frame)

    expect(frame.style.height).toBe('220px')
  })
})
