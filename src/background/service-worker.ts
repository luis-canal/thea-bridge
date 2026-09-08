import { parseStudyKitUrl } from '../domain/study-kit-url';
import type { RuntimeMessage, RuntimeResponse } from '../shared/messages';

void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.runtime.onMessage.addListener(
  (message: RuntimeMessage, _sender, sendResponse: (response: RuntimeResponse) => void) => {
    if (message.type !== 'GET_ACTIVE_STUDY_KIT') {
      return false;
    }

    void getActiveStudyKit().then(sendResponse);
    return true;
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