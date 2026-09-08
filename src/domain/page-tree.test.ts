import { describe, expect, it } from 'vitest';
import { buildPageTree } from './page-tree';

describe('buildPageTree', () => {
  it('keeps a root page in the tree', () => {
    const page = { id: 'root', title: 'Home', url: 'https://example.com', path: '' };

    expect(buildPageTree([page])).toEqual([
      { name: 'Home', path: 'root', page, children: [] },
    ]);
  });

  it('groups pages by pathname segments', () => {
    const tree = buildPageTree([
      { id: 'a', title: 'A', url: 'https://example.com/a', path: 'fundamentos/intro' },
      { id: 'b', title: 'B', url: 'https://example.com/b', path: 'fundamentos/guia' },
      { id: 'c', title: 'C', url: 'https://example.com/c', path: 'avancado' },
    ]);

    expect(tree).toEqual([
      {
        name: 'fundamentos',
        path: 'fundamentos',
        children: [
          {
            name: 'intro',
            path: 'fundamentos/intro',
            page: {
              id: 'a',
              title: 'A',
              url: 'https://example.com/a',
              path: 'fundamentos/intro',
            },
            children: [],
          },
          {
            name: 'guia',
            path: 'fundamentos/guia',
            page: {
              id: 'b',
              title: 'B',
              url: 'https://example.com/b',
              path: 'fundamentos/guia',
            },
            children: [],
          },
        ],
      },
      {
        name: 'avancado',
        path: 'avancado',
        page: {
          id: 'c',
          title: 'C',
          url: 'https://example.com/c',
          path: 'avancado',
        },
        children: [],
      },
    ]);
  });
});