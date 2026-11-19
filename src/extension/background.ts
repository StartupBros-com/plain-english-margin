import type { BackgroundRequest } from './messages';

const HOST_URL = 'offscreen.html';

async function ensureHost(): Promise<void> {
  const url = chrome.runtime.getURL(HOST_URL);
  const existing = await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT], documentUrls: [url] });
  if (existing.length > 0) return;
  await chrome.offscreen.createDocument({
    url: HOST_URL,
    reasons: [chrome.offscreen.Reason.DOM_PARSER],
    justification: "Runs the Firebase AI Logic client, which needs a document to reach Chrome's on-device Prompt API.",
  });
}

chrome.runtime.onMessage.addListener((msg: BackgroundRequest, _sender, sendResponse) => {
  if (msg?.target !== 'pem-bg') return false;
  ensureHost().then(
    () => sendResponse({ ok: true }),
    () => sendResponse({ ok: false }),
  );
  return true;
});

// Clicking the toolbar button turns the margin on (or off) for the current tab. No broad site access is needed.
chrome.action.onClicked.addListener((tab) => {
  if (tab.id === undefined) return;
  void chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
});
