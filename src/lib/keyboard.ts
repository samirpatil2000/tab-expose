import { useEffect, useCallback } from 'react';

interface KeyboardNavProps {
  totalItems: number;
  columns: number;
  selectedIndex: number;
  onIndexChange: (newIndex: number) => void;
  onSelect: (index: number) => void;
  onCloseTab?: (index: number) => void;
  onFocusSearch?: () => void;
  onCloseOverview?: () => void;
  closeShortcut?: ParsedShortcut | null;
}

export interface ParsedShortcut {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  key: string;
}

export function parseShortcut(shortcut: string): ParsedShortcut {
  const parsed: ParsedShortcut = {
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    key: ''
  };

  // Chrome normally returns "Modifier+Key" (e.g. "Alt+Z", "Command+Shift+Period").
  // But defensively also handle Unicode symbols directly (e.g. "\u2325Z" = "⌥Z").
  function applyPart(part: string) {
    switch (part) {
      case 'Command': case '\u2318': parsed.metaKey = true; break;
      case 'MacCtrl': case 'Ctrl':   parsed.ctrlKey = true; break;
      case '\u2303':                 parsed.ctrlKey = true; break;
      case 'Shift':   case '\u21e7': parsed.shiftKey = true; break;
      case 'Alt':     case '\u2325': parsed.altKey = true; break;
      case 'Period':  parsed.key = '.'; break;
      case 'Comma':   parsed.key = ','; break;
      case 'Space':   parsed.key = ' '; break;
      default:
        if (part.length > 1) {
          // Could be concatenated unicode modifiers like "⌥Z" with no + separator.
          for (const char of part) {
            if (char === '\u2318')      parsed.metaKey = true;
            else if (char === '\u2325') parsed.altKey = true;
            else if (char === '\u21e7') parsed.shiftKey = true;
            else if (char === '\u2303') parsed.ctrlKey = true;
            else                        parsed.key = char.toLowerCase();
          }
        } else {
          parsed.key = part.toLowerCase();
        }
    }
  }

  shortcut.split('+').forEach(applyPart);
  return parsed;
}

/** Derive the layout-independent base key from e.code (unaffected by modifiers). */
function baseKeyFromCode(code: string): string {
  if (code.startsWith('Key'))   return code.slice(3).toLowerCase();  // "KeyZ" → "z"
  if (code.startsWith('Digit')) return code.slice(5);                 // "Digit1" → "1"
  if (code === 'Period') return '.';
  if (code === 'Comma')  return ',';
  if (code === 'Space')  return ' ';
  return code.toLowerCase();
}

export function matchesShortcut(e: KeyboardEvent, s: ParsedShortcut): boolean {
  // Use e.code for key matching — it reflects the PHYSICAL key and is unaffected by
  // modifier keys. This is critical on Mac where Option/Shift change e.key entirely
  // (e.g. Option+Z → e.key="Ω", but e.code="KeyZ" always).
  const keyMatches =
    e.key.toLowerCase() === s.key ||
    baseKeyFromCode(e.code) === s.key;

  return (
    e.metaKey  === s.metaKey  &&
    e.ctrlKey  === s.ctrlKey  &&
    e.shiftKey === s.shiftKey &&
    e.altKey   === s.altKey   &&
    keyMatches
  );
}

export function useKeyboardNavigation({
  totalItems,
  columns,
  selectedIndex,
  onIndexChange,
  onSelect,
  onCloseTab,
  onFocusSearch,
  onCloseOverview,
  closeShortcut
}: KeyboardNavProps) {

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore keystrokes if focused on an input, unless it's a specific hotkey
    const activeEl = document.activeElement;
    const inInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';

    if (e.key === 'Escape') {
      e.preventDefault();
      onCloseOverview?.();
      return;
    }

    if (closeShortcut && matchesShortcut(e, closeShortcut)) {
      e.preventDefault();
      onCloseOverview?.();
      return;
    }

    // CMD+F or CTRL+F
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      onFocusSearch?.();
      return;
    }

    // CMD+W or CTRL+W
    if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
      e.preventDefault();
      if (!inInput && selectedIndex >= 0) {
        onCloseTab?.(selectedIndex);
      }
      return;
    }

    if (inInput) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSelect(selectedIndex);
      }
      // Allow down arrow to move out of search to first item maybe?
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        (activeEl as HTMLElement).blur();
        onIndexChange(0);
      }
      return;
    }

    e.preventDefault(); // Prevent default scrolling for arrows and space

    let nextIndex = selectedIndex;

    switch (e.key) {
      case 'ArrowRight':
        nextIndex = Math.min(selectedIndex + 1, totalItems - 1);
        break;
      case 'ArrowLeft':
        nextIndex = Math.max(selectedIndex - 1, 0);
        break;
      case 'ArrowDown':
        nextIndex = Math.min(selectedIndex + columns, totalItems - 1);
        break;
      case 'ArrowUp':
        nextIndex = Math.max(selectedIndex - columns, 0);
        break;
      case 'Enter':
        onSelect(selectedIndex);
        return;
    }

    if (nextIndex !== selectedIndex && nextIndex >= 0 && nextIndex < totalItems) {
      onIndexChange(nextIndex);
    }

  }, [totalItems, columns, selectedIndex, onIndexChange, onSelect, onCloseTab, onFocusSearch, onCloseOverview, closeShortcut]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
