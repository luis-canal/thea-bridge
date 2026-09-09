import { describe, expect, it, vi } from 'vitest';
import { ImportJob, type ImportJobState } from './import-job';
import type { GitBookPage } from './sitemap-types';

const pages: GitBookPage[] = [
  { id: 'one', title: 'One', titleSource: 'path-fallback', url: 'https://example.com/one', path: 'one' },
  { id: 'two', title: 'Two', titleSource: 'path-fallback', url: 'https://example.com/two', path: 'two' },
];

function createJob(
  overrides: Partial<{
    fetchMarkdown: (page: GitBookPage) => Promise<string>;
    uploadFile: () => Promise<string>;
    attachFileToSet: () => Promise<void>;
  }> = {},
) {
  const updates: ImportJobState[] = [];
  const job = new ImportJob('job-1', 'set-1', pages, {
    gitBookClient: {
      fetchMarkdown: overrides.fetchMarkdown ?? vi.fn().mockResolvedValue('# page'),
    },
    theaClient: {
      uploadFile: overrides.uploadFile ?? vi.fn().mockResolvedValue('file-1'),
      attachFileToSet: overrides.attachFileToSet ?? vi.fn().mockResolvedValue(undefined),
    },
    onUpdate: (state) => updates.push(state),
  });

  return { job, updates };
}

describe('ImportJob', () => {
  it('processes pages sequentially and records file ids', async () => {
    const order: string[] = [];
    const { job } = createJob({
      fetchMarkdown: vi.fn(async (page) => {
        order.push(`download:${page.id}`);
        return `# ${page.title}`;
      }),
      uploadFile: vi.fn(async () => {
        order.push('upload');
        return `file-${order.filter((entry) => entry === 'upload').length}`;
      }),
      attachFileToSet: vi.fn(async () => {
        order.push('attach');
      }),
    });

    const result = await job.run();

    expect(order).toEqual(['download:one', 'upload', 'attach', 'download:two', 'upload', 'attach']);
    expect(result.pages.map(({ status, fileId }) => ({ status, fileId }))).toEqual([
      { status: 'imported', fileId: 'file-1' },
      { status: 'imported', fileId: 'file-2' },
    ]);
  });

  it('keeps a failed page isolated and retries it individually', async () => {
    const uploadFile = vi.fn().mockRejectedValueOnce(new Error('FILE_UPLOAD_FAILED:500')).mockResolvedValue('file-1');
    const { job } = createJob({ uploadFile });

    const firstRun = await job.run();

    expect(firstRun.pages[0]).toMatchObject({ status: 'failed', stage: 'upload', error: 'FILE_UPLOAD_FAILED:500' });
    expect(firstRun.pages[1].status).toBe('imported');

    const retried = await job.retry('one');

    expect(retried.pages[0]).toMatchObject({ status: 'imported', fileId: 'file-1' });
  });

  it('keeps the file id when association fails', async () => {
    const { job } = createJob({
      attachFileToSet: vi.fn().mockRejectedValue(new Error('MATERIAL_ATTACH_FAILED:500')),
    });

    const result = await job.run();

    expect(result.pages[0]).toMatchObject({
      status: 'failed',
      stage: 'attach',
      fileId: 'file-1',
      error: 'MATERIAL_ATTACH_FAILED:500',
    });
  });

  it('cancels pending pages without starting them', async () => {
    const { job } = createJob();
    job.cancel();

    const result = await job.run();

    expect(result.status).toBe('cancelled');
    expect(result.pages.every(({ status }) => status === 'cancelled')).toBe(true);
  });
});