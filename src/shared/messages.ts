import type { StudyKitContext } from '../domain/study-kit-url';
import type { GitBookPage } from '../domain/sitemap-types';
import type { GitBookSource } from '../domain/gitbook-url';
import type { ImportJobState } from '../domain/import-job';

export type MarkdownDownloadResult =
  | { pageId: string; ok: true; content: string }
  | { pageId: string; ok: false; reason: string };

export type StudyKitResponse =
  | { ok: true; context: StudyKitContext }
  | { ok: false; reason: 'NO_ACTIVE_TAB' | 'NOT_A_STUDY_KIT' };

export type GitBookResponse =
  | { ok: true; source: GitBookSource; pages: GitBookPage[] }
  | { ok: false; reason: string };

export type MarkdownDownloadResponse =
  | { ok: true; results: MarkdownDownloadResult[] }
  | { ok: false; reason: string };

export type ImportMarkdownResponse =
  | { ok: true; fileId: string }
  | { ok: false; reason: string };

export type ImportJobResponse =
  | { ok: true; state: ImportJobState }
  | { ok: false; reason: string };

export type ImportProgressMessage = {
  type: 'IMPORT_PROGRESS';
  state: ImportJobState;
};

export type RuntimeMessage =
  | { type: 'GET_ACTIVE_STUDY_KIT' }
  | { type: 'DISCOVER_GITBOOK_PAGES'; url: string }
  | { type: 'DOWNLOAD_MARKDOWN_PAGES'; pages: GitBookPage[] }
  | { type: 'IMPORT_MARKDOWN_PAGE'; setId: string; page: GitBookPage }
  | { type: 'START_IMPORT'; jobId: string; setId: string; pages: GitBookPage[] }
  | { type: 'CANCEL_IMPORT'; jobId: string }
  | { type: 'RETRY_IMPORT_PAGE'; jobId: string; pageId: string };

export type RuntimeResponse =
  | StudyKitResponse
  | GitBookResponse
  | MarkdownDownloadResponse
  | ImportMarkdownResponse
  | ImportJobResponse;