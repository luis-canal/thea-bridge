import { parseStudyKitUrl } from '../domain/study-kit-url';
import { GitBookClient } from '../integrations/gitbook/gitbook-client';
import type { RuntimeMessage, RuntimeResponse } from '../shared/messages';

void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
const gitBookClient = new GitBookClient();

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