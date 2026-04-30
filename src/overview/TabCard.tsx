import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { TabInfo } from '../lib/tabManager';
import { getThumbnail } from '../lib/thumbnailCache';
import { X, Globe } from 'lucide-react';

interface TabCardProps {
  tab: TabInfo;
  isSelected: boolean;
  style: React.CSSProperties;
  uiScale?: number;
  columnWidth?: number;
  onClick: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onClose: (e: React.MouseEvent) => void;
  isEnterAnim?: boolean;
  enterDelay?: number;
}

const getFaviconUrl = (u: string, size: number) => {
  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', u);
  url.searchParams.set('size', size.toString());
  return url.toString();
};

const FaviconImage = ({ pageUrl, originalSrc, className, fallbackClassName, fallbackSize, maxDisplaySize }: { pageUrl?: string, originalSrc?: string, className: string, fallbackClassName: string, fallbackSize: number, maxDisplaySize?: number }) => {
  const [errorCount, setErrorCount] = useState(0);
  
  let srcToTry;
  if (errorCount === 0 && pageUrl) {
    srcToTry = getFaviconUrl(pageUrl, 32);
  } else if (errorCount <= 1 && originalSrc) {
    srcToTry = originalSrc;
  }

  if (!srcToTry) {
    return <Globe size={fallbackSize} className={fallbackClassName} />;
  }
  
  // Render at a fixed CSS size that won't exceed the icon's native resolution.
  // 32 physical pixels / dpr = CSS pixels. This prevents upscale blur.
  const dpr = window.devicePixelRatio || 1;
  const nativeCssSize = Math.round(32 / dpr);
  const displaySize = maxDisplaySize ? Math.min(maxDisplaySize, nativeCssSize) : nativeCssSize;

  return (
    <img
      src={srcToTry}
      className={className}
      style={{ width: displaySize, height: displaySize, imageRendering: 'auto' }}
      alt=""
      onError={() => setErrorCount(c => c + 1)}
    />
  );
};

/*
 * All footer dimensions use the CSS custom property --s (the scale factor).
 * calc(<base-px> * var(--s)) keeps everything proportional without hardcoding.
 * The scale uses sqrt in Overview so large cards get diminishing returns.
 */
export const TabCard = memo(({ tab, isSelected, style, uiScale = 1, columnWidth = 260, onClick, onMouseEnter, onClose, isEnterAnim = true, enterDelay = 0 }: TabCardProps) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  
  const domain = tab.url ? (() => {
    try { return new URL(tab.url).hostname; } catch { return ''; }
  })() : '';

  useEffect(() => {
    let mounted = true;
    setThumbnailUrl(null);
    const loadThumbnail = async () => {
      const cached = await getThumbnail(tab.id);
      if (mounted && cached) {
        setThumbnailUrl(cached);
      }
    };
    
    loadThumbnail();
    return () => { mounted = false; };
  }, [tab.id]);

  // Compute the maximum safe scale that won't overflow the cell padding (8px each side).
  // Card inner width = columnWidth - 16 (p-2 = 8px × 2).
  // Scaling by S adds (cardWidth * (S-1) / 2) on each side.
  // Constraint: cardWidth * (S-1) / 2 ≤ cellPadding  →  S ≤ 1 + 2*cellPadding / cardWidth
  const cellPadding = 8;
  const cardWidth = columnWidth - cellPadding * 2;
  const cardHeight = (style as any).height ? (style as any).height - cellPadding * 2 : cardWidth;
  const maxSafeScaleW = 1 + (cellPadding * 2) / cardWidth;
  const maxSafeScaleH = 1 + (cellPadding * 2) / cardHeight;
  const maxSafeScale = Math.min(maxSafeScaleW, maxSafeScaleH);
  
  // The tween with backOut easing overshoots by ~30% of the delta.
  // So if we want peak ≤ maxSafeScale, the target must satisfy:
  // target + (target - 1) * 0.3 ≤ maxSafeScale
  // target * 1.3 - 0.3 ≤ maxSafeScale
  // target ≤ (maxSafeScale + 0.3) / 1.3
  const OVERSHOOT_FACTOR = 0.3;
  const maxTargetScale = (maxSafeScale + OVERSHOOT_FACTOR) / (1 + OVERSHOOT_FACTOR);
  const selectedScale = Math.min(1.03, maxTargetScale);
  const hoverScale = Math.min(1.02, maxTargetScale);

  const cardStyle = {
    ...style,
    '--s': uiScale,
    '--hover-scale': hoverScale,
  } as React.CSSProperties;

  return (
    <motion.div
      style={cardStyle}
      className="p-2"
      onMouseEnter={onMouseEnter}
      initial={isEnterAnim ? { opacity: 0, scale: 0.96 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        opacity: { type: "spring", stiffness: 280, damping: 24, delay: enterDelay },
        scale: { type: "spring", stiffness: 280, damping: 24, delay: enterDelay },
      }}
    >
      <motion.div 
        onClick={onClick}
        animate={{
          scale: isSelected ? selectedScale : 1,
          filter: isSelected ? 'brightness(1)' : 'brightness(0.78)',
          boxShadow: isSelected
            ? '0 0 0 1px rgba(255,255,255,0.18), 0 4px 8px rgba(0,0,0,0.5)'
            : '0 0 0 1px rgba(255,255,255,0), 0 2px 6px rgba(0,0,0,0.3)'
        }}
        transition={{
          // backOut easing: overshoots by ~30% of delta then settles.
          // Target scale is computed so peak never exceeds cell padding.
          scale: { type: "tween", duration: 0.18, ease: [0.34, 1.56, 0.64, 1] },
          filter: { type: "tween", duration: 0.15, ease: "easeOut" },
          boxShadow: { type: "tween", duration: 0.08, ease: "easeOut" }
        }}
        className={`relative flex flex-col h-full rounded-[14px] overflow-hidden cursor-pointer group transition-[opacity,filter] duration-320 select-none will-change-transform [backface-visibility:hidden] ${isSelected ? 'bg-[#282828]' : 'bg-[#1e1e1e]'}`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute z-10 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity
            w-[calc(28px*var(--s))] h-[calc(28px*var(--s))] top-[calc(8px*var(--s))] right-[calc(8px*var(--s))]"
        >
          <X size={Math.round(16 * uiScale)} className="text-white" />
        </button>

        {/* Thumbnail Area — lighter desaturation when unselected */}
        <div className={`relative w-full flex-1 bg-[#121212] overflow-hidden rounded-t-[14px] transition-[filter] duration-200 ${isSelected ? 'grayscale-0' : 'grayscale-[0.15]'}`}>
          {thumbnailUrl ? (
            <img 
              src={thumbnailUrl} 
              alt="" 
              className={`w-full h-full object-contain group-hover:scale-[1.04] transition-transform duration-180 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isSelected ? 'scale-[1.04]' : ''}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
              <FaviconImage 
                pageUrl={tab.url}
                originalSrc={tab.favIconUrl} 
                className="opacity-30 grayscale" 
                fallbackClassName="text-white/10" 
                fallbackSize={48}
              />
            </div>
          )}
        </div>

        {/* Footer — heavier desaturation when unselected */}
        <div
          className={`flex items-center bg-[#242424] transition-[filter] duration-200
            p-[calc(12px*var(--s))] gap-[calc(12px*var(--s))] ${isSelected ? 'grayscale-0' : 'grayscale-[0.8]'}`}
        >
          <div
            className="shrink-0 flex items-center justify-center rounded-sm bg-white/5
              w-[calc(20px*var(--s))] h-[calc(20px*var(--s))]"
          >
            <FaviconImage 
              pageUrl={tab.url}
              originalSrc={tab.favIconUrl} 
              className="object-contain"
              fallbackClassName="text-white/50" 
              fallbackSize={14}
            />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h3
              className="font-medium text-white truncate leading-tight
                text-[calc(13px*var(--s))]"
            >
              {tab.title || 'Untitled'}
            </h3>
            {domain && (
              <p
                className="text-white/40 truncate leading-none
                  text-[calc(11px*var(--s))] mt-[calc(2px*var(--s))]"
              >
                {domain}
              </p>
            )}
          </div>
          {tab.active && (
            <div
              className="shrink-0 rounded-full bg-[#4c9aff] shadow-[0_0_8px_#4c9aff]
                w-[calc(8px*var(--s))] h-[calc(8px*var(--s))]"
              title="Active Tab"
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
});
