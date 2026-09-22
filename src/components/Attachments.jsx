import Button from './Button'
import Card from './Card'
import Badge from './Badge'

const getFileBadgeStyle = (type = '') => {
  const t = type.toUpperCase()
  if (t === 'PDF') return 'bg-danger/10 text-danger border-danger/30'
  if (t === 'PNG' || t === 'JPG' || t === 'JPEG') return 'bg-purple-50 text-purple-700 border-purple-200'
  if (t === 'ZIP' || t === 'TAR') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-chip text-text-secondary border-border-default'
}

function Attachments({
  attachments = [],
  totalAttachmentSize = '',
  scanInfo = '',
  onDownloadAll,
  onDownloadAttachment,
  onViewAttachment,
  variant = 'card',
  className = '',
}) {
  if (!attachments || attachments.length === 0) return null

  const isFullscreen = variant === 'fullscreen'
  const Container = isFullscreen ? 'section' : Card
  const containerProps = isFullscreen
    ? {
        'aria-label': 'Attachments',
        className: `pt-5 border-t border-border-default flex flex-col gap-4 mt-2 ${className}`.trim(),
      }
    : {
        className: `p-6 flex flex-col gap-4 ${className}`.trim(),
      }

  const HeadingTag = isFullscreen ? 'h3' : 'h2'

  return (
    <Container {...containerProps}>
      <div
        className={
          isFullscreen
            ? 'flex items-center justify-between gap-3'
            : 'flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-default'
        }
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-text-primary shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
          <HeadingTag
            className={
              isFullscreen
                ? 'text-sm font-bold text-text-primary'
                : 'text-sm sm:text-base font-bold text-text-primary'
            }
          >
            Attachments
          </HeadingTag>
          <Badge className="bg-chip text-text-secondary px-2 py-0.5 font-mono text-[11px]">
            {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
            {totalAttachmentSize ? ` · ${totalAttachmentSize}` : ''}
          </Badge>
        </div>

        <Button
          variant="light"
          onClick={onDownloadAll}
          className={
            isFullscreen
              ? 'text-xs px-2.5 py-1 gap-1.5'
              : 'text-xs px-3 py-1.5 gap-1.5 self-start sm:self-auto'
          }
          aria-label="Download all attachments as zip"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          <span>{isFullscreen ? 'Download All' : 'Download All (.zip)'}</span>
        </Button>
      </div>

      <div
        className={
          isFullscreen
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
            : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5'
        }
      >
        {attachments.map((att) => (
          <div
            key={att.id || att.filename}
            className={`${
              isFullscreen ? 'bg-surface-subtle' : 'bg-surface'
            } border border-border-default rounded-[8px] p-3 flex flex-col justify-between hover:border-border-strong transition-colors gap-2.5 min-w-0`}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <span
                className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[3px] border uppercase shrink-0 ${getFileBadgeStyle(
                  att.type
                )}`}
              >
                {att.type || 'FILE'}
              </span>
              <span
                className="font-medium text-xs text-text-primary truncate block flex-1"
                title={att.filename}
              >
                {att.filename}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-page text-[11px] text-text-secondary">
              <span className="font-mono">{att.size || ''}</span>
              <div className={isFullscreen ? 'flex items-center gap-2' : 'flex items-center gap-1.5'}>
                {typeof onViewAttachment === 'function' && (
                  <button
                    type="button"
                    onClick={() => onViewAttachment(att)}
                    className="hover:text-text-primary font-medium transition-colors cursor-pointer"
                  >
                    View
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    typeof onDownloadAttachment === 'function' && onDownloadAttachment(att)
                  }
                  className="hover:text-text-primary font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                  aria-label={`Download ${att.filename}`}
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {scanInfo && !isFullscreen && (
        <div className="mt-2 pt-3 border-t border-border-default flex items-center gap-2 text-xs font-mono text-text-secondary">
          <svg
            className="w-3.5 h-3.5 text-success shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{scanInfo}</span>
        </div>
      )}
    </Container>
  )
}

export default Attachments
