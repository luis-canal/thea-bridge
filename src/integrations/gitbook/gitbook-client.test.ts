import { afterEach, describe, expect, it, vi } from 'vitest';
import { GitBookClient } from './gitbook-client';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GitBookClient', () => {
  it('fetches and parses the normalized sitemap URL', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response('<urlset><url><loc>https://hiago.gitbook.io/space/intro</loc></url></urlset>', {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response('# Introdução real', { status: 200 }));

    const result = await new GitBookClient().discoverPages('https://hiago.gitbook.io/space/intro');

    expect(fetchMock).toHaveBeenCalledWith('https://hiago.gitbook.io/space/sitemap-pages.xml');
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].path).toBe('intro');
    expect(result.pages[0].title).toBe('Introdução real');
    expect(result.pages[0].titleSource).toBe('gitbook');
  });

  it('rejects a failed sitemap request', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }));

    await expect(new GitBookClient().discoverPages('https://hiago.gitbook.io/space')).rejects.toThrow(
      'SITEMAP_REQUEST_FAILED:404',
    );
  });

  it('keeps the pathname fallback when a page has no Markdown heading', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response('<urlset><url><loc>https://hiago.gitbook.io/space/01-introducao</loc></url></urlset>', {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response('Conteúdo sem heading', { status: 200 }));

    const result = await new GitBookClient().discoverPages('https://hiago.gitbook.io/space');

    expect(result.pages[0]).toMatchObject({
      title: '01 introducao',
      titleSource: 'path-fallback' as const,
    });
  });

  it('fetches and validates a page Markdown response', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('# Intro\n\nContent', { status: 200 }),
    );
    const page = {
      id: 'page',
      title: 'Intro',
      titleSource: 'path-fallback' as const,
      url: 'https://hiago.gitbook.io/space/intro',
      path: 'intro',
    };

    await expect(new GitBookClient().fetchMarkdown(page)).resolves.toBe('# Intro\n\nContent');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://hiago.gitbook.io/space/intro.md?displayAgentInstructions=false&markdownSource=page-action',
    );
  });

  it('rejects empty and HTML page responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<!doctype html>', { status: 200 }));

    await expect(
      new GitBookClient().fetchMarkdown({
        id: 'page',
        title: 'Intro',
        titleSource: 'path-fallback',
        url: 'https://hiago.gitbook.io/space/intro',
        path: 'intro',
      }),
    ).rejects.toThrow('INVALID_MARKDOWN_CONTENT');
  });
});