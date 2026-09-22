import { describe,it, expect } from 'vitest'
import { formatReceivedAt,formatRelativeTime,formatTotalAttachmentSize } from '../src/utils/helpers'

describe('helpers', () => {
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
    expect(check).toBe('Sep 17, 2026, 9:49 AM')
  })
})




describe('helpers', () => {
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




describe('helpers', () =>{
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
      const attachments =  [{name: 'photo.png',size:'5KB'}]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('5 KB')
    })

    it('returns bytes when size is less than 1 KB', () =>{
      const attachments =  [{name: 'photo.png',size:'500B'}]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('500 B')
    })

    it('returns KB when size is greater than 1KB but less than 1MB', () =>{
       const attachments =  [{name: 'photo.png',size:'2048B'}]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('2 KB')
    })

    it('returns MB when size is greater than 1MB but less than 1GB', () =>{
       const attachments =  [{name: 'photo.png',size:'2097152B'}]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('2.0 MB')
    })

    it('returns GB when size is greater than 1GB but less than 1TB', () =>{
       const attachments =  [{name: 'photo.png',size:'2147483648'}]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('2.0 GB')
    })

    it('returns total size of two attachments ', () =>{
       const attachments =  [{name: 'photo.png',size:'2KB'}, { name: 'document.pdf', size: '3KB' }]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('5 KB')
    })
    
    it('returns total size of two attachments with different units ', () =>{
       const attachments =  [{name: 'photo.png',size:'512KB'}, { name: 'document.pdf', size: '3MB' }]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('3.5 MB')
    })

    it('returns total size of two attachments with different units ', () =>{
       const attachments =  [{name: 'photo.png',size:'512KB'}, { name: 'document.pdf', size: '3MB' }]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('3.5 MB')
    })

     it('returns total size of two attachments with different units ', () =>{
       const attachments =  [{name: 'photo.png',size:'512KB'}, { name: 'document.pdf', size: '3MB' }]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('3.5 MB')
    })

    it('returns empty string for invalid format ', () =>{
       const attachments =  [{name: 'photo.png',size:'five KB'}]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('')
    })

    it('returns empty string for zero size ', () =>{
       const attachments =  [{name: 'photo.png',size:'0 KB'}]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('')
    })

    it('returns empty string for  two attachments with one invalid format ', () =>{
       const attachments =  [{name: 'photo.png',size:'512KB'}, { name: 'document.pdf', size: 'three MB' }]
      const check = formatTotalAttachmentSize(attachments)
      expect(check).toBe('512 KB')
    })
           

})
