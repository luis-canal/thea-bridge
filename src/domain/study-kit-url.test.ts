import { describe, expect, it } from 'vitest';
import { parseStudyKitUrl } from './study-kit-url';

describe('parseStudyKitUrl', () => {
  it('extracts the set id from a Study Kit URL', () => {
    expect(parseStudyKitUrl('https://www.thea.study/smartStudy/1250721117')).toEqual({
      setId: '1250721117',
      url: 'https://www.thea.study/smartStudy/1250721117',
    });
  });

  it('accepts query parameters without changing the route identity', () => {
    expect(parseStudyKitUrl('https://www.thea.study/smartStudy/kit-42?view=cards')?.setId).toBe(
      'kit-42',
    );
  });

  it('rejects non-Thea URLs', () => {
    expect(parseStudyKitUrl('https://example.com/smartStudy/1250721117')).toBeNull();
  });

  it('rejects routes that are not Study Kits', () => {
    expect(parseStudyKitUrl('https://www.thea.study/dashboard')).toBeNull();
  });
});