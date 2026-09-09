import { describe, expect, it } from 'vitest';
import { createMarkdownFile, getMarkdownFileName } from './markdown-file';

describe('getMarkdownFileName', () => {
  it('uses only the last path segment', () => {
    expect(
      getMarkdownFileName({
        id: 'page',
        title: 'Introdução',
        titleSource: 'path-fallback',
        url: 'https://example.com/fundamentos/01-introducao-engenharia',
        path: 'fundamentos/01-introducao-engenharia',
      }),
    ).toBe('01-introducao-engenharia.md');
  });

  it('sanitizes accents and invalid filename characters', () => {
    expect(
      getMarkdownFileName({
        id: 'page',
        title: 'Página',
        titleSource: 'path-fallback',
        url: 'https://example.com/page',
        path: 'Página: primeiro teste?',
      }),
    ).toBe('pagina-primeiro-teste.md');
  });
});

describe('createMarkdownFile', () => {
  it('keeps the markdown content in memory with its metadata', () => {
    const file = createMarkdownFile(
      { id: 'page', title: 'Intro', titleSource: 'path-fallback', url: 'https://example.com/intro', path: 'intro' },
      '# Intro',
    );

    expect(file).toMatchObject({ pageId: 'page', fileName: 'intro.md' });
    expect(file.blob.size).toBeGreaterThan(0);
  });
});