import { normalizeGitBookUrl, type GitBookSource } from '../../domain/gitbook-url';
import { parseSitemapPages } from '../../domain/sitemap-parser';
import type { GitBookPage } from '../../domain/sitemap-types';

export class GitBookClient {
  async discoverPages(inputUrl: string): Promise<{ source: GitBookSource; pages: GitBookPage[] }> {
    const source = normalizeGitBookUrl(inputUrl);

    if (!source) {
      throw new Error('INVALID_GITBOOK_URL');
    }

    const response = await fetch(source.sitemapUrl);

    if (!response.ok) {
      throw new Error(`SITEMAP_REQUEST_FAILED:${response.status}`);
    }

    const xml = await response.text();

    return {
      source,
      pages: parseSitemapPages(xml, source),
    };
  }
}