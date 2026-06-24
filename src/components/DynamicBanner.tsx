import React, { useEffect, useState, useRef } from 'react';
import { doc, onSnapshot, db } from '../lib/firebase';

interface BannerItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  buttonText?: string;
  buttonAction?: string;
  targetUrl?: string;
}

export const DynamicBanner: React.FC = () => {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Lecture en temps réel de la ligne 'banners' dans app_config
    const bannerRef = doc(db, 'appConfig', 'banners');
    
    const unsubscribe = onSnapshot(bannerRef, (snapshot) => {
      if (snapshot.exists()) {
        const rawData = snapshot.data();
        // Dans ton JSON, les bannières sont dans l'objet "banners"
        const bannersList = rawData?.banners as BannerItem[];
        
        if (Array.isArray(bannersList)) {
          // On charge toutes les bannières disponibles dans ton tableau
          setBanners(bannersList);
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Erreur carrousel Supabase:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Défilement automatique toutes les 5 secondes
  useEffect(() => {
    if (banners.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = prevIndex === banners.length - 1 ? 0 : prevIndex + 1;
        if (containerRef.current) {
          const width = containerRef.current.clientWidth;
          containerRef.current.scrollTo({
            left: nextIndex * width,
            behavior: 'smooth'
          });
        }
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [banners]);

  const handleScroll = () => {
    if (containerRef.current) {
      const scrollLeft = containerRef.current.scrollLeft;
      const width = containerRef.current.clientWidth;
      const newIndex = Math.round(scrollLeft / width);
      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
      }
    }
  };

  // Gestion des actions au clic sur le bouton
  const handleAction = (banner: BannerItem) => {
    if (banner.targetUrl) {
      window.location.assign(banner.targetUrl);
    } else if (banner.buttonAction === 'sell') {
      console.log("Action: Ouvrir l'écran de vente");
      window.dispatchEvent(new CustomEvent('set-active-tab', { detail: 'sell' }));
    } else if (banner.buttonAction === 'search') {
      console.log("Action: Ouvrir la recherche");
      window.dispatchEvent(new CustomEvent('set-active-tab', { detail: 'search' }));
    }
  };

  if (loading) {
    return (
      <div className="relative mx-3 sm:mx-4 my-4">
        <div className="w-full aspect-video rounded-[2rem] bg-zinc-900 animate-pulse flex flex-col justify-center p-6 sm:p-8 space-y-3">
          <div className="h-2.5 w-12 bg-zinc-800 rounded-md" />
          <div className="h-6 sm:h-8 w-40 sm:w-52 bg-zinc-800 rounded-lg" />
          <div className="h-3 w-32 sm:w-40 bg-zinc-800 rounded-md" />
          <div className="h-8 w-24 bg-zinc-800 rounded-full pt-1.5" />
        </div>
      </div>
    );
  }

  if (banners.length === 0) return null;

  return (
    <div className="relative mx-3 sm:mx-4 my-4 group">
      {/* Conteneur horizontal fluide avec Snap CSS et bords arrondis ultra-propres */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-none rounded-[2rem] bg-slate-950 text-white shadow-md hover:shadow-xl transition-all duration-300"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {banners.map((banner) => (
          <div 
            key={banner.id}
            className="w-full flex-shrink-0 snap-start relative aspect-video flex flex-col justify-center p-6 sm:p-8 overflow-hidden cursor-pointer"
            onClick={() => handleAction(banner)}
          >
            {/* Image de fond de haute qualité avec transition d'échelle */}
            <img 
              src={banner.imageUrl} 
              alt={banner.title} 
              className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
            {/* Dégradé radial/linéaire riche pour un rendu de texte ultra-lisible et premium */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent" />
            
            {/* Contenu textuel centré verticalement avec une largeur idéale */}
            <div className="relative z-10 flex flex-col items-start max-w-[85%] sm:max-w-[75%] space-y-2">
              <span className="text-[9px] font-black tracking-widest text-[#FF4500] uppercase drop-shadow-sm">
                En vedette
              </span>
              <h2 
                className="text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tight leading-tight text-white drop-shadow-md"
                dangerouslySetInnerHTML={{ __html: banner.title }}
              />
              {banner.subtitle && (
                <p className="text-[11px] sm:text-xs text-slate-200/90 font-medium leading-snug line-clamp-2 drop-shadow-sm">
                  {banner.subtitle}
                </p>
              )}
 
              {/* Bouton d'action signature de TrocShop */}
              {banner.buttonText && (
                <div className="pt-1.5">
                  <span
                    className="inline-flex items-center justify-center px-5 py-2 bg-[#FF4500] hover:bg-[#E03D00] text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-orange-600/30 transition-all active:scale-95"
                  >
                    {banner.buttonText}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
 
      {/* Indicateurs de pagination modernes (petits points repositionnés) */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 right-8 flex space-x-1.5 z-10 bg-black/30 backdrop-blur-md py-1 px-2 rounded-full">
          {banners.map((_, index) => (
            <div 
              key={index}
              className={`h-1 rounded-full transition-all duration-300 ${
                index === currentIndex ? 'w-3.5 bg-[#FF4500]' : 'w-1 bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
