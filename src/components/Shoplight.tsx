import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Share as ShareIcon, MessageCircle, Volume2, VolumeX, Sparkles, ArrowLeft, BadgeCheck } from 'lucide-react';
import { Share as CapacitorShare } from '@capacitor/share';

export interface SpotlightItem {
  id: string;
  video_url: string;
  description: string;
  vendeur_nom: string;
  vendeur_avatar: string;
  vendeur_id: string;
  vendeur_certifie?: boolean;
  created_at?: any;
  expires_at?: any;
}

interface ShoplightProps {
  onContactSeller: (sellerId: string, sellerNom: string, item: SpotlightItem) => void;
  onBackToHome?: () => void;
  onViewProfile?: (sellerId: string) => void;
}

export function Shoplight({ onContactSeller, onBackToHome, onViewProfile }: ShoplightProps) {
  const [items, setItems] = useState<SpotlightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalMuted, setGlobalMuted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchSpotlight() {
      try {
        const { data, error } = await supabase
          .from('spotlight')
          .select('*')
          .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          setItems(data as SpotlightItem[]);
        } else {
          setItems([]);
        }
      } catch (err) {
        console.warn("Erreur chargement Supabase spotlight:", err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSpotlight();
  }, []);

  // Handle scroll snap to detect the active video index
  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const clientHeight = containerRef.current.clientHeight;
    if (clientHeight === 0) return;
    const index = Math.round(scrollTop / clientHeight);
    if (index !== activeIndex && index >= 0 && index < items.length) {
      setActiveIndex(index);
    }
  };

  if (loading) {
    return (
      <div className="absolute inset-0 w-full h-full bg-zinc-950 flex flex-col items-center justify-center text-white z-40">
        <div className="w-16 h-16 rounded-full border-4 border-t-orange-600 border-r-transparent border-b-transparent border-l-transparent animate-spin mb-4" />
        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest animate-pulse">
          Chargement de Shoplight...
        </p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 w-full h-full bg-black text-white flex flex-col overflow-hidden select-none">
      {/* Bouton de retour élégant en haut à gauche */}
      {onBackToHome && (
        <button
          onClick={onBackToHome}
          className="absolute top-6 left-6 z-[1001] w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white active:scale-95 transition-all shadow-lg hover:bg-black/60 cursor-pointer"
          title="Retour"
        >
          <ArrowLeft size={24} />
        </button>
      )}

      {items.length === 0 ? (
        <div className="flex-1 w-full h-full flex flex-col items-center justify-center text-center px-6 bg-zinc-950">
          <h3 className="text-xl font-bold text-white mb-2">Aucun shoplight disponible pour le moment</h3>
          <p className="text-zinc-500 text-xs max-w-sm">Revenez plus tard pour découvrir de nouvelles courtes vidéos de produits en vente près de chez vous !</p>
        </div>
      ) : (
        /* Scrollable feed container with snap scroll */
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar relative scroll-smooth bg-black"
          style={{ scrollSnapType: 'y mandatory' }}
        >
          {items.map((item, index) => (
            <ShoplightVideoCard
              key={item.id}
              item={item}
              isActive={index === activeIndex}
              isMuted={globalMuted}
              onToggleMute={() => setGlobalMuted(!globalMuted)}
              onContact={onContactSeller}
              onViewProfile={onViewProfile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface VideoCardProps {
  item: SpotlightItem;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onContact: (sellerId: string, sellerNom: string, item: SpotlightItem) => void;
  onViewProfile?: (sellerId: string) => void;
}

function ShoplightVideoCard({ item, isActive, isMuted, onToggleMute, onContact, onViewProfile }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [showPlayIcon, setShowPlayIcon] = useState(false);

  // Auto-play/pause based on active prop
  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => {
        setPlaying(true);
      }).catch((e) => {
        console.warn("Autoplay blocké ou échoué:", e);
        setPlaying(false);
      });
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
      setShowPlayIcon(true);
      setTimeout(() => setShowPlayIcon(false), 800);
    } else {
      videoRef.current.play().then(() => {
        setPlaying(true);
        setShowPlayIcon(true);
        setTimeout(() => setShowPlayIcon(false), 800);
      }).catch(() => {});
    }
  };

  const handleShare = async () => {
    const shareUrl = "https://troc-shop-kgfn.vercel.app/";
    const text = `Regarde la vidéo de ${item.vendeur_nom} sur TrocShop : "${item.description.substring(0, 60)}..."`;
    
    try {
      const isCapacitor = !!(window as any).Capacitor;
      if (isCapacitor) {
        await CapacitorShare.share({
          title: "TrocShop Spotlight",
          text: text,
          url: shareUrl,
          dialogTitle: "Partager Shoplight"
        });
      } else if (navigator.share) {
        await navigator.share({
          title: "TrocShop Spotlight",
          text: text,
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(`${text} ${shareUrl}`);
        alert("Lien de partage copié dans le presse-papiers !");
      }
    } catch (err) {
      console.warn("Share failed, fallback to clip:", err);
      try {
        await navigator.clipboard.writeText(`${text} ${shareUrl}`);
        alert("Lien de partage copié dans le presse-papiers !");
      } catch (e) {}
    }
  };

  return (
    <div className="w-full h-full shrink-0 snap-start relative bg-zinc-950 flex items-center justify-center overflow-hidden">
      {/* Clickable video area */}
      <div onClick={togglePlay} className="absolute inset-0 w-full h-full flex items-center justify-center cursor-pointer">
        <video
          ref={videoRef}
          src={item.video_url}
          loop
          muted={isMuted}
          playsInline
          onWaiting={() => setWaiting(true)}
          onPlaying={() => setWaiting(false)}
          className="w-full h-full object-cover"
        />
        
        {/* Subtle vignette/shadow overlay for high visibility of texts */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />
      </div>

      {/* Loading spinner overlay */}
      {waiting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
          <div className="w-10 h-10 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        </div>
      )}

      {/* Play/Pause indicator overlay animation */}
      <AnimatePresence>
        {showPlayIcon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1.2 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.4 }}
            className="absolute p-6 rounded-full bg-black/40 backdrop-blur-md pointer-events-none text-white z-20"
          >
            {playing ? <Play size={40} className="fill-white translate-x-0.5" /> : <Pause size={40} className="fill-white" />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom overlay layout */}
      <div className="absolute bottom-6 md:bottom-8 left-4 right-4 z-10 flex items-end justify-between pointer-events-none gap-4">
        {/* Left column: Seller Profile & Description */}
        <div className="flex-1 max-w-[70%] text-white space-y-3 pointer-events-auto">
          {/* Seller profile info */}
          <div 
            onClick={() => onViewProfile?.(item.vendeur_id)}
            className="flex items-center gap-2.5 cursor-pointer group active:scale-95 transition-all duration-200"
          >
            <img
              src={item.vendeur_avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
              alt={item.vendeur_nom}
              className="w-11 h-11 rounded-full object-cover border-2 border-white/90 shadow-lg group-hover:border-orange-500 transition-colors"
              referrerPolicy="no-referrer"
            />
            <div className="leading-tight">
              <h4 className="font-extrabold text-sm tracking-tight flex items-center gap-1 shadow-sm drop-shadow group-hover:text-orange-400 transition-colors">
                @{item.vendeur_nom}
                {item.vendeur_certifie && (
                  <BadgeCheck size={14} className="text-white fill-orange-500 shrink-0" />
                )}
              </h4>
              <p className="text-[10px] text-zinc-300 font-medium">Yamoussoukro • Local</p>
            </div>
          </div>

          {/* Description area - vertically scrollable if long */}
          <div className="max-h-24 overflow-y-auto pr-1 text-xs text-zinc-100 font-medium leading-relaxed drop-shadow-md no-scrollbar">
            <p className="whitespace-pre-line">{item.description}</p>
          </div>
        </div>

        {/* Right column: Interactive vertical action buttons */}
        <div className="flex flex-col items-center gap-5 pointer-events-auto shrink-0 pb-1">
          {/* Mute button */}
          <button
            onClick={onToggleMute}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white active:scale-95 transition-all shadow-lg hover:bg-black/60"
            title={isMuted ? "Activer le son" : "Désactiver le son"}
          >
            {isMuted ? <VolumeX size={20} className="text-orange-500" /> : <Volume2 size={20} />}
          </button>

          {/* Contact button */}
          <button
            onClick={() => onContact(item.vendeur_id, item.vendeur_nom, item)}
            className="w-14 h-14 rounded-full bg-orange-600 border border-orange-500 flex flex-col items-center justify-center text-white active:scale-95 transition-all shadow-xl shadow-orange-600/30 hover:bg-orange-700 relative group"
            title="Contacter"
          >
            <MessageCircle size={24} className="group-hover:scale-110 transition-transform fill-white/10" />
            <span className="text-[8px] font-black uppercase tracking-widest mt-0.5 scale-90">Chat</span>
          </button>

          {/* Share button */}
          <button
            onClick={handleShare}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center text-white active:scale-95 transition-all shadow-lg hover:bg-black/60 group"
            title="Partager"
          >
            <ShareIcon size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-[8px] font-bold mt-0.5 scale-95">Partager</span>
          </button>
        </div>
      </div>
    </div>
  );
}
