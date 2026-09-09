import { XMLParser } from 'fast-xml-parser';
import type { GitBookPage } from './sitemap-types';
import { isPageInGitBookSpace, type GitBookSource } from './gitbook-url';

type SitemapUrl = { loc?: string };
type SitemapDocument = { urlset?: { url?: SitemapUrl | SitemapUrl[] } };

const parser = new XMLParser({
  ignoreAttributes: true,
  isArray: (_name, jPath) => jPath === 'urlset.url',
});

export function parseSitemapPages(xml: string, source: GitBookSource): GitBookPage[] {
  const document = parser.parse(xml) as SitemapDocument;
  const sitemapUrls = document.urlset?.url ?? [];
  const sitemapEntries = Array.isArray(sitemapUrls) ? sitemapUrls : [sitemapUrls];
  const pages = new Map<string, GitBookPage>();

  for (const sitemapUrl of sitemapEntries) {
    if (!sitemapUrl.loc) {
      continue;
    }

    const pageUrl = normalizePageUrl(sitemapUrl.loc);

    if (!pageUrl || !isPageInGitBookSpace(pageUrl, source)) {
      continue;
    }

    pages.set(pageUrl, {
      id: pageUrl,
      title: getPageTitle(pageUrl, source),
      titleSource: 'path-fallback',
      url: pageUrl,
      path: getPagePath(pageUrl, source),
    });
  }

  return [...pages.values()].sort((first, second) =>
    first.path.localeCompare(second.path, 'pt-BR', { sensitivity: 'base' }),
  );
}

function normalizePageUrl(value: string): string | null {
  try {
    const url = new URL(value);
    url.search = '';
    url.hash = '';
    url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return null;
  }
}

function getPagePath(pageUrl: string, source: GitBookSource): string {
  return new URL(pageUrl).pathname.slice(new URL(source.baseUrl).pathname.length).replace(/^\/+/, '');
}

function getPageTitle(pageUrl: string, source: GitBookSource): string {
  const path = getPagePath(pageUrl, source);
  const lastSegment = path.split('/').filter(Boolean).at(-1) ?? path;
  return decodePathSegment(lastSegment).replace(/[-_]+/g, ' ');
}

function decodePathSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}