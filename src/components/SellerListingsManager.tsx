import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, 
  BarChart2, 
  MessageCircle, 
  Heart, 
  Clock, 
  Search, 
  MoreVertical, 
  Zap, 
  Edit3, 
  CheckCircle, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Tag, 
  Eye, 
  ShoppingBag,
  Film,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Flame,
  ArrowDownRight,
  PauseCircle,
  PlayCircle,
  Bookmark,
  PackageX,
  RotateCcw
} from 'lucide-react';
import { Product, ProductStatus } from '../types';
import { getProductAggregatedStats } from '../lib/productEvents';
import { cn, formatReservedCountdown } from '../lib/utils';
import { CustomDropdown } from './ui/CustomDropdown';
import { SpotlightPublisher } from './SpotlightPublisher';

// Helper for smooth bezier curve SVG paths
function getSmoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const mx = (current.x + next.x) / 2;
    path += ` C ${mx} ${current.y}, ${mx} ${next.y}, ${next.x} ${next.y}`;
  }
  return path;
}

interface SellerListingsManagerProps {
  user: any;
  products: Product[];
  conversations?: any[];
  favorites?: string[];
  onBack: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string, e?: React.MouseEvent) => void;
  onMarkAsSold: (productId: string) => void;
  onUpdateStatus?: (productId: string, status: ProductStatus) => void;
  onCancelReservation?: (productId: string) => void;
  onOpenConversation?: (conversationId: string) => void;
  onSelectProductDetail?: (product: Product) => void;
}

export const SellerListingsManager: React.FC<SellerListingsManagerProps> = ({
  user,
  products,
  conversations = [],
  favorites = [],
  onBack,
  onEditProduct,
  onDeleteProduct,
  onMarkAsSold,
  onUpdateStatus,
  onCancelReservation,
  onOpenConversation,
}) => {
  // Section switch state (Annonces vs Vidéos Spotlight)
  const [mainSectionMode, setMainSectionMode] = useState<'annonces' | 'spotlight'>('annonces');

  // Filter state
  const [activeStatusTab, setActiveStatusTab] = useState<'actives' | 'reserved' | 'sold' | 'out_of_stock'>('actives');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'views' | 'price_asc' | 'price_desc'>('recent');

  // Selected product for detail view
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);

  // Popup menu state on product cards
  const [openMenuProductId, setOpenMenuProductId] = useState<string | null>(null);

  // Booster confirmation modal
  const [boosterProduct, setBoosterProduct] = useState<Product | null>(null);

  // Close card action menus when clicking outside
  useEffect(() => {
    const handleGlobalClick = () => setOpenMenuProductId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Filter seller's own products
  const sellerProducts = useMemo(() => {
    if (!user) return [];
    return products.filter((p) => p.sellerId === user.uid);
  }, [products, user]);

  // Calculated overall summary stats for the dark top banner
  const overviewStats = useMemo(() => {
    let activeCount = 0;
    let totalViews7Days = 0;
    let totalMessages = 0;

    sellerProducts.forEach((p) => {
      const isSold = p.status === 'sold';
      const isReserved = p.status === 'reserved' || p.status === 'pending';
      const isOutOfStock = (p as any).status === 'out_of_stock';
      const isPaused = (p as any).status === 'paused';
      const isExpired = (p as any).status === 'expired';

      if (!isSold && !isReserved && !isOutOfStock && !isPaused && !isExpired) {
        activeCount++;
      }

      const pStats = getProductAggregatedStats(p, conversations, favorites);
      totalViews7Days += pStats.last7DaysViews;
      totalMessages += pStats.messagesCount;
    });

    return {
      activeCount,
      totalViews7Days,
      totalMessages,
      totalCount: sellerProducts.length,
    };
  }, [sellerProducts, conversations, favorites]);

  // Tab counts
  const tabCounts = useMemo(() => {
    let actives = 0;
    let reserved = 0;
    let sold = 0;
    let outOfStock = 0;
    let paused = 0;
    let expired = 0;

    sellerProducts.forEach((p) => {
      const st = p.status as string;
      if (st === 'sold') sold++;
      else if (st === 'reserved' || st === 'pending') reserved++;
      else if (st === 'out_of_stock') outOfStock++;
      else if (st === 'paused') paused++;
      else if (st === 'expired') expired++;
      else actives++;
    });

    return { actives, reserved, sold, outOfStock, paused, expired };
  }, [sellerProducts]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return sellerProducts.filter((p) => {
      // 1. Status Filter
      const st = p.status as string;
      if (activeStatusTab === 'sold' && st !== 'sold') return false;
      if (activeStatusTab === 'reserved' && st !== 'reserved' && st !== 'pending') return false;
      if (activeStatusTab === 'out_of_stock' && st !== 'out_of_stock') return false;
      if (activeStatusTab === 'actives' && (st === 'sold' || st === 'reserved' || st === 'pending' || st === 'out_of_stock' || st === 'paused' || st === 'expired')) {
        return false;
      }

      // 2. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = p.title?.toLowerCase().includes(q);
        const matchesCategory = p.category?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCategory) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'views') {
        const statsA = getProductAggregatedStats(a, conversations, favorites);
        const statsB = getProductAggregatedStats(b, conversations, favorites);
        return statsB.totalViews - statsA.totalViews;
      }
      // 'recent' default
      const dateA = new Date(a.createdAt?.seconds ? a.createdAt.seconds * 1000 : a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt?.seconds ? b.createdAt.seconds * 1000 : b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [sellerProducts, activeStatusTab, searchQuery, sortBy, conversations, favorites]);

  // Handle WhatsApp Booster
  const handleConfirmBooster = () => {
    if (!boosterProduct) return;
    const phone = "2250160232164";
    const msg = `Bonjour l'équipe TrocShop, je souhaite booster mon annonce "${boosterProduct.title}" (Prix: ${boosterProduct.price} CFA).`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    setBoosterProduct(null);
  };

  // Helper for badge rendering
  const renderStatusBadge = (p: Product) => {
    const st = p.status as string;
    const isSold = st === 'sold';
    const isReserved = st === 'reserved' || st === 'pending';
    const isOutOfStock = st === 'out_of_stock';
    const isPaused = st === 'paused';
    const isExpired = st === 'expired';
    const isUrgent = (p as any).isUrgent;
    const isPriceLowered = (p as any).isPriceLowered;

    if (isSold) {
      return (
        <span className="px-2.5 py-1 bg-zinc-900/90 text-white text-[10px] font-black uppercase tracking-wider rounded-lg backdrop-blur-md border border-white/10 shadow-sm flex items-center gap-1">
          <CheckCircle size={12} className="text-emerald-400" />
          Vendu
        </span>
      );
    }
    if (isReserved) {
      return (
        <span className="px-2.5 py-1 bg-amber-500/90 text-zinc-950 text-[10px] font-black uppercase tracking-wider rounded-lg backdrop-blur-md border border-white/20 shadow-sm flex items-center gap-1">
          <Clock size={12} />
          Réservé
        </span>
      );
    }
    if (isOutOfStock) {
      return (
        <span className="px-2.5 py-1 bg-rose-600/90 text-white text-[10px] font-black uppercase tracking-wider rounded-lg backdrop-blur-md border border-white/20 shadow-sm flex items-center gap-1">
          <PackageX size={12} />
          Rupture
        </span>
      );
    }
    if (isPaused) {
      return (
        <span className="px-2.5 py-1 bg-indigo-600/90 text-white text-[10px] font-black uppercase tracking-wider rounded-lg backdrop-blur-md border border-white/20 shadow-sm flex items-center gap-1">
          <PauseCircle size={12} />
          En pause
        </span>
      );
    }
    if (isExpired) {
      return (
        <span className="px-2.5 py-1 bg-zinc-600/90 text-white text-[10px] font-black uppercase tracking-wider rounded-lg backdrop-blur-md border border-white/10 shadow-sm">
          Expiré
        </span>
      );
    }
    if (isUrgent) {
      return (
        <span className="px-2.5 py-1 bg-red-600/90 text-white text-[10px] font-black uppercase tracking-wider rounded-lg backdrop-blur-md border border-white/20 shadow-sm flex items-center gap-1 animate-pulse">
          <Flame size={12} className="fill-white" />
          Urgent
        </span>
      );
    }
    if (isPriceLowered) {
      return (
        <span className="px-2.5 py-1 bg-emerald-600/90 text-white text-[10px] font-black uppercase tracking-wider rounded-lg backdrop-blur-md border border-white/20 shadow-sm flex items-center gap-1">
          <ArrowDownRight size={12} />
          Prix baissé
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 bg-emerald-500/90 text-white text-[10px] font-black uppercase tracking-wider rounded-lg backdrop-blur-md border border-white/20 shadow-sm flex items-center gap-1">
        <CheckCircle size={12} />
        Actif
      </span>
    );
  };

  // If a product is selected for detail view, render DETAIL SCREEN
  if (selectedProductDetail) {
    const stats = getProductAggregatedStats(selectedProductDetail, conversations, favorites);
    const isSold = selectedProductDetail.status === 'sold';

    // Calculate chart max and points
    const maxVal = Math.max(...stats.dailyViews7Days.map(d => d.count), 5);
    const chartHeight = 120;
    const chartWidth = 320;
    const points = stats.dailyViews7Days.map((d, index) => {
      const x = (index / (stats.dailyViews7Days.length - 1 || 1)) * chartWidth;
      const y = chartHeight - (d.count / maxVal) * (chartHeight - 20) - 10;
      return { x, y, val: d.count, label: d.dayLabel, date: d.dateStr };
    });

    const pathD = points.length > 0 ? getSmoothPath(points) : '';
    const fillD = points.length > 0
      ? `${pathD} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`
      : '';

    const strokeColor = stats.isTrendUp ? '#22c55e' : '#ea580c';
    const gradientId = `chartGrad_${selectedProductDetail.id}`;

    return (
      <div 
        className="space-y-6 pb-40 max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedProductDetail(null)}
            className="p-3 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-900 rounded-2xl transition-all active:scale-95 shadow-sm cursor-pointer"
            title="Retour à mes annonces"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-zinc-900">
              Détails de l'annonce
            </h2>
            <p className="text-xs text-zinc-500 font-medium">Statistiques & performances en temps réel</p>
          </div>
        </div>

        {/* Hero Product Card */}
        <div className="bg-white rounded-[2rem] border border-zinc-150 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
          <div className="w-full sm:w-32 h-40 sm:h-32 rounded-2xl overflow-hidden bg-zinc-100 relative shrink-0">
            <img 
              src={selectedProductDetail.images?.[0] || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=400&q=80"} 
              alt={selectedProductDetail.title} 
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2">
              {renderStatusBadge(selectedProductDetail)}
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-1.5 w-full">
            <h3 className="text-xl font-black text-zinc-900 tracking-tight leading-snug truncate">
              {selectedProductDetail.title}
            </h3>
            <p className="text-2xl font-black text-orange-600 tracking-tight">
              {selectedProductDetail.price ? `${selectedProductDetail.price.toLocaleString('fr-FR')} CFA` : 'Troc'}
            </p>
            <div className="flex items-center gap-3 text-xs text-zinc-400 font-semibold pt-1 flex-wrap">
              <span className="px-2.5 py-1 bg-zinc-100 rounded-lg text-zinc-600">{selectedProductDetail.category || 'Général'}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Calendar size={13} /> En ligne depuis {stats.daysOnline} j</span>
            </div>
          </div>
        </div>

        {/* 4 Stat Tiles Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white/90 backdrop-blur-xl p-4 sm:p-5 rounded-[1.8rem] border border-orange-500/20 shadow-[0_8px_25px_rgba(234,88,12,0.06)] hover:border-orange-500/40 transition-all space-y-2 group">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center border border-orange-500/20 shadow-sm group-hover:scale-110 transition-transform">
              <BarChart2 size={20} />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">{stats.totalViews}</p>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Vues totales</p>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl p-4 sm:p-5 rounded-[1.8rem] border border-red-500/20 shadow-[0_8px_25px_rgba(239,68,68,0.06)] hover:border-red-500/40 transition-all space-y-2 group">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20 shadow-sm group-hover:scale-110 transition-transform">
              <Heart size={20} className="fill-red-500" />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">{stats.favoritesCount}</p>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Favoris</p>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl p-4 sm:p-5 rounded-[1.8rem] border border-blue-500/20 shadow-[0_8px_25px_rgba(59,130,246,0.06)] hover:border-blue-500/40 transition-all space-y-2 group">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20 shadow-sm group-hover:scale-110 transition-transform">
              <MessageCircle size={20} />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">{stats.messagesCount}</p>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Messages</p>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl p-4 sm:p-5 rounded-[1.8rem] border border-emerald-500/20 shadow-[0_8px_25px_rgba(16,185,129,0.06)] hover:border-emerald-500/40 transition-all space-y-2 group">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 shadow-sm group-hover:scale-110 transition-transform">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">{stats.daysOnline} j</p>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">En ligne</p>
            </div>
          </div>
        </div>

        {/* Trend Chart Box */}
        <div className="bg-white p-5 sm:p-6 rounded-[2rem] border border-zinc-150 shadow-sm space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-black text-zinc-900 uppercase tracking-tight flex items-center gap-2">
                <BarChart2 size={18} className="text-orange-600" />
                Évolution des vues sur 7 jours
              </h4>
              <p className="text-xs text-zinc-400 font-medium">Nombre de consultations quotidiennes</p>
            </div>

            {stats.hasViews && (
              <div className={cn(
                "px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1 border shadow-sm",
                stats.isTrendUp 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : (stats.viewsTrendPercent < 0 
                      ? "bg-red-50 text-red-700 border-red-200" 
                      : "bg-orange-50 text-orange-700 border-orange-200")
              )}>
                {stats.isTrendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span>{stats.viewsTrendPercent > 0 ? `+${stats.viewsTrendPercent}%` : `${stats.viewsTrendPercent}%`}</span>
              </div>
            )}
          </div>

          {!stats.hasViews ? (
            /* Empty state for brand new listing with 0 views */
            <div className="py-12 px-6 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 space-y-2">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
                <BarChart2 size={22} />
              </div>
              <h5 className="font-black text-zinc-900 text-sm">Pas encore de statistiques</h5>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Reviens dans quelques heures, tes premières statistiques d'audience apparaîtront dès les premières consultations.
              </p>
            </div>
          ) : (
            /* SVG Trend Chart */
            <div className="space-y-3 pt-2">
              <div className="w-full overflow-x-auto">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-36 overflow-visible">
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
                      <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Gradient Area */}
                  {fillD && <path d={fillD} fill={`url(#${gradientId})`} />}

                  {/* Smooth Line */}
                  {pathD && (
                    <path 
                      d={pathD} 
                      fill="none" 
                      stroke={strokeColor} 
                      strokeWidth="3.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                    />
                  )}

                  {/* Points */}
                  {points.map((p, i) => (
                    <g key={i} className="group cursor-pointer">
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r="5" 
                        fill="#ffffff" 
                        stroke={strokeColor} 
                        strokeWidth="3" 
                        className="transition-all hover:r-7"
                      />
                      <title>{`${p.label} (${p.date}): ${p.val} vue${p.val > 1 ? 's' : ''}`}</title>
                    </g>
                  ))}
                </svg>
              </div>

              {/* Day Labels */}
              <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 px-1 border-t border-zinc-100 pt-2">
                {stats.dailyViews7Days.map((d, idx) => (
                  <div key={idx} className="text-center">
                    <p className="text-zinc-700 font-black">{d.dayLabel}</p>
                    <p className="text-[9px] text-zinc-400">{d.count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* History Timeline */}
        <div className="bg-white p-5 sm:p-6 rounded-[2rem] border border-zinc-150 shadow-sm space-y-4">
          <h4 className="text-base font-black text-zinc-900 uppercase tracking-tight flex items-center gap-2">
            <Clock size={18} className="text-orange-600" />
            Historique de l'annonce
          </h4>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200">
            {stats.historyEvents.map((event) => (
              <div key={event.id} className="relative flex items-start gap-3">
                <span className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-orange-600 ring-4 ring-orange-100 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-zinc-900">{event.label}</p>
                  <p className="text-[10px] font-semibold text-zinc-400">{event.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions (Bottom Bar) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            onClick={() => setBoosterProduct(selectedProductDetail)}
            className="py-4 px-5 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-orange-600/20 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <Zap size={18} className="fill-white" />
            <span>Booster l'annonce</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onEditProduct(selectedProductDetail);
              setSelectedProductDetail(null);
            }}
            className="py-4 px-5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-900 font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <Edit3 size={18} />
            <span>Modifier</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onMarkAsSold(selectedProductDetail.id);
              setSelectedProductDetail(prev => prev ? { ...prev, status: 'sold' } : null);
            }}
            disabled={isSold}
            className={cn(
              "py-4 px-5 font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 border shadow-sm",
              isSold 
                ? "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed" 
                : "bg-white border-zinc-200 text-zinc-900 hover:bg-zinc-50"
            )}
          >
            <CheckCircle size={18} className={isSold ? "text-zinc-400" : "text-emerald-600"} />
            <span>{isSold ? "Déjà vendu" : "Marquer vendu"}</span>
          </button>
        </div>
      </div>
    );
  }

  // MAIN LISTINGS LIST SCREEN
  return (
    <div 
      className="space-y-6 pb-40"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-3 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-900 rounded-2xl transition-all active:scale-95 shadow-sm cursor-pointer"
            title="Retour au profil"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-3xl font-black italic tracking-tighter uppercase text-zinc-900 border-b-4 border-orange-600 inline-block font-sans">
              MES ANNONCES
            </h2>
          </div>
        </div>

        {/* Switch Pill (Annonces vs Vidéos) */}
        <div className="bg-zinc-100 p-1.5 rounded-full flex items-center max-w-xs sm:max-w-sm w-full border border-zinc-200/90 shadow-2xs self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setMainSectionMode('annonces')}
            className={cn(
              "flex-1 py-2 px-3.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center cursor-pointer",
              mainSectionMode === 'annonces'
                ? "bg-orange-600 text-white shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            )}
          >
            <span>Annonces</span>
          </button>

          <button
            type="button"
            onClick={() => setMainSectionMode('spotlight')}
            className={cn(
              "flex-1 py-2 px-3.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center cursor-pointer",
              mainSectionMode === 'spotlight'
                ? "bg-zinc-900 text-white shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            )}
          >
            <span>Vidéos</span>
          </button>
        </div>
      </div>

      {mainSectionMode === 'spotlight' ? (
        <SpotlightPublisher user={user} mode="manage" />
      ) : (
        <>

      {/* Bandeau d'aperçu (Dark Summary Card) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-[2.2rem] p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-3 gap-3 text-center sm:text-left divide-x divide-zinc-800">
          <div className="px-2 sm:px-4 space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {overviewStats.activeCount}
            </p>
            <p className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Annonces actives
            </p>
          </div>

          <div className="px-2 sm:px-4 space-y-1 pl-4">
            <p className="text-3xl sm:text-4xl font-black text-orange-500 tracking-tight flex items-center justify-center sm:justify-start gap-1">
              {overviewStats.totalViews7Days}
            </p>
            <p className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Vues 7j cumulées
            </p>
          </div>

          <div className="px-2 sm:px-4 space-y-1 pl-4">
            <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {overviewStats.totalMessages}
            </p>
            <p className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Messages reçus
            </p>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: 'actives', label: 'Actives', count: tabCounts.actives },
          { key: 'reserved', label: 'Réservées', count: tabCounts.reserved },
          { key: 'sold', label: 'Vendues', count: tabCounts.sold },
          { key: 'out_of_stock', label: 'Rupture', count: tabCounts.outOfStock },
        ].map((tab) => {
          const isActive = activeStatusTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveStatusTab(tab.key as any)}
              className={cn(
                "px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer shadow-sm border",
                isActive
                  ? "bg-orange-600 text-white border-orange-600 shadow-orange-600/20"
                  : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold",
                isActive ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"
              )}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Sort Line */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer dans mes annonces..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-600 shadow-sm"
          />
        </div>

        {/* Sort selector */}
        <div className="w-full sm:w-60 shrink-0">
          <CustomDropdown
            value={sortBy}
            options={[
              { value: 'recent', label: 'Tri : Plus récent' },
              { value: 'views', label: 'Tri : Plus vus' },
              { value: 'price_asc', label: 'Tri : Prix croissant' },
              { value: 'price_desc', label: 'Tri : Prix décroissant' },
            ]}
            onChange={(val) => setSortBy(val as any)}
          />
        </div>
      </div>

      {/* Product Grid (2 columns) */}
      {filteredProducts.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[2rem] border border-zinc-150 p-8 space-y-3">
          <ShoppingBag className="w-16 h-16 mx-auto text-zinc-300 opacity-40" />
          <h3 className="font-black text-zinc-900 text-base uppercase tracking-tight">Aucune annonce trouvée</h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            {searchQuery 
              ? "Aucun résultat ne correspond à ta recherche." 
              : `Aucune annonce dans la catégorie "${activeStatusTab}".`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredProducts.map((product, index) => {
            const pStats = getProductAggregatedStats(product, conversations, favorites);
            const isSold = product.status === 'sold';
            const isMenuOpen = openMenuProductId === product.id;
            const isEvenColumn = index % 2 === 0;

            return (
              <div
                key={product.id}
                onClick={() => setSelectedProductDetail(product)}
                className={cn(
                  "bg-white rounded-[2rem] border border-zinc-150 shadow-sm hover:shadow-md transition-all flex flex-col relative group cursor-pointer",
                  isMenuOpen ? "z-50" : "z-10"
                )}
              >
                {/* Photo Header */}
                <div className="aspect-[4/5] bg-zinc-100 relative rounded-t-[2rem] overflow-hidden">
                  <img
                    src={product.images?.[0] || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=400&q=80"}
                    alt={product.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Top Left Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    {renderStatusBadge(product)}
                  </div>
                </div>

                {/* Top Right "···" Menu Button & Popover - Placed at Card level to prevent overflow clipping */}
                <div className="absolute top-3 right-3 z-50">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuProductId(isMenuOpen ? null : product.id);
                    }}
                    className="w-8 h-8 rounded-full bg-zinc-900/90 hover:bg-black text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-lg"
                    title="Options"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {/* Popover Action Menu */}
                  {isMenuOpen && (
                    <>
                      {/* Invisible Backdrop to close menu when clicking outside */}
                      <div 
                        className="fixed inset-0 z-40 bg-transparent cursor-default" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuProductId(null);
                        }} 
                      />
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          "absolute top-10 w-52 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-zinc-200 py-2 z-50 text-xs font-bold text-zinc-800",
                            isEvenColumn ? "left-0 sm:left-auto sm:right-0" : "right-0"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuProductId(null);
                              setBoosterProduct(product);
                            }}
                            className="w-full px-4 py-2.5 text-left hover:bg-orange-50 text-orange-600 flex items-center gap-2.5 cursor-pointer font-extrabold"
                          >
                            <Zap size={15} className="fill-orange-600" />
                            <span>Booster</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuProductId(null);
                              onEditProduct(product);
                            }}
                            className="w-full px-4 py-2.5 text-left hover:bg-zinc-50 flex items-center gap-2.5 cursor-pointer"
                          >
                            <Edit3 size={15} />
                            <span>Modifier</span>
                          </button>

                          {(product.status === 'reserved' || product.status === 'pending') && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuProductId(null);
                                if (onCancelReservation) {
                                  onCancelReservation(product.id);
                                } else if (onUpdateStatus) {
                                  onUpdateStatus(product.id, 'available');
                                }
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-rose-50 text-rose-700 flex items-center gap-2.5 cursor-pointer font-bold border-t border-zinc-100"
                            >
                              <RotateCcw size={15} />
                              <span>Annuler la réservation</span>
                            </button>
                          )}

                          {product.status !== 'reserved' && product.status !== 'pending' && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuProductId(null);
                                if (onUpdateStatus) {
                                  onUpdateStatus(product.id, 'reserved');
                                }
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-amber-50 text-amber-700 flex items-center gap-2.5 cursor-pointer font-bold"
                            >
                              <Bookmark size={15} />
                              <span>Marquer réservé</span>
                            </button>
                          )}

                          {product.status !== 'sold' && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuProductId(null);
                                if (onUpdateStatus) {
                                  onUpdateStatus(product.id, 'sold');
                                } else {
                                  onMarkAsSold(product.id);
                                }
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-emerald-50 text-emerald-700 flex items-center gap-2.5 cursor-pointer font-bold"
                            >
                              <CheckCircle size={15} />
                              <span>Marquer vendu</span>
                            </button>
                          )}

                          {(product.status as string) !== 'out_of_stock' && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuProductId(null);
                                if (onUpdateStatus) {
                                  onUpdateStatus(product.id, 'out_of_stock');
                                }
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-rose-50 text-rose-700 flex items-center gap-2.5 cursor-pointer font-bold"
                            >
                              <PackageX size={15} />
                              <span>En rupture de stock</span>
                            </button>
                          )}

                          {product.status !== 'available' && (product.status as string) !== 'active' && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuProductId(null);
                                if (onUpdateStatus) {
                                  onUpdateStatus(product.id, 'available');
                                }
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-blue-50 text-blue-700 flex items-center gap-2.5 cursor-pointer font-bold border-t border-zinc-100"
                            >
                              <PlayCircle size={15} />
                              <span>Remettre en vente</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              setOpenMenuProductId(null);
                              onDeleteProduct(product.id, e);
                            }}
                            className="w-full px-4 py-2.5 text-left hover:bg-red-50 text-red-600 flex items-center gap-2.5 cursor-pointer border-t border-zinc-100"
                          >
                            <Trash2 size={15} />
                            <span>Supprimer</span>
                          </button>
                        </div>
                      </>
                    )}
                </div>

                {/* Content */}
                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-black text-zinc-900 text-xs truncate leading-snug">
                      {product.title}
                    </h4>
                    <p className="text-sm font-black text-orange-600">
                      {product.price ? `${product.price.toLocaleString('fr-FR')} CFA` : 'Troc'}
                    </p>
                  </div>

                  {/* Reservation Details & Seller Action Bar */}
                  {(product.status === 'reserved' || product.status === 'pending') && (
                    <div className="pt-2 border-t border-zinc-100 space-y-1.5">
                      <div className="px-2.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[10px] font-black flex items-center gap-1.5 shadow-2xs">
                        <Clock size={12} className="text-amber-600 shrink-0" />
                        <span className="truncate">{formatReservedCountdown(product.reserved_until || (product as any).reservedUntil)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {onCancelReservation && (
                          <button
                            type="button"
                            onClick={() => onCancelReservation(product.id)}
                            className="flex-1 py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            title="Annuler la réservation"
                          >
                            <RotateCcw size={11} />
                            <span>Annuler</span>
                          </button>
                        )}
                        {onOpenConversation && (
                          <button
                            type="button"
                            onClick={() => {
                              const conv = conversations.find((c: any) => c.productId === product.id);
                              if (conv) {
                                onOpenConversation(conv.id);
                              }
                            }}
                            className="flex-1 py-1.5 px-2 bg-zinc-900 hover:bg-black text-white rounded-lg text-[10px] font-black flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            title="Discuter avec l'acheteur"
                          >
                            <MessageCircle size={11} className="text-orange-400" />
                            <span>Discuter</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mini-stats line */}
                  <div className="pt-2 border-t border-zinc-100 text-[10px] text-zinc-400 font-bold flex items-center justify-between gap-1">
                    {isSold ? (
                      <span className="text-zinc-500 font-bold truncate">
                        Vendu le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                      </span>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 shrink-0" title="Nombre de vues">
                          <BarChart2 size={13} className="text-zinc-500" />
                          <span className="text-zinc-700">{pStats.last7DaysViews}</span>
                          <span className={cn(
                            "text-[9px] font-black",
                            pStats.isTrendUp ? "text-emerald-600" : (pStats.viewsTrendPercent < 0 ? "text-red-500" : "text-zinc-400")
                          )}>
                            {pStats.isTrendUp ? `↑` : (pStats.viewsTrendPercent < 0 ? `↓` : '')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0" title="Messages reçus">
                          <MessageCircle size={13} className="text-zinc-400" />
                          <span className="text-zinc-700">{pStats.messagesCount}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* WhatsApp Booster Confirmation Modal */}
      {boosterProduct && (
        <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-[2rem] p-6 max-w-sm w-full shadow-2xl border border-zinc-150 space-y-5 text-center"
          >
            <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
              <Zap size={28} className="fill-orange-600" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">
                Booster votre annonce
              </h3>
              <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                Vous allez contacter l'équipe TrocShop sur WhatsApp pour booster votre annonce <strong className="text-zinc-900">"{boosterProduct.title}"</strong>. Voulez-vous continuer ?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBoosterProduct(null)}
                className="py-3.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95"
              >
                Non
              </button>

              <button
                type="button"
                onClick={handleConfirmBooster}
                className="py-3.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95 shadow-md shadow-orange-600/20"
              >
                Oui
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerListingsManager;
