function formatReceivedAt(timestamp) {
  if (!timestamp) return 'Unknown time'
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return timestamp

  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date)
  } catch (error) {
    console.error('Unable to format received timestamp', error)
    return timestamp
  }
}

function formatRelativeTime(receivedAt) {
  if (!receivedAt) return ''
  const date = new Date(receivedAt)
  if (isNaN(date.getTime())) return ''

  const diffMs = Date.now() - date.getTime()
  if (diffMs < 0) return 'just now'

  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMin < 1) {
    return 'just now'
  }
  if (diffHours < 1) {
    return `${diffMin}m ago`
  }
  if (diffDays < 1) {
    return `${diffHours}h ago`
  }
  if (diffDays < 30) {
    return `${diffDays}d ago`
  }
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) {
    return `${diffMonths}mo ago`
  }
  const diffYears = Math.floor(diffDays / 365)
  return `${diffYears}y ago`
}

// A size in bytes, from either shape it arrives in: the API's bare byte count
// (113) or a display string with a unit ("1.8 MB"). Null when it is neither.
function toBytes(size) {
  if (size === null || size === undefined || size === '') return null
  const match = String(size).trim().match(/^([\d.]+)\s*(B|KB|MB|GB)?$/i)
  if (!match) return null

  const num = parseFloat(match[1])
  const unit = (match[2] || 'B').toUpperCase()
  if (unit === 'GB') return num * 1024 * 1024 * 1024
  if (unit === 'MB') return num * 1024 * 1024
  if (unit === 'KB') return num * 1024
  return num
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`
  }
  return `${bytes} B`
}

/** One attachment's size with its unit, or '' when it is unknown. */
function formatFileSize(size) {
  const bytes = toBytes(size)
  return bytes ? formatBytes(bytes) : ''
}

function formatTotalAttachmentSize(attachments = []) {
  if (!attachments || attachments.length === 0) return ''
  let totalBytes = 0
  let hasValidSize = false

  for (const att of attachments) {
    if (!att.size) continue
    const bytes = toBytes(att.size)
    if (bytes !== null) {
      hasValidSize = true
      totalBytes += bytes
    }
  }

  if (!hasValidSize || totalBytes === 0) return ''
  return formatBytes(totalBytes)
}

export { formatReceivedAt, formatRelativeTime, formatFileSize, formatTotalAttachmentSize }