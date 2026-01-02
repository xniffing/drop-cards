export type OpenApiDocsOptions = {
  title?: string
}

/**
 * Opens an in-browser Swagger UI page in a new tab, using Blob URLs for both the
 * HTML shell and the OpenAPI JSON document.
 *
 * Note: Swagger UI assets are loaded from a CDN (unpkg). If the user is offline
 * or the CDN is blocked, the page may not render.
 */
export function openSwaggerUiInNewTab(openApiJson: string, opts: OpenApiDocsOptions = {}) {
  const title = opts.title ?? 'API Docs'

  const specBlob = new Blob([openApiJson], { type: 'application/json' })
  const specUrl = URL.createObjectURL(specBlob)

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      html, body { margin: 0; padding: 0; height: 100%; }
      #swagger-ui { height: 100%; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: ${JSON.stringify(specUrl)},
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout"
      });
    </script>
  </body>
</html>`

  const htmlBlob = new Blob([html], { type: 'text/html' })
  const htmlUrl = URL.createObjectURL(htmlBlob)

  const w = window.open(htmlUrl, '_blank', 'noopener,noreferrer')
  if (!w) {
    // If popups are blocked, still let the caller handle UI feedback.
    return { success: false as const, error: 'Popup blocked' }
  }

  // Cleanup: once the new window finishes loading, we can revoke the HTML URL.
  // Keep specUrl alive a bit longer because Swagger UI fetches it after load.
  w.addEventListener('load', () => {
    try {
      URL.revokeObjectURL(htmlUrl)
    } catch {
      // ignore
    }
    window.setTimeout(() => {
      try {
        URL.revokeObjectURL(specUrl)
      } catch {
        // ignore
      }
    }, 30_000)
  })

  return { success: true as const }
}

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

