# TheaBridge Privacy Policy

**Last updated:** 2026-09-10

TheaBridge is a Chrome extension that helps users import pages from GitBook into a Study Kit on Thea.

## Data processing

When the user starts an import, the extension:

1. Reads the selected GitBook pages and their Markdown content in the browser.
2. Sends the Markdown files directly to Thea using the user's existing authenticated browser session.
3. Associates the uploaded files with the Study Kit selected by the user.

The content is not sent to a TheaBridge backend. TheaBridge does not operate or require a separate application server for this process.

## Cookies and authentication

The extension uses cookies from `www.thea.study` only to authenticate requests made on behalf of the user's existing Thea session. It may read the session's CSRF cookie and forward the corresponding CSRF header required by Thea.

TheaBridge does not collect, copy, sell, or transmit cookies to its own servers. It does not ask the user for a username, password, access token, or API key.

## Storage and retention

The extension does not permanently store GitBook content, uploaded files, cookies, credentials, or access tokens. Markdown content and import progress are held temporarily in browser memory while an operation is running.

The uploaded content is subject to Thea's own data handling and retention policies after it is sent to Thea.

## Third parties

The extension communicates directly with:

- The GitBook URL provided by the user, to discover and read pages.
- `www.thea.study`, to upload files and associate them with the active Study Kit.

No analytics, advertising, tracking, or third-party data broker is included in TheaBridge.

## User control

The user controls which GitBook URL and pages are selected for import. The user can stop an active import from the extension and can remove imported materials through Thea.

## Contact

For privacy questions or support requests, contact the extension publisher through the support channel listed in the Chrome Web Store listing.