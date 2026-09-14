import { useState } from 'react'

/**
 * Sandboxed HTML email renderer adhering strictly to Jira IND-8 criteria:
 * 1. Sandboxed iframe without `allow-scripts` (scripts strictly disabled).
 * 2. Strict Content-Security-Policy blocking all remote tracking pixels, images, external frames, and network requests.
 * 3. Scoped CSS for safe typography matching the Inbound design system.
 */
function SafeHtmlEmail({ htmlContent }) {
  const [iframeHeight, setIframeHeight] = useState('220px')

  // Construct secure srcDoc document with strict CSP and scoped reset styling
  const secureSrcDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'none'; script-src 'none'; frame-src 'none'; connect-src 'none'; media-src 'none'; object-src 'none'; style-src 'unsafe-inline'; font-src 'none';">
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #111213;
      background-color: transparent;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    a {
      color: #111111;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    p {
      margin: 0 0 1em 0;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #111213;
      margin-top: 1.2em;
      margin-bottom: 0.5em;
      line-height: 1.3;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    th, td {
      border: 1px solid #e4e5e9;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background-color: #f4f5f7;
      font-weight: 600;
    }
    code, pre {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      background-color: #eef0f2;
      border-radius: 4px;
    }
    code {
      padding: 2px 4px;
    }
    pre {
      padding: 12px;
      overflow-x: auto;
      white-space: pre-wrap;
    }
    img {
      display: none !important; /* Secondary CSS defense in addition to CSP */
    }
    iframe {
      display: none !important;
    }
  </style>
</head>
<body>
  ${htmlContent || ''}
</body>
</html>`

  const handleLoad = (e) => {
    try {
      const iframe = e.target
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (doc) {
        const measuredHeight = Math.max(
          doc.documentElement.scrollHeight || 0,
          doc.body?.scrollHeight || 0,
          180
        )
        setIframeHeight(`${measuredHeight + 16}px`)
      }
    } catch {
      // Sandboxed origin may restrict direct DOM inspection in some engines; fallback to minimum height
    }
  }

  return (
    <iframe
      title="Sandboxed Email Content"
      srcDoc={secureSrcDoc}
      sandbox="allow-same-origin"
      onLoad={handleLoad}
      className="w-full border-0 block"
      style={{ height: iframeHeight, minHeight: '180px' }}
    />
  )
}

export default SafeHtmlEmail
