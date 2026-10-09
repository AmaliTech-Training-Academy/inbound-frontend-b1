import { describe,it, expect } from 'vitest'
import { formatFileSize,formatReceivedAt,formatRelativeTime,formatTotalAttachmentSize } from '../src/utils/helpers'

describe('helpers', () => {
  describe('formatReceivedAt', () => {
    it ('returns unknown for falsy values', () => {
      const timestamp = ''
      const check = formatReceivedAt(timestamp)
      expect(check).toBe('Unknown time')
    })

    it ('returns the timestamp for an invalid timestamp',() => {
      const timestamp = 'adiza'
      const check = formatReceivedAt(timestamp)
      expect(check).toBe('adiza')
    })

    it ('returns the valid timestamp correctly',() => {
      const timestamp = '2026-09-17T09:49:10.566Z'
      const check = formatReceivedAt(timestamp)
      // ICU 72+ separates the day period with U+202F; NFKC folds it back to a plain space
      expect(check.normalize('NFKC')).toBe('Sep 17, 2026, 9:49 AM')
    })
  })

  describe('formatRelativeTime', () => {
    it('returns empty string for falsy values', () => {
      const receivedAt = ''
      const check = formatRelativeTime(receivedAt)
      expect(check).toBe('')
    })

    it('returns an empty string for invalid value',() => {
      const receivedAt = 'date'
      const check = formatRelativeTime(receivedAt)
      expect(check).toBe('')
    })

    it('returns just now for future time',() => {
      const receivedAt = new Date(Date.now() + 60000).toISOString()
      const check = formatRelativeTime(receivedAt)
      expect(check).toBe('just now')
    })

    it('returns just now for time less than a minute ago', () => {
      const receivedAt = new Date(Date.now() - 30000).toISOString()
      const check = formatRelativeTime(receivedAt)
      expect(check).toBe('just now')
    })

    it('returns minutes ago for time greater than a minute but less than an hour', () => {
      const receivedAt = new Date(Date.now() - 120000).toISOString()
      const check =formatRelativeTime(receivedAt)
      expect(check).toBe('2m ago')
    })

    it('returns hours ago for time greater than an hour but less than a day', () => {
      const receivedAt = new Date(Date.now() -7200000).toISOString()
      const check = formatRelativeTime(receivedAt)
      expect(check).toBe('2h ago')
    })

    it('returns days ago for time greater than a day ago but less than a month', () => {
      const receivedAt = new Date(Date.now() - 172800000).toISOString()
      const check = formatRelativeTime(receivedAt)
      expect(check).toBe('2d ago')
    })

    it('returns months ago for time greater than a month ago but less than a year',() => {
      const receivedAt = new Date(Date.now() - 5184000000).toISOString()
      const check = formatRelativeTime(receivedAt)
      expect(check).toBe('2mo ago')
    })

    it('returns a years ago for a time greater than a year', () => {
      const receivedAt = new Date(Date.now() - 63208000000).toISOString()
      const check = formatRelativeTime(receivedAt)
      expect(check).toBe('2y ago')
    })
  })

  describe('formatTotalAttachmentSize', () => {
    it('returns an empty string for falsy attachments ',() =>{
      const attachments = ''
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('')
    })

    it('returns an empty string for empty attachments', () =>{
      const attachments = []
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('')
    })

    it('returns an empty string when an attachment has no size', () =>{
      const attachments = [{name: 'photo.png'}]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('')
    })

    it('returns the size of an attachment when the size is valid', () =>{
      const attachments = [{name: 'photo.png',size:'5KB'}]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('5 KB')
    })

    it('returns bytes when size is less than 1 KB', () =>{
      const attachments = [{name: 'photo.png',size:'500B'}]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('500 B')
    })

    it('returns KB when size is greater than 1KB but less than 1MB', () =>{
      const attachments = [{name: 'photo.png',size:'2048B'}]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('2 KB')
    })

    it('returns MB when size is greater than 1MB but less than 1GB', () =>{
      const attachments = [{name: 'photo.png',size:'2097152B'}]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('2.0 MB')
    })

    it('returns GB when size is greater than 1GB but less than 1TB', () =>{
      const attachments = [{name: 'photo.png',size:'2147483648'}]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('2.0 GB')
    })

    it('returns total size of two attachments ', () =>{
      const attachments = [{name: 'photo.png',size:'2KB'}, { name: 'document.pdf', size: '3KB' }]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('5 KB')
    })

    it('returns total size of two attachments with different units ', () =>{
      const attachments = [{name: 'photo.png',size:'512KB'}, { name: 'document.pdf', size: '3MB' }]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('3.5 MB')
    })

    it('returns empty string for invalid format ', () =>{
      const attachments = [{name: 'photo.png',size:'five KB'}]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('')
    })

    it('returns empty string for zero size ', () =>{
      const attachments = [{name: 'photo.png',size:'0 KB'}]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('')
    })

    it('returns empty string for  two attachments with one invalid format ', () =>{
      const attachments = [{name: 'photo.png',size:'512KB'}, { name: 'document.pdf', size: 'three MB' }]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('512 KB')
    })

    it('returns an empty string when called with no argument at all', () =>{
      const check = formatTotalAttachmentSize()
      expect(check).toBe('')
    })

    it('returns an empty string for null attachments', () =>{
      const check = formatTotalAttachmentSize(null)
      expect(check).toBe('')
    })

    it('returns an empty string for a negative size', () =>{
      const attachments = [{name: 'photo.png',size:'-5KB'}]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('')
    })

    it('reads the bare byte count the API sends, not only a display string', () =>{
      const attachments = [{name: 'photo.png',size: 2048}]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('2 KB')
    })

    it('skips an attachment with no size and totals the rest', () =>{
      const attachments = [{name: 'photo.png',size:'1KB'}, { name: 'document.pdf' }]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('1 KB')
    })

    it('rolls up to the next unit once the total reaches it', () =>{
      const attachments = [{name: 'photo.png',size:'512KB'}, { name: 'document.pdf', size: '512KB' }]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('1.0 MB')
    })

    it('stays in bytes just below a kilobyte', () =>{
      const attachments = [{name: 'photo.png',size:'1023B'}]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('1023 B')
    })
  })

  describe('formatFileSize', () => {
    it('returns an empty string when the size is missing', () => {
      expect(formatFileSize(undefined)).toBe('')
      expect(formatFileSize(null)).toBe('')
      expect(formatFileSize('')).toBe('')
    })

    it('returns an empty string for a size it cannot read', () => {
      expect(formatFileSize('five KB')).toBe('')
    })

    it('returns an empty string for a zero size', () => {
      expect(formatFileSize(0)).toBe('')
      expect(formatFileSize('0 KB')).toBe('')
    })

    it('formats the bare byte count the API sends', () => {
      expect(formatFileSize(113)).toBe('113 B')
      expect(formatFileSize(2048)).toBe('2 KB')
      expect(formatFileSize(2097152)).toBe('2.0 MB')
      expect(formatFileSize(2147483648)).toBe('2.0 GB')
    })

    it('reads a display string with a unit, in either case and with or without a space', () => {
      expect(formatFileSize('1.8 MB')).toBe('1.8 MB')
      expect(formatFileSize('512kb')).toBe('512 KB')
      expect(formatFileSize('3GB')).toBe('3.0 GB')
    })

    it('moves up a unit once the size reaches it', () => {
      expect(formatFileSize(1023)).toBe('1023 B')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize('1024 KB')).toBe('1.0 MB')
    })
  })
})
