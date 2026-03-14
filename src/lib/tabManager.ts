export interface TabInfo {
  id: number;
  title: string;
  url: string;
  favIconUrl: string;
  windowId: number;
  active: boolean;
}

export async function getAllTabs(): Promise<TabInfo[]> {
  const currentWindow = await chrome.windows.getCurrent();
  const tabs = await chrome.tabs.query({});
  
  const mappedTabs: TabInfo[] = tabs
    .filter(tab => tab.id !== undefined)
    .map(tab => ({
      id: tab.id!,
      title: tab.title || 'Untitled',
      url: tab.url || '',
      favIconUrl: tab.favIconUrl || '',
      windowId: tab.windowId,
      active: tab.active
    }));

  // Sort: Active tab (current window) -> Current Window -> Other Windows
  mappedTabs.sort((a, b) => {
    // Both in current window, active comes first
    if (a.windowId === currentWindow.id && b.windowId === currentWindow.id) {
      if (a.active) return -1;
      if (b.active) return 1;
      return 0;
    }
    
    if (a.windowId === currentWindow.id) return -1;
    if (b.windowId === currentWindow.id) return 1;
    
    // Both in other windows, preserve existing order or group by windowId
    return a.windowId - b.windowId;
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
