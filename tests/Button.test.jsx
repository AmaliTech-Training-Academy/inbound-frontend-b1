import {describe,it,expect,vi} from 'vitest'
import {render,screen,fireEvent} from '@testing-library/react'
import Button from '../src/components/Button'


describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Save changes</Button>)

    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save changes</Button>)

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick while disabled', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick} disabled>Save changes</Button>)

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(onClick).not.toHaveBeenCalled()
  })

  it('defaults to a button type so it cannot submit a form', () => {
    render(<Button>Save changes</Button>)

    expect(screen.getByRole('button', { name: 'Save changes' })).toHaveAttribute('type', 'button')
  })

  it('forwards extra attributes to the underlying button', () => {
    render(
      <Button aria-label="Toggle theme" title="Toggle theme (visual representation)">
        Save changes
      </Button>
    )

    expect(screen.getByLabelText('Toggle theme')).toHaveAttribute(
      'title',
      'Toggle theme (visual representation)'
    )
  })
})
