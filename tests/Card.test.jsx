import {describe,it,expect} from 'vitest'
import {render,screen} from '@testing-library/react'
import Card from '../src/components/Card'


describe('Card', () => {
  it('renders its children', () => {
    render(<Card>Message body</Card>)

    expect(screen.getByText('Message body')).toBeInTheDocument()
  })

  it('merges the provided className with its own styles', () => {
    render(<Card className="p-6">Message body</Card>)

    const card = screen.getByText('Message body')
    expect(card).toHaveClass('bg-surface')
    expect(card).toHaveClass('p-6')
  })

  it('forwards extra attributes to the container element', () => {
    render(
      <Card role="region" aria-label="Message details">
        Message body
      </Card>
    )

    expect(screen.getByRole('region', { name: 'Message details' })).toHaveTextContent('Message body')
  })
})
