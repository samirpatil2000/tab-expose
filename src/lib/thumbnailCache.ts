import { get, set, del, keys } from 'idb-keyval';
import type { TabInfo } from './tabManager';

const MAX_THUMBNAILS = 500;
const THUMBNAIL_WIDTH = 320;
const THUMBNAIL_HEIGHT = 200;

interface CacheEntry {
  dataUrl: string;
  timestamp: number;
}

export async function getThumbnail(url: string): Promise<string | null> {
  if (!url || url.startsWith('chrome://')) return null;
  const entry = await get<CacheEntry>(url);
  if (entry) {
    // Update LRU timestamp
    entry.timestamp = Date.now();
    await set(url, entry);
    return entry.dataUrl;
  }
  return null;
}

// Resizes a data URL visually using an offscreen canvas
function resizeThumbnail(dataUrl: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve(dataUrl); // Fallback
      }

      // Calculate cover dimensions
      const imgAspect = img.width / img.height;
      const targetAspect = width / height;
      
      let drawWidth = width;
      let drawHeight = height;
      let offsetX = 0;
      let offsetY = 0;

      if (imgAspect > targetAspect) {
        drawWidth = height * imgAspect;
        offsetX = (width - drawWidth) / 2;
      } else {
        drawHeight = width / imgAspect;
        offsetY = (height - drawHeight) / 2;
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
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
      // Wait 50-120ms between captures as per requirements
      const delay = Math.floor(Math.random() * 70) + 50;
      setTimeout(next, delay);
    }
  }
}

async function evictIfNecessary() {
  const allKeys = await keys();
  if (allKeys.length <= MAX_THUMBNAILS) return;

  // Need to read all entries to sort by timestamp
  const entries: { url: IDBValidKey, timestamp: number }[] = [];
  for (const key of allKeys) {
    const entry = await get<CacheEntry>(key);
    if (entry) {
      entries.push({ url: key, timestamp: entry.timestamp });
    }
  }

  entries.sort((a, b) => a.timestamp - b.timestamp);
  
  // Evict earliest items
  const toEvict = entries.slice(0, entries.length - MAX_THUMBNAILS);
  for (const item of toEvict) {
    await del(item.url);
  }
}

export async function captureAndStoreThumbnail(tab: TabInfo): Promise<string | null> {
  if (!tab.url || tab.url.startsWith('chrome://')) return null;

  // We can ONLY capture the visible tab of a window. 
  // If we try to capture a background tab, it captures the active tab instead.
  if (!tab.active) {
    return null;
  }

  await acquireCaptureSlot();
  
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: "jpeg",
      quality: 60
    });
    
    if (!dataUrl) return null;

    const resizedUrl = await resizeThumbnail(dataUrl, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
    const entry: CacheEntry = { dataUrl: resizedUrl, timestamp: Date.now() };
    
    await set(tab.url, entry);
    // Best effort background eviction
    evictIfNecessary().catch(console.error);

    return resizedUrl;
  } catch (err) {
    // Expected to fail if tab doesn't have focus or permission issues
    console.debug('Failed to capture tab', tab.id, err);
    return null;
  } finally {
    releaseCaptureSlot();
  }
}

// Add a helper for the background script to capture a specific tab ID
export async function captureTabById(tabId: number, windowId: number, url: string) {
  if (!url || url.startsWith('chrome://')) return;
  
  await acquireCaptureSlot();
  try {
    // Race condition prevention: verify the tab hasn't changed during the delay
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.active) return;

    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
      format: "jpeg",
      quality: 60
    });
    
    if (!dataUrl) return;

    // Second check: verify it's STILL active after the async capture
    const tabAfter = await chrome.tabs.get(tabId);
    if (!tabAfter || !tabAfter.active || tabAfter.url !== url) return;

    const resizedUrl = await resizeThumbnail(dataUrl, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
    const entry: CacheEntry = { dataUrl: resizedUrl, timestamp: Date.now() };
    
    await set(url, entry);
    evictIfNecessary().catch(console.error);
  } catch (err) {
    console.debug('Background capture failed', err);
  } finally {
    releaseCaptureSlot();
  }
}
