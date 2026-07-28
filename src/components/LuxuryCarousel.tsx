import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Maximize2, Play, Pause, Grid, X, Crop, Expand } from 'lucide-react';
import { cn } from '../lib/utils';

interface LuxuryCarouselProps {
  images: string[];
  title?: string;
  onClose?: () => void;
  onZoomImage?: (img: string) => void;
  heightClass?: string;
}

export const LuxuryCarousel: React.FC<LuxuryCarouselProps> = ({
  images,
  title,
  onClose,
  onZoomImage,
  heightClass = "h-[58vh] md:h-[580px]",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const safeImages = images && images.length > 0 ? images : ['https://images.unsplash.com/photo-1594498259353-c0ad33568dad?w=800&q=80'];

  // Auto-play slideshow timer
  useEffect(() => {
    if (!isPlaying || safeImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % safeImages.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isPlaying, safeImages.length]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % safeImages.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + safeImages.length) % safeImages.length);
  };

  // Touch Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 40;
    const isRightSwipe = distance < -40;

    if (isLeftSwipe && safeImages.length > 1) {
      handleNext();
    } else if (isRightSwipe && safeImages.length > 1) {
      handlePrev();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <div className={cn("w-full bg-gradient-to-b from-stone-50 via-orange-50/20 to-stone-100/80 relative group flex flex-col shrink-0 overflow-hidden font-sans select-none", heightClass)}>
      {/* Background Ambient Blur */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.25 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
        >
          <img
            src={safeImages[currentIndex]}
            alt=""
            className="w-full h-full object-cover blur-3xl scale-125 opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-100/90 via-stone-50/40 to-white/80" />
        </motion.div>
      </AnimatePresence>

      {/* Main Image Stage */}
      <div 
        className="flex-1 relative overflow-hidden flex items-center justify-center z-10"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <motion.div
          className="flex h-full w-full transform-gpu cursor-grab active:cursor-grabbing"
          animate={{ x: `-${currentIndex * 100}%` }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 32,
            mass: 0.8
          }}
        >
          {safeImages.map((img, i) => (
            <div
              key={i}
              className="w-full h-full shrink-0 flex items-center justify-center p-2 sm:p-4 md:p-6 relative"
            >
              <motion.div
                initial={false}
                animate={{
                  scale: currentIndex === i ? 1 : 0.93,
                  opacity: currentIndex === i ? 1 : 0.4,
                }}
                transition={{ duration: 0.3 }}
                className="w-full h-full relative group/img rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden bg-white/90 border border-zinc-200/80 shadow-[0_15px_35px_rgba(0,0,0,0.06)] flex items-center justify-center backdrop-blur-xl"
                onClick={() => onZoomImage?.(img)}
              >
                {/* Background Blur Fill when in contain mode */}
                {fitMode === 'contain' && (
                  <img
                    src={img}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-45 scale-110 pointer-events-none"
                  />
                )}

                {/* Main Photo - Full Frame Cover or Full Uncropped Contain */}
                <img
                  src={img}
                  alt={title || `Photo ${i + 1}`}
                  className={cn(
                    "transition-all duration-500 group-hover/img:scale-102 relative z-10",
                    fitMode === 'cover' 
                      ? "w-full h-full object-cover" 
                      : "max-w-full max-h-full object-contain p-2 sm:p-4 drop-shadow-[0_12px_24px_rgba(0,0,0,0.12)]"
                  )}
                />

                {/* Hover Zoom Overlay */}
                <div className="absolute inset-0 z-20 bg-gradient-to-b from-black/0 via-black/0 to-black/25 opacity-0 group-hover/img:opacity-100 transition-all duration-300 flex items-center justify-center cursor-pointer">
                  <div className="px-4 py-2.5 bg-zinc-900/85 backdrop-blur-xl text-white rounded-full flex items-center gap-2 border border-zinc-700/50 shadow-2xl scale-90 group-hover/img:scale-100 transition-transform duration-300 font-bold text-xs uppercase tracking-wider">
                    <Maximize2 size={16} />
                    <span>Agrandir</span>
                  </div>
                </div>
              </motion.div>
            </div>
          ))}
        </motion.div>

        {/* Floating Top Left Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 z-30 w-11 h-11 bg-white/90 hover:bg-white backdrop-blur-2xl border border-zinc-200/80 text-zinc-800 rounded-2xl flex items-center justify-center shadow-md hover:shadow-lg active:scale-90 transition-all"
            title="Fermer"
          >
            <X size={20} />
          </button>
        )}

        {/* Floating Top Right Counter Badge */}
        {safeImages.length > 1 && (
          <div className="absolute top-4 right-4 z-30 px-3.5 py-1.5 bg-white/90 backdrop-blur-2xl border border-zinc-200/80 rounded-xl text-[10px] font-black text-zinc-800 shadow-md tracking-widest uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            <span>
              {String(currentIndex + 1).padStart(2, '0')} / {String(safeImages.length).padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Side Arrows */}
        {safeImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-2xl bg-white/90 hover:bg-orange-600 hover:text-white backdrop-blur-2xl border border-zinc-200/80 text-zinc-800 flex items-center justify-center shadow-lg active:scale-75 transition-all opacity-0 group-hover:opacity-100"
              title="Précédent"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-2xl bg-white/90 hover:bg-orange-600 hover:text-white backdrop-blur-2xl border border-zinc-200/80 text-zinc-800 flex items-center justify-center shadow-lg active:scale-75 transition-all opacity-0 group-hover:opacity-100"
              title="Suivant"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}

        {/* High-End Glass Floating Control Dock */}
        {safeImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 p-1.5 bg-white/90 backdrop-blur-2xl border border-zinc-200/80 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.08)]">
            {/* Play / Pause Slideshow Button */}
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={cn(
                "p-2 rounded-xl transition-all active:scale-80",
                isPlaying ? "bg-orange-600 text-white shadow-md shadow-orange-600/30" : "hover:bg-zinc-100 text-zinc-600"
              )}
              title={isPlaying ? "Mettre en pause" : "Lecture automatique"}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>

            {/* Pagination Indicators */}
            <div className="flex items-center gap-1.5 px-2">
              {safeImages.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    idx === currentIndex 
                      ? "w-6 bg-gradient-to-r from-orange-500 to-amber-500 shadow-[0_0_10px_rgba(234,88,12,0.4)]" 
                      : "w-2 bg-zinc-300 hover:bg-zinc-400"
                  )}
                />
              ))}
            </div>

            {/* Thumbnail Toggle Button */}
            <button
              type="button"
              onClick={() => setShowThumbnails(!showThumbnails)}
              className={cn(
                "p-2 rounded-xl transition-all active:scale-80",
                showThumbnails ? "bg-zinc-100 text-zinc-900" : "hover:bg-zinc-100 text-zinc-500"
              )}
              title="Afficher/masquer les miniatures"
            >
              <Grid size={16} />
            </button>

            {/* Fit / Cover Mode Toggle Button */}
            <button
              type="button"
              onClick={() => setFitMode(fitMode === 'cover' ? 'contain' : 'cover')}
              className={cn(
                "p-2 rounded-xl transition-all active:scale-80 text-xs font-semibold flex items-center gap-1.5 px-2.5",
                fitMode === 'cover' ? "bg-zinc-900 text-white shadow-sm" : "bg-orange-100 text-orange-700 border border-orange-200"
              )}
              title={fitMode === 'cover' ? "Passer en mode ajusté (image entière)" : "Passer en mode remplir le cadre"}
            >
              {fitMode === 'cover' ? (
                <>
                  <Expand size={14} />
                  <span className="hidden sm:inline">Remplir</span>
                </>
              ) : (
                <>
                  <Crop size={14} />
                  <span className="hidden sm:inline">Ajuster</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Luxury Filmstrip Thumbnail Drawer */}
      <AnimatePresence>
        {showThumbnails && safeImages.length > 1 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white/80 backdrop-blur-xl border-t border-zinc-200/60 px-4 py-3 shrink-0 z-20 overflow-x-auto no-scrollbar"
          >
            <div className="flex items-center justify-center gap-3 min-w-max mx-auto">
              {safeImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-300 shrink-0 group/thumb active:scale-90 border bg-zinc-100",
                    idx === currentIndex
                      ? "border-orange-500 ring-2 ring-orange-500/40 scale-105 shadow-md shadow-orange-500/20 z-10"
                      : "border-zinc-200/80 opacity-60 hover:opacity-100 hover:scale-102"
                  )}
                >
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {idx === currentIndex && (
                    <div className="absolute inset-0 bg-orange-500/10 pointer-events-none" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LuxuryCarousel;
