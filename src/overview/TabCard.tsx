import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { TabInfo } from '../lib/tabManager';
import { getThumbnail } from '../lib/thumbnailCache';
import { X, Globe } from 'lucide-react';

interface TabCardProps {
  tab: TabInfo;
  isSelected: boolean;
  style: React.CSSProperties;
  onClick: () => void;
  onClose: (e: React.MouseEvent) => void;
  isEnterAnim?: boolean;
}

export const TabCard = memo(({ tab, isSelected, style, onClick, onClose, isEnterAnim = true }: TabCardProps) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  
  // Extract domain simply
  const domain = tab.url ? (() => {
    try { return new URL(tab.url).hostname; } catch { return ''; }
  })() : '';

  useEffect(() => {
    let mounted = true;
    const loadThumbnail = async () => {
      const cached = await getThumbnail(tab.url);
      if (mounted && cached) {
        setThumbnailUrl(cached);
      }
      // No capture here — background service worker handles all captures
    };
    
    loadThumbnail();
    return () => { mounted = false; };
  }, [tab.url, tab.windowId, tab.id]); // Re-run if URL changes

  return (
    <motion.div
      style={style}
      className="p-2" // Padding inside the grid cell for gap
      initial={isEnterAnim ? { opacity: 0, scale: 0.96 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18 }}
    >
      <div 
        onClick={onClick}
        className={`relative flex flex-col h-full bg-[#1e1e1e] rounded-[14px] overflow-hidden cursor-pointer group shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] transition-all duration-150 ease-out select-none
          ${isSelected ? 'ring-2 ring-[#4c9aff]' : 'ring-1 ring-white/5'}
        `}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 w-7 h-7 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={16} className="text-white" />
        </button>

        {/* Thumbnail Area */}
        <div className="relative w-full aspect-[16/10] bg-[#121212] overflow-hidden rounded-t-[14px]">
          {thumbnailUrl ? (
            <img 
              src={thumbnailUrl} 
              alt="" 
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-[180ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
              {tab.favIconUrl ? (
                <img src={tab.favIconUrl} className="w-12 h-12 opacity-30 grayscale" alt="" />
              ) : (
                <Globe className="w-12 h-12 text-white/10" />
              )}
            </div>
          )}
        </div>

        {/* Footer Area */}
        <div className="p-3 flex items-center gap-3 bg-[#242424] flex-1">
          <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-sm bg-white/5">
            {tab.favIconUrl ? (
              <img src={tab.favIconUrl} alt="" className="w-full h-full object-contain" />
            ) : (
              <Globe className="w-3.5 h-3.5 text-white/50" />
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h3 className="text-[13px] font-medium text-white truncate leading-tight">
              {tab.title || 'Untitled'}
            </h3>
            {domain && (
              <p className="text-[11px] text-white/40 truncate mt-0.5 leading-none">
                {domain}
              </p>
            )}
          </div>
          {tab.active && (
            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#4c9aff] shadow-[0_0_8px_#4c9aff]" title="Active Tab"></div>
          )}
        </div>
      </div>
    </motion.div>
  );
});
