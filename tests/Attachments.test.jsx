import {describe,it,expect,vi} from 'vitest'
import {render,screen,fireEvent,within} from '@testing-library/react'
import Attachments from '../src/components/Attachments'

const attachments = [
  { id: 'att_01', filename: 'guide.pdf', type: 'PDF', size: '1.8 MB' },
  { id: 'att_02', filename: 'logo.png', type: 'PNG', size: '1.4 MB' },
]


describe('Attachments', () => {
  it('renders nothing when no attachments are provided', () => {
    const { container } = render(<Attachments />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for an empty attachment list', () => {
    const { container } = render(<Attachments attachments={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('labels a single attachment as one file', () => {
    render(<Attachments attachments={[attachments[0]]} />)

    expect(screen.getByText(/1 file/)).toHaveTextContent('1 file')
  })

  it('shows the file count and the combined size of the attachments', () => {
    render(<Attachments attachments={attachments} totalAttachmentSize="3.2 MB" />)

    expect(screen.getByText(/2 files/)).toHaveTextContent('2 files · 3.2 MB')
  })

  it('renders the filename, type and size of every attachment', () => {
    render(<Attachments attachments={attachments} />)

    expect(screen.getByText('guide.pdf')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
    expect(screen.getByText('1.8 MB')).toBeInTheDocument()
    expect(screen.getByText('logo.png')).toBeInTheDocument()
    expect(screen.getByText('PNG')).toBeInTheDocument()
    expect(screen.getByText('1.4 MB')).toBeInTheDocument()
  })

  it('falls back to a generic file label when an attachment has no type', () => {
    render(<Attachments attachments={[{ id: 'att_x', filename: 'notes.txt' }]} />)

    expect(screen.getByText('FILE')).toBeInTheDocument()
  })

  it('renders the card variant with a level 2 heading', () => {
    render(<Attachments attachments={attachments} />)

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Attachments')
    expect(screen.getByLabelText('Download all attachments as zip')).toHaveTextContent('Download All (.zip)')
  })

  it('renders the fullscreen variant as a labelled section with its own heading', () => {
    render(<Attachments attachments={attachments} variant="fullscreen" />)

    const section = screen.getByRole('region', { name: 'Attachments' })
    expect(within(section).getByRole('heading', { level: 3 })).toHaveTextContent('Attachments')
    expect(screen.getByLabelText('Download all attachments as zip')).toHaveTextContent('Download All')
  })

  it('calls onDownloadAll when the download all action is used', () => {
    const onDownloadAll = vi.fn()
    render(<Attachments attachments={attachments} onDownloadAll={onDownloadAll} />)

    fireEvent.click(screen.getByLabelText('Download all attachments as zip'))

    expect(onDownloadAll).toHaveBeenCalledTimes(1)
  })

  it('calls onDownloadAttachment with the attachment that was requested', () => {
    const onDownloadAttachment = vi.fn()
    render(<Attachments attachments={attachments} onDownloadAttachment={onDownloadAttachment} />)

    fireEvent.click(screen.getByLabelText('Download guide.pdf'))

    expect(onDownloadAttachment).toHaveBeenCalledWith(attachments[0])
  })

  it('does not throw when a file is downloaded without a handler', () => {
    render(<Attachments attachments={attachments} />)

    expect(() => fireEvent.click(screen.getByLabelText('Download guide.pdf'))).not.toThrow()
  })

  it('hides the view action when no view handler is provided', () => {
    render(<Attachments attachments={attachments} />)

    expect(screen.queryByText('View')).toBeNull()
  })

  it('calls onViewAttachment with the attachment that was requested', () => {
    const onViewAttachment = vi.fn()
    render(<Attachments attachments={attachments} onViewAttachment={onViewAttachment} />)

    fireEvent.click(screen.getAllByText('View')[0])

    expect(onViewAttachment).toHaveBeenCalledWith(attachments[0])
  })

  it('shows the scan summary when scan info is provided', () => {
    render(<Attachments attachments={attachments} scanInfo="Sandboxed scan complete · 0 threats" />)

    expect(screen.getByText('Sandboxed scan complete · 0 threats')).toBeInTheDocument()
  })

  it('hides the scan summary in the fullscreen variant', () => {
    render(
      <Attachments
        attachments={attachments}
        scanInfo="Sandboxed scan complete · 0 threats"
        variant="fullscreen"
      />
    )

    expect(screen.queryByText('Sandboxed scan complete · 0 threats')).toBeNull()
  })
})
