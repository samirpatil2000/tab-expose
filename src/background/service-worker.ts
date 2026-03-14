import { captureTabById } from '../lib/thumbnailCache';

async function openOverview() {
  const overviewUrl = chrome.runtime.getURL("overview/index.html");
  
  // Check if the overview is already open
  const tabs = await chrome.tabs.query({ url: overviewUrl });
  if (tabs.length > 0) {
    // Toggle: Close the existing window if it's already open
    const tab = tabs[0];
    if (tab.windowId) {
      await chrome.windows.remove(tab.windowId);
    }
    return;
  }

  chrome.windows.create({
    url: overviewUrl,
    type: "popup",
    state: "fullscreen"
  });
}

chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-overview') {
    openOverview();
  }
});

chrome.action.onClicked.addListener(() => {
  openOverview();
});

// Capture thumbnail when a tab finishes loading
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active && tab.url && tab.windowId && !tab.url.startsWith('chrome://')) {
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
