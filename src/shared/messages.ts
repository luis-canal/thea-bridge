import type { StudyKitContext } from '../domain/study-kit-url';
import type { GitBookPage } from '../domain/sitemap-types';
import type { GitBookSource } from '../domain/gitbook-url';

export type RuntimeMessage =
  | { type: 'GET_ACTIVE_STUDY_KIT' }
  | { type: 'DISCOVER_GITBOOK_PAGES'; url: string };

export type StudyKitResponse =
  | { ok: true; context: StudyKitContext }
  | { ok: false; reason: 'NO_ACTIVE_TAB' | 'NOT_A_STUDY_KIT' };

export type GitBookResponse =
  | { ok: true; source: GitBookSource; pages: GitBookPage[] }
  | { ok: false; reason: string };

export type RuntimeResponse = StudyKitResponse | GitBookResponse;