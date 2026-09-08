## TheaBridge

Chrome extension for importing GitBook content into Thea Study Kits.

### Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

After building, load the `dist` directory in Chrome at `chrome://extensions` with Developer mode enabled.

The current implementation provides the Manifest V3 foundation, React side panel, active Thea Study Kit detection, and GitBook page discovery through `sitemap-pages.xml`. Page selection and file import are intentionally not implemented yet.

The sitemap phase currently supports GitBook spaces hosted at `https://<workspace>.gitbook.io/<space>`. Custom GitBook domains are not included until a stable rule for identifying their space is defined.

The current phase also allows the user to select individual discovered pages, select all pages, clear the selection, and view the pages grouped by their pathname.

Selected pages can now be downloaded as Markdown in memory. The extension requests each page through its `.md` URL, validates the response, and creates a `Blob` named after the final pathname segment, such as `01-introducao-engenharia.md`. Download failures are reported independently per page.

The extension supports importing selected pages into the active Study Kit. It sends each Markdown file through `POST /files` as `multipart/form-data`, validates the returned `fileId`, and associates it through `POST /sets/{setId}/materials`. The requests use the existing authenticated browser session and do not store credentials.

After a successful association, the active Study Kit tab is reloaded so its attachment list reflects the new material immediately.

Selected pages are now processed by a sequential in-memory import queue. The side panel shows per-page progress, records the returned `fileId`, distinguishes download, upload, and association failures, supports cancellation, and allows retrying failed pages individually.

The Thea requests also forward the CSRF token from the active Thea session when the corresponding cookie is available, preventing `419` CSRF/session errors.
