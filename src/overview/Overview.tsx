// @ts-nocheck
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FixedSizeGrid as Grid } from 'react-window';
import Fuse from 'fuse.js';
import { getAllTabs, switchToTab, closeTab as apiCloseTab } from '../lib/tabManager';
import type { TabInfo } from '../lib/tabManager';
import { useKeyboardNavigation, parseShortcut } from '../lib/keyboard';
import { TabCard } from './TabCard';
import { SearchBar } from './SearchBar';

const MIN_CARD_WIDTH = 260;
const CARD_HEIGHT = 220; // Thumbnail 160 + footer 60
const MAX_SEARCH_RESULTS = 300;

// Render Grid Cell outside to prevent inline re-render bugs
const Cell = ({ columnIndex, rowIndex, style, data }: any) => {
  const { filteredTabs, columns, selectedIndex, query, handleSelect, handleHighlight, handleCloseTab } = data;
  const index = rowIndex * columns + columnIndex;
  if (index >= filteredTabs.length) return null;
  
  const tab = filteredTabs[index];
  
  return (
    <TabCard
      tab={tab}
      isSelected={index === selectedIndex}
      style={style}
      isEnterAnim={!query} // Only animate on initial load, not search filter
      enterDelay={Math.min(index * 0.03, 0.18)}
      onClick={(e) => handleHighlight(index, e)}
      onClose={(e) => {
        e.stopPropagation();
        handleCloseTab(index);
      }}
    />
  );
};

export function Overview() {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isExiting, setIsExiting] = useState(false);
  const [shortcutKeys, setShortcutKeys] = useState<string[]>(['\u2318', '\u21e7', '.']);
  const [rawShortcut, setRawShortcut] = useState<string>('');
  const [debugKey, setDebugKey] = useState<string>('(none yet)');
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<any>(null);
  const initialLoadDone = useRef(false);

  // Initial load and listen for tab changes
  useEffect(() => {
    let mounted = true;
    
    const fetchTabs = () => {
      getAllTabs().then(res => {
        if (!mounted) return;
        setTabs(res);
        
        if (!initialLoadDone.current && res.length > 0) {
          const activeIdx = res.findIndex(t => t.active);
          if (activeIdx !== -1) {
            setSelectedIndex(activeIdx);
            setTimeout(() => {
              const paddingX = 24;
              const availableWidth = window.innerWidth - (paddingX * 2);
              const cols = Math.max(1, Math.floor(availableWidth / MIN_CARD_WIDTH));
              const targetRow = Math.floor(activeIdx / cols);
              gridRef.current?.scrollToItem({ align: 'auto', rowIndex: targetRow, columnIndex: 0 });
            }, 100);
          }
          initialLoadDone.current = true;
        }
      });
    };

    fetchTabs();

    // Listen for tab movements (dragging to reposition or change windows)
    chrome.tabs.onMoved.addListener(fetchTabs);
    chrome.tabs.onDetached.addListener(fetchTabs);
    chrome.tabs.onAttached.addListener(fetchTabs);
    chrome.tabs.onCreated.addListener(fetchTabs);
    chrome.tabs.onRemoved.addListener(fetchTabs);
    chrome.tabs.onUpdated.addListener(fetchTabs);

    return () => { 
      mounted = false; 
      chrome.tabs.onMoved.removeListener(fetchTabs);
      chrome.tabs.onDetached.removeListener(fetchTabs);
      chrome.tabs.onAttached.removeListener(fetchTabs);
      chrome.tabs.onCreated.removeListener(fetchTabs);
      chrome.tabs.onRemoved.removeListener(fetchTabs);
      chrome.tabs.onUpdated.removeListener(fetchTabs);
    };
  }, []);

  // Update window size
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Fetch extension keyboard shortcut
  useEffect(() => {
    if (chrome?.commands?.getAll) {
      chrome.commands.getAll((commands) => {
        console.log('[Mosaic] commands.getAll:', JSON.stringify(commands));
        const action = commands.find(c => c.name === '_execute_action');
        console.log('[Mosaic] _execute_action shortcut:', action?.shortcut);
        if (action?.shortcut) {
          const keys = action.shortcut.split('+').map(part => {
            if (part === 'Command' || part === 'MacCtrl') return '\u2318';
            if (part === 'Shift') return '\u21e7';
            if (part === 'Alt') return '\u2325';
            if (part === 'Ctrl') return '\u2303';
            if (part === 'Period') return '.';
            if (part === 'Comma') return ',';
            return part.toUpperCase();
          });
          setShortcutKeys(keys);
          setRawShortcut(action.shortcut);
        } else {
          setShortcutKeys([]);
          setRawShortcut('');
        }
      });
    }
  }, []);

  // DEBUG: capture last keydown event for diagnosing shortcut mismatch
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
        setDebugKey(
          `key="${e.key}" code="${e.code}" meta=${e.metaKey} ctrl=${e.ctrlKey} shift=${e.shiftKey} alt=${e.altKey}`
        );
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const closeShortcut = useMemo(() => rawShortcut ? parseShortcut(rawShortcut) : null, [rawShortcut]);

  // Fuzzy search setup
  const fuse = useMemo(() => new Fuse(tabs, {
    keys: ['title', 'url'],
    threshold: 0.3,
    ignoreLocation: true
  }), [tabs]);

  const filteredTabs = useMemo(() => {
    if (!query) return tabs;
    return fuse.search(query, { limit: MAX_SEARCH_RESULTS }).map(res => res.item);
  }, [query, tabs, fuse]);

  // Compute Grid Layout
  const paddingX = 24;
  const paddingY = 24;
  const availableWidth = windowSize.width - (paddingX * 2);
  const columns = Math.max(1, Math.floor(availableWidth / MIN_CARD_WIDTH));
  const columnWidth = availableWidth / columns;
  const rows = Math.ceil(filteredTabs.length / columns);
  const availableHeight = windowSize.height - paddingY * 2 - 80; // 80px for search bar

  // Keyboard Navigation / Mouse Click
  const handleSelect = useCallback((index: number) => {
    const tab = filteredTabs[index];
    if (tab) {
      setIsExiting(true);
      setTimeout(() => {
        switchToTab(tab.id, tab.windowId).then(() => {
          window.close(); // Close the overview window after switching
        });
      }, 120);
    }
  }, [filteredTabs]);

  // Mouse Click
  const handleHighlight = useCallback((index: number, e?: React.MouseEvent) => {
    if (index === selectedIndex) {
      handleSelect(index); // If already selected, open it
    } else {
      setSelectedIndex(index); // Otherwise, select it
    }
  }, [selectedIndex, handleSelect]);

  const handleCloseTab = useCallback((index: number) => {
    const tab = filteredTabs[index];
    if (tab) {
      apiCloseTab(tab.id);
      setTabs(prev => prev.filter(t => t.id !== tab.id));
      if (index >= filteredTabs.length - 1) {
        setSelectedIndex(Math.max(0, filteredTabs.length - 2));
      }
    }
  }, [filteredTabs]);

  const handleFocusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleCloseOverview = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => window.close(), 120);
  }, []);

  const handleOpenShortcutSettings = useCallback(async () => {
    const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
    const target = windows.at(-1);
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts', windowId: target?.id });
    window.close();
  }, []);

  useKeyboardNavigation({
    totalItems: filteredTabs.length,
    columns,
    selectedIndex,
    onIndexChange: (idx) => {
      setSelectedIndex(idx);
      // Scroll into view logic
      const targetRow = Math.floor(idx / columns);
      gridRef.current?.scrollToItem({ rowIndex: targetRow, columnIndex: 0 });
    },
    onSelect: handleSelect,
    onCloseTab: handleCloseTab,
    onFocusSearch: handleFocusSearch,
    onCloseOverview: handleCloseOverview,
    closeShortcut
  });

  // Handle Query change
  const handleQueryChange = (q: string) => {
    setQuery(q);
    setSelectedIndex(0); // Reset selection
    gridRef.current?.scrollToItem({ rowIndex: 0, columnIndex: 0 });
  };

  // Item dependencies for react-window to detect changes
  const itemData = useMemo(() => ({
    filteredTabs,
    columns,
    selectedIndex,
    query,
    handleSelect,
    handleHighlight,
    handleCloseTab
  }), [filteredTabs, columns, selectedIndex, query, handleSelect, handleHighlight, handleCloseTab]);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    // Only close if we clicked directly on the outer container or spacer, not inside a card or search bar
    if (e.target === e.currentTarget) {
      window.close();
    }
  }, []);

  return (
    <motion.div 
      animate={isExiting ? { opacity: 0, scale: 0.97, filter: 'blur(4px)' } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col h-screen w-full bg-[#1A1A1A] text-white overflow-hidden p-6 font-sans"
      onClick={handleBackgroundClick}
    >
      <SearchBar 
        query={query} 
        onQueryChange={handleQueryChange} 
        inputRef={searchInputRef}
      />
      
      <div 
        className="flex-1 w-full mx-auto max-w-[1600px] outline-none flex flex-col"
        onClick={handleBackgroundClick}
      >
        <div className="flex justify-between items-center mb-5 px-3">
          <div className="text-[12px] font-medium text-white/40 tracking-wider uppercase">
            {filteredTabs.length} Tabs
          </div>
          <div 
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg ring-1 ring-black/20 cursor-pointer hover:bg-white/10 transition-colors"
            onClick={handleOpenShortcutSettings}
            title="Click to change shortcut"
          >
            <span className="text-[12px] font-medium text-white/40 tracking-wide">Dismiss</span>
            <div className="flex items-center gap-1">
              {shortcutKeys.length === 0 ? (
                <span className="text-[12px] text-[#4c9aff]">Set shortcut</span>
              ) : (
                shortcutKeys.map((key, i) => (
                  <kbd key={i} className="flex items-center justify-center min-w-[22px] h-[22px] px-1 rounded border border-white/10 bg-white/10 text-white/80 text-[11px] font-sans shadow-sm backdrop-blur-md">
                    {key}
                  </kbd>
                ))
              )}
            </div>
          </div>
        </div>

        {filteredTabs.length > 0 ? (
          <Grid
            ref={gridRef}
            className="outline-none scrollbar-hide"
            columnCount={columns}
            columnWidth={columnWidth}
            rowCount={rows}
            rowHeight={CARD_HEIGHT}
            width={availableWidth}
            height={availableHeight}
            innerElementType="div"
            itemData={itemData}
          >
            {Cell}
          </Grid>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white/40">
            <p>No tabs found for "{query}"</p>
          </div>
        )}
      </div>

      {/* DEBUG OVERLAY – remove after fixing */}
      <div style={{ position: 'fixed', bottom: 8, left: 8, background: 'rgba(0,0,0,0.85)', color: '#4c9aff', fontFamily: 'monospace', fontSize: 11, padding: '6px 10px', borderRadius: 6, zIndex: 9999, pointerEvents: 'none', maxWidth: '90vw', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
        <b>rawShortcut:</b> "{rawShortcut || '(empty)'}"
        {'\n'}<b>closeShortcut:</b> {closeShortcut ? JSON.stringify(closeShortcut) : 'null'}
        {'\n'}<b>last mod+key:</b> {debugKey}
      </div>
    </motion.div>
  );
}
