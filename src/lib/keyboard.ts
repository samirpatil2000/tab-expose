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
  onNewTab?: () => void;
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
  if (code.startsWith('Key'))   return code.slice(3).toLowerCase();
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'Period') return '.';
  if (code === 'Comma')  return ',';
  if (code === 'Space')  return ' ';
  return code.toLowerCase();
}

export function matchesShortcut(e: KeyboardEvent, s: ParsedShortcut): boolean {
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

/** Returns true if the key event is a printable character (single char, no ctrl/meta). */
function isPrintableKey(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  // Single printable character
  return e.key.length === 1;
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
  onNewTab,
  closeShortcut
}: KeyboardNavProps) {

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const activeEl = document.activeElement;
    const inInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';

    // --- Global hotkeys (always handled regardless of focus) ---

    if (e.key === 'Escape') {
      e.preventDefault();
      if (inInput) {
        (activeEl as HTMLElement).blur();
      } else {
        onCloseOverview?.();
      }
      return;
    }

    if (closeShortcut && matchesShortcut(e, closeShortcut)) {
      e.preventDefault();
      onCloseOverview?.();
      return;
    }

    // Delete key — close the selected tab (when not typing in the input)
    if (e.key === 'Delete' && !inInput) {
      e.preventDefault();
      if (selectedIndex >= 0) {
        onCloseTab?.(selectedIndex);
      }
      return;
    }

    // Insert — open a new tab
    if (e.key === 'Insert') {
      e.preventDefault();
      onNewTab?.();
      return;
    }

    // Home — jump to the first item
    if (e.key === 'Home') {
      e.preventDefault();
      if (inInput) (activeEl as HTMLElement).blur();
      if (totalItems > 0) onIndexChange(0);
      return;
    }

    // End — jump to the last item
    if (e.key === 'End') {
      e.preventDefault();
      if (inInput) (activeEl as HTMLElement).blur();
      if (totalItems > 0) onIndexChange(totalItems - 1);
      return;
    }

    // PageUp — move one item left (same as ArrowLeft in grid)
    if (e.key === 'PageUp') {
      e.preventDefault();
      if (inInput) (activeEl as HTMLElement).blur();
      if (selectedIndex === 0) {
        onFocusSearch?.();
      } else {
        onIndexChange(Math.max(selectedIndex - 1, 0));
      }
      return;
    }

    // PageDown — move one item right (same as ArrowRight in grid)
    if (e.key === 'PageDown') {
      e.preventDefault();
      if (inInput) (activeEl as HTMLElement).blur();
      const nextIndex = Math.min(selectedIndex + 1, totalItems - 1);
      if (nextIndex !== selectedIndex) onIndexChange(nextIndex);
      return;
    }

    // --- Arrow Down: leave the input and enter grid navigation ---

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (inInput) {
        // Just leave the input and focus the grid — don't advance the index
        (activeEl as HTMLElement).blur();
        return;
      }
      const nextIndex = Math.min(selectedIndex + columns, totalItems - 1);
      if (nextIndex !== selectedIndex && nextIndex >= 0 && nextIndex < totalItems) {
        onIndexChange(nextIndex);
      }
      return;
    }

    // --- Arrow Up: navigate grid; if already in the first row, focus the input ---

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (inInput) return; // already in input, let it be

      const inFirstRow = selectedIndex < columns;
      if (inFirstRow) {
        // Moving "above" the first row → focus the search input
        onFocusSearch?.();
      } else {
        const nextIndex = Math.max(selectedIndex - columns, 0);
        if (nextIndex !== selectedIndex) {
          onIndexChange(nextIndex);
        }
      }
      return;
    }

    // --- Left/Right arrows: navigate grid, or escape input at text boundaries ---

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (inInput) {
        const input = activeEl as HTMLInputElement;
        const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
        const atStart = input.selectionStart === 0 && input.selectionEnd === 0;

        if (e.key === 'ArrowRight' && atEnd) {
          e.preventDefault();
          input.blur();
          const nextIndex = Math.min(selectedIndex + 1, totalItems - 1);
          if (nextIndex !== selectedIndex) onIndexChange(nextIndex);
          return;
        }
        if (e.key === 'ArrowLeft' && atStart) {
          e.preventDefault();
          input.blur();
          const nextIndex = Math.max(selectedIndex - 1, 0);
          if (nextIndex !== selectedIndex) onIndexChange(nextIndex);
          return;
        }
        return; // cursor is mid-text, let the input handle it
      }

      e.preventDefault();
      let nextIndex = selectedIndex;
      if (e.key === 'ArrowRight') {
        nextIndex = Math.min(selectedIndex + 1, totalItems - 1);
      } else {
        // Left arrow on the first item → focus the search input
        if (selectedIndex === 0) {
          onFocusSearch?.();
          return;
        }
        nextIndex = Math.max(selectedIndex - 1, 0);
      }
      if (nextIndex !== selectedIndex && nextIndex >= 0 && nextIndex < totalItems) {
        onIndexChange(nextIndex);
      }
      return;
    }

    // --- Enter always selects the current tab ---

    if (e.key === 'Enter') {
      e.preventDefault();
      onSelect(selectedIndex);
      return;
    }

    // --- Backspace: focus the search input (let it handle the deletion) ---

    if (e.key === 'Backspace') {
      if (!inInput) {
        // Focus the input so the backspace deletes the last char
        onFocusSearch?.();
        // Don't prevent default — the input will handle the keypress naturally
      }
      // If already in input, let it behave normally
      return;
    }

    // --- Printable characters: redirect into the search input ---

    if (isPrintableKey(e)) {
      if (!inInput) {
        // Focus the search input — the character will be typed into it
        onFocusSearch?.();
        // Don't prevent default so the character lands in the input
      }
      // If already in input, let it behave normally
      return;
    }

  }, [totalItems, columns, selectedIndex, onIndexChange, onSelect, onCloseTab, onFocusSearch, onCloseOverview, onNewTab, closeShortcut]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
