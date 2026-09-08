import { createMarkdownFile } from './markdown-file';
import type { GitBookPage } from './sitemap-types';
import type { GitBookClient } from '../integrations/gitbook/gitbook-client';
import type { TheaClient } from '../integrations/thea/thea-client';

export type ImportStage = 'download' | 'upload' | 'attach';
export type ImportPageStatus = 'pending' | 'processing' | 'imported' | 'failed' | 'cancelled';

export type ImportPageState = {
  page: GitBookPage;
  status: ImportPageStatus;
  stage?: ImportStage;
  fileId?: string;
  error?: string;
};

export type ImportJobState = {
  jobId: string;
  setId: string;
  status: 'running' | 'completed' | 'cancelled';
  pages: ImportPageState[];
};

type ImportDependencies = {
  gitBookClient: Pick<GitBookClient, 'fetchMarkdown'>;
  theaClient: Pick<TheaClient, 'uploadFile' | 'attachFileToSet'>;
  onUpdate: (state: ImportJobState) => void;
};

export class ImportJob {
  private readonly state: ImportJobState;
  private cancelled = false;

  constructor(
    jobId: string,
    setId: string,
    pages: GitBookPage[],
    private readonly dependencies: ImportDependencies,
  ) {
    this.state = {
      jobId,
      setId,
      status: 'running',
      pages: pages.map((page) => ({ page, status: 'pending' })),
    };
  }

  get snapshot(): ImportJobState {
    return cloneJobState(this.state);
  }

  cancel(): void {
    this.cancelled = true;
  }

  async run(): Promise<ImportJobState> {
    for (const pageState of this.state.pages) {
      if (this.cancelled) {
        this.cancelPendingPages();
        break;
      }

      if (pageState.status !== 'pending') {
        continue;
      }

      await this.processPage(pageState);
    }

    this.state.status = this.cancelled ? 'cancelled' : 'completed';
    this.emit();
    return this.snapshot;
  }

  async retry(pageId: string): Promise<ImportJobState> {
    const pageState = this.state.pages.find(({ page }) => page.id === pageId);

    if (!pageState || pageState.status !== 'failed') {
      return this.snapshot;
    }

    pageState.status = 'pending';
    pageState.stage = undefined;
    pageState.error = undefined;
    this.state.status = 'running';
    this.cancelled = false;
    this.emit();
    return this.run();
  }

  private async processPage(pageState: ImportPageState): Promise<void> {
    pageState.status = 'processing';
    pageState.stage = 'download';
    this.emit();

    try {
      const content = await this.dependencies.gitBookClient.fetchMarkdown(pageState.page);
      this.throwIfCancelled(pageState);

      pageState.stage = 'upload';
      this.emit();
      const fileId = await this.dependencies.theaClient.uploadFile(
        createMarkdownFile(pageState.page, content),
      );
      pageState.fileId = fileId;
      this.throwIfCancelled(pageState);

      pageState.stage = 'attach';
      this.emit();
      await this.dependencies.theaClient.attachFileToSet(fileId, this.state.setId);
      pageState.status = 'imported';
      pageState.stage = undefined;
      this.emit();
    } catch (error) {
      if (error instanceof ImportCancelledError) {
        pageState.status = 'cancelled';
        pageState.stage = undefined;
        this.emit();
        return;
      }

      pageState.status = 'failed';
      pageState.error = error instanceof Error ? error.message : 'IMPORT_FAILED';
      this.emit();
    }
  }

  private throwIfCancelled(pageState: ImportPageState): void {
    if (this.cancelled) {
      throw new ImportCancelledError(pageState.page.id);
    }
  }

  private cancelPendingPages(): void {
    for (const pageState of this.state.pages) {
      if (pageState.status === 'pending') {
        pageState.status = 'cancelled';
      }
    }
  }

  private emit(): void {
    this.dependencies.onUpdate(this.snapshot);
  }
}

export class ImportCancelledError extends Error {
  constructor(pageId: string) {
    super(`IMPORT_CANCELLED:${pageId}`);
  }
}

function cloneJobState(state: ImportJobState): ImportJobState {
  return {
    ...state,
    pages: state.pages.map((pageState) => ({ ...pageState, page: { ...pageState.page } })),
  };
}