import { captureTabById } from '../lib/thumbnailCache';

chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-overview') {
    chrome.windows.create({
      url: "overview/index.html",
      type: "popup",
      state: "fullscreen"
    });
  }
});

// Capture thumbnail when a tab finishes loading
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active && tab.url && tab.windowId) {
    // Small delay to let rendering finish
    setTimeout(() => {
      captureTabById(tabId, tab.windowId, tab.url!);
    }, 500);
  }
});

// Capture thumbnail when user switches to a tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab && tab.url && tab.windowId) {
    // Small delay to let the tab paint
    setTimeout(() => {
      captureTabById(activeInfo.tabId, tab.windowId, tab.url!);
    }, 300);
  }
});
