import { describe, expect, it } from 'vitest';
import { buildMarkdownUrl } from './markdown-url';

describe('buildMarkdownUrl', () => {
  it('adds the markdown suffix and GitBook markdown parameters', () => {
    expect(buildMarkdownUrl('https://hiago.gitbook.io/space/fundamentos/intro?old=true#top')).toBe(
      'https://hiago.gitbook.io/space/fundamentos/intro.md?displayAgentInstructions=false&markdownSource=page-action',
    );
  });
});