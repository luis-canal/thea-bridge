import { afterEach, describe, expect, it, vi } from 'vitest';
import { GitBookClient } from './gitbook-client';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GitBookClient', () => {
  it('fetches and parses the normalized sitemap URL', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        '<urlset><url><loc>https://hiago.gitbook.io/space/intro</loc></url></urlset>',
        { status: 200 },
      ),
    );

    const result = await new GitBookClient().discoverPages('https://hiago.gitbook.io/space/intro');

    expect(fetchMock).toHaveBeenCalledWith('https://hiago.gitbook.io/space/sitemap-pages.xml');
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].path).toBe('intro');
  });

  it('rejects a failed sitemap request', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }));

    await expect(new GitBookClient().discoverPages('https://hiago.gitbook.io/space')).rejects.toThrow(
      'SITEMAP_REQUEST_FAILED:404',
    );
  });
});