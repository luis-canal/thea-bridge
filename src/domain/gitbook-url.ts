const GITBOOK_HOST_SUFFIX = '.gitbook.io';

export type GitBookSource = {
  inputUrl: string;
  baseUrl: string;
  sitemapUrl: string;
};

export function normalizeGitBookUrl(value: string): GitBookSource | null {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' || !isGitBookHost(url.hostname)) {
    return null;
  }

  const pathSegments = url.pathname.split('/').filter(Boolean);

  if (pathSegments.length === 0 || pathSegments[0].endsWith('.xml')) {
    return null;
  }

  const baseUrl = new URL(`/${pathSegments[0]}/`, url.origin);
  const sitemapUrl = new URL('sitemap-pages.xml', baseUrl);

  return {
    inputUrl: baseUrl.toString(),
    baseUrl: baseUrl.toString(),
    sitemapUrl: sitemapUrl.toString(),
  };
}

export function isGitBookHost(hostname: string): boolean {
  return hostname.endsWith(GITBOOK_HOST_SUFFIX) && hostname.length > GITBOOK_HOST_SUFFIX.length;
}

export function isPageInGitBookSpace(pageUrl: string, source: GitBookSource): boolean {
  let page: URL;

  try {
    page = new URL(pageUrl);
  } catch {
    return false;
  }

  return page.origin === new URL(source.baseUrl).origin && page.pathname.startsWith(new URL(source.baseUrl).pathname);
}