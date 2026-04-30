import { captureTabById } from '../lib/thumbnailCache';

let lastToggleTime = 0;

async function openOverview() {
  const now = Date.now();
  if (now - lastToggleTime < 500) return; // Debounce triggers
  lastToggleTime = now;

  const overviewUrl = chrome.runtime.getURL("overview/index.html");
  
  // Check if an overview tab already exists in any window (match with or without query params)
  const tabs = await chrome.tabs.query({ url: overviewUrl + '*' });

  if (tabs.length > 0 && tabs[0].id) {
    // Toggle: close the existing overview tab
    try {
      await chrome.tabs.remove(tabs[0].id);
    } catch (e) {
      console.error('Failed to close tab:', e);
    }
    return;
  }

  // Find the currently active tab before opening the overview
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const sourceTabId = activeTab?.id;

  // Open as a regular maximized tab, passing the source tab ID
  const url = sourceTabId
    ? `${overviewUrl}?from=${sourceTabId}`
    : overviewUrl;
  chrome.tabs.create({ url, active: true });
}

chrome.commands.onCommand.addListener((command) => {
  if (command === '_execute_action' || command === 'open-overview') {
    openOverview();
  }
});

chrome.action.onClicked.addListener(() => {
  openOverview();
});

// Capture thumbnail when a tab finishes loading
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active && tab.url && tab.windowId) {
    new Promise<void>(resolve => setTimeout(resolve, 500)).then(() => {
      captureTabById(tabId, tab.windowId!, tab.url!);
    });
  }
});

// Capture thumbnail when user switches to a tab
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId).then(tab => {
    if (!tab?.url || !tab.active) return;
    return new Promise<void>(resolve => setTimeout(resolve, 300)).then(() => {
      captureTabById(activeInfo.tabId, tab.windowId, tab.url!);
    });
  });
});
