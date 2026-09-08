import type { GitBookPage } from './sitemap-types';

export type MarkdownFile = {
  pageId: string;
  fileName: string;
  blob: Blob;
};

export function createMarkdownFile(page: GitBookPage, content: string): MarkdownFile {
  const fileName = getMarkdownFileName(page);

  return {
    pageId: page.id,
    fileName,
    blob: new Blob([content], { type: 'text/markdown;charset=utf-8' }),
  };
}

export function getMarkdownFileName(page: GitBookPage): string {
  const lastSegment = page.path.split('/').filter(Boolean).at(-1) ?? page.title;
  const safeName = sanitizeFileName(lastSegment);
  return `${safeName || 'page'}.md`;
}

function sanitizeFileName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .toLowerCase();
}