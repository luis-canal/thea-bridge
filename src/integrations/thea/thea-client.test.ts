import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMarkdownFile } from '../../domain/markdown-file';
import { TheaClient } from './thea-client';

const file = createMarkdownFile(
  { id: 'page', title: 'Intro', url: 'https://example.com/intro', path: 'intro' },
  '# Intro',
);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TheaClient', () => {
  it('uploads the file and attaches it to the Study Kit', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'file-123' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await expect(new TheaClient().importFile(file, '1250721117')).resolves.toEqual({ fileId: 'file-123' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('https://www.thea.study/files');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(fetchMock.mock.calls[0][1]?.body).toBeInstanceOf(FormData);
    expect(fetchMock.mock.calls[1][0]).toBe('https://www.thea.study/sets/1250721117/materials');
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      fileIds: ['file-123'],
      setIds: [],
    });
  });

  it('reports an expired session', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 401 }));

    await expect(new TheaClient().importFile(file, '1250721117')).rejects.toThrow('THEA_SESSION_EXPIRED');
  });

  it('rejects an incompatible upload response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ processed: true }), { status: 200 }));

    await expect(new TheaClient().importFile(file, '1250721117')).rejects.toThrow(
      'INCOMPATIBLE_FILE_RESPONSE',
    );
  });

  it('does not attach a file that is still processing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'file-123', processed: false }), { status: 200 }),
    );

    await expect(new TheaClient().importFile(file, '1250721117')).rejects.toThrow('FILE_NOT_PROCESSED');
  });

  it('rejects an explicit material association error', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'file-123', processed: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'invalid set' }), { status: 200 }));

    await expect(new TheaClient().importFile(file, '1250721117')).rejects.toThrow(
      'MATERIAL_ATTACH_REJECTED',
    );
  });

  it('reports an attachment failure separately from upload', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'file-123' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 500 }));

    await expect(new TheaClient().importFile(file, '1250721117')).rejects.toThrow(
      'MATERIAL_ATTACH_FAILED:500',
    );
  });
});