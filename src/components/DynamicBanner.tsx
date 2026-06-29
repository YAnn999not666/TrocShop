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

const FALLBACK_BANNERS: BannerItem[] = [
  {
    id: "fallback-troc",
    title: "Troquez en toute simplicité !",
    subtitle: "Échangez vos objets inutilisés contre ce dont vous avez besoin à Yamoussoukro.",
    imageUrl: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/163b01ba-db06-46b3-9083-e30a045b4f5a",
    buttonText: "Commencer à troquer",
    buttonAction: "sell"
  },
  {
    id: "fallback-security",
    title: "Transactions 100% locales",
    subtitle: "Achetez, vendez et négociez en toute sécurité près de chez vous ou à l'INPHB.",
    imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200&auto=format&fit=crop",
    buttonText: "Explorer les articles",
    buttonAction: "search"
  }
];

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
        
        if (Array.isArray(bannersList) && bannersList.length > 0) {
          // On charge toutes les bannières disponibles dans ton tableau
          setBanners(bannersList);
        } else {
          setBanners(FALLBACK_BANNERS);
        }
      } else {
        setBanners(FALLBACK_BANNERS);
      }
      setLoading(false);
    }, (error) => {
      console.warn("Erreur carrousel Supabase, chargement des bannières locales de secours:", error);
      setBanners(FALLBACK_BANNERS);
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
    if (banner.buttonAction === 'view_profile') {
      console.log("Action: Ouvrir le profil du vendeur depuis targetUrl:", banner.targetUrl);
      if (banner.targetUrl) {
        window.dispatchEvent(new CustomEvent('view-seller-profile', { detail: banner.targetUrl }));
      }
    } else if (banner.targetUrl) {
      window.location.assign(banner.targetUrl);
    } else if (banner.buttonAction === 'sell') {
      console.log("Action: Ouvrir l'écran de vente");
      window.dispatchEvent(new CustomEvent('set-active-tab', { detail: 'sell' }));
    } else if (banner.buttonAction === 'search') {
      console.log("Action: Ouvrir la recherche");
      window.dispatchEvent(new CustomEvent('set-active-tab', { detail: 'search' }));
    } else if (banner.buttonAction && (banner.buttonAction.startsWith('profile_') || banner.buttonAction.startsWith('profile:'))) {
      const sellerId = banner.buttonAction.replace('profile_', '').replace('profile:', '');
      console.log("Action: Ouvrir le profil du vendeur:", sellerId);
      window.dispatchEvent(new CustomEvent('view-seller-profile', { detail: sellerId }));
    }
  };

  if (loading) {
    return (
      <div className="relative mx-3 sm:mx-4 min-[980px]:mx-0 mt-0 mb-4 min-[980px]:mt-0 min-[980px]:mb-6">
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
    <div className="relative mx-3 sm:mx-4 min-[980px]:mx-0 mt-0 mb-4 min-[980px]:mt-0 min-[980px]:mb-6 group">
      {/* Conteneur horizontal fluide avec Snap CSS et bords arrondis ultra-propres */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-none rounded-[2rem] bg-slate-950 text-white shadow-md hover:shadow-xl transition-all duration-300"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {banners.map((banner, index) => (
          <div 
            key={`${banner.id || 'banner'}-${index}`}
            className="w-full flex-shrink-0 snap-start relative aspect-video flex flex-col justify-end p-4 sm:p-6 overflow-hidden cursor-pointer"
            onClick={() => handleAction(banner)}
          >
            {/* Image de fond de haute qualité en pleine opacité (100%) sans assombrissement général */}
            <img 
              src={banner.imageUrl} 
              alt={banner.title || "Publicité"} 
              className="absolute inset-0 h-full w-full object-cover opacity-100 transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              referrerPolicy="no-referrer"
            />
            
            {/* Contenu textuel sans aucun conteneur ou fond sombre pour laisser l'image 100% visible */}
            {(banner.title || banner.subtitle || banner.buttonText) && (
              <div className="relative z-10 flex flex-col items-start max-w-[85%] sm:max-w-[75%] space-y-1">
                <span className="text-[9px] font-black tracking-widest text-[#FF4500] uppercase drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)]">
                  En vedette
                </span>
                {banner.title && (
                  <h2 
                    className="text-sm sm:text-base md:text-lg font-black uppercase tracking-tight leading-tight text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]"
                    dangerouslySetInnerHTML={{ __html: banner.title }}
                  />
                )}
                {banner.subtitle && (
                  <p className="text-[10px] sm:text-xs text-white font-medium leading-snug line-clamp-2 drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)]">
                    {banner.subtitle}
                  </p>
                )}
   
                {/* Bouton d'action signature de TrocShop */}
                {banner.buttonText && (
                  <div className="pt-1">
                    <span
                      className="inline-flex items-center justify-center px-4 py-1.5 bg-[#FF4500] hover:bg-[#E03D00] text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-black/40 transition-all active:scale-95 text-white"
                    >
                      {banner.buttonText}
                    </span>
                  </div>
                )}
              </div>
            )}
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
