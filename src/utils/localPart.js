// Validates the local part a user may type for a custom inbox address (the bit
// before the @). A fast client-side gate for the "New inbox" dialog and landing
// page - the server is authoritative and its refusal is surfaced either way.
//
// Matches the backend's rule (verified against /inbox/custom on 2026-10-11):
// a non-empty alphanumeric string, at most 64 characters. Callers lowercase the
// input first, so the address is case-insensitive in practice.
const MAX_LOCAL_PART = 64

export function isValidLocalPart(value) {
  if (typeof value !== 'string') return false
  if (value.length < 1 || value.length > MAX_LOCAL_PART) return false
  return /^[a-z0-9]+$/.test(value)
}
