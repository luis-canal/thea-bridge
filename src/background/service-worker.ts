import { parseStudyKitUrl } from '../domain/study-kit-url';
import { createMarkdownFile } from '../domain/markdown-file';
import { GitBookClient } from '../integrations/gitbook/gitbook-client';
import { TheaClient } from '../integrations/thea/thea-client';
import type { GitBookPage } from '../domain/sitemap-types';
import type { RuntimeMessage, RuntimeResponse } from '../shared/messages';

void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
const gitBookClient = new GitBookClient();
const theaClient = new TheaClient();

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