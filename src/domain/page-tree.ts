import type { GitBookPage } from './sitemap-types';

export type PageTreeNode = {
  name: string;
  path: string;
  page?: GitBookPage;
  children: PageTreeNode[];
};

export function buildPageTree(pages: GitBookPage[]): PageTreeNode[] {
  const roots: PageTreeNode[] = [];

  for (const page of pages) {
    const segments = page.path.split('/').filter(Boolean);

    if (segments.length === 0) {
      roots.push({ name: page.title, path: page.id, page, children: [] });
      continue;
    }

    let siblings = roots;
    let currentPath = '';

    segments.forEach((segment, index) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      let node = siblings.find((candidate) => candidate.name === segment);

      if (!node) {
        node = { name: segment, path: currentPath, children: [] };
        siblings.push(node);
      }

      if (index === segments.length - 1) {
        node.page = page;
      }

      siblings = node.children;
    });
  }

  return roots;
}