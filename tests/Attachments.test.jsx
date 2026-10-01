import {describe,it,expect,vi} from 'vitest'
import {render,screen,fireEvent,within} from '@testing-library/react'
import Attachments from '../src/components/Attachments'

const attachments = [
  { id: 'att_01', filename: 'guide.pdf', type: 'PDF', size: '1.8 MB' },
  { id: 'att_02', filename: 'policy.pdf', type: 'PDF', size: '420 KB' },
  { id: 'att_03', filename: 'roster.csv', type: 'CSV', size: '64 KB' },
]

describe('Attachments', () => {
  it('says so when no attachments are provided', () => {
    render(<Attachments />)

    expect(screen.getByText('No attachments')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Attachments' })).toBeNull()
  })

  it('says so for an empty attachment list', () => {
    render(<Attachments attachments={[]} />)

    expect(screen.getByText('No attachments')).toBeInTheDocument()
  })

  it('labels a single attachment as one', () => {
    render(<Attachments attachments={[attachments[0]]} />)

    expect(screen.getByRole('heading', { name: '1 Attachment' })).toBeInTheDocument()
  })

  it('shows the file count and the combined size of the attachments', () => {
    render(<Attachments attachments={attachments} totalAttachmentSize="2.3 MB" />)

    expect(screen.getByRole('heading', { name: '3 Attachments · 2.3 MB' })).toBeInTheDocument()
  })

  it('renders the filename, type and size of every attachment', () => {
    render(<Attachments attachments={attachments} />)

    const tiles = within(screen.getByRole('region', { name: 'Attachments' })).getAllByRole('listitem')
    expect(tiles).toHaveLength(3)
    expect(tiles[0]).toHaveTextContent('guide.pdf')
    expect(tiles[0]).toHaveTextContent('PDF · 1.8 MB')
    expect(tiles[2]).toHaveTextContent('roster.csv')
    expect(tiles[2]).toHaveTextContent('CSV · 64 KB')
  })

  it('falls back to a generic file label when an attachment has no type', () => {
    render(<Attachments attachments={[{ id: 'x', filename: 'mystery', size: '1 KB' }]} />)

    expect(screen.getByRole('listitem')).toHaveTextContent('File · 1 KB')
  })

  it('gives a live attachment its unit and its type from the file name', () => {
    // The API sends a bare byte count and a MIME contentType, not a short type.
    render(
      <Attachments
        attachments={[
          { id: 'a', filename: 'invoice-INV-2026-0931.txt', contentType: 'text/plain', size: 113 },
          { id: 'b', filename: 'photo.png', contentType: 'image/png', size: 248000 },
        ]}
      />
    )

    const tiles = screen.getAllByRole('listitem')
    expect(tiles[0]).toHaveTextContent('TXT · 113 B')
    expect(tiles[1]).toHaveTextContent('PNG · 242 KB')
  })

  it('treats a null type as a generic file rather than failing', () => {
    render(<Attachments attachments={[{ id: 'x', filename: 'mystery', type: null, size: '1 KB' }]} />)

    expect(screen.getByRole('listitem')).toHaveTextContent('File · 1 KB')
  })

  it('offers no download actions while nothing is behind them', () => {
    // The API has no attachment download yet: a button that does nothing is
    // worse than none.
    render(<Attachments attachments={attachments} />)

    expect(screen.queryByRole('button')).toBeNull()
  })

  it('calls onDownloadAll when the download all action is used', () => {
    const onDownloadAll = vi.fn()
    render(<Attachments attachments={attachments} onDownloadAll={onDownloadAll} />)

    fireEvent.click(screen.getByRole('button', { name: 'Download all attachments as zip' }))

    expect(onDownloadAll).toHaveBeenCalledTimes(1)
  })

  it('calls onDownloadAttachment with the attachment that was requested', () => {
    const onDownloadAttachment = vi.fn()
    render(<Attachments attachments={attachments} onDownloadAttachment={onDownloadAttachment} />)

    fireEvent.click(screen.getByRole('button', { name: 'Download policy.pdf' }))

    expect(onDownloadAttachment).toHaveBeenCalledWith(attachments[1])
  })

  it('hides the view action when no view handler is provided', () => {
    render(<Attachments attachments={attachments} />)

    expect(screen.queryByRole('button', { name: 'View' })).toBeNull()
  })

  it('calls onViewAttachment with the attachment that was requested', () => {
    const onViewAttachment = vi.fn()
    render(<Attachments attachments={attachments} onViewAttachment={onViewAttachment} />)

    fireEvent.click(screen.getAllByRole('button', { name: 'View' })[2])

    expect(onViewAttachment).toHaveBeenCalledWith(attachments[2])
  })

  it('shows the scan summary when scan info is provided', () => {
    render(<Attachments attachments={attachments} scanInfo="0 threats found" />)

    expect(screen.getByText('0 threats found')).toBeInTheDocument()
  })
})
