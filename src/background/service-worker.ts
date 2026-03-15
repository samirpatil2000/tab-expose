import { captureTabById } from '../lib/thumbnailCache';

let lastToggleTime = 0;

async function openOverview() {
  const now = Date.now();
  if (now - lastToggleTime < 500) return; // Debounce triggers
  lastToggleTime = now;

  const overviewUrl = chrome.runtime.getURL("overview/index.html");
  
  // Find all windows to see if any contain our overview page
  // We use includes() to be extra safe with URL matching
  const windows = await chrome.windows.getAll({ populate: true });
  const existingWindow = windows.find(win => 
    win.tabs?.some(t => t.url && t.url.includes(overviewUrl))
  );

  if (existingWindow && existingWindow.id) {
    try {
      await chrome.windows.remove(existingWindow.id);
    } catch (e) {
      console.error('Failed to close window:', e);
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
  if (command === '_execute_action' || command === 'open-overview') {
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
