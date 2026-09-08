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
