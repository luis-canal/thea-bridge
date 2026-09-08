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

The current phase only provides the Manifest V3 foundation, React side panel, and detection of the active Thea Study Kit. GitBook discovery and file import are intentionally not implemented yet.
