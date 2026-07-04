import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Car, 
  Home, 
  ChevronRight, 
  Search, 
  X, 
  Filter, 
  MapPin, 
  Share2, 
  MessageSquare, 
  ChevronLeft, 
  Check, 
  User, 
  DollarSign, 
  Calendar,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { CustomDropdown } from './ui/CustomDropdown';
import { NEIGHBORHOODS } from '../constants';
import { ServiceListing } from '../types';
import { 
  db, 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  User as AuthUser 
} from '../lib/firebase';
import { fetchUserProfileCached, handlePhoneCall } from '../lib/helpers';

export function SellerAvatar({ sellerId, className = "w-8 h-8" }: { sellerId: string; className?: string }) {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (sellerId) {
      fetchUserProfileCached(sellerId).then(data => {
        if (data) setProfile(data);
      });
    }
  }, [sellerId]);

  if (!profile) {
    return <div className={`${className} rounded-full bg-zinc-200 animate-pulse`} />;
  }

  return (
    <div className="relative inline-block shrink-0">
      {profile.photoURL ? (
        <img 
          src={profile.photoURL} 
          alt={profile.displayName || "Utilisateur"} 
          className={`${className} rounded-full object-cover`}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className={`${className} rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-600 uppercase`}>
          {profile.displayName ? profile.displayName.substring(0, 2) : 'TS'}
        </div>
      )}
      {(profile.isCertified === true || profile.is_certified === true || profile.isPro === true || profile.is_pro === true) && (
        <span className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 border border-white text-white p-0.5 rounded-full flex items-center justify-center w-3 h-3">
          <svg className="w-1.5 h-1.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
    </div>
  );
}

const SERVICE_NEIGHBORHOODS = [
  "Le Millionnaire",
  "220 Logements",
  "227 Logements",
  "Assabou",
  "Morofé",
  "Quartier Commerce",
  "Kokrenou",
  "Dioulabougou",
  "Petit Bouaké",
  "Énergie",
  "Abitha",
  "Kami",
  "Abakro",
  "Abokouamékro",
  "Abouakouassikro",
  "Aboukro"
];

interface ServicesPageProps {
  onBackToHome: () => void;
  user: AuthUser | null;
  onContactSeller: (sellerId: string, sellerName: string, service: any) => void;
  onDetailToggle?: (isOpen: boolean) => void;
  onSellerClick?: (sellerId: string) => void;
  initialServiceId?: string | null;
}

type SubView = 'main' | 'car' | 'house';

export function ServicesPage({ onBackToHome, user, onContactSeller, onDetailToggle, onSellerClick, initialServiceId }: ServicesPageProps) {
  const [subView, setSubView] = useState<SubView>('main');
  
  // Realtime services state
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  // Selected house/car for details view
  const [selectedHouse, setSelectedHouse] = useState<ServiceListing | null>(null);
  const [selectedHouseSellerProfile, setSelectedHouseSellerProfile] = useState<any>(null);

  useEffect(() => {
    if (selectedHouse) {
      fetchUserProfileCached(selectedHouse.sellerId).then(data => {
        if (data) {
          setSelectedHouseSellerProfile(data);
        } else {
          setSelectedHouseSellerProfile(null);
        }
      });
    } else {
      setSelectedHouseSellerProfile(null);
    }
  }, [selectedHouse]);

  // Auto-select service if initialServiceId is provided
  useEffect(() => {
    if (initialServiceId && services.length > 0) {
      const match = services.find((s) => s.id === initialServiceId);
      if (match) {
        setSelectedHouse(match);
      }
    }
  }, [initialServiceId, services]);
  
  // Carousel index
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Sharing toast
  const [shareFeedback, setShareFeedback] = useState(false);

  // Lightbox / Zoom state for clicking on image
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Refs for gesture tracking
  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);
  const touchStartPointRef = useRef<{ x: number; y: number } | null>(null);

  // Search and filter states for Car view
  const [carSearchQuery, setCarSearchQuery] = useState('');
  const [carSortBy, setCarSortBy] = useState('newest');
  const [isCarFiltersOpen, setIsCarFiltersOpen] = useState(false);
  const [carPriceMax, setCarPriceMax] = useState<number | null>(null);
  const [carNeighborhood, setCarNeighborhood] = useState('Tous');

  // Search and filter states for House view
  const [houseSearchQuery, setHouseSearchQuery] = useState('');
  const [houseSortBy, setHouseSortBy] = useState('newest');
  const [isHouseFiltersOpen, setIsHouseFiltersOpen] = useState(false);
  const [housePriceMax, setHousePriceMax] = useState<number | null>(null);
  const [houseNeighborhood, setHouseNeighborhood] = useState('Tous');

  // Listen to outer detail toggle event from "Mes Annonces" click
  useEffect(() => {
    const handleOpenDetail = (e: CustomEvent) => {
      const serviceId = e.detail;
      const found = services.find(s => s.id === serviceId);
      if (found) {
        setSelectedHouse(found);
        setCarouselIndex(0);
        setSubView(found.serviceType === 'house' ? 'house' : 'car');
      }
    };
    window.addEventListener('open-service-detail', handleOpenDetail as any);
    
    // Check if there was a pre-set ID from window variable on load
    if ((window as any).__openServiceDetailId) {
      const serviceId = (window as any).__openServiceDetailId;
      const found = services.find(s => s.id === serviceId);
      if (found) {
        setSelectedHouse(found);
        setCarouselIndex(0);
        setSubView(found.serviceType === 'house' ? 'house' : 'car');
        delete (window as any).__openServiceDetailId;
      }
    }

    return () => {
      window.removeEventListener('open-service-detail', handleOpenDetail as any);
    };
  }, [services]);

  // Update navbar hidden state when service details open/close
  useEffect(() => {
    if (onDetailToggle) {
      onDetailToggle(selectedHouse !== null);
    }
    if (!selectedHouse) {
      delete (window as any).__openServiceDetailId;
    }
  }, [selectedHouse, onDetailToggle]);

  // Load services in real-time
  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: ServiceListing[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          serviceType: d.serviceType,
          title: d.title,
          price: d.price,
          pricePeriod: d.pricePeriod,
          neighborhood: d.neighborhood,
          customLocation: d.customLocation,
          description: d.description,
          images: d.images || [],
          sellerId: d.sellerId,
          sellerName: d.sellerName,
          sellerPhone: d.sellerPhone,
          status: d.status || 'available',
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        } as ServiceListing);
      });
      setServices(list);
      setServicesLoading(false);
    }, (err) => {
      console.warn("Error subscribing to services collection:", err);
      setServicesLoading(false);
    });

    return () => unsub();
  }, []);

  // Filter and sort house rentals
  const filteredHouses = services
    .filter(item => item.serviceType === 'house')
    .filter(item => {
      if (!houseSearchQuery.trim()) return true;
      const q = houseSearchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.neighborhood.toLowerCase().includes(q)
      );
    })
    .filter(item => {
      if (houseNeighborhood === 'Tous') return true;
      return item.neighborhood === houseNeighborhood;
    })
    .filter(item => {
      if (housePriceMax === null) return true;
      return item.price <= housePriceMax;
    })
    .sort((a, b) => {
      if (houseSortBy === 'newest') {
        const tA = a.createdAt?.seconds || new Date(a.createdAt).getTime() || 0;
        const tB = b.createdAt?.seconds || new Date(b.createdAt).getTime() || 0;
        return tB - tA;
      }
      if (houseSortBy === 'oldest') {
        const tA = a.createdAt?.seconds || new Date(a.createdAt).getTime() || 0;
        const tB = b.createdAt?.seconds || new Date(b.createdAt).getTime() || 0;
        return tA - tB;
      }
      if (houseSortBy === 'price-asc') {
        return a.price - b.price;
      }
      if (houseSortBy === 'price-desc') {
        return b.price - a.price;
      }
      return 0;
    });

  // Filter and sort car rentals
  const filteredCars = services
    .filter(item => item.serviceType === 'car')
    .filter(item => {
      if (!carSearchQuery.trim()) return true;
      const q = carSearchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.neighborhood.toLowerCase().includes(q)
      );
    })
    .filter(item => {
      if (carNeighborhood === 'Tous') return true;
      return item.neighborhood === carNeighborhood;
    })
    .filter(item => {
      if (carPriceMax === null) return true;
      return item.price <= carPriceMax;
    })
    .sort((a, b) => {
      if (carSortBy === 'newest') {
        const tA = a.createdAt?.seconds || new Date(a.createdAt).getTime() || 0;
        const tB = b.createdAt?.seconds || new Date(b.createdAt).getTime() || 0;
        return tB - tA;
      }
      if (carSortBy === 'oldest') {
        const tA = a.createdAt?.seconds || new Date(a.createdAt).getTime() || 0;
        const tB = b.createdAt?.seconds || new Date(b.createdAt).getTime() || 0;
        return tA - tB;
      }
      if (carSortBy === 'price-asc') {
        return a.price - b.price;
      }
      if (carSortBy === 'price-desc') {
        return b.price - a.price;
      }
      return 0;
    });

  const handleShare = (item: ServiceListing) => {
    const typeLabel = item.serviceType === 'house' ? 'superbe maison' : 'superbe voiture';
    const periodLabel = item.pricePeriod === 'month' ? 'mois' : 'jour';
    const shareUrl = `${window.location.origin}/?tab=services&service=${item.id}`;
    const shareText = `Découvre cette ${typeLabel} en location sur TrocShop : "${item.title}" situé à ${item.neighborhood} pour seulement ${item.price.toLocaleString()} FCFA par ${periodLabel}. Regarde ici : ${shareUrl}`;
    
    if (navigator.share) {
      navigator.share({
        title: item.title,
        text: shareText,
        url: shareUrl
      }).catch(err => {
        console.log('Error sharing:', err);
        navigator.clipboard.writeText(shareText);
        setShareFeedback(true);
        setTimeout(() => setShareFeedback(false), 2500);
      });
    } else {
      navigator.clipboard.writeText(shareText);
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2500);
    }
  };

  const nextSlide = (imagesCount: number) => {
    setCarouselIndex((prev) => (prev + 1) % imagesCount);
  };

  const prevSlide = (imagesCount: number) => {
    setCarouselIndex((prev) => (prev - 1 + imagesCount) % imagesCount);
  };

  return (
    <div className="w-full min-h-screen bg-white pb-24">
      <AnimatePresence mode="wait">
        {/* Main Category Selector Grid */}
        {subView === 'main' && !selectedHouse && (
          <motion.div
            key="main"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6 pt-2 max-w-sm mx-auto"
          >
            {/* Header */}
            <div className="flex items-center gap-4 px-1">
              <button
                onClick={onBackToHome}
                className="w-10 h-10 rounded-full bg-white border border-zinc-150 flex items-center justify-center text-zinc-600 hover:bg-zinc-50 active:scale-95 transition-all shadow-sm"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">TrocShop</p>
                <h2 className="font-black text-xl tracking-tight text-zinc-900">ESPACE SERVICES</h2>
              </div>
            </div>

            {/* Grid of service categories */}
            <div className="grid grid-cols-1 gap-4 px-1">
              {/* Location de maisons */}
              <button
                onClick={() => {
                  setSubView('house');
                  setHouseSearchQuery('');
                  setIsHouseFiltersOpen(false);
                  setHousePriceMax(null);
                  setHouseNeighborhood('Tous');
                }}
                className="group relative overflow-hidden bg-white border border-zinc-150 rounded-[2rem] p-6 text-left hover:border-indigo-200 hover:shadow-md transition-all active:scale-[0.99]"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Home size={24} />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                    <ChevronRight size={16} />
                  </div>
                </div>
                <div>
                  <h3 className="font-black text-base text-zinc-950 uppercase tracking-wide">Location de maisons</h3>
                  <p className="text-xs text-zinc-400 mt-1 font-medium">Trouvez votre prochain logement ou hébergement</p>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {/* Location de voiture View */}
        {subView === 'car' && !selectedHouse && (
          <motion.div
            key="car"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-6 max-w-sm mx-auto"
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSubView('main')}
                  className="p-2 hover:bg-zinc-100 rounded-full text-zinc-600 transition-colors"
                >
                  <ArrowLeft size={24} />
                </button>
                <div>
                  <h2 className="text-4xl font-black tracking-tighter uppercase italic text-indigo-600">
                    Location de voiture
                  </h2>
                  <div className="h-1.5 w-12 rounded-full mt-1 bg-indigo-600" />
                </div>
              </div>

              {/* Banner with perfectly white image */}
              <div className="w-full flex items-center justify-center bg-white overflow-hidden mb-6 relative py-4">
                <img 
                  src="/images (6).jpeg" 
                  alt="Location de voiture" 
                  className="max-h-[220px] w-auto object-contain bg-white"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Search Bar matching category page */}
              <div className="flex items-center gap-3 w-full">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300 transition-colors group-focus-within:text-indigo-600" />
                  <input 
                    type="text" 
                    value={carSearchQuery}
                    onChange={e => setCarSearchQuery(e.target.value)}
                    placeholder="Rechercher une voiture..." 
                    className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white border border-zinc-150 shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-sm"
                  />
                  {carSearchQuery && (
                    <button 
                      onClick={() => setCarSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-600 transition-all font-medium"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => setIsCarFiltersOpen(!isCarFiltersOpen)}
                  className={cn(
                    "rounded-2xl h-14 w-14 shrink-0 transition-all flex items-center justify-center border",
                    isCarFiltersOpen ? "bg-indigo-50 border-indigo-100 text-indigo-600" : "bg-white border-zinc-150 text-zinc-400 hover:text-zinc-600"
                  )}
                >
                  <Filter size={20} />
                </button>
              </div>

              {/* Filters Panel */}
              <AnimatePresence>
                {isCarFiltersOpen && (
                  <motion.div 
                    key="car-filters"
                    initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                    animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                    exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                    className="space-y-4 bg-zinc-50 p-6 rounded-[2rem] border border-zinc-150"
                  >
                    <div className="grid grid-cols-1 gap-4">
                      {/* Price max filter */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800">Budget Max</label>
                        <input 
                          type="number" 
                          placeholder="F CFA" 
                          value={carPriceMax !== null ? carPriceMax : ''}
                          className="w-full bg-white border border-zinc-200 p-3 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                          onChange={(e) => setCarPriceMax(e.target.value ? Number(e.target.value) : null)}
                        />
                      </div>

                      {/* Neighborhood / Quartier filter as requested */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800">Quartier</label>
                        <CustomDropdown
                          value={carNeighborhood}
                          options={['Tous', ...SERVICE_NEIGHBORHOODS]}
                          onChange={(val) => setCarNeighborhood(val)}
                          placeholder="Tous"
                          className="bg-white border-zinc-150 rounded-2xl"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sort Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                {[
                  { id: 'newest', label: 'Nouveautés' },
                  { id: 'price-asc', label: 'Prix croissant' },
                  { id: 'price-desc', label: 'Prix décroissant' },
                  { id: 'oldest', label: 'Ancienneté' },
                ].map(sort => (
                  <button
                    key={sort.id}
                    onClick={() => setCarSortBy(sort.id)}
                    className={cn(
                      "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                      carSortBy === sort.id 
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20" 
                        : "bg-white text-zinc-400 border-zinc-150 hover:border-zinc-200"
                    )}
                  >
                    {sort.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Cars */}
            {servicesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-44 bg-zinc-50 border border-zinc-100 rounded-[2rem] animate-pulse" />
                ))}
              </div>
            ) : filteredCars.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 bg-white border border-zinc-150 rounded-[2.5rem] shadow-sm text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-300 mb-4">
                  <Car size={32} />
                </div>
                <p className="font-black uppercase tracking-widest text-[10px] text-zinc-400">Aucune annonce trouvée</p>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">Aucune voiture ne correspond à vos critères de recherche.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredCars.map((car) => (
                  <motion.div
                    key={car.id}
                    onClick={() => {
                      setSelectedHouse(car);
                      setCarouselIndex(0);
                    }}
                    className="bg-white border border-zinc-150 rounded-[2rem] overflow-hidden hover:shadow-md active:scale-[0.99] transition-all cursor-pointer flex flex-col"
                  >
                    {/* Main Image Banner */}
                    <div className="h-48 w-full relative bg-zinc-100">
                      {car.images?.[0] ? (
                        <img 
                          src={car.images[0]} 
                          alt={car.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-300">
                          <Car size={40} />
                        </div>
                      )}
                      {/* Price Badge */}
                      <div className="absolute bottom-4 left-4 px-4 py-2 bg-indigo-600/90 backdrop-blur-md text-white rounded-full text-xs font-black">
                        {car.price.toLocaleString()} FCFA / {car.pricePeriod === 'month' ? 'mois' : 'jour'}
                      </div>
                      
                      {/* Count Badge */}
                      {car.images && car.images.length > 1 && (
                        <div className="absolute top-4 right-4 px-2.5 py-1 bg-black/60 backdrop-blur-md text-white rounded-full text-[9px] font-black uppercase tracking-wider">
                          {car.images.length} Photos
                        </div>
                      )}
                    </div>

                    {/* Quick details */}
                    <div className="p-5 space-y-2">
                      <div className="flex items-center gap-1.5 text-indigo-600">
                        <MapPin size={12} />
                        <span className="text-[10px] font-black uppercase tracking-wider">{car.neighborhood}</span>
                      </div>
                      <h3 className="font-black text-sm text-zinc-900 leading-tight uppercase line-clamp-1">{car.title}</h3>
                      <p className="text-xs text-zinc-500 line-clamp-2 font-medium mb-2">{car.description}</p>

                      {/* Seller Info with Avatar */}
                      <div 
                        onClick={(e) => {
                          if (onSellerClick) {
                            e.stopPropagation();
                            onSellerClick(car.sellerId);
                          }
                        }}
                        className="flex items-center justify-between border-t border-zinc-100 pt-3 mt-2 hover:bg-zinc-50/50 rounded-xl px-1.5 py-1 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <SellerAvatar sellerId={car.sellerId} className="w-8 h-8" />
                          <div className="text-left">
                            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider leading-none">Publié par</p>
                            <p className="text-xs font-black text-zinc-800 line-clamp-1 mt-0.5 hover:text-indigo-600 transition-colors">{car.sellerName}</p>
                          </div>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full shrink-0">Voir le profil</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Location de maisons View */}
        {subView === 'house' && !selectedHouse && (
          <motion.div
            key="house"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-6 max-w-sm mx-auto"
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSubView('main')}
                  className="p-2 hover:bg-zinc-100 rounded-full text-zinc-600 transition-colors"
                >
                  <ArrowLeft size={24} />
                </button>
                <div>
                  <h2 className="text-4xl font-black tracking-tighter uppercase italic text-indigo-600">
                    Maisons
                  </h2>
                  <div className="h-1.5 w-12 rounded-full mt-1 bg-indigo-600" />
                </div>
              </div>

              {/* Banner with perfectly white image */}
              <div className="w-full flex items-center justify-center bg-white overflow-hidden mb-6 relative py-4">
                <img 
                  src="/images (5).jpeg" 
                  alt="Location de maison" 
                  className="max-h-[220px] w-auto object-contain bg-white"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Search Bar matching category page */}
              <div className="flex items-center gap-3 w-full">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300 transition-colors group-focus-within:text-indigo-600" />
                  <input 
                    type="text" 
                    value={houseSearchQuery}
                    onChange={e => setHouseSearchQuery(e.target.value)}
                    placeholder="Rechercher une maison..." 
                    className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white border border-zinc-150 shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-sm"
                  />
                  {houseSearchQuery && (
                    <button 
                      onClick={() => setHouseSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-600 transition-all font-medium"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => setIsHouseFiltersOpen(!isHouseFiltersOpen)}
                  className={cn(
                    "rounded-2xl h-14 w-14 shrink-0 transition-all flex items-center justify-center border",
                    isHouseFiltersOpen ? "bg-indigo-50 border-indigo-100 text-indigo-600" : "bg-white border-zinc-150 text-zinc-400 hover:text-zinc-600"
                  )}
                >
                  <Filter size={20} />
                </button>
              </div>

              {/* Filters Panel */}
              <AnimatePresence>
                {isHouseFiltersOpen && (
                  <motion.div 
                    key="house-filters"
                    initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                    animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                    exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                    className="space-y-4 bg-zinc-50 p-6 rounded-[2rem] border border-zinc-150"
                  >
                    <div className="grid grid-cols-1 gap-4">
                      {/* Price max filter */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800">Budget Max (FCFA)</label>
                        <input 
                          type="number" 
                          placeholder="F CFA" 
                          value={housePriceMax !== null ? housePriceMax : ''}
                          className="w-full bg-white border border-zinc-200 p-3 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                          onChange={(e) => setHousePriceMax(e.target.value ? Number(e.target.value) : null)}
                        />
                      </div>

                      {/* Neighborhood / Quartier filter */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800">Quartier</label>
                        <CustomDropdown
                          value={houseNeighborhood}
                          options={['Tous', ...SERVICE_NEIGHBORHOODS]}
                          onChange={(val) => setHouseNeighborhood(val)}
                          placeholder="Tous"
                          className="bg-white border-zinc-150 rounded-2xl"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sort Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                {[
                  { id: 'newest', label: 'Nouveautés' },
                  { id: 'price-asc', label: 'Prix croissant' },
                  { id: 'price-desc', label: 'Prix décroissant' },
                  { id: 'oldest', label: 'Ancienneté' },
                ].map(sort => (
                  <button
                    key={sort.id}
                    onClick={() => setHouseSortBy(sort.id)}
                    className={cn(
                      "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                      houseSortBy === sort.id 
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20" 
                        : "bg-white text-zinc-400 border-zinc-150 hover:border-zinc-200"
                    )}
                  >
                    {sort.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Houses */}
            {servicesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-44 bg-zinc-50 border border-zinc-100 rounded-[2rem] animate-pulse" />
                ))}
              </div>
            ) : filteredHouses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 bg-white border border-zinc-150 rounded-[2.5rem] shadow-sm text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-300 mb-4">
                  <Home size={32} />
                </div>
                <p className="font-black uppercase tracking-widest text-[10px] text-zinc-400">Aucune annonce trouvée</p>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs">Aucune maison ne correspond à vos critères de recherche.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredHouses.map((house) => (
                  <motion.div
                    key={house.id}
                    layoutId={`house-card-${house.id}`}
                    onClick={() => {
                      setSelectedHouse(house);
                      setCarouselIndex(0);
                    }}
                    className="bg-white border border-zinc-150 rounded-[2rem] overflow-hidden hover:shadow-md active:scale-[0.99] transition-all cursor-pointer flex flex-col"
                  >
                    {/* Main Image Banner */}
                    <div className="h-48 w-full relative bg-zinc-100">
                      {house.images?.[0] ? (
                        <img 
                          src={house.images[0]} 
                          alt={house.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-300">
                          <Home size={40} />
                        </div>
                      )}
                      {/* Price Badge */}
                      <div className="absolute bottom-4 left-4 px-4 py-2 bg-indigo-600/90 backdrop-blur-md text-white rounded-full text-xs font-black">
                        {house.price.toLocaleString()} FCFA / {house.pricePeriod === 'month' ? 'mois' : 'jour'}
                      </div>
                      
                      {/* Count Badge */}
                      {house.images && house.images.length > 1 && (
                        <div className="absolute top-4 right-4 px-2.5 py-1 bg-black/60 backdrop-blur-md text-white rounded-full text-[9px] font-black uppercase tracking-wider">
                          {house.images.length} Photos
                        </div>
                      )}
                    </div>

                    {/* Quick details */}
                    <div className="p-5 space-y-2">
                      <div className="flex items-center gap-1.5 text-indigo-600">
                        <MapPin size={12} />
                        <span className="text-[10px] font-black uppercase tracking-wider">{house.neighborhood}</span>
                      </div>
                      <h3 className="font-black text-sm text-zinc-900 leading-tight uppercase line-clamp-1">{house.title}</h3>
                      <p className="text-xs text-zinc-500 line-clamp-2 font-medium mb-2">{house.description}</p>

                      {/* Seller Info with Avatar */}
                      <div 
                        onClick={(e) => {
                          if (onSellerClick) {
                            e.stopPropagation();
                            onSellerClick(house.sellerId);
                          }
                        }}
                        className="flex items-center justify-between border-t border-zinc-100 pt-3 mt-2 hover:bg-zinc-50/50 rounded-xl px-1.5 py-1 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <SellerAvatar sellerId={house.sellerId} className="w-8 h-8" />
                          <div className="text-left">
                            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider leading-none">Publié par</p>
                            <p className="text-xs font-black text-zinc-800 line-clamp-1 mt-0.5 hover:text-indigo-600 transition-colors">{house.sellerName}</p>
                          </div>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full shrink-0">Voir le profil</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Selected House/Car Details Page with Modern Carousel */}
        {selectedHouse && (
          <motion.div
            key="house-details"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="space-y-6 max-w-sm mx-auto"
          >
            {/* Nav Header */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedHouse(null)}
                className="w-10 h-10 rounded-full bg-white border border-zinc-150 flex items-center justify-center text-zinc-600 hover:bg-zinc-50 active:scale-95 transition-all shadow-sm"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">ESPACE SERVICES</p>
                <h2 className="font-black text-sm tracking-tight text-indigo-600 uppercase">
                  DÉTAILS {selectedHouse.serviceType === 'car' ? 'DE LA VOITURE' : 'DE LA MAISON'}
                </h2>
              </div>
            </div>

            {/* Modern Interactive Carousel */}
            <div 
              onClick={() => {
                if (selectedHouse.images && selectedHouse.images.length > 0) {
                  setZoomScale(1);
                  setPanOffset({ x: 0, y: 0 });
                  setIsLightboxOpen(true);
                }
              }}
              className="relative h-64 w-full bg-zinc-900 rounded-[2rem] overflow-hidden group shadow-lg cursor-zoom-in hover:shadow-xl transition-shadow"
            >
              {selectedHouse.images && selectedHouse.images.length > 0 ? (
                <div className="w-full h-full relative">
                  <img 
                    src={selectedHouse.images[carouselIndex]} 
                    alt={`${selectedHouse.title} - Image ${carouselIndex + 1}`}
                    className="w-full h-full object-cover transition-all duration-500"
                  />

                  {/* Left & Right Arrow Controls */}
                  {selectedHouse.images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          prevSlide(selectedHouse.images.length);
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white flex items-center justify-center transition-colors active:scale-95"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          nextSlide(selectedHouse.images.length);
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white flex items-center justify-center transition-colors active:scale-95"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}

                  {/* Top floating index indicators */}
                  <div className="absolute top-4 right-4 px-2.5 py-1 bg-black/50 backdrop-blur-md text-white text-[9px] font-black tracking-widest uppercase rounded-full">
                    {carouselIndex + 1} / {selectedHouse.images.length}
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400 bg-zinc-800">
                  {selectedHouse.serviceType === 'car' ? <Car size={48} /> : <Home size={48} />}
                </div>
              )}

              {/* Bottom image indices indicators (dots) */}
              {selectedHouse.images && selectedHouse.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {selectedHouse.images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCarouselIndex(idx);
                      }}
                      className={cn(
                        "h-2 rounded-full transition-all duration-300",
                        carouselIndex === idx ? "w-5 bg-white" : "w-2 bg-white/40 hover:bg-white/60"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* House Details Content */}
            <div className="space-y-4">
              <div className="space-y-1">
                {/* Badges */}
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-full">
                    {selectedHouse.serviceType === 'car' ? '🚗 Location de voiture' : '🏠 Location de maison'}
                  </span>
                  <span className="px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-full">
                    ✓ Disponible
                  </span>
                </div>

                <h1 className="text-2xl font-black text-zinc-900 leading-tight uppercase pt-2">
                  {selectedHouse.title}
                </h1>

                {/* Price Display */}
                <div className="text-xl font-black text-indigo-600 flex items-baseline gap-1 pt-1">
                  {selectedHouse.price.toLocaleString()} FCFA
                  <span className="text-xs font-normal text-zinc-400">/ {selectedHouse.pricePeriod === 'month' ? 'mois' : 'jour'}</span>
                </div>
              </div>

              <hr className="border-zinc-100" />

              {/* Location Row */}
              <div className="flex items-start gap-3 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <MapPin size={20} />
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Emplacement</h4>
                  <p className="text-xs font-bold text-zinc-800 mt-0.5">{selectedHouse.neighborhood}</p>
                </div>
              </div>

              {/* Description styled to display beautifully and BIG ("assez bien et en grand") */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 ml-1">
                  Description détaillée
                </h3>
                <div className="bg-white border border-zinc-150 p-6 rounded-[2rem] text-sm md:text-base text-zinc-700 font-bold leading-relaxed whitespace-pre-wrap shadow-sm">
                  {selectedHouse.description}
                </div>
              </div>

              {/* Owner Info */}
              <div 
                onClick={() => {
                  if (onSellerClick) {
                    onSellerClick(selectedHouse.sellerId);
                  }
                }}
                className="flex items-center justify-between bg-zinc-50 p-4 rounded-2xl border border-zinc-100 cursor-pointer hover:bg-zinc-100/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <SellerAvatar sellerId={selectedHouse.sellerId} className="w-10 h-10" />
                  <div className="text-left">
                    <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Publié par</h4>
                    <p className="text-xs font-black text-zinc-850 mt-0.5">{selectedHouse.sellerName}</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline shrink-0">Voir le profil</span>
              </div>

              {/* Public Phone Number for Services */}
              {selectedHouseSellerProfile?.phoneVisibility === 'public' && selectedHouseSellerProfile?.phoneNumber && (
                <div className="flex flex-col gap-2 p-5 bg-emerald-50/50 border border-emerald-100 rounded-3xl mt-2 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Numéro de téléphone du prestataire</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePhoneCall(selectedHouseSellerProfile.phoneNumber);
                    }}
                    className="flex items-center justify-between p-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-600/20 gap-2"
                  >
                    <span className="flex items-center gap-2">
                      <Phone size={14} className="fill-white/10 text-white shrink-0" />
                      <span>{selectedHouseSellerProfile.phoneNumber}</span>
                    </span>
                    <span className="text-[9px] px-2.5 py-1 bg-white/15 rounded-lg border border-white/10 uppercase font-black">Appeler</span>
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                {/* Contacter le prestataire */}
                <button
                  onClick={() => onContactSeller(selectedHouse.sellerId, selectedHouse.sellerName, selectedHouse)}
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white rounded-full font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  <MessageSquare size={16} />
                  Contacter
                </button>

                {/* Partager */}
                <button
                  onClick={() => handleShare(selectedHouse)}
                  className="w-14 h-14 bg-zinc-100 hover:bg-zinc-200 active:scale-95 transition-all rounded-full flex items-center justify-center text-zinc-700 border border-zinc-200"
                  title="Partager"
                >
                  <Share2 size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Multi-Touch / Pinch-to-zoom Lightbox Overlay with Custom Controls */}
      <AnimatePresence>
        {isLightboxOpen && selectedHouse && selectedHouse.images && selectedHouse.images.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 right-0 bottom-0 left-0 min-[980px]:left-[220px] z-[100] bg-black/95 backdrop-blur-xl flex flex-col justify-between"
            onClick={() => setIsLightboxOpen(false)}
          >
            {/* Top Bar controls */}
            <div className="p-6 flex items-center justify-between z-10 text-white">
              <div>
                <h4 className="text-xs font-black tracking-widest uppercase text-zinc-400">AGRANDISSEMENT</h4>
                <p className="text-[10px] text-zinc-500 font-bold uppercase truncate max-w-[200px]">{selectedHouse.title}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLightboxOpen(false);
                }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            {/* Immersive Image Canvas with true Pinch-To-Zoom Touch Handlers & double click fallback */}
            <div 
              className="flex-1 flex items-center justify-center overflow-hidden relative cursor-grab active:cursor-grabbing px-4"
              onClick={(e) => {
                // Prevent closing when clicking the background if we have zoom
                if (zoomScale > 1) {
                  e.stopPropagation();
                }
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                if (e.touches.length === 2) {
                  // Pinch-to-zoom initial calculate
                  const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                  );
                  initialPinchDistanceRef.current = dist;
                  initialScaleRef.current = zoomScale;
                } else if (e.touches.length === 1) {
                  // Standard panning start
                  touchStartPointRef.current = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                  };
                }
              }}
              onTouchMove={(e) => {
                e.stopPropagation();
                if (e.touches.length === 2 && initialPinchDistanceRef.current) {
                  const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                  );
                  const newScale = Math.min(
                    Math.max((dist / initialPinchDistanceRef.current) * initialScaleRef.current, 1),
                    4
                  );
                  setZoomScale(newScale);
                } else if (e.touches.length === 1 && zoomScale > 1 && touchStartPointRef.current) {
                  const dx = e.touches[0].clientX - touchStartPointRef.current.x;
                  const dy = e.touches[0].clientY - touchStartPointRef.current.y;
                  setPanOffset(prev => ({
                    x: prev.x + dx,
                    y: prev.y + dy
                  }));
                  touchStartPointRef.current = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                  };
                }
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                initialPinchDistanceRef.current = null;
                touchStartPointRef.current = null;
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (zoomScale > 1) {
                  setZoomScale(1);
                  setPanOffset({ x: 0, y: 0 });
                } else {
                  setZoomScale(2.5);
                }
              }}
            >
              <div className="relative pointer-events-none select-none">
                <motion.img
                  src={selectedHouse.images[carouselIndex]}
                  alt="Agrandissement"
                  style={{
                    scale: zoomScale,
                    x: panOffset.x,
                    y: panOffset.y,
                  }}
                  className="max-h-[70vh] max-w-full object-contain rounded-2xl shadow-2xl transition-transform duration-100 ease-out"
                />
              </div>

              {/* Floating index & guidance */}
              <div className="absolute bottom-6 left-6 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-white text-[9px] font-bold tracking-widest uppercase">
                {carouselIndex + 1} / {selectedHouse.images.length} • ÉCARTEMENT POUR ZOOMER
              </div>
            </div>

            {/* Bottom Panel with Manual Fallback Controls (ZoomIn, ZoomOut, Reset) */}
            <div className="p-6 bg-black/40 backdrop-blur-md border-t border-white/5 flex flex-col gap-4 items-center justify-center z-10 text-white">
              <div className="flex items-center gap-3">
                {/* Zoom Out Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomScale(prev => Math.max(prev - 0.5, 1));
                    if (zoomScale <= 1.5) {
                      setPanOffset({ x: 0, y: 0 });
                    }
                  }}
                  className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors active:scale-95"
                  title="Zoomer -"
                >
                  <ZoomOut size={18} />
                </button>

                {/* Reset Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomScale(1);
                    setPanOffset({ x: 0, y: 0 });
                  }}
                  className="px-6 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center gap-2 text-white text-xs font-black uppercase tracking-wider transition-colors active:scale-95"
                  title="Réinitialiser"
                >
                  <RotateCcw size={14} />
                  Réinitialiser
                </button>

                {/* Zoom In Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomScale(prev => Math.min(prev + 0.5, 4));
                  }}
                  className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors active:scale-95"
                  title="Zoomer +"
                >
                  <ZoomIn size={18} />
                </button>
              </div>

              {/* Image previews inside Lightbox for easy clicking */}
              {selectedHouse.images.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto max-w-full py-1 px-4 no-scrollbar">
                  {selectedHouse.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCarouselIndex(idx);
                        setZoomScale(1);
                        setPanOffset({ x: 0, y: 0 });
                      }}
                      className={cn(
                        "w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all duration-300",
                        carouselIndex === idx ? "border-indigo-500 scale-105" : "border-transparent opacity-60 hover:opacity-100"
                      )}
                    >
                      <img src={img} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sharing Feedback Notification Overlay */}
      <AnimatePresence>
        {shareFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white text-xs font-bold px-6 py-3.5 rounded-full flex items-center gap-2 shadow-xl"
          >
            <Check size={16} className="text-emerald-500" />
            Lien de partage copié dans le presse-papiers !
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
