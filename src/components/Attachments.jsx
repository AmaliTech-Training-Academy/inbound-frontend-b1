import { Download, FileText } from 'lucide-react'
import { formatFileSize } from '../utils/helpers'

// The chip colour for a file type, as the design's attachment tiles use them.
const getFileTileStyle = (type) => {
  // The API may send null for an unknown type, which a default parameter lets through.
  switch (String(type ?? '').toUpperCase()) {
    case 'PDF':
      return 'bg-rose-500'
    case 'PNG':
    case 'JPG':
    case 'JPEG':
    case 'GIF':
    case 'WEBP':
      return 'bg-sky-500'
    case 'ZIP':
    case 'TAR':
    case 'GZ':
      return 'bg-amber-500'
    default:
      return 'bg-emerald-500'
  }
}

// The short type a tile shows: the one given, else the file's extension, else
// nothing (the tile then says "File"). The API sends a MIME contentType rather
// than a short type, so for live mail the extension is what there is.
function fileType(att) {
  if (att.type) return att.type
  const extension = att.filename?.match(/\.([a-z0-9]{1,5})$/i)?.[1]
  return extension ? extension.toUpperCase() : null
}

// A message's attachments as the design's file tiles. The actions are only
// drawn when there is something behind them: the API has no attachment
// download yet, and a button that does nothing is worse than none.
function Attachments({
  attachments = [],
  totalAttachmentSize = '',
  scanInfo = '',
  onDownloadAll,
  onDownloadAttachment,
  onViewAttachment,
  className = '',
}) {
  // Said outright rather than left blank, so "no files" is never mistaken for
  // "files still loading".
  if (!attachments || attachments.length === 0) {
    return (
      <p className={`mt-8 text-xs text-slate-400 ${className}`.trim()}>No attachments</p>
    )
  }

  return (
    <section aria-label="Attachments" className={`mt-8 ${className}`.trim()}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-medium text-slate-400">
          {attachments.length} {attachments.length === 1 ? 'Attachment' : 'Attachments'}
          {totalAttachmentSize ? ` · ${totalAttachmentSize}` : ''}
        </h3>
        {typeof onDownloadAll === 'function' && (
          <button
            type="button"
            onClick={onDownloadAll}
            className="text-xs font-medium text-sky-600 hover:underline"
            aria-label="Download all attachments as zip"
          >
            Download All
          </button>
        )}
      </div>

      <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
        {attachments.map((att) => (
          <li
            key={att.id || att.filename}
            className="flex min-w-0 max-w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5"
          >
            <span
              aria-hidden="true"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${getFileTileStyle(fileType(att))}`}
            >
              <FileText size={16} />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="max-w-48 truncate text-xs font-medium text-slate-800" title={att.filename}>
                {att.filename}
              </p>
              <p className="text-[11px] text-slate-400">
                <span className="uppercase">{fileType(att) || 'File'}</span>
                {formatFileSize(att.size) ? ` · ${formatFileSize(att.size)}` : ''}
              </p>
            </div>
            {typeof onViewAttachment === 'function' && (
              <button
                type="button"
                onClick={() => onViewAttachment(att)}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-900"
              >
                View
              </button>
            )}
            {typeof onDownloadAttachment === 'function' && (
              <button
                type="button"
                onClick={() => onDownloadAttachment(att)}
                className="text-slate-400 hover:text-slate-700"
                aria-label={`Download ${att.filename}`}
              >
                <Download size={14} aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {scanInfo && <p className="mt-3 font-mono text-[11px] text-slate-400">{scanInfo}</p>}
    </section>
  )
}

export default Attachments
