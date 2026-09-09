import { describe, expect, it } from 'vitest';
import { getSelectionState } from './selection-state';

describe('getSelectionState', () => {
  it.each([
    [0, 0, 'none'],
    [5, 0, 'none'],
    [5, 2, 'partial'],
    [5, 5, 'all'],
  ])('returns %s for %s total and %s selected', (total, selected, expected) => {
    expect(getSelectionState(total, selected)).toBe(expected);
  });
});