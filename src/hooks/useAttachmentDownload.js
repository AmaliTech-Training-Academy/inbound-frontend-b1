import { useCallback, useState } from 'react'
import { ApiError, downloadAttachment } from '../services/inboxApi.js'

// Fetching an attachment and handing it to the browser.
//
// The error is kept here with the id of the message it happened in, so it can
// only be drawn while that message is open and needs no effect to clear it on
// the way out. `onSessionDead` is called when the token itself is refused -
// the caller decides what that means for the session.
export function useAttachmentDownload({ token, selected, selectedId, onSessionDead }) {
    const [attachmentError, setAttachmentError] = useState(null)

    // Both sides are undefined at once when there is no error and nothing is
    // open, so the error itself has to be checked before its id is compared.
    const shownAttachmentError =
        attachmentError && attachmentError.messageId === selectedId ? attachmentError.text : null

// The download endpoint is authenticated, so a plain <a download> cannot be
// used: it would send no Authorization header and come back 401. The bytes
// are fetched here instead and handed to the browser as a blob url.
//
// One object url per file, revoked on a delay rather than at once: revoking
// immediately can cancel the download (or blank the tab) the click just
// started, since the browser has not finished reading it yet.
const withAttachmentUrl = useCallback(
  async (attachment, handOff) => {
    setAttachmentError(null)
    try {
      const { blob, filename } = await downloadAttachment(attachment.id, token, {
        fallbackName: attachment.filename,
      })
      const url = URL.createObjectURL(blob)
      try {
        handOff(url, filename)
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 60_000)
      }
      return true
    } catch (err) {
      console.error('[InboxPage] attachment request failed', err)

      // A dead token means every other call is about to fail the same way,
      // so ask the server: onSessionDead() tears the session down if it agrees.
      // isSessionDead rather than isDead, because a 404 here is one missing
      // file, not the end of the session.
      if (err instanceof ApiError && err.isSessionDead) {
        onSessionDead()
      }

      setAttachmentError({
        messageId: selectedId,
        text:
          err?.status === 404
            ? `${attachment.filename} is no longer available.`
            : (err?.message ?? 'That attachment could not be downloaded.'),
      })
      return false
    }
  },
  [token, selectedId, setAttachmentError, onSessionDead],
)

const saveToDisk = (url, filename) => {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

const onDownloadAttachment = useCallback(
  (attachment) => withAttachmentUrl(attachment, saveToDisk),
  [withAttachmentUrl],
)

// No view action on purpose. Opening an attachment inline would mean
// navigating to a blob: url, and a blob: url runs in this page's origin -
// so an emailed text/html or image/svg+xml attachment would execute script
// here, with the session token sitting in sessionStorage. The server guards
// against this with Content-Disposition: attachment and nosniff; re-wrapping
// the bytes in our own blob throws both away. Anyone can email a disposable
// address, so that is a vector, not a corner case.
//
// Previewing is worth having, but only by constructing the blob with a type
// we have chosen from an allowlist (images, pdf) rather than the one the
// response carried. That is its own piece of work.

// One request at a time: the API serves a single attachment per call, and
// firing them in parallel is what makes a browser treat the page as a
// multi-download attack and block the rest. Stops at the first failure,
// which withAttachmentUrl has already reported.
const onDownloadAll = useCallback(async () => {
  for (const attachment of selected?.attachments ?? []) {
    const ok = await withAttachmentUrl(attachment, saveToDisk)
    if (!ok) break
  }
}, [selected?.attachments, withAttachmentUrl])

    return { shownAttachmentError, onDownloadAttachment, onDownloadAll }
}
