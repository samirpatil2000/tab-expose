import { get, set, del, keys, getMany } from 'idb-keyval';

const MAX_THUMBNAILS = 500;

const KEY_PREFIX = 'thumb:';

function cacheKey(tabId: number): string {
  return `${KEY_PREFIX}${tabId}`;
}

interface CacheEntry {
  dataUrl: string;
  timestamp: number;
}

// In-memory cache — populated by prefetch, avoids repeated IDB reads
const memoryCache = new Map<number, string>();

export async function getThumbnail(tabId: number): Promise<string | null> {
  // Check memory cache first (instant)
  const cached = memoryCache.get(tabId);
  if (cached) return cached;

  const entry = await get<CacheEntry>(cacheKey(tabId));
  if (entry) {
    memoryCache.set(tabId, entry.dataUrl);
    // Update LRU timestamp in background — don't block
    set(cacheKey(tabId), { ...entry, timestamp: Date.now() }).catch(() => {});
    return entry.dataUrl;
  }
  return null;
}

/**
 * Get a thumbnail synchronously from the in-memory cache.
 * Returns null if not prefetched yet.
 */
export function getThumbnailSync(tabId: number): string | null {
  return memoryCache.get(tabId) ?? null;
}

/** Prefetch thumbnails for multiple tabs in a single batch IDB read. */
export async function prefetchThumbnails(tabIds: number[]): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  const keysToFetch = tabIds.filter(id => !memoryCache.has(id));

  if (keysToFetch.length === 0) {
    // All already in memory
    for (const id of tabIds) {
      const url = memoryCache.get(id);
      if (url) result.set(id, url);
    }
    return result;
  }

  const entries = await getMany<CacheEntry | undefined>(keysToFetch.map(id => cacheKey(id)));

  for (let i = 0; i < keysToFetch.length; i++) {
    const entry = entries[i];
    if (entry?.dataUrl) {
      memoryCache.set(keysToFetch[i], entry.dataUrl);
      result.set(keysToFetch[i], entry.dataUrl);
    }
  }

  // Also include already-cached ones
  for (const id of tabIds) {
    if (!result.has(id)) {
      const url = memoryCache.get(id);
      if (url) result.set(id, url);
    }
  }

  return result;
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
