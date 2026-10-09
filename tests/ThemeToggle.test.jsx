import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ThemeToggle from '../src/components/ThemeToggle.jsx'

// The hook keeps the class on <html> and the stored choice, so both are put
// back between tests: the class outlives cleanup(), and storage outlives the
// render that wrote it.
beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

afterEach(() => {
  document.documentElement.classList.remove('dark')
})

describe('ThemeToggle', () => {
  it('starts light and offers the dark theme', () => {
    render(<ThemeToggle />)

    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument()
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('switches to dark, stores the choice and offers the light theme', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))

    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('inbound-theme')).toBe('dark')
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument()
  })

  it('switches back, storing light and dropping the class', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    const button = screen.getByRole('button')
    await user.click(button)
    await user.click(button)

    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem('inbound-theme')).toBe('light')
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument()
  })

  it('opens dark when that is the stored choice', () => {
    localStorage.setItem('inbound-theme', 'dark')
    render(<ThemeToggle />)

    expect(document.documentElement).toHaveClass('dark')
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument()
  })

  it('keeps a second toggle on screen in step with the first', async () => {
    const user = userEvent.setup()
    render(
      <>
        <ThemeToggle />
        <ThemeToggle />
      </>,
    )

    const [first, second] = screen.getAllByRole('button')
    await user.click(first)

    expect(second).toHaveAccessibleName('Switch to light theme')
    expect(document.documentElement).toHaveClass('dark')
  })

  it('ignores a stored value that is not a theme', () => {
    localStorage.setItem('inbound-theme', 'sepia')
    render(<ThemeToggle />)

    expect(document.documentElement).not.toHaveClass('dark')
  })
})
