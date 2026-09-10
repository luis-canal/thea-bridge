# TheaBridge

Chrome extension for importing GitBook content into Thea Study Kits.

TheaBridge runs locally in the browser. It discovers pages from a GitBook sitemap, lets the user select content, downloads each page as Markdown, and sends the selected files directly to the active Thea Study Kit.

## Features

- Manifest V3 with React, TypeScript and Vite.
- Detection of the active Thea Study Kit.
- GitBook page discovery through `sitemap-pages.xml`.
- Page titles extracted from the first Markdown heading, with pathname fallback.
- Individual and global page selection.
- Sequential import queue with progress, cancellation and individual retry.
- Direct upload to the Thea session through its file and material endpoints.
- Friendly success and failure states in the side panel.

GitBook spaces currently need to use the `https://<workspace>.gitbook.io/<space>` format. Custom GitBook domains are not included yet.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

After building, load the `dist` directory in Chrome at `chrome://extensions` with Developer mode enabled.

## Privacy

See [PRIVACY.md](PRIVACY.md) for information about cookies, content processing and data storage.

## Publishing

The publishable artifact is the contents of the `dist` directory after a successful build:

```bash
npm run build
cd dist
zip -r ../thea-bridge-0.1.1.zip .
```
