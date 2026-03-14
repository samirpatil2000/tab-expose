export interface TabInfo {
  id: number;
  title: string;
  url: string;
  favIconUrl: string;
  windowId: number;
  active: boolean;
  index: number;
}

export async function getAllTabs(): Promise<TabInfo[]> {
  // Explictly get the last normal browser window
  const lastFocused = await chrome.windows.getLastFocused({ windowTypes: ['normal'] }).catch(() => null);
  
  const allTabs = await chrome.tabs.query({});
  const extensionUrl = chrome.runtime.getURL('');
  
  const mappedTabs: TabInfo[] = allTabs
    .filter(tab => tab.id !== undefined && (!tab.url || !tab.url.startsWith(extensionUrl)))
    .map(tab => ({
      id: tab.id!,
      title: tab.title || 'Untitled',
      url: tab.url || '',
      favIconUrl: tab.favIconUrl || '',
      windowId: tab.windowId,
      active: tab.active,
      index: tab.index
    }));

  const targetWindowId = lastFocused ? lastFocused.id : mappedTabs.find(t => t.active)?.windowId;

  // MUST EXPLICITLY SORT. chrome.tabs.query order is not guaranteed.
  mappedTabs.sort((a, b) => {
    // If they are in different windows, prioritize the target window, then sort by window ID
    if (a.windowId !== b.windowId) {
      if (a.windowId === targetWindowId) return -1;
      if (b.windowId === targetWindowId) return 1;
      return a.windowId - b.windowId;
    }
    // WITHIN THE SAME WINDOW: Sort mathematically left-to-right (0, 1, 2...)
    return a.index - b.index;
  });

  return mappedTabs;
}

export async function switchToTab(tabId: number, windowId: number) {
  await chrome.tabs.update(tabId, { active: true });
  await chrome.windows.update(windowId, { focused: true });
}

export async function closeTab(tabId: number) {
  await chrome.tabs.remove(tabId);
}
