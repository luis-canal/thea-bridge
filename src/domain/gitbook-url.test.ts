import { describe, expect, it } from 'vitest';
import { isPageInGitBookSpace, normalizeGitBookUrl } from './gitbook-url';

describe('normalizeGitBookUrl', () => {
  it('normalizes a GitBook page to its space and sitemap URLs', () => {
    expect(
      normalizeGitBookUrl(
        'https://hiago.gitbook.io/atitus-engenheria-de-software-2026-2/fundamentos/01-introducao-engenharia?view=page#top',
      ),
    ).toEqual({
      inputUrl: 'https://hiago.gitbook.io/atitus-engenheria-de-software-2026-2/',
      baseUrl: 'https://hiago.gitbook.io/atitus-engenheria-de-software-2026-2/',
      sitemapUrl:
        'https://hiago.gitbook.io/atitus-engenheria-de-software-2026-2/sitemap-pages.xml',
    });
  });

  it('rejects unsupported domains and invalid space paths', () => {
    expect(normalizeGitBookUrl('https://example.com/docs')).toBeNull();
    expect(normalizeGitBookUrl('https://gitbook.io/docs')).toBeNull();
    expect(normalizeGitBookUrl('http://hiago.gitbook.io/docs')).toBeNull();
  });
});

describe('isPageInGitBookSpace', () => {
  const source = normalizeGitBookUrl('https://hiago.gitbook.io/space/page')!;

  it('accepts pages from the same GitBook space', () => {
    expect(isPageInGitBookSpace('https://hiago.gitbook.io/space/other-page', source)).toBe(true);
  });

  it('rejects pages from another space or host', () => {
    expect(isPageInGitBookSpace('https://hiago.gitbook.io/other/page', source)).toBe(false);
    expect(isPageInGitBookSpace('https://other.gitbook.io/space/page', source)).toBe(false);
  });
});