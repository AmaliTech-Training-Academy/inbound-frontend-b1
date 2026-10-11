import { describe, it, expect } from 'vitest'
import { isValidLocalPart } from './localPart.js'

describe('isValidLocalPart', () => {
  it('accepts non-empty lowercase alphanumeric names', () => {
    for (const ok of ['a', 'alice', 'alice123', 'inbox2026', '000']) {
      expect(isValidLocalPart(ok)).toBe(true)
    }
  })

  it('rejects empty, spaces and separators the backend refuses', () => {
    // The server is alphanumeric-only: dots, dashes and underscores 400.
    for (const bad of ['', ' ', 'a b', 'alice.smith', 'a-b', 'a_b', 'a@b', 'a+b']) {
      expect(isValidLocalPart(bad)).toBe(false)
    }
  })

  it('rejects uppercase and non-ascii (callers lowercase ascii first)', () => {
    for (const bad of ['Alice', 'héllo']) {
      expect(isValidLocalPart(bad)).toBe(false)
    }
  })

  it('rejects anything longer than 64 characters', () => {
    expect(isValidLocalPart('a'.repeat(64))).toBe(true)
    expect(isValidLocalPart('a'.repeat(65))).toBe(false)
  })

  it('rejects non-strings', () => {
    for (const bad of [null, undefined, 5, {}]) {
      expect(isValidLocalPart(bad)).toBe(false)
    }
  })
})
