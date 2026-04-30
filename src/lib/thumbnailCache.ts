import { get, set, del, keys } from 'idb-keyval';

const MAX_THUMBNAILS = 500;

// Cache key prefix to distinguish thumbnail entries from other idb-keyval data
const KEY_PREFIX = 'thumb:';

function cacheKey(tabId: number): string {
  return `${KEY_PREFIX}${tabId}`;
}

interface CacheEntry {
  dataUrl: string;
  timestamp: number;
}

export async function getThumbnail(tabId: number): Promise<string | null> {
  const entry = await get<CacheEntry>(cacheKey(tabId));
  if (entry) {
    // Update LRU timestamp
    entry.timestamp = Date.now();
    await set(cacheKey(tabId), entry);
    return entry.dataUrl;
  }
  return null;
}

// Limit concurrent captures
let activeCaptures = 0;
const captureQueue: (() => void)[] = [];

async function acquireCaptureSlot(): Promise<void> {
  if (activeCaptures < 2) {
    activeCaptures++;
    return Promise.resolve();
  }
  return new Promise(resolve => captureQueue.push(resolve));
}

function releaseCaptureSlot() {
  activeCaptures--;
  if (captureQueue.length > 0) {
    const next = captureQueue.shift();
    if (next) {
      activeCaptures++;
      const delay = Math.floor(Math.random() * 70) + 50;
      setTimeout(next, delay);
    }
  }
}

async function evictIfNecessary() {
  const allKeys = await keys();
  // Only consider our thumbnail keys
  const thumbKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(KEY_PREFIX));
  if (thumbKeys.length <= MAX_THUMBNAILS) return;

  const entries: { key: IDBValidKey, timestamp: number }[] = [];
  for (const key of thumbKeys) {
    const entry = await get<CacheEntry>(key);
    if (entry) {
      entries.push({ key, timestamp: entry.timestamp });
    }
  }

  entries.sort((a, b) => a.timestamp - b.timestamp);
  
  const toEvict = entries.slice(0, entries.length - MAX_THUMBNAILS);
  for (const item of toEvict) {
    await del(item.key);
  }
}

export async function captureTabById(tabId: number, windowId: number, url: string) {
  if (!url) return;
  
  await acquireCaptureSlot();
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.active) return;

    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
      format: "jpeg",
      quality: 80
    });
    
    if (!dataUrl) return;

    // Verify the tab is still the same after the async capture
    const tabAfter = await chrome.tabs.get(tabId);
    if (!tabAfter || !tabAfter.active || tabAfter.url !== url || tabAfter.windowId !== windowId) return;

    const entry: CacheEntry = { dataUrl, timestamp: Date.now() };
    
    await set(cacheKey(tabId), entry);
    evictIfNecessary().catch(console.error);
  } catch (err) {
    console.debug('Background capture failed', err);
  } finally {
    releaseCaptureSlot();
  }
}
