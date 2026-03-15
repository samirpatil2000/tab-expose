// @ts-nocheck
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FixedSizeGrid as Grid } from 'react-window';
import Fuse from 'fuse.js';
import { getAllTabs, switchToTab, closeTab as apiCloseTab } from '../lib/tabManager';
import type { TabInfo } from '../lib/tabManager';
import { useKeyboardNavigation } from '../lib/keyboard';
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
    onCloseOverview: handleCloseOverview
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
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg ring-1 ring-black/20">
            <span className="text-[12px] font-medium text-white/40 tracking-wide">Dismiss</span>
            <div className="flex items-center gap-1">
              <kbd className="flex items-center justify-center min-w-[22px] h-[22px] rounded border border-white/10 bg-white/10 text-white/80 text-[11px] font-sans shadow-sm backdrop-blur-md">⌘</kbd>
              <kbd className="flex items-center justify-center min-w-[22px] h-[22px] rounded border border-white/10 bg-white/10 text-white/80 text-[11px] font-sans shadow-sm backdrop-blur-md">⇧</kbd>
              <kbd className="flex items-center justify-center min-w-[22px] h-[22px] rounded border border-white/10 bg-white/10 text-white/80 text-[11px] font-sans shadow-sm backdrop-blur-md">Y</kbd>
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
    </motion.div>
  );
}
