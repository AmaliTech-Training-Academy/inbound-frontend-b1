import {describe,it,expect} from 'vitest'
import {render,screen} from '@testing-library/react'
import Badge from '../src/components/Badge'


describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>3 files</Badge>)

    expect(screen.getByText('3 files')).toBeInTheDocument()
  })

  it('merges the provided className with its own styles', () => {
    render(<Badge className="text-text-secondary">3 files</Badge>)

    const badge = screen.getByText('3 files')
    expect(badge).toHaveClass('bg-chip')
    expect(badge).toHaveClass('text-text-secondary')
  })

  it('forwards extra attributes to the badge element', () => {
    render(<Badge title="Attachment count">3 files</Badge>)

    expect(screen.getByTitle('Attachment count')).toHaveTextContent('3 files')
  })
})
