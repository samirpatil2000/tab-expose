// @ts-nocheck
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
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

export function Overview() {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<any>(null);

  // Initial load
  useEffect(() => {
    let mounted = true;
    getAllTabs().then(res => {
      if (mounted) setTabs(res);
    });
    return () => { mounted = false; };
  }, []);

  // Update window size and handle blur
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    const handleBlur = () => window.close();
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('blur', handleBlur);
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

  // Keyboard Navigation
  const handleSelect = useCallback((index: number) => {
    const tab = filteredTabs[index];
    if (tab) {
      switchToTab(tab.id, tab.windowId).then(() => {
        window.close(); // Close the overview window after switching
      });
    }
  }, [filteredTabs]);

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
    window.close(); // Only works if opened by background script, or we can just window.close() since it's a popup
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

  // Render Grid Cell
  const Cell = ({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * columns + columnIndex;
    if (index >= filteredTabs.length) return null;
    
    const tab = filteredTabs[index];
    
    return (
      <TabCard
        key={tab.id}
        tab={tab}
        isSelected={index === selectedIndex}
        style={style}
        isEnterAnim={!query} // Only animate on initial load, not search filter
        onClick={() => handleSelect(index)}
        onClose={(e) => {
          e.stopPropagation();
          handleCloseTab(index);
        }}
      />
    );
  };

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    // Only close if we clicked directly on the outer container or spacer, not inside a card or search bar
    if (e.target === e.currentTarget) {
      window.close();
    }
  }, []);

  return (
    <div 
      className="flex flex-col h-screen w-full bg-[#1A1A1A] text-white overflow-hidden p-6 font-sans"
      onClick={handleBackgroundClick}
    >
      <SearchBar 
        query={query} 
        onQueryChange={handleQueryChange} 
        inputRef={searchInputRef}
      />
      
      <div 
        className="flex-1 w-full mx-auto max-w-[1600px] outline-none"
        onClick={handleBackgroundClick}
      >
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
          >
            {Cell}
          </Grid>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white/40">
            <p>No tabs found for "{query}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
