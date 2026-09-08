import type { StudyKitContext } from '../domain/study-kit-url';

export type RuntimeMessage = {
  type: 'GET_ACTIVE_STUDY_KIT';
};

export type RuntimeResponse =
  | { ok: true; context: StudyKitContext }
  | { ok: false; reason: 'NO_ACTIVE_TAB' | 'NOT_A_STUDY_KIT' };