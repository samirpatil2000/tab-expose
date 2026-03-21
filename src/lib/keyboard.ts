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
}

export function useKeyboardNavigation({
  totalItems,
  columns,
  selectedIndex,
  onIndexChange,
  onSelect,
  onCloseTab,
  onFocusSearch,
  onCloseOverview
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

    // CMD+SHIFT+Y, CMD+SHIFT+M, or CMD+SHIFT+. (or CTRL) to toggle close
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key.toLowerCase() === 'y' || e.key.toLowerCase() === 'm' || e.key === '.' || e.key === '>')) {
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

  }, [totalItems, columns, selectedIndex, onIndexChange, onSelect, onCloseTab, onFocusSearch, onCloseOverview]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
