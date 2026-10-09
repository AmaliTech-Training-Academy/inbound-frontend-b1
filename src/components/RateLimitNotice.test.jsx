import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RateLimitNotice from './RateLimitNotice.jsx'

const NOW = Date.parse('2026-10-07T12:00:00.000Z')

describe('RateLimitNotice', () => {
  it('says new mail may be delayed and counts down to the next check', () => {
    render(<RateLimitNotice until={NOW + 27_400} now={NOW} />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Too many requests from your network, so new mail may be delayed.',
    )
    expect(screen.getByText('Checking again in 28s.')).toBeInTheDocument()
  })

  it('keeps the countdown out of what a screen reader announces', () => {
    render(<RateLimitNotice until={NOW + 10_000} now={NOW} />)

    expect(screen.getByRole('status')).not.toHaveTextContent('Checking again')
  })

  it('shows nothing once the wait is over', () => {
    const { container } = render(<RateLimitNotice until={NOW - 1} now={NOW} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('shows nothing when the server never refused', () => {
    const { container } = render(<RateLimitNotice until={0} now={NOW} />)

    expect(container).toBeEmptyDOMElement()
  })
})
