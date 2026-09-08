import { describe, expect, it } from 'vitest';
import { buildCsrfHeaders } from './thea-client';

describe('Thea CSRF integration', () => {
  it('decodes the CSRF cookie into the request header', () => {
    expect(buildCsrfHeaders({ name: 'XSRF-TOKEN', value: 'token%2Bvalue' })).toEqual({
      'X-XSRF-TOKEN': 'token+value',
    });
  });

  it('omits the header when no CSRF cookie is available', () => {
    expect(buildCsrfHeaders()).toEqual({});
  });
});