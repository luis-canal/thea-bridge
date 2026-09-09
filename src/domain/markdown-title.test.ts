import { describe, expect, it } from 'vitest';
import { extractMarkdownTitle } from './markdown-title';

describe('extractMarkdownTitle', () => {
  it('extracts the first Markdown heading', () => {
    expect(extractMarkdownTitle('Intro text\n\n# Introdução à Engenharia ##\n\n## Outro título')).toBe(
      'Introdução à Engenharia',
    );
  });

  it('accepts headings with Markdown special characters', () => {
    expect(extractMarkdownTitle('# APIs: C++ & SQL (2026)')).toBe('APIs: C++ & SQL (2026)');
  });

  it('returns null when Markdown has no heading', () => {
    expect(extractMarkdownTitle('Conteúdo sem título\n\n- item')).toBeNull();
  });
});