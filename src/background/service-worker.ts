import { parseStudyKitUrl } from '../domain/study-kit-url';
import { createMarkdownFile } from '../domain/markdown-file';
import { GitBookClient } from '../integrations/gitbook/gitbook-client';
import { TheaClient } from '../integrations/thea/thea-client';
import { ImportJob, type ImportJobState } from '../domain/import-job';
import type { GitBookPage } from '../domain/sitemap-types';
import type { RuntimeMessage, RuntimeResponse } from '../shared/messages';

void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
const gitBookClient = new GitBookClient();
const theaClient = new TheaClient();
const importJobs = new Map<string, ImportJob>();

chrome.runtime.onMessage.addListener(
  (message: RuntimeMessage, _sender, sendResponse: (response: RuntimeResponse) => void) => {
    if (message.type === 'GET_ACTIVE_STUDY_KIT') {
      void getActiveStudyKit().then(sendResponse);
      return true;
    }

    if (message.type === 'DISCOVER_GITBOOK_PAGES') {
      void discoverGitBookPages(message.url).then(sendResponse);
      return true;
    }

    if (message.type === 'DOWNLOAD_MARKDOWN_PAGES') {
      void downloadMarkdownPages(message.pages).then(sendResponse);
      return true;
    }

    if (message.type === 'IMPORT_MARKDOWN_PAGE') {
      void importMarkdownPage(message.setId, message.page).then(sendResponse);
      return true;
    }

    if (message.type === 'START_IMPORT') {
      void startImport(message.jobId, message.setId, message.pages).then(sendResponse);
      return true;
    }

    if (message.type === 'CANCEL_IMPORT') {
      return cancelImport(message.jobId, sendResponse);
    }

    if (message.type === 'RETRY_IMPORT_PAGE') {
      void retryImportPage(message.jobId, message.pageId).then(sendResponse);
      return true;
    }

    return false;
  },
);

async function getActiveStudyKit(): Promise<RuntimeResponse> {
  const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

  if (!activeTab?.url) {
    return { ok: false, reason: 'NO_ACTIVE_TAB' };
  }

  const context = parseStudyKitUrl(activeTab.url);

  if (!context) {
    return { ok: false, reason: 'NOT_A_STUDY_KIT' };
  }

  return { ok: true, context };
}

async function discoverGitBookPages(inputUrl: string): Promise<RuntimeResponse> {
  try {
    return { ok: true, ...(await gitBookClient.discoverPages(inputUrl)) };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'SITEMAP_REQUEST_FAILED',
    };
  }
}

async function downloadMarkdownPages(pages: GitBookPage[]) {
  const results = [];

  for (const page of pages) {
    try {
      const content = await gitBookClient.fetchMarkdown(page);
      results.push({ pageId: page.id, ok: true as const, content });
    } catch (error) {
      results.push({
        pageId: page.id,
        ok: false as const,
        reason: error instanceof Error ? error.message : 'MARKDOWN_REQUEST_FAILED',
      });
    }
  }

  return { ok: true as const, results };
}

async function importMarkdownPage(setId: string, page: GitBookPage) {
  try {
    const content = await gitBookClient.fetchMarkdown(page);
    const file = createMarkdownFile(page, content);
    const result = await theaClient.importFile(file, setId);
    await refreshActiveStudyKit(setId);
    return { ok: true as const, fileId: result.fileId };
  } catch (error) {
    return {
      ok: false as const,
      reason: error instanceof Error ? error.message : 'THEA_IMPORT_FAILED',
    };
  }
}

async function startImport(jobId: string, setId: string, pages: GitBookPage[]) {
  if (importJobs.has(jobId)) {
    return { ok: false as const, reason: 'IMPORT_JOB_ALREADY_EXISTS' };
  }

  const job = createImportJob(jobId, setId, pages);
  importJobs.set(jobId, job);
  const initialState = job.snapshot;
  void runImportJob(job, setId);
  return { ok: true as const, state: initialState };
}

function cancelImport(jobId: string, sendResponse: (response: RuntimeResponse) => void): boolean {
  const job = importJobs.get(jobId);

  if (!job) {
    sendResponse({ ok: false, reason: 'IMPORT_JOB_NOT_FOUND' });
    return false;
  }

  job.cancel();
  sendResponse({ ok: true, state: job.snapshot });
  return false;
}

async function retryImportPage(jobId: string, pageId: string) {
  const job = importJobs.get(jobId);

  if (!job) {
    return { ok: false as const, reason: 'IMPORT_JOB_NOT_FOUND' };
  }

  return { ok: true as const, state: await job.retry(pageId) };
}

function createImportJob(jobId: string, setId: string, pages: GitBookPage[]): ImportJob {
  return new ImportJob(jobId, setId, pages, {
    gitBookClient,
    theaClient,
    onUpdate: (state) => {
      void chrome.runtime.sendMessage({ type: 'IMPORT_PROGRESS', state });
    },
  });
}

async function runImportJob(job: ImportJob, setId: string): Promise<void> {
  const state = await job.run();

  if (state.pages.some(({ status }) => status === 'imported')) {
    await refreshActiveStudyKit(setId);
  }
}

async function refreshActiveStudyKit(setId: string): Promise<void> {
  const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

  if (!activeTab?.id || !activeTab.url) {
    return;
  }

  const context = parseStudyKitUrl(activeTab.url);

  if (context?.setId !== setId) {
    return;
  }

  await chrome.tabs.reload(activeTab.id);
}