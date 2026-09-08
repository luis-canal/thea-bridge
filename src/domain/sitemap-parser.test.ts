import { describe, expect, it } from 'vitest';
import { normalizeGitBookUrl } from './gitbook-url';
import { parseSitemapPages } from './sitemap-parser';

const source = normalizeGitBookUrl('https://hiago.gitbook.io/space')!;

describe('parseSitemapPages', () => {
  it('extracts, filters, deduplicates, and sorts sitemap locations', () => {
    const xml = `<?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://hiago.gitbook.io/space/z-page?ref=sitemap</loc></url>
        <url><loc>https://other.gitbook.io/space/outside</loc></url>
        <url><loc>https://hiago.gitbook.io/other/wrong-space</loc></url>
        <url><loc>https://hiago.gitbook.io/space/a-page</loc></url>
        <url><loc>https://hiago.gitbook.io/space/z-page</loc></url>
      </urlset>`;

    expect(parseSitemapPages(xml, source)).toEqual([
      {
        id: 'https://hiago.gitbook.io/space/a-page',
        title: 'a page',
        url: 'https://hiago.gitbook.io/space/a-page',
        path: 'a-page',
      },
      {
        id: 'https://hiago.gitbook.io/space/z-page',
        title: 'z page',
        url: 'https://hiago.gitbook.io/space/z-page',
        path: 'z-page',
      },
    ]);
  });

  it('returns an empty list for a sitemap without pages', () => {
    expect(parseSitemapPages('<urlset />', source)).toEqual([]);
  });
});