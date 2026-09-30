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

  it('blocks scripts, images and remote assets with a strict content security policy', () => {
    render(<SafeHtmlEmail htmlContent="<p>Hello</p>" />)

    const doc = screen.getByTitle('Sandboxed Email Content').getAttribute('srcdoc')
    expect(doc).toContain("script-src 'none'")
    expect(doc).toContain("img-src 'none'")
    expect(doc).toContain("frame-src 'none'")
    expect(doc).toContain("connect-src 'none'")
    expect(doc).toContain("object-src 'none'")
  })

  it('keeps images hidden as a second line of defense', () => {
    render(<SafeHtmlEmail htmlContent="<p>Hello</p>" />)

    const doc = screen.getByTitle('Sandboxed Email Content').getAttribute('srcdoc')
    expect(doc).toContain('display: none !important')
  })

  it('sandboxes the frame without allowing scripts to run', () => {
    render(<SafeHtmlEmail htmlContent="<p>Hello</p>" />)

    expect(screen.getByTitle('Sandboxed Email Content')).toHaveAttribute('sandbox', 'allow-same-origin')
  })

  it('starts at a fixed height and resizes once the email content has loaded', () => {
    render(<SafeHtmlEmail htmlContent="<p>Hello</p>" />)

    const frame = screen.getByTitle('Sandboxed Email Content')
    expect(frame).toHaveStyle({ height: '220px' })

    fireEvent.load(frame)

    expect(frame.style.height).toBe('196px')
  })
})
