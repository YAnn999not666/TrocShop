import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { supabase } from './integrations/supabase/client';
import SplashScreen from './components/SplashScreen';
import { Button } from './components/ui/Button';
import { CustomDropdown } from './components/ui/CustomDropdown';
import { LoginForm, SignupForm } from './components/AuthForms';
import { ReviewSection } from './components/Reviews';
import { ProfileSettings } from './components/ProfileSettings';
import { ProductCard, ProductCardSkeleton } from './components/ProductCard';
import { ChatWindow } from './components/Chat';
import { Notifications } from './components/Notifications';
import { useNotifications } from './hooks/useNotifications';
import { useWebPush } from './hooks/useWebPush';
import { useLikes } from './hooks/useLikes';
import { DynamicBanner } from './components/DynamicBanner';
import { 
  auth, 
  db, 
  handleFirestoreError, 
  OperationType, 
  serverTimestamp, 
  firebaseConfig,
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signInWithRedirect,
  getRedirectResult,
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
  increment,
  limit,
  startAfter,
  uploadToSupabaseStorage
} from './lib/firebase';
import { App as CapacitorApp } from '@capacitor/app';
import { Share as CapacitorShare } from '@capacitor/share';

// Backward-compatible name. Uploads any base64 image to Supabase Storage
// and returns its public URL.
const uploadImageToCloudinary = async (base64: string): Promise<string> => {
  if (!base64 || !base64.startsWith('data:')) return base64;
  return uploadToSupabaseStorage('product-images', base64);
};
import { Product, UserProfile, Message, Conversation, Review } from './types';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import { GoogleGenAI } from "@google/genai";
import { 
  Search, 
  PlusCircle, 
  MessageCircle, 
  User as UserIcon, 
  Home as HomeIcon,
  ShoppingBag,
  LogOut,
  ChevronRight,
  ChevronDown,
  Filter,
  Camera,
  MapPin,
  Tag,
  ArrowLeft,
  ArrowRight,
  Clock,
  Zap,
  Heart,
  Send,
  Star,
  Repeat,
  Handshake,
  Eye,
  EyeOff,
  Phone,
  Settings as SettingsIcon,
  Bell,
  Menu,
  Maximize,
  Maximize2,
  Navigation,
  Check,
  ChevronLeft,
  Plus,
  Share,
  Shield,
  ShieldAlert,
  MoreVertical,
  Trash2,
  Mic,
  Fingerprint,
  Edit3,
  CheckCheck,
  CheckCircle2,
  ListChecks,
  Play,
  Pause,
  FastForward,
  Reply,
  CornerUpLeft,
  Smile,
  X,
  Sparkles,
  Map,
  Calendar,
  Image as ImageIcon,
  AlertTriangle,
  BadgeCheck,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatPrice } from './lib/utils';
import { NEIGHBORHOODS, CATEGORIES, CITIES, MEETING_POINTS, AVAILABILITY_OPTIONS } from './constants';
import {
  globalDataCache,
  globalUserProfileCache,
  globalUserProfilePromises,
  fetchUserProfileCached,
  CAMPUS_SCHOOLS,
  safeConfirm,
  safeAlert,
  safeCopyToClipboard,
  toast,
  isPartnerUser
} from './lib/helpers';

// --- Components ---

const ConversationRecipientAvatar = ({ participantNames, participantIds, currentUser }: { participantNames: string[], participantIds: string[], currentUser: any }) => {
  const otherId = participantIds?.find(id => id !== currentUser?.uid);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!otherId) return;
    fetchUserProfileCached(otherId).then((data) => {
      if (data) setProfile(data);
    });
  }, [otherId]);

  const defaultLetter = (participantNames?.find(n => n !== currentUser?.displayName) || 'U')[0].toUpperCase();

  if (profile?.photoURL) {
    return (
      <img src={profile.photoURL} className="w-14 h-14 rounded-[1.2rem] object-cover border-2 border-white shadow-sm shrink-0" alt="Avatar" />
    );
  }

  return (
    <div className="w-14 h-14 bg-orange-50 rounded-[1.2rem] flex items-center justify-center text-orange-600 font-black text-xl border-2 border-white shadow-sm shrink-0">
      {defaultLetter}
    </div>
  );
};

const ConversationRecipientName = ({ participantNames, participantIds, currentUser }: { participantNames: string[], participantIds: string[], currentUser: any }) => {
  const otherId = participantIds?.find(id => id !== currentUser?.uid);
  const defaultName = participantNames?.find(n => n !== currentUser?.displayName) || `Utilisateur ${otherId?.slice(0, 4) || ''}`;
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!otherId) return;
    fetchUserProfileCached(otherId).then((data) => {
      if (data) setProfile(data);
    });
  }, [otherId]);

  const isCertified = (profile?.is_certified as any) === true || (profile?.is_certified as any) === 'vrai' || (profile?.isCertified as any) === true || (profile?.isCertified as any) === 'vrai' || (profile?.['is certified'] as any) === true || (profile?.['is certified'] as any) === 'vrai' || (profile?.badges as string[])?.some(b => b?.toLowerCase().includes('certif'));
  const isPartner = isPartnerUser(profile);

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="font-black text-sm tracking-tighter truncate text-zinc-950">
        {profile?.displayName || defaultName}
      </span>
      {isPartner && (
        <Shield size={14} className="text-emerald-600 fill-emerald-600 shrink-0" />
      )}
      {isCertified && (
        <BadgeCheck size={14} className="text-orange-600 fill-orange-600 text-white shrink-0" />
      )}
      {profile?.isStudent && (
        <span className="shrink-0 p-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full flex items-center justify-center" title={`Étudiant à ${profile.studentSchool || ''}`}>
          <GraduationCap size={12} className="text-blue-600" />
        </span>
      )}
    </div>
  );
};







export const filterUserBadges = (badges: string[] | undefined, createdAt: any): string[] => {
  if (!badges) return [];
  let badgesList = [...badges];
  
  if (badgesList.includes('Nouveau') && createdAt) {
    let createdDate: Date;
    if (createdAt && typeof createdAt.toDate === 'function') {
      createdDate = createdAt.toDate();
    } else if (createdAt && typeof createdAt.seconds === 'number') {
      createdDate = new Date(createdAt.seconds * 1000);
    } else {
      createdDate = new Date(createdAt);
    }

    if (!isNaN(createdDate.getTime())) {
      const diffMs = Date.now() - createdDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays > 7) {
        badgesList = badgesList.filter(b => b !== 'Nouveau');
      }
    }
  }
  return badgesList;
};


export const getSellerProfile = (data: any): { isCertified: boolean, isStudent: boolean, studentSchool: string, isPartner: boolean } | undefined => {
  if (!data) return undefined;
  const isCertified = !!(
    data.is_certified === true || 
    data.is_certified === 'vrai' || 
    data.isCertified === true || 
    data.isCertified === 'vrai' || 
    data['is certified'] === true || 
    data['is certified'] === 'vrai' || 
    (Array.isArray(data.badges) && data.badges.some((b: any) => typeof b === 'string' && (b.toLowerCase().includes('certif') || b.toLowerCase().includes('valide') || b.toLowerCase().includes('vérifié') || b.toLowerCase().includes('verifie'))))
  );
  const isStudent = !!(
    data.isStudent === true || 
    data.is_student === true || 
    (data.isStudent as any) === 'true' || 
    (data.isStudent as any) === 'vrai' || 
    (Array.isArray(data.badges) && data.badges.some((b: any) => typeof b === 'string' && (b.toLowerCase().includes('étudiant') || b.toLowerCase().includes('etudiant'))))
  );
  const isPartner = isPartnerUser(data);
  const studentSchool = data.studentSchool || '';
  return { isCertified, isStudent, studentSchool, isPartner };
};

const CATEGORY_METADATA: Record<string, {
  model: string;
  alt: string;
  title: string;
  colorClass: string;
  bgGrad: string;
  badgeBg: string;
}> = {
  "Mode": {
    model: "/akatsuki_coat_-_itachis_clothes.glb",
    alt: "Manteau Akatsuki 3D",
    title: "Espace Mode",
    colorClass: "text-red-600",
    bgGrad: "bg-red-600",
    badgeBg: "bg-red-50 border-red-100 text-red-600"
  },
  "High Tech / Informatique": {
    model: "/smol_ame_in_an_upcycled_terrarium_hololiveen.glb",
    alt: "Terrarium Smol Ame 3D",
    title: "Espace High Tech & Informatique",
    colorClass: "text-sky-600",
    bgGrad: "bg-sky-600",
    badgeBg: "bg-sky-50 border-sky-100 text-sky-600"
  },
  "Maison": {
    model: "/meuble_tv.glb",
    alt: "Meuble TV 3D",
    title: "Espace Maison & Meubles",
    colorClass: "text-amber-700",
    bgGrad: "bg-amber-700",
    badgeBg: "bg-amber-50 border-amber-100 text-amber-700"
  },
  "Cuisine": {
    model: "/cuillere.glb",
    alt: "Cuillère 3D",
    title: "Espace Cuisine",
    colorClass: "text-teal-600",
    bgGrad: "bg-teal-600",
    badgeBg: "bg-teal-50 border-teal-100 text-teal-600"
  },
  "Scolaire / Livres": {
    model: "/variety_of_books.glb",
    alt: "Livres Académiques 3D",
    title: "Espace Scolaire & Livres",
    colorClass: "text-indigo-600",
    bgGrad: "bg-indigo-600",
    badgeBg: "bg-indigo-50 border-indigo-100 text-indigo-600"
  },
  "Loisirs": {
    model: "/steam_deck_console.glb",
    alt: "Steam Deck Console 3D",
    title: "Espace Loisirs",
    colorClass: "text-purple-600",
    bgGrad: "bg-purple-600",
    badgeBg: "bg-purple-50 border-purple-100 text-purple-600"
  },
  "Engin roulant": {
    model: "/pony_cartoon.glb",
    alt: "Pony Cartoon 3D",
    title: "Espace Engins Roulants",
    colorClass: "text-pink-600",
    bgGrad: "bg-pink-600",
    badgeBg: "bg-pink-50 border-pink-100 text-pink-600"
  },
  "Alimentation": {
    model: "/kanna_diet.glb",
    alt: "Kanna Diététique 3D",
    title: "Espace Alimentation",
    colorClass: "text-lime-600",
    bgGrad: "bg-lime-600",
    badgeBg: "bg-lime-50 border-lime-100 text-lime-600"
  },
  "Divers": {
    model: "/technical_difficulties.glb",
    alt: "Difficultés Techniques Chat 3D",
    title: "Espace Divers",
    colorClass: "text-zinc-600",
    bgGrad: "bg-zinc-600",
    badgeBg: "bg-zinc-50 border-zinc-100 text-zinc-600"
  },
  "Beauté": {
    model: "/cosmetic_bottles_-_dove.glb",
    alt: "Cosmetics Bottle Dove 3D",
    title: "Espace Beauté",
    colorClass: "text-rose-500",
    bgGrad: "bg-rose-500",
    badgeBg: "bg-rose-50 border-rose-100 text-rose-500"
  }
};


// --- Main App ---



export default function App() {
  const LOCAL_VERSION = "1.0.0";
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBanner(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA Installation outcome: ${outcome}`);
    } catch (err) {
      console.error("PWA Installation error:", err);
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };
  const [showVersionModal, setShowVersionModal] = useState(false);
  const lastBackPressRef = useRef<number>(0);
  const [updateDownloadUrl, setUpdateDownloadUrl] = useState("https://troc-shop-store.vercel.app/");
  const [serverVersion, setServerVersion] = useState<string | null>(null);

  useEffect(() => {
    // Écoute en temps réel — détecte les mises à jour même si l'app est déjà ouverte
    const configDocRef = doc(db, 'app_config', 'version'); // ← snake_case pour Supabase
    
    const unsubscribe = onSnapshot(
      configDocRef,
      (configDoc) => {
        if (configDoc.exists()) {
          const data = configDoc.data();
          const versionInBase = data.version;
          const downloadUrl = data.downloadUrl;

          if (downloadUrl) {
            setUpdateDownloadUrl(downloadUrl);
          }
          if (versionInBase && versionInBase !== LOCAL_VERSION) {
            setServerVersion(versionInBase);
            setShowVersionModal(true);
          }
        }
      },
      (err) => {
        if (!navigator.onLine) {
          console.warn("Version check skipped: client is offline.");
        } else {
          console.error("Failed to listen to app version:", err);
        }
      }
    );

    return () => unsubscribe(); // cleanup au démontage
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileReviews, setProfileReviews] = useState<any[]>([]);
  useEffect(() => {
    if (!user) {
      setProfileReviews([]);
      return;
    }
    const qCount = query(
      collection(db, 'reviews'),
      where('toUserId', '==', user.uid)
    );
    const unsub = onSnapshot(qCount, (snap) => {
      const revs = snap.docs.map(d => d.data());
      setProfileReviews(revs);
    }, (e) => console.log("Error loading profile reviews:", e));
    return () => unsub();
  }, [user]);

  const privateRatingStats = useMemo(() => {
    if (profileReviews.length === 0) return { rating: 0, count: 0 };
    const sum = profileReviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return {
      rating: Number((sum / profileReviews.length).toFixed(1)),
      count: profileReviews.length
    };
  }, [profileReviews]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [homeProducts, setHomeProducts] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem('cached_home_products');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [explorerPages, setExplorerPages] = useState<Record<number, Product[]>>(() => {
    try {
      const cached = localStorage.getItem('cached_explorer_page_0');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return { 0: parsed };
        }
      }
    } catch (e) {}
    return {};
  });
  const [explorerPageLastDocs, setExplorerPageLastDocs] = useState<Record<number, any>>({});
  const [explorerHasMore, setExplorerHasMore] = useState(true);
  const [explorerLoading, setExplorerLoading] = useState(false);
  const explorerUnsubsRef = useRef<Record<number, () => void>>({});
  const infiniteScrollParamsRef = useRef<any>(null);

  const explorerProducts = useMemo(() => {
    const flat: Product[] = [];
    const seen = new Set<string>();
    const keys = Object.keys(explorerPages).map(Number).sort((a, b) => a - b);
    keys.forEach(k => {
      if (explorerPages[k]) {
        explorerPages[k].forEach(p => {
          if (p && p.id && !seen.has(p.id)) {
            seen.add(p.id);
            flat.push(p);
          }
        });
      }
    });
    return flat;
  }, [explorerPages]);

  const updateLocalProductState = (productIdOrIds: string | string[], updates: Partial<Product>) => {
    const ids = Array.isArray(productIdOrIds) ? productIdOrIds : [productIdOrIds];
    
    // 1. Update core products
    setProducts(prev => prev.map(p => ids.includes(p.id) ? { ...p, ...updates } : p));
    
    // 2. Update homeProducts and write to localStorage
    setHomeProducts(prev => {
      const next = prev.map(p => ids.includes(p.id) ? { ...p, ...updates } : p);
      try {
        localStorage.setItem('cached_home_products', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    
    // 3. Update explorerPages and write to localStorage
    setExplorerPages(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(pageKey => {
        const pageIndex = Number(pageKey);
        if (next[pageIndex]) {
          next[pageIndex] = next[pageIndex].map(p => ids.includes(p.id) ? { ...p, ...updates } : p);
        }
      });
      if (next[0]) {
        try {
          localStorage.setItem('cached_explorer_page_0', JSON.stringify(next[0]));
        } catch (e) {}
      }
      return next;
    });

    // 4. Update currently opened/selected product if it is one of the affected products
    setSelectedProduct(prev => {
      if (prev && ids.includes(prev.id)) {
        return { ...prev, ...updates };
      }
      return prev;
    });
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [filterPriceMax, setFilterPriceMax] = useState<number | null>(null);
  const [filterCondition, setFilterCondition] = useState<string>('Tous');
  const [filterNeighborhood, setFilterNeighborhood] = useState<string>('Tous');
  const [filterListingType, setFilterListingType] = useState<string>('Tous');
  const [filterStudentMode, setFilterStudentMode] = useState<boolean>(false);
  const [filterStudentSchool, setFilterStudentSchool] = useState<string>('Tous');
  const [filterCertifiedOnly, setFilterCertifiedOnly] = useState<boolean>(false);

  // Student space view search filters
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentFilterSchool, setStudentFilterSchool] = useState<string>('Tous');
  const [studentFilterCondition, setStudentFilterCondition] = useState<string>('Tous');
  const [studentFilterPriceMax, setStudentFilterPriceMax] = useState<number | null>(null);
  const [studentFilterListingType, setStudentFilterListingType] = useState<string>('Tous');
  const [studentSortBy, setStudentSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'oldest'>('newest');
  const [isStudentFiltersOpen, setIsStudentFiltersOpen] = useState(true);

  // Category space view search filters
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string | null>(null);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [categoryFilterCondition, setCategoryFilterCondition] = useState<string>('Tous');
  const [categoryFilterPriceMax, setCategoryFilterPriceMax] = useState<number | null>(null);
  const [categoryFilterListingType, setCategoryFilterListingType] = useState<string>('Tous');
  const [categorySortBy, setCategorySortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'oldest'>('newest');
  const [isCategoryFiltersOpen, setIsCategoryFiltersOpen] = useState(true);

  const [certifiedSellers, setCertifiedSellers] = useState<Record<string, boolean>>({});
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [peekedNotificationId, setPeekedNotificationId] = useState<string | null>(null);
  
  const [isMessagesEditMode, setIsMessagesEditMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [peekedConversationId, setPeekedConversationId] = useState<string | null>(null);

  const [isMyTrocEditMode, setIsMyTrocEditMode] = useState(false);
  const [selectedTrocs, setSelectedTrocs] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [justGeneratedCodeExIds, setJustGeneratedCodeExIds] = useState<string[]>([]);
  const [mytrocSubTab, setMytrocSubTab] = useState<'ongoing' | 'past'>('ongoing');
  const [firestoreQuotaExceeded, setFirestoreQuotaExceeded] = useState(false);

  const peekTimerRef = useRef<NodeJS.Timeout | null>(null);
  const convPeekTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [showTrocFeedback, setShowTrocFeedback] = useState(false);
  
  const handleConvPeekStart = (id: string, e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    convPeekTimerRef.current = setTimeout(() => {
      setPeekedConversationId(id);
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, 400); 
  };

  const clearPeekTimers = () => {
    if (convPeekTimerRef.current) clearTimeout(convPeekTimerRef.current);
  };
  
  const handleConvPeekEnd = () => {
    setPeekedConversationId(null);
  };

  const handleGlobalPointerMove = () => {
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    if (convPeekTimerRef.current) clearTimeout(convPeekTimerRef.current);
  };
  
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        setIsNavHidden(true);
      }
    };
    const handleBlur = (e: FocusEvent) => {
      // Small timeout to allow next element focus to be caught
      setTimeout(() => {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA' && active.getAttribute('contenteditable') !== 'true')) {
          setIsNavHidden(false);
        }
      }, 50);
    };
    
    window.addEventListener('focusin', handleFocus as any);
    window.addEventListener('focusout', handleBlur as any);
    return () => {
      window.removeEventListener('focusin', handleFocus as any);
      window.removeEventListener('focusout', handleBlur as any);
    };
  }, []);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price-asc' | 'price-desc'>('newest');
  const [customConfirm, setCustomConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [customAlert, setCustomAlert] = useState<string | null>(null);

  useEffect(() => {
    const nativeAlert = window.alert;
    (window as any).safeConfirm = (message: string, onConfirm: () => void) => {
      setCustomConfirm({ message, onConfirm });
    };
    (window as any).safeAlert = (message: string) => {
      setCustomAlert(message);
    };
    window.alert = (message: string) => {
      setCustomAlert(message);
    };
    return () => {
      window.alert = nativeAlert;
      delete (window as any).safeConfirm;
      delete (window as any).safeAlert;
    };
  }, []);

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setFirestoreQuotaExceeded(true);
    };
    window.addEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    if (typeof window !== 'undefined' && (window as any).__firestore_quota_exceeded) {
      setFirestoreQuotaExceeded(true);
    }
    return () => {
      window.removeEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    };
  }, []);

  useEffect(() => {
    const handleSetTab = (e: any) => {
      const tab = e.detail;
      if (tab && ['home', 'search', 'favorites', 'sell', 'messages', 'profile', 'notifications', 'student', 'category'].includes(tab)) {
        setActiveTab(tab);
      }
    };
    window.addEventListener('set-active-tab', handleSetTab);
    return () => {
      window.removeEventListener('set-active-tab', handleSetTab);
    };
  }, []);

  const [showTrocVerifier, setShowTrocVerifier] = useState<any | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadPerConversation, setUnreadPerConversation] = useState<Record<string, number>>({});
  const [pendingTrocs, setPendingTrocs] = useState(0);
  const bottomNavItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bottomLimelightRef = useRef<HTMLDivElement | null>(null);
  const exchangesLoadedRef = useRef<boolean>(false);
  const isLoadingProfilesRef = useRef(false);
  const [isBottomLimelightReady, setIsBottomLimelightReady] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_home_products');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      }
    } catch (e) {}
    return true;
  });
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'favorites' | 'sell' | 'messages' | 'profile' | 'auth' | 'notifications' | 'student' | 'category'>(() => {
    // Handle PWA shortcuts or URL parameters
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && ['home', 'search', 'favorites', 'sell', 'messages', 'profile', 'notifications', 'student', 'category'].includes(tab)) {
        return tab as any;
      }
      const saved = localStorage.getItem('activeTab');
      return (saved as any) || 'home';
    }
    return 'home';
  });

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useLayoutEffect(() => {
    const activeMapping: Record<string, number> = {
      home: 0,
      search: 1,
      favorites: 3,
      messages: 4
    };
    
    const index = activeMapping[activeTab];
    if (index === undefined) {
      if (bottomLimelightRef.current) {
        bottomLimelightRef.current.style.opacity = '0';
      }
      return;
    }

    const limelight = bottomLimelightRef.current;
    const activeItem = bottomNavItemRefs.current[index];
    
    if (limelight && activeItem) {
      limelight.style.opacity = '1';
      const newLeft = activeItem.offsetLeft + activeItem.offsetWidth / 2 - limelight.offsetWidth / 2;
      limelight.style.left = `${newLeft}px`;

      if (!isBottomLimelightReady) {
        const timer = setTimeout(() => setIsBottomLimelightReady(true), 50);
        return () => clearTimeout(timer);
      }
    }
  }, [activeTab, isBottomLimelightReady]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [allUsersProfiles, setAllUsersProfiles] = useState<Record<string, UserProfile>>({});

  const [showStudentBubble, setShowStudentBubble] = useState(false);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [profileView, setProfileView] = useState<'main' | 'listings' | 'favorites' | 'settings' | 'security'>('main');
  const [showSecurityRulesModal, setShowSecurityRulesModal] = useState(false);
  const [showExchangePicker, setShowExchangePicker] = useState(false);
  const [authFailedHelp, setAuthFailedHelp] = useState<string | null>(null);
  const isCreatingProfile = useRef(false);

  useEffect(() => {
    // Process redirect sign-in result for mobile/Capacitor environments
    const processRedirect = async () => {
      try {
        const result: any = await getRedirectResult(auth);
        if (result?.user) {
          const u: any = result.user;
          const userRef = doc(db, 'users', u.uid);
          const snap = await getDoc(userRef);

          let storedMode = 'login';
          try {
            storedMode = localStorage.getItem('authRedirectMode') || 'login';
            localStorage.removeItem('authRedirectMode');
          } catch (_) {}

          if (storedMode === 'signup' && snap.exists()) {
            alert("Vous avez déjà un compte Google associé. Connectez-vous plutôt.");
            setAuthMode('login');
            return;
          }
          if (storedMode === 'login' && !snap.exists()) {
            alert("Aucun compte Google trouvé. Veuillez vous inscrire avec ce compte d'abord.");
            setAuthMode('signup');
            return;
          }

          if (!snap.exists()) {
            const newProfile: UserProfile = {
              uid: u.uid,
              displayName: u.displayName || 'Utilisateur Google',
              email: u.email || '',
              photoURL: u.photoURL || '',
              phoneNumber: '',
              phoneVisibility: 'public',
              city: 'Yamoussoukro',
              createdAt: serverTimestamp(),
              isVerified: true,
              notificationsEnabled: true,
              badges: ['Bienvenue']
            };
            await setDoc(userRef, newProfile).catch(e => handleFirestoreError(e, OperationType.WRITE, 'users'));
            setProfile(newProfile);
          }
          setActiveTab('home');
        }
      } catch (err: any) {
        console.error("Redirect auth result processing error:", err?.message || String(err));
      }
    };
    processRedirect();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setActiveTab(current => current === 'auth' ? 'home' : current);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Synchronize user profile in real-time with full cleanup
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    // Do not reset to false if we are in the middle of a signup profile creation
    if (isCreatingProfile.current !== true) {
      isCreatingProfile.current = false;
    }

    const unsubscribeProfile = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const pData = snap.data();
        setProfile(pData as UserProfile);
        globalUserProfileCache[user.uid] = pData;
      } else if (!isCreatingProfile.current) {
        isCreatingProfile.current = true;
        const newProfile: UserProfile = {
          uid: user.uid,
          displayName: user.displayName || 'Utilisateur',
          email: user.email || '',
          photoURL: user.photoURL || '',
          bio: "Passionné(e) de TrocShop !",
          city: "Yamoussoukro",
          createdAt: serverTimestamp(),
          isVerified: false,
          badges: [],
          isOnline: true,
          notificationsEnabled: true
        };
        setDoc(userRef, newProfile).catch(e => handleFirestoreError(e, OperationType.WRITE, 'users'));
      }
      setLoading(false);
    }, (e) => {
      handleFirestoreError(e, OperationType.GET, `users/${user.uid}`);
      setLoading(false);
    });

    return () => {
      unsubscribeProfile();
    };
  }, [user?.uid]);





  const loadExplorerPage = (pageIndex: number, lastDocOption: any) => {
    if (pageIndex > 0) {
      return;
    }

    const pageCacheKey = 'explorerPage_0';
    if (globalDataCache[pageCacheKey]) {
      const cached = globalDataCache[pageCacheKey];
      setExplorerPages({ 0: cached.pList });
      setExplorerHasMore(false);
      return;
    }

    if (explorerLoading) return;
    if (firestoreQuotaExceeded) return;

    setExplorerLoading(true);

    const q = query(
      collection(db, 'products'),
      orderBy('createdAt', 'desc')
    );

    if (explorerUnsubsRef.current[0]) {
      explorerUnsubsRef.current[0]();
    }
    const unsub = onSnapshot(q, (snapshot) => {
      const pList = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];

      globalDataCache[pageCacheKey] = {
        pList,
        lastDoc: null,
        hasMore: false
      };

      try {
        localStorage.setItem('cached_explorer_page_0', JSON.stringify(pList));
      } catch (e) {}

      setExplorerPages({ 0: pList });
      setExplorerHasMore(false);
      setExplorerLoading(false);
    }, (err) => {
      console.error("Error subscribing to explorer products:", err);
      setExplorerLoading(false);
    });
    explorerUnsubsRef.current[0] = unsub;
  };

  useEffect(() => {
    // Load page 0 of explorer products on mount
    loadExplorerPage(0, null);

    // Silent background refresh for homeProducts (SWR) -> Maintenant en TEMPS RÉEL (onSnapshot) pour une mise à jour instantanée sans actualisation !
    const qHome = query(
      collection(db, 'products'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const unsubHome = onSnapshot(qHome, (snapshot) => {
      const p = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];
      globalDataCache['homeProducts'] = p;
      try {
        localStorage.setItem('cached_home_products', JSON.stringify(p));
      } catch (e) {}
      setHomeProducts(p);
      setIsInitialLoading(false);
    }, (e) => {
      console.warn("Real-time query for homeProducts failed:", e);
      setIsInitialLoading(false);
    });

    return () => {
      unsubHome();
      Object.values(explorerUnsubsRef.current).forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
      explorerUnsubsRef.current = {};
    };
  }, []);

  useEffect(() => {
    setProducts(prev => {
      const merged: Record<string, Product> = {};
      prev.forEach(p => { merged[p.id] = p; });
      homeProducts.forEach(p => { merged[p.id] = p; });
      explorerProducts.forEach(p => { merged[p.id] = p; });
      return Object.values(merged);
    });

    const classNames = CAMPUS_SCHOOLS; // reference to CAMPUS_SCHOOLS if needed
    const sellerIds = Array.from(new Set([
      ...homeProducts.map(p => p.sellerId),
      ...explorerProducts.map(p => p.sellerId)
    ].filter(Boolean)));

    if (sellerIds.length === 0) return;

    const missingSellerIds = sellerIds.filter(id => !globalUserProfileCache[id]);

    if (missingSellerIds.length === 0) return;
    if (isLoadingProfilesRef.current) return;
    isLoadingProfilesRef.current = true;

    // Mark ALL missing seller IDs as queried with a default profile immediately
    // so that subsequent micro-tasks and re-renders don't trigger additional duplicate fetch requests for them.
    missingSellerIds.forEach(id => {
      globalUserProfileCache[id] = { 
        uid: id, 
        username: "Utilisateur", 
        is_student: false, 
        isStudent: false, 
        badges: [] 
      };
    });

    const chunks: string[][] = [];
    for (let i = 0; i < missingSellerIds.length; i += 30) {
      chunks.push(missingSellerIds.slice(i, i + 30));
    }

    const loadMissing = async () => {
      try {
        const chunkPromises = chunks.map(async (chunk) => {
          const q = query(collection(db, 'users'), where('__name__', 'in', chunk));
          const snap = await getDocs(q);
          const chunkMap: Record<string, UserProfile> = {};
          snap.forEach(docSnap => {
            const profileData = docSnap.data();
            globalUserProfileCache[docSnap.id] = { uid: docSnap.id, ...profileData };
            chunkMap[docSnap.id] = { uid: docSnap.id, ...profileData } as UserProfile;
          });
          return chunkMap;
        });

        const resultsArray = await Promise.all(chunkPromises);
        const combinedResults: Record<string, UserProfile> = {};
        resultsArray.forEach(res => {
          Object.assign(combinedResults, res);
        });

        setAllUsersProfiles(prev => {
          const updated = { ...prev, ...combinedResults };
          sellerIds.forEach(id => {
            if (globalUserProfileCache[id] && !updated[id]) {
              updated[id] = { uid: id, ...globalUserProfileCache[id] } as UserProfile;
            }
          });
          return updated;
        });
      } catch (e) {
        console.warn("Error fetching missing seller profiles:", e);
      } finally {
        isLoadingProfilesRef.current = false;
      }
    };

    loadMissing();
  }, [homeProducts, explorerProducts]);

  const refreshHomeData = async () => {
    delete globalDataCache['homeProducts'];
    if (homeProducts.length === 0) {
      setIsInitialLoading(true);
    }
    const qHome = query(
      collection(db, 'products'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    try {
      const snapshot = await getDocs(qHome);
      const p = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];
      globalDataCache['homeProducts'] = p;
      try {
        localStorage.setItem('cached_home_products', JSON.stringify(p));
      } catch (e) {}
      setHomeProducts(p);
    } catch (e) {
      console.error("Error on pull to refresh on home:", e);
      handleFirestoreError(e, OperationType.LIST, 'products');
    } finally {
      setIsInitialLoading(false);
    }
  };

  const refreshExplorerData = async () => {
    // Supprimer les caches d'explorer
    Object.keys(globalDataCache).forEach(key => {
      if (key.startsWith('explorerPage_')) {
        delete globalDataCache[key];
      }
    });
    
    const hasExistingProducts = Object.keys(explorerPages).length > 0;
    if (!hasExistingProducts) {
      setExplorerLoading(true);
    }
    
    const q = query(
      collection(db, 'products'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    try {
      const snapshot = await getDocs(q);
      const pList = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];
      const lastDocOfThisPage = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
      const hasMoreVal = snapshot.docs.length >= 20;

      const pageCacheKey = `explorerPage_0`;
      globalDataCache[pageCacheKey] = {
        pList,
        lastDoc: lastDocOfThisPage,
        hasMore: hasMoreVal
      };

      try {
        localStorage.setItem('cached_explorer_page_0', JSON.stringify(pList));
      } catch (e) {}

      setExplorerPages({ 0: pList });
      if (lastDocOfThisPage) {
        setExplorerPageLastDocs({ 0: lastDocOfThisPage });
      } else {
        setExplorerPageLastDocs({});
      }
      setExplorerHasMore(hasMoreVal);
    } catch (err) {
      console.error("Error doing pull to refresh on explorer page:", err);
      handleFirestoreError(err, OperationType.LIST, 'products-preview-refresh');
    } finally {
      setExplorerLoading(false);
    }
  };

  const explorerSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab !== 'search') return;

    const handleScroll = () => {
      if (explorerLoading || !explorerHasMore || firestoreQuotaExceeded) return;

      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const clientHeight = window.innerHeight;

      // Trigger load more when user scrolls within 300px of the footer/bottom
      if (scrollHeight - scrollTop - clientHeight < 300) {
        const pageKeys = Object.keys(explorerPages).map(Number);
        const lastPageIndex = pageKeys.length > 0 ? Math.max(...pageKeys) : -1;
        const nextPageIndex = lastPageIndex + 1;
        const lastDoc = lastPageIndex >= 0 ? explorerPageLastDocs[lastPageIndex] : null;

        if (nextPageIndex === 0 || lastDoc) {
          loadExplorerPage(nextPageIndex, lastDoc);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Check initially in case screen is very tall or first load needs immediate check
    const initialCheck = setTimeout(handleScroll, 500);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(initialCheck);
    };
  }, [activeTab, explorerLoading, explorerHasMore, explorerPages, explorerPageLastDocs, loadExplorerPage, firestoreQuotaExceeded]);


  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [previousProduct, setPreviousProduct] = useState<Product | null>(null);
  const [publicProfile, setPublicProfile] = useState<UserProfile | null>(null);
  const [publicReviews, setPublicReviews] = useState<any[]>([]);
  useEffect(() => {
    if (!selectedSellerId) {
      setPublicReviews([]);
      return;
    }
    const qCount = query(
      collection(db, 'reviews'),
      where('toUserId', '==', selectedSellerId)
    );
    const unsub = onSnapshot(qCount, (snap) => {
      const revs = snap.docs.map(d => d.data());
      setPublicReviews(revs);
    }, (e) => console.log("Error loading public reviews:", e));
    return () => unsub();
  }, [selectedSellerId]);

  const publicRatingStats = useMemo(() => {
    if (publicReviews.length === 0) return { rating: 0, count: 0 };
    const sum = publicReviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return {
      rating: Number((sum / publicReviews.length).toFixed(1)),
      count: publicReviews.length
    };
  }, [publicReviews]);
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authRequiredMessage, setAuthRequiredMessage] = useState<string | null>(null);

  const triggerAuthRequired = (message: string) => {
    setAuthRequiredMessage(message);
  };

  const redirectToLogin = () => {
    setAuthRequiredMessage(null);
    setAuthMode('login');
    setActiveTab('auth');
  };

  const redirectToSignup = () => {
    setAuthRequiredMessage(null);
    setAuthMode('signup');
    setActiveTab('auth');
  };

  const cancelAuthRequired = () => {
    setAuthRequiredMessage(null);
  };

  // Handle selected seller profile loading
  useEffect(() => {
    const loadSellerProfile = async () => {
      if (!selectedSellerId) {
        setPublicProfile(null);
        setSellerProducts([]);
        return;
      }

      const cacheKeyProfile = `publicProfile_${selectedSellerId}`;
      const cacheKeyProducts = `sellerProducts_${selectedSellerId}`;

      if (globalDataCache[cacheKeyProfile] !== undefined && globalDataCache[cacheKeyProducts] !== undefined) {
        setPublicProfile(globalDataCache[cacheKeyProfile]);
        setSellerProducts(globalDataCache[cacheKeyProducts]);
        return;
      }
      
      try {
        const docRef = doc(db, 'users', selectedSellerId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const profileData = docSnap.data() as UserProfile;
          setPublicProfile(profileData);
          globalDataCache[cacheKeyProfile] = profileData;
          
          const q = query(
            collection(db, 'products'),
            where('sellerId', '==', selectedSellerId),
            orderBy('createdAt', 'desc'),
            limit(20)
          );
          const productsSnap = await getDocs(q);
          const pList = productsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
          globalDataCache[cacheKeyProducts] = pList;
          setSellerProducts(pList);
        }
      } catch (err: any) {
        console.error("Error loading seller profile:", err?.message || String(err));
      }
    };
    loadSellerProfile();
  }, [selectedSellerId]);

  const handleEmailLogin = async (firstName: string, lastName: string, pass: string) => {
    try {
      if (!firstName || !lastName || !pass) return;
      setLoading(true);
      setAuthFailedHelp(null);
      const email = `${firstName.toLowerCase().trim()}.${lastName.toLowerCase().trim()}@trocshop.user`;
      await signInWithEmailAndPassword(auth, email, pass);
      setActiveTab('home');
    } catch (e: any) {
      console.error("Login error:", e?.message || String(e));
      if (e.code === 'auth/network-request-failed' || e.message?.includes('network-request-failed')) {
        setAuthFailedHelp("Problème de connexion Firebase détecté (auth/network-request-failed).\n\nCela se produit généralement lorsque l'application s'exécute dans une iframe isolée (bloquant les cookies et l'accès stockage tiers) ou suite à un blocage réseau.\n\n👉 ACTION REQUISE : Veuillez ouvrir l'application dans un onglet indépendant en cliquant sur le bouton ci-dessous.");
      } else if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        alert("Nom, prénom ou mot de passe incorrect.");
      } else {
        alert("Erreur de connexion.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async (data: any) => {
    if (data.password !== data.confirmPassword) {
      alert("Les mots de passe ne correspondent pas.");
      return;
    }
    try {
      setLoading(true);
      setAuthFailedHelp(null);
      isCreatingProfile.current = true;
      
      const email = `${data.firstName.toLowerCase().trim()}.${data.lastName.toLowerCase().trim()}@trocshop.user`;
      console.log("Registering with:", email);
      
      const cred = await createUserWithEmailAndPassword(auth, email, data.password);
      
      // Update Auth Profile
      await updateProfile(cred.user, {
        displayName: `${data.firstName} ${data.lastName}`,
      });

      const userRef = doc(db, 'users', cred.user.uid);
      const badges = ['Nouveau'];
      if (data.isStudent) {
        badges.push('🎓 Étudiant');
      }

      const newProfile: UserProfile = {
        uid: cred.user.uid,
        displayName: `${data.firstName} ${data.lastName}`,
        firstName: data.firstName,
        lastName: data.lastName,
        email: email,
        phoneNumber: data.phoneNumber,
        phoneVisibility: data.phoneVisibility as 'public' | 'private',
        city: data.city || 'Yamoussoukro',
        createdAt: serverTimestamp(),
        isVerified: false,
        isCertified: false,
        notificationsEnabled: true,
        badges,
        isStudent: !!data.isStudent,
        studentSchool: data.isStudent ? (data.studentSchool || CAMPUS_SCHOOLS[0]) : ''
      };
      
      console.log("Saving profile for:", cred.user.uid);
      await setDoc(userRef, newProfile).catch(e => handleFirestoreError(e, OperationType.WRITE, 'users'));
      setProfile(newProfile);
      
      alert("Inscription réussie ! Bienvenue sur TrocShop.");
      setActiveTab('home');
      setShowSecurityRulesModal(true);
    } catch (e: any) {
      console.error("Signup Error:", e?.message || String(e));
      if (e.code === 'auth/network-request-failed' || e.message?.includes('network-request-failed')) {
        setAuthFailedHelp("Problème de connexion Firebase détecté (auth/network-request-failed) pendant l'inscription.\n\nCela se produit lorsque le navigateur bloque l'authentification et l'écriture dans l'iframe.\n\n👉 ACTION REQUISE : Ouvrez l'application dans un nouvel onglet indépendant en utilisant la barre ci-dessous.");
      } else if (e.code === 'auth/email-already-in-use') {
        alert("Ce nom et prénom sont déjà utilisés. Essayez de vous connecter.");
        setAuthMode('login');
      } else if (e.code === 'auth/operation-not-allowed') {
        alert("🚨 Action Requise: Le fournisseur 'Email/Mot de passe' doit être activé dans votre console Firebase.\n\nPour corriger :\n1. Allez sur https://console.firebase.google.com/project/" + (firebaseConfig.projectId) + "/authentication/providers\n2. Cliquez sur 'Ajouter un fournisseur' et activez 'E-mail/Mot de passe'.\n\nCela est nécessaire pour permettre l'inscription personnalisée.");
      } else {
        alert("Erreur d'inscription: " + (e.message || "Impossible de créer le compte."));
      }
    } finally {
      isCreatingProfile.current = false;
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (loading) return;
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const isCapacitorOrMobile = !!(window as any).Capacitor || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isCapacitorOrMobile) {
        try {
          localStorage.setItem('authRedirectMode', authMode);
        } catch (_) {}
        await signInWithRedirect(auth, provider);
        return;
      }

      const result = await signInWithPopup(auth, provider);
      const u = result.user;
      const userRef = doc(db, 'users', u.uid);
      const snap = await getDoc(userRef);

      if (authMode === 'signup' && snap.exists()) {
        alert("Vous avez déjà un compte Google associé. Connectez-vous plutôt.");
        setAuthMode('login');
        return;
      }
      if (authMode === 'login' && !snap.exists()) {
        alert("Aucun compte Google trouvé. Veuillez vous inscrire avec ce compte d'abord.");
        setAuthMode('signup');
        return;
      }

      if (!snap.exists()) {
        const newProfile: UserProfile = {
          uid: u.uid,
          displayName: u.displayName || 'Utilisateur Google',
          email: u.email || '',
          photoURL: u.photoURL || '',
          phoneNumber: '',
          phoneVisibility: 'public',
          city: 'Yamoussoukro',
          createdAt: serverTimestamp(),
          isVerified: true,
          notificationsEnabled: true,
          badges: ['Bienvenue']
        };
        await setDoc(userRef, newProfile).catch(e => handleFirestoreError(e, OperationType.WRITE, 'users'));
        setProfile(newProfile);
      }
      setActiveTab('home');
    } catch (e: any) {
      console.error("Auth error:", e?.code, e?.message || String(e));
      if (e?.code === 'auth/network-request-failed' || e?.message?.includes('network-request-failed')) {
        setAuthFailedHelp("L'ouverture de l'authentification Google a échoué (auth/network-request-failed).\n\nCela se produit souvent car l'application s'exécute dans une iframe qui restreint les Cookies ou l'authentification POPUP.\n\n👉 FIABILISATION : Ouvrez l'application dans un nouvel onglet indépendant.");
      } else if (e?.code === 'auth/popup-blocked') {
        alert("La fenêtre de connexion Google a été bloquée. Veuillez ouvrir l'application dans un nouvel onglet ou autoriser les pop-ups (en haut dans la barre d'adresse) pour vous connecter avec Google.");
      } else if (e?.code === 'auth/cancelled-popup-request' || e?.code === 'auth/popup-closed-by-user') {
        // Ignorer silencieusement si l'utilisateur annule la popup
      } else {
        alert("Erreur de connexion avec Google: " + (e?.message || 'Inconnue'));
      }
    } finally {
      setTimeout(() => setLoading(false), 500); // Wait a bit before allowing another attempt
    }
  };

  const handleDeleteProduct = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    safeConfirm("Voulez-vous vraiment supprimer cette annonce ?", async () => {
      // Optimistic delete
      setProducts(prev => prev.filter(p => p.id !== id));
      setHomeProducts(prev => prev.filter(p => p.id !== id));
      if (globalDataCache['homeProducts']) {
        globalDataCache['homeProducts'] = globalDataCache['homeProducts'].filter((p: any) => p.id !== id);
      }
      setExplorerPages(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(pageKey => {
          const indexNum = Number(pageKey);
          if (next[indexNum]) {
            next[indexNum] = next[indexNum].filter(p => p.id !== id);
          }
        });
        return next;
      });

      try {
        const docRef = doc(db, 'products', id);
        await deleteDoc(docRef);
        safeAlert("Annonce supprimée.");
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
      }
    });
  };

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [inAppNotification, setInAppNotification] = useState<{ title: string; body: string; type: 'message' | 'troc' } | null>(null);

  const { 
    notifications, 
    setNotifications,
    rawNotifications,
    setRawNotifications,
    handleDeleteNotification 
  } = useNotifications(
    user, 
    activeConversationId, 
    profile,
    conversations,  // ← Passer les conversations
    exchanges        // ← Passer les exchanges
  );

  useWebPush(user?.uid);

  // Optimistically update likesCount and favorites locally for maximum fluidity
  const updateProductLikesLocally = (productId: string, val: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const count = typeof p.likesCount === 'number' ? p.likesCount : 0;
        return { ...p, likesCount: Math.max(0, count + val) };
      }
      return p;
    }));

    setHomeProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const count = typeof p.likesCount === 'number' ? p.likesCount : 0;
        return { ...p, likesCount: Math.max(0, count + val) };
      }
      return p;
    }));

    setExplorerPages(prev => {
      const copy = { ...prev };
      let changed = false;
      Object.keys(copy).forEach(pageKey => {
        const idx = Number(pageKey);
        const list = copy[idx];
        if (Array.isArray(list)) {
          const hasItem = list.some(p => p.id === productId);
          if (hasItem) {
            copy[idx] = list.map(p => {
              if (p.id === productId) {
                const count = typeof p.likesCount === 'number' ? p.likesCount : 0;
                return { ...p, likesCount: Math.max(0, count + val) };
              }
              return p;
            });
            changed = true;
          }
        }
      });
      return changed ? copy : prev;
    });

    setSelectedProduct(prev => {
      if (prev && prev.id === productId) {
        const count = typeof prev.likesCount === 'number' ? prev.likesCount : 0;
        return { ...prev, likesCount: Math.max(0, count + val) };
      }
      return prev;
    });
  };

  const {
    favorites,
    getLikesCount,
    toggleFavorite: baseToggleFavorite
  } = useLikes(user, updateProductLikesLocally);

  const toggleFavorite = async (id: string, e?: React.MouseEvent) => {
    if (!user) {
      triggerAuthRequired("Pour aimer cet article et l'ajouter à vos favoris, vous devez d'abord vous connecter ou créer un compte.");
      return;
    }
    await baseToggleFavorite(id, e);
  };

  const activeConversationIdRef = useRef<string | null>(null);
  const activeTabRef = useRef<string>('home');
  const profileRef = useRef<UserProfile | null>(null);
  const processedNotifIdsRef = useRef<Set<string>>(new Set());
  const isFirstConvLoadRef = useRef<boolean>(true);
  const isFirstExchangesLoadRef = useRef<boolean>(true);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
    if (activeConversationId && user) {
      const conv = conversations.find(c => c.id === activeConversationId);
      if (conv && conv.unreadUserId === user.uid) {
        // Clear unread flag in database instantly on open
        updateDoc(doc(db, 'conversations', activeConversationId), {
          unreadUserId: null
        }).catch(e => console.warn("Failed resetting unreadUserId flag:", e));
      }
    }
  }, [activeConversationId, user, conversations]);

  // Real-time badge unread counting from real-time database lists bypasses notification RLS errors
  useEffect(() => {
    if (!user) {
      setUnreadMessages(0);
      setUnreadPerConversation({});
      setPendingTrocs(0);
      return;
    }

    // 1. Calculate unread messages count and unread per conversation from conversations
    const countMap: Record<string, number> = {};
    let totalUnread = 0;
    
    conversations.forEach(c => {
      if (c.unreadUserId === user.uid) {
        countMap[c.id] = 1;
        totalUnread += 1;
      }
    });
    
    setUnreadMessages(totalUnread);
    setUnreadPerConversation(countMap);

    // 2. Calculate pending trocs: when status is 'pending' and we are the recipient (the seller)
    // or when status is 'accepted' and we are the buyer (waiting for further swap action)
    const countPendingExchanges = exchanges.filter(e => 
      (e.status === 'pending' && e.sellerId === user.uid) ||
      (e.status === 'accepted' && e.buyerId === user.uid)
    ).length;
    setPendingTrocs(countPendingExchanges);

  }, [conversations, exchanges, user]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Capacitor Android Hardware Back Button listener
  useEffect(() => {
    let activeListener: any = null;

    const setupBackButton = async () => {
      try {
        activeListener = await CapacitorApp.addListener('backButton', () => {
          let handled = false;

          if (selectedProduct) {
            setSelectedProduct(null);
            handled = true;
          } else if (showExchangePicker) {
            setShowExchangePicker(false);
            handled = true;
          } else if (editingProduct) {
            setEditingProduct(null);
            handled = true;
          } else if (activeConversationId) {
            setActiveConversationId(null);
            handled = true;
          } else if (selectedSellerId) {
            setSelectedSellerId(null);
            handled = true;
          } else if (isStudentFiltersOpen) {
            setIsStudentFiltersOpen(false);
            handled = true;
          } else if (isCategoryFiltersOpen) {
            setIsCategoryFiltersOpen(false);
            handled = true;
          } else if (selectedCategoryTab) {
            setSelectedCategoryTab(null);
            handled = true;
          } else if (profileView !== 'main') {
            setProfileView('main');
            handled = true;
          } else if (activeTab !== 'home') {
            setActiveTab('home');
            handled = true;
          }

          if (!handled) {
            const now = Date.now();
            if (now - lastBackPressRef.current < 2000) {
              try {
                CapacitorApp.minimizeApp();
              } catch (err) {
                console.warn("Could not minimize app on back button:", err);
              }
            } else {
              lastBackPressRef.current = now;
              setInAppNotification({
                title: "Quitter l'application 🚪",
                body: "Appuyez à nouveau sur le bouton retour pour quitter",
                type: 'troc'
              });
              // Auto dismiss after 2 seconds
              setTimeout(() => {
                setInAppNotification(prev => prev?.title === "Quitter l'application 🚪" ? null : prev);
              }, 2000);
            }
          }
        });
      } catch (err) {
        // Safe check since Capacitor is only present when running natively
      }
    };

    setupBackButton();

    return () => {
      if (activeListener) {
        activeListener.remove().catch(() => {});
      }
    };
  }, [
    selectedProduct,
    showExchangePicker,
    editingProduct,
    activeConversationId,
    selectedSellerId,
    profileView,
    activeTab,
    isStudentFiltersOpen,
    isCategoryFiltersOpen,
    selectedCategoryTab
  ]);

  const resetExchangesLoaded = React.useCallback(() => {
    exchangesLoadedRef.current = false;
  }, []);

  const fetchExchanges = React.useCallback(() => {
    // Les transactions sont gérées en temps réel via l'abonnement onSnapshot ci-dessous.
  }, []);

  useEffect(() => {
    if (!user) {
      setExchanges([]);
      return;
    }

    const qBuyer = query(
      collection(db, 'exchanges'),
      where('buyerId', '==', user.uid)
    );
    const qSeller = query(
      collection(db, 'exchanges'),
      where('sellerId', '==', user.uid)
    );

    let buyerList: any[] = [];
    let sellerList: any[] = [];

    const handleUpdate = () => {
      const combined = [...buyerList, ...sellerList];
      const seen = new Set();
      const unique = combined.filter((el: any) => {
        const duplicate = seen.has(el.id);
        seen.add(el.id);
        return !duplicate;
      });
      
      const sorted = unique.sort((a: any, b: any) => {
        const t1 = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
        const t2 = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
        return t1 - t2;
      });

      const cacheKey = `exchanges_${user.uid}`;
      globalDataCache[cacheKey] = sorted;
      setExchanges(sorted);
    };

    const unsubBuyer = onSnapshot(qBuyer, (snap) => {
      buyerList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      handleUpdate();

      if (!isFirstExchangesLoadRef.current) {
        snap.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const exData = change.doc.data() as any;
            const statusTxt = exData.status === 'accepted' ? 'Confirmée/Acceptée' :
                              exData.status === 'completed' ? 'Validée/Terminée' :
                              exData.status === 'cancelled' ? 'Refusée/Annulée' : exData.status;

            setInAppNotification({
              title: "Mise à jour transaction 🔄",
              body: `Votre proposition d'échange pour "${exData.productTitle}" est désormais : ${statusTxt}`,
              type: 'troc'
            });
            setTimeout(() => {
              setInAppNotification(prev => prev?.body.includes(exData.productTitle) ? null : prev);
            }, 6000);
          }
        });
      } else {
        isFirstExchangesLoadRef.current = false;
      }
    }, (e) => {
      if (!e.message?.includes('index')) {
        console.warn("Error in exchanges buyer listener:", e);
      }
    });

    const unsubSeller = onSnapshot(qSeller, (snap) => {
      sellerList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      handleUpdate();

      if (!isFirstExchangesLoadRef.current) {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const exData = change.doc.data() as any;
            if (exData.status === 'pending') {
              setInAppNotification({
                title: "Proposition de transaction reçue 🤝",
                body: `Vous avez reçu une proposition d'échange pour "${exData.productTitle}" ! Veuillez la consulter.`,
                type: 'troc'
              });
              setTimeout(() => {
                setInAppNotification(prev => prev?.body.includes(exData.productTitle) ? null : prev);
              }, 6000);
            }
          }
        });
      }
    }, (e) => {
      if (!e.message?.includes('index')) {
        console.warn("Error in exchanges seller listener:", e);
      }
    });

    return () => {
      unsubBuyer();
      unsubSeller();
    };
  }, [user?.uid]);

  useEffect(() => {
    exchangesLoadedRef.current = false;
    setExchanges([]);
    if (globalDataCache[`exchanges_${user?.uid}`]) {
      delete globalDataCache[`exchanges_${user?.uid}`];
    }
  }, [user?.uid]);

  // Synchronise automatiquement le statut des produits possédés par l'utilisateur connecté
  // en base de données et localement si une transaction validée (status === 'completed') les contient.
  // Cela résout les barrières de RLS Supabase de manière transparente et sécurisée.
  useEffect(() => {
    if (!user || !exchanges || exchanges.length === 0) return;

    exchanges.forEach(async (ex) => {
      if (ex.status !== 'completed') return;

      const myAffectedProductIds: string[] = [];

      // Si je suis le vendeur, l'article principal (mis en vente) est le mien
      if (ex.sellerId === user.uid && ex.productId) {
        myAffectedProductIds.push(ex.productId);
      }

      // Si je suis l'acheteur, les articles proposés en échange sont les miens
      if (ex.buyerId === user.uid) {
        if (ex.exchangeProductIds && Array.isArray(ex.exchangeProductIds)) {
          myAffectedProductIds.push(...ex.exchangeProductIds);
        } else if (ex.exchangeProductId) {
          myAffectedProductIds.push(ex.exchangeProductId);
        }
      }

      const uniqueMyIds = Array.from(new Set(myAffectedProductIds.filter(Boolean)));

      for (const prodId of uniqueMyIds) {
        // Obtenir le produit local pour vérifier s'il a besoin d'être mis à jour
        const localProd = products.find(p => p.id === prodId) || homeProducts.find(p => p.id === prodId);
        
        if (!localProd || localProd.status !== 'sold' || localProd.is_available !== false || localProd.transactionInProgress) {
          try {
            const prodRef = doc(db, 'products', prodId);
            const snap = await getDoc(prodRef);
            if (snap.exists()) {
              const dbData = snap.data();
              // Ne met à jour que si les valeurs ne sont pas déjà correctes en base de données
              if (dbData.status !== 'sold' || dbData.is_available !== false || dbData.transactionInProgress) {
                const batch = writeBatch(db);
                batch.update(prodRef, {
                  status: 'sold',
                  is_available: false,
                  transactionInProgress: false,
                  updatedAt: serverTimestamp()
                });
                await batch.commit();

                // Mettre à jour l'état local immédiatement
                updateLocalProductState([prodId], {
                  status: 'sold',
                  is_available: false,
                  transactionInProgress: false
                });

                // Invalider le cache du produit pour forcer le rechargement si nécessaire
                delete globalDataCache[prodId];
              }
            }
          } catch (err) {
            console.warn(`[Sync completed exchange products] Impossible de mettre à jour le produit ${prodId} à "sold":`, err);
          }
        }
      }
    });
  }, [exchanges, user, products, homeProducts]);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      processedNotifIdsRef.current = new Set();
      return;
    }
    // Notification permission request
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const convCacheKey = `conversations_${user.uid}`;
    if (globalDataCache[convCacheKey] !== undefined) {
      setConversations(globalDataCache[convCacheKey]);
    }

    const q = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc'),
      limit(50)
    );
    let convDebounceTimeout: any = null;
    const unsubConv = onSnapshot(q, (snap) => {
      // Monitor live message arrivals for in-app floating slide-downs and HTML5 notifications
      if (!isFirstConvLoadRef.current) {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const convData = change.doc.data() as Conversation;
            const isMeSender = convData.lastSenderId === user.uid;
            const isOurActiveChatNow = activeConversationIdRef.current === convData.id;

            if (convData.unreadUserId === user.uid && !isMeSender && (!isOurActiveChatNow || document.hidden)) {
              // Trigger a beautiful sliding in-app banner toast
              setInAppNotification({
                title: "Nouveau message 💬",
                body: convData.lastMessage || "Vous avez reçu un message.",
                type: 'message'
              });
              // Auto dismiss after 6 seconds
              setTimeout(() => {
                setInAppNotification(prev => prev?.body === (convData.lastMessage || "Vous avez reçu un message.") ? null : prev);
              }, 6000);

              // Also trigger immediate browser/HTML5 notification popup
              if (
                'Notification' in window &&
                Notification.permission === 'granted' &&
                profileRef.current?.notificationsEnabled !== false
              ) {
                new Notification(`Nouveau message de TrocShop`, {
                  body: convData.lastMessage || "Discutons à propos de votre échange.",
                  icon: '/icon.jpg',
                  tag: convData.id,
                  renotify: true
                } as any);
              }
            }
          }
        });
      } else {
        isFirstConvLoadRef.current = false;
      }

      if (convDebounceTimeout) {
        clearTimeout(convDebounceTimeout);
      }
      convDebounceTimeout = setTimeout(() => {
        const convs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
        const sorted = convs.sort((a, b) => {
          const t1 = (a.updatedAt as any)?.seconds || 0;
          const t2 = (b.updatedAt as any)?.seconds || 0;
          return t2 - t1;
        });
        globalDataCache[convCacheKey] = sorted;
        setConversations(sorted);
      }, 500);
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'conversations'));

    return () => {
      if (convDebounceTimeout) {
        clearTimeout(convDebounceTimeout);
      }
      unsubConv();
    };
  }, [user?.uid]);

  // Synchronise les compteurs de messages non lus et de trocs en attente de manière totalement indépendante des notifications
  useEffect(() => {
    if (!user) {
      setUnreadMessages(0);
      setUnreadPerConversation({});
      setPendingTrocs(0);
      return;
    }

    // 1. Calcul des messages non lus par conversation et total
    const countMap: Record<string, number> = {};
    let totalUnreadConvs = 0;
    
    conversations.forEach(c => {
      if (c.unreadUserId === user.uid && c.lastSenderId !== user.uid) {
        countMap[c.id] = 1;
        totalUnreadConvs++;
      }
    });
    setUnreadPerConversation(countMap);
    setUnreadMessages(totalUnreadConvs);

    // 2. Calcul des trocs en attente (quand l'utilisateur est le vendeur)
    const pendingCount = exchanges.filter(e => e.status === 'pending' && e.sellerId === user.uid).length;
    setPendingTrocs(pendingCount);

  }, [conversations, exchanges, user?.uid]);

  // Synchronisation des notifications globales de l'admin vers le profil de l'utilisateur
  useEffect(() => {
    if (!user) return;

    const qGlobal = query(
      collection(db, 'global_notifications'),
      limit(10)
    );

    const unsubscribeGlobal = onSnapshot(qGlobal, async (snap) => {
      let syncedIds: string[] = [];
      try {
        syncedIds = JSON.parse(localStorage.getItem(`synced_global_${user.uid}`) || '[]');
      } catch (e) {}

      const syncedSet = new Set(syncedIds);
      const newSyncedList = [...syncedIds];
      let hasChanges = false;

      for (const globalDoc of snap.docs) {
        const notifId = globalDoc.id;
        if (!syncedSet.has(notifId)) {
          syncedSet.add(notifId);
          newSyncedList.push(notifId);
          hasChanges = true;

          const data = globalDoc.data();
          const userNotifRef = doc(db, 'users', user.uid, 'notifications', notifId);
          try {
            const docSnap = await getDoc(userNotifRef);
            if (!docSnap.exists()) {
              await setDoc(userNotifRef, {
                toUserId: user.uid,
                type: data.type || 'system',
                title: data.title || 'Notification TrocShop',
                body: data.body || '',
                fromUserId: 'system',
                fromUserName: 'TrocShop',
                createdAt: data.createdAt || serverTimestamp(),
                read: false,
                globalId: notifId
              });
            }
          } catch (err) {
            console.error("Error syncing global notification:", err);
          }
        }
      }

      if (hasChanges) {
        localStorage.setItem(`synced_global_${user.uid}`, JSON.stringify(newSyncedList));
      }
    }, (e) => {
      console.warn("Global notifications subscription failed:", e);
    });

    return () => unsubscribeGlobal();
  }, [user?.uid]);

  // Les notifications de troc ne sont plus marquées lues automatiquement en arrivant sur cet onglet.
  // Elles restent dans le journal du centre de notification jusqu'à ce que l'utilisateur clique dessus ou clique sur "Tout lu".

  const filteredProducts = useMemo(() => {
    const searchLower = searchQuery.toLowerCase().trim();
    const terms = searchLower.split(' ').filter(Boolean);
    
    let filtered = explorerProducts.filter(p => {
      const matchSearch = terms.length === 0 || terms.every(term => 
        p.title.toLowerCase().includes(term) || 
        p.description.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.neighborhood.toLowerCase().includes(term)
      );
      
      const matchCondition = filterCondition === 'Tous' || p.condition === filterCondition;
      const matchNeighborhood = filterNeighborhood === 'Tous' || p.neighborhood === filterNeighborhood;
      const matchListingType = filterListingType === 'Tous' || 
                             (filterListingType === 'Vente' && p.listingType === 'sale') ||
                             (filterListingType === 'Troc' && p.listingType === 'troc') ||
                             (filterListingType === 'Troc +' && p.listingType === 'mixed');
      const matchPrice = !filterPriceMax || p.price <= filterPriceMax;
      
      const seller = allUsersProfiles[p.sellerId] || globalUserProfileCache[p.sellerId];
      const sProfile = getSellerProfile(seller);
      const isSellerCertified = sProfile ? sProfile.isCertified : false;
      const matchCertified = !filterCertifiedOnly || isSellerCertified;
      
      const matchAvailable = p.status !== 'sold' && p.is_available !== false;

      // Student and School Filters
      let matchStudent = true;
      if (filterStudentMode) {
        const isSellerStudent = sProfile ? sProfile.isStudent : false;
        if (!isSellerStudent) {
          matchStudent = false;
        } else if (filterStudentSchool !== 'Tous') {
          const sellerSchool = sProfile?.studentSchool || '';
          if (sellerSchool !== filterStudentSchool) {
            matchStudent = false;
          }
        }
      }
      
      return matchSearch && matchCondition && matchNeighborhood && matchListingType && matchPrice && matchCertified && matchAvailable && matchStudent;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      if (sortBy === 'oldest') return dateA - dateB;
      return dateB - dateA; // newest first
    });
  }, [searchQuery, explorerProducts, sortBy, filterCondition, filterPriceMax, filterNeighborhood, filterListingType, filterCertifiedOnly, filterStudentMode, filterStudentSchool, allUsersProfiles]);

  const filteredStudentProducts = useMemo(() => {
    const allUniqueProductsMap: Record<string, Product> = {};
    homeProducts.forEach(p => { allUniqueProductsMap[p.id] = p; });
    explorerProducts.forEach(p => { allUniqueProductsMap[p.id] = p; });
    
    const allUniqueProducts = Object.values(allUniqueProductsMap);

    const filtered = allUniqueProducts.filter(p => {
      const seller = allUsersProfiles[p.sellerId] || globalUserProfileCache[p.sellerId];
      const sProfile = getSellerProfile(seller);
      const isSellerStudent = sProfile ? sProfile.isStudent : false;

      if (!isSellerStudent) return false;

      if (studentSearchQuery) {
        const query = studentSearchQuery.toLowerCase().trim();
        const title = (p.title || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        if (!title.includes(query) && !desc.includes(query) && !cat.includes(query)) {
          return false;
        }
      }

      if (studentFilterSchool !== 'Tous') {
        const sellerSchool = sProfile?.studentSchool || '';
        if (sellerSchool !== studentFilterSchool) {
          return false;
        }
      }

      if (studentFilterCondition !== 'Tous') {
        if (p.condition !== studentFilterCondition) {
          return false;
        }
      }

      if (studentFilterPriceMax !== null) {
        if (p.price > studentFilterPriceMax) {
          return false;
        }
      }

      if (studentFilterListingType !== 'Tous') {
        if (studentFilterListingType === 'Vente' && p.listingType !== 'sale') return false;
        if (studentFilterListingType === 'Troc' && p.listingType !== 'troc') return false;
        if (studentFilterListingType === 'Troc +' && p.listingType !== 'mixed') return false;
      }

      const matchAvailable = p.status !== 'sold' && p.is_available !== false;
      if (!matchAvailable) return false;

      return true;
    });

    return filtered.sort((a, b) => {
      if (studentSortBy === 'price-asc') return a.price - b.price;
      if (studentSortBy === 'price-desc') return b.price - a.price;
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      if (studentSortBy === 'oldest') return dateA - dateB;
      return dateB - dateA;
    });
  }, [
    homeProducts,
    explorerProducts,
    studentSearchQuery,
    studentFilterSchool,
    studentFilterCondition,
    studentFilterPriceMax,
    studentFilterListingType,
    studentSortBy,
    allUsersProfiles,
    globalUserProfileCache
  ]);

  const filteredCategoryProducts = useMemo(() => {
    if (!selectedCategoryTab) return [];
    
    const allUniqueProductsMap: Record<string, Product> = {};
    homeProducts.forEach(p => { allUniqueProductsMap[p.id] = p; });
    explorerProducts.forEach(p => { allUniqueProductsMap[p.id] = p; });
    
    const allUniqueProducts = Object.values(allUniqueProductsMap);

    const filtered = allUniqueProducts.filter(p => {
      // Clean category matching
      if (p.category !== selectedCategoryTab) return false;

      if (categorySearchQuery) {
        const queryStr = categorySearchQuery.toLowerCase().trim();
        const titleStr = (p.title || '').toLowerCase();
        const descStr = (p.description || '').toLowerCase();
        if (!titleStr.includes(queryStr) && !descStr.includes(queryStr)) {
          return false;
        }
      }

      if (categoryFilterCondition !== 'Tous') {
        if (p.condition !== categoryFilterCondition) {
          return false;
        }
      }

      if (categoryFilterPriceMax !== null) {
        if (p.price > categoryFilterPriceMax) {
          return false;
        }
      }

      if (categoryFilterListingType !== 'Tous') {
        if (categoryFilterListingType === 'Vente' && p.listingType !== 'sale') return false;
        if (categoryFilterListingType === 'Troc' && p.listingType !== 'troc') return false;
        if (categoryFilterListingType === 'Troc +' && p.listingType !== 'mixed') return false;
      }

      const matchAvailable = p.status !== 'sold' && p.is_available !== false;
      if (!matchAvailable) return false;

      return true;
    });

    return filtered.sort((a, b) => {
      if (categorySortBy === 'price-asc') return a.price - b.price;
      if (categorySortBy === 'price-desc') return b.price - a.price;
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      if (categorySortBy === 'oldest') return dateA - dateB;
      return dateB - dateA;
    });
  }, [
    homeProducts,
    explorerProducts,
    selectedCategoryTab,
    categorySearchQuery,
    categoryFilterCondition,
    categoryFilterPriceMax,
    categoryFilterListingType,
    categorySortBy
  ]);

  const handleLoadMore = () => {
    if (explorerLoading || !explorerHasMore || firestoreQuotaExceeded) return;
    const pageKeys = Object.keys(explorerPages).map(Number);
    const lastPageIndex = pageKeys.length > 0 ? Math.max(...pageKeys) : -1;
    const nextPageIndex = lastPageIndex + 1;
    const lastDoc = lastPageIndex >= 0 ? explorerPageLastDocs[lastPageIndex] : null;
    
    if (nextPageIndex === 0 || lastDoc) {
      loadExplorerPage(nextPageIndex, lastDoc);
    }
  };

  const startConversation = async (p: Product) => {
    if (!user) {
      triggerAuthRequired("Pour discuter avec le vendeur, vous devez d'abord vous connecter ou créer un compte.");
      return;
    }
    
    if (p.sellerId === user.uid) {
      alert("C'est votre article ! Vous ne pouvez pas vous contacter vous-même.");
      return;
    }

    const convId = [user.uid, p.sellerId, p.id].sort().join('_');
    const convRef = doc(db, 'conversations', convId);
    
    // Navigate immediately for high fluidity
    setActiveConversationId(convId);
    setActiveTab('messages');
    setSelectedProduct(null); // Close the sheet for better UX

    try {
      const snap = await getDoc(convRef);
      if (!snap.exists()) {
        const batch = writeBatch(db);
        
        batch.set(convRef, {
          id: convId,
          participantIds: [user.uid, p.sellerId],
          participantNames: [user.displayName || 'Utilisateur', p.sellerName],
          productId: p.id,
          sellerId: p.sellerId,
          productTitle: p.title,
          productImage: p.images[0],
          productPrice: p.price,
          lastMessage: `Bonjour, je suis intéressé(e) par votre article : ${p.title}`,
          lastSenderId: user.uid,
          updatedAt: serverTimestamp(),
          unreadUserId: p.sellerId,
        });

        // Add auto-mention message
        const msgRef = doc(collection(convRef, 'messages'));
        batch.set(msgRef, {
          senderId: user.uid,
          text: `Bonjour, je suis intéressé(e) par votre article : ${p.title}`,
          isProductMention: true,
          productId: p.id,
          createdAt: serverTimestamp(),
        });

        const exRef = doc(collection(db, 'exchanges'));
        batch.set(exRef, {
          productId: p.id,
          productTitle: p.title,
          productImage: p.images[0],
          productPrice: p.price,
          buyerId: user.uid,
          sellerId: p.sellerId,
          type: 'purchase',
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Add notification to the seller informing about the purchase proposition and to consult mes transactions
        const notifRef = doc(collection(db, 'users', p.sellerId, 'notifications'));
        batch.set(notifRef, {
          type: 'troc',
          title: "Proposition d'achat reçue",
          body: `Vous avez reçu une proposition d'achat de la part de ${user.displayName || 'un membre'} pour votre article "${p.title}". Veuillez consulter la page "mes transactions" pour la confirmer ou l'annuler.`,
          toUserId: p.sellerId,
          fromUserId: user.uid,
          fromUserName: user.displayName || 'Un membre',
          productId: p.id,
          exchangeId: exRef.id,
          read: false,
          createdAt: serverTimestamp()
        });

        await batch.commit();
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'conversations');
    }
  };

  const handleProposeExchange = async (targetProduct: Product, myProductIds: string[], priceAdjustment: number = 0) => {
    if (!user) return;
    
    if (targetProduct.sellerId === user.uid) {
      alert("C'est votre propre article !");
      setShowExchangePicker(false);
      return;
    }
    
    setShowExchangePicker(false);
    setSelectedProduct(null);

    try {
      const batch = writeBatch(db);
      
      const exRef = doc(collection(db, 'exchanges'));
      const exItems = products.filter(p => myProductIds.includes(p.id));
      
      batch.set(exRef, {
        productId: targetProduct.id,
        productTitle: targetProduct.title,
        productImage: targetProduct.images[0],
        productPrice: targetProduct.price,
        buyerId: user.uid,
        buyerName: user.displayName,
        sellerId: targetProduct.sellerId,
        exchangeProductIds: myProductIds,
        exchangeProductTitles: exItems.map(p => p.title),
        exchangeProductImages: exItems.map(p => p.images?.[0] || ''),
        priceAdjustment: priceAdjustment,
        type: 'exchange',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Notify seller
      const notifRef = doc(collection(db, 'users', targetProduct.sellerId, 'notifications'));
      batch.set(notifRef, {
        type: 'troc',
        title: 'Nouvelle proposition de troc',
        body: `Vous avez reçu une proposition de troc de la part de ${user.displayName} pour votre article "${targetProduct.title}". Veuillez consulter la page "mes transactions" pour la confirmer ou l'annuler.`,
        toUserId: targetProduct.sellerId,
        fromUserId: user.uid,
        fromUserName: user.displayName,
        productId: targetProduct.id,
        exchangeId: exRef.id,
        createdAt: serverTimestamp(),
        read: false
      });

      await batch.commit();
      resetExchangesLoaded();
      fetchExchanges();
      setShowTrocFeedback(true);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'exchange_proposal');
    }
  };

  const handleCompleteExchange = async (exId: string) => {
    if (!user) {
      alert("Veuillez vous connecter pour effectuer cette action.");
      return;
    }
    try {
      const exRef = doc(db, 'exchanges', exId);
      const exSnap = await getDoc(exRef);
      if (!exSnap.exists()) return;
      
      const exData = exSnap.data();
      const batch = writeBatch(db);

      batch.update(exRef, { 
        status: 'completed',
        updatedAt: serverTimestamp() 
      });

      const affectedIds: string[] = [];
      if (exData.productId) affectedIds.push(exData.productId);
      if (exData.exchangeProductIds && Array.isArray(exData.exchangeProductIds)) {
        affectedIds.push(...exData.exchangeProductIds);
      } else if (exData.exchangeProductId) {
        affectedIds.push(exData.exchangeProductId);
      }

      affectedIds.forEach(id => {
        batch.update(doc(db, 'products', id), {
          status: 'sold',
          is_available: false,
          transactionInProgress: false,
          updatedAt: serverTimestamp()
        });
      });

      // Update locally
      updateLocalProductState(affectedIds, {
        status: 'sold',
        is_available: false,
        transactionInProgress: false
      });

      // Notify Seller to delete sold listing
      const notifSellerRef = doc(collection(db, 'users', exData.sellerId, 'notifications'));
      batch.set(notifSellerRef, {
        type: 'system',
        title: 'Article vendu ! 🛍️',
        body: `Votre article "${exData.productTitle}" a été vendu. Veuillez s'il vous plaît le retirer du catalogue.`,
        toUserId: exData.sellerId,
        fromUserId: 'system',
        fromUserName: 'TrocShop',
        productId: exData.productId,
        createdAt: serverTimestamp(),
        read: false
      });

      await batch.commit();

      if (user) {
        delete globalDataCache[`exchanges_${user.uid}`];
        resetExchangesLoaded();
        fetchExchanges();
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'exchanges');
    }
  };

  /* handleGenerateTrocCode removed */

  /* handleVerifyTrocCode removed */

  /* handleExchangeStatusUpdate removed */

  const handleLogout = () => {
    signOut(auth);
    setUser(null);
    setProfile(null);
    setActiveTab('home');
    setActiveConversationId(null);
  };

  const handleMarkAsSold = async (productId: string) => {
    try {
      await updateDoc(doc(db, 'products', productId), {
        status: 'sold',
        is_available: false,
        transactionInProgress: false,
        updatedAt: serverTimestamp()
      });
      updateLocalProductState(productId, {
        status: 'sold',
        is_available: false,
        transactionInProgress: false
      });
      alert("L'article a été marqué comme vendu.");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'products');
    }
  };



  if (isBooting) {
    return (
      <AnimatePresence>
        {isBooting && <SplashScreen onComplete={() => setIsBooting(false)} />}
      </AnimatePresence>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 md:flex md:items-center md:justify-center md:p-8 antialiased">
      <div className="w-full min-h-screen bg-white text-zinc-900 font-sans selection:bg-orange-100 selection:text-orange-900 relative flex flex-col overflow-x-hidden md:overflow-hidden md:w-[400px] md:h-[840px] md:min-h-[840px] md:rounded-[52px] md:shadow-[0_24px_70px_-10px_rgba(15,23,42,0.18),0_0_0_1px_rgba(15,23,42,0.06)] md:border-[14px] md:border-slate-950">
        {/* Dynamic Island simulée (visible sur ordinateur) */}
        <div className="hidden md:block absolute top-3.5 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-950 rounded-full z-50 shadow-inner" />

        {/* Voyant de la caméra frontale */}
        <div className="hidden md:block absolute top-5 left-[calc(50%+40px)] w-2 h-2 bg-slate-900/80 rounded-full z-50 border border-slate-800/50" />

        {firestoreQuotaExceeded && (
        <div className="fixed md:absolute top-36 left-4 right-4 z-[99] max-w-lg mx-auto bg-orange-50/95 backdrop-blur-xl border border-orange-200/50 rounded-2xl p-3.5 shadow-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
            <span className="text-sm">⚠️</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-[11px] uppercase tracking-wider text-zinc-800">Base de données saturée</p>
            <p className="text-[10px] text-zinc-600 font-medium leading-relaxed mt-0.5">La limite quotidienne de requêtes à la base est atteinte. TrocShop continue de fonctionner en mode local sécurisé : vous pouvez naviguer grâce au cache local.</p>
          </div>
        </div>
      )}

      {/* iOS Watermark Background */}
      <div className="fixed md:absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
        <motion.span 
          animate={{ 
            scale: [1, 1.05, 1],
            opacity: [0.03, 0.05, 0.03]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="text-[8rem] md:text-[14rem] font-black rotate-12 tracking-tighter text-orange-600/10 blur-[4px]"
        >
          999
        </motion.span>
      </div>
      
      <header className={cn(
        "fixed md:absolute top-[calc(env(safe-area-inset-top,16px)+8px)] md:top-12 left-4 right-4 z-[100] bg-white/40 backdrop-blur-[40px] backdrop-saturate-[180%] border border-white/50 rounded-[2rem] px-6 h-20 flex flex-col justify-center shadow-[0_20px_50px_rgba(0,0,0,0.05)]",
        (selectedSellerId || activeTab === 'category' || activeTab === 'student') ? "hidden invisible pointer-events-none" : ""
      )}>
        <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setActiveTab('home')}>
                <span className="text-2xl font-black italic tracking-tighter text-orange-600 select-none">TrocShop</span>
                <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-orange-600 bg-orange-100/80 border border-orange-200/50 rounded-md select-none transform -translate-y-1.5 font-sans leading-none">Bêta</span>
              </div>
          </div>
          
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveTab('notifications')}
                  className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 hover:text-orange-600 transition-all relative"
                >
                  <Bell size={20} />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce-short">
                      {notifications.filter(n => !n.read).length > 9 ? '9+' : notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
                <button onClick={() => setActiveTab('profile')} className="relative group">
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} className="w-10 h-10 rounded-xl border-2 border-white shadow-sm ring-1 ring-zinc-200 group-hover:ring-orange-500 transition-all object-cover" alt="Avatar" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-lg">
                      {profile?.displayName?.[0] || user.displayName?.[0] || 'U'}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => { 
                    const nextMode = activeTab === 'auth' ? (authMode === 'login' ? 'signup' : 'login') : 'login';
                    setAuthMode(nextMode); 
                    setActiveTab('auth'); 
                  }} 
                  className="py-2.5 px-6 rounded-full text-[10px] font-black uppercase tracking-widest bg-orange-600 text-white hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20"
                >
                  {activeTab === 'auth' ? (authMode === 'login' ? 'S\'inscrire' : 'Connexion') : 'Connexion'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main className={cn(
        "pb-36 px-6 max-w-lg mx-auto w-full h-auto md:h-full md:overflow-y-auto no-scrollbar relative transition-all duration-300",
        (activeTab === 'category' || activeTab === 'student') ? "pt-6" : "pt-36 md:pt-[152px]"
      )}>

        <AnimatePresence mode="wait">
          {activeTab === 'auth' && (
            <motion.div 
              key="auth"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-16 md:py-24 flex flex-col items-center"
            >
              <div className="text-center space-y-6 mb-12 relative">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-orange-600/20 mb-8 overflow-hidden border border-zinc-100"
                >
                  <img src="/icon.jpg" className="w-full h-full object-cover" alt="TrocShop Logo" referrerPolicy="no-referrer" />
                </motion.div>
                <h2 className="text-5xl font-black tracking-tighter italic text-zinc-900 uppercase leading-none">
                  {authMode === 'login' ? 'Connexion' : 'S\'inscrire'}
                </h2>
                <div className="h-2 w-24 bg-orange-600 mx-auto rounded-full" />
              </div>
              
              <div className="w-full max-w-sm space-y-10">
                {authFailedHelp && (
                  <div className="bg-red-50 border border-red-200 rounded-[2rem] p-6 text-zinc-900 space-y-4 shadow-xl shadow-red-100/30">
                    <p className="text-xs font-semibold text-red-800 leading-relaxed flex items-start gap-2">
                      <span className="text-sm shrink-0">⚠️</span> 
                      <span>{authFailedHelp}</span>
                    </p>
                    <a 
                      href={window.location.href} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center justify-center gap-2 w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all shadow-lg shadow-red-600/20 text-center"
                    >
                      Ouvrir dans un nouvel onglet
                    </a>
                  </div>
                )}

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {authMode === 'login' ? (
                    <LoginForm onLogin={handleEmailLogin} onToggle={() => setAuthMode('signup')} />
                  ) : (
                    <SignupForm onSignup={handleEmailSignup} onToggle={() => setAuthMode('login')} />
                  )}
                </motion.div>

                {/* MASKED GOOGLE LOGIN
                <div className="flex items-center gap-6 text-zinc-300">
                  <div className="h-px flex-1 bg-zinc-200" />
                  <span className="text-[10px] uppercase font-black tracking-[0.3em] text-zinc-400">Continuer avec</span>
                  <div className="h-px flex-1 bg-zinc-200" />
                </div>

                <Button disabled={loading} onClick={handleLogin} variant="outline" className="w-full py-5 rounded-3xl border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 group transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  <div className="flex items-center justify-center gap-4">
                    <img src="https://www.google.com/favicon.ico" className="w-6 h-6 grayscale group-hover:grayscale-0 transition-all duration-300" alt="Google" />
                    <span className="text-zinc-900 font-black uppercase tracking-widest text-[10px]">{loading ? "Connexion..." : "Compte Google"}</span>
                  </div>
                </Button>
                */}
              </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <Notifications 
              notifications={notifications}
              user={user}
              onBackToHome={() => setActiveTab('home')}
              setNotifications={setNotifications}
              setRawNotifications={setRawNotifications}
              onNotificationClick={(n) => {
                if (n.type === 'message' && n.conversationId) {
                  setActiveConversationId(n.conversationId);
                  setActiveTab('messages');
                } else if (n.type === 'troc') {
                  setActiveTab('favorites');
                } else if (n.type === 'favorite') {
                  setActiveTab('profile');
                  setProfileView('favorites');
                }
              }}
            />
          )}


      {activeTab === 'home' && (
          <motion.div 
            key="home"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="py-6 space-y-8"
          >
              <DynamicBanner />

              {/* Categories */}
              <div className="flex gap-3 overflow-x-auto py-2 no-scrollbar">
                {/* Button Tous */}
                <button 
                  onClick={() => setSelectedCategory('Tous')}
                  className={cn(
                    "px-6 py-2 rounded-full border text-xs font-black uppercase tracking-widest transition-all shrink-0",
                    selectedCategory === 'Tous' ? "bg-orange-600 border-orange-600 text-white" : "bg-white border-zinc-100 text-zinc-400 hover:border-zinc-300"
                  )}
                >
                  Tous
                </button>

                {/* Button Mode Étudiant */}
                <button 
                  onClick={() => {
                    setActiveTab('student');
                  }}
                  className={cn(
                    "px-6 py-2 rounded-full border text-xs font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-1.5",
                    "bg-emerald-50 border-emerald-100 border-dashed text-emerald-600 hover:bg-emerald-100/40"
                  )}
                >
                  <span className="text-sm select-none">🎓</span>
                  <span>Mode Étudiant</span>
                </button>

                {/* Other Categories */}
                {CATEGORIES.map((cat) => (
                  <button 
                    key={cat} 
                    onClick={() => {
                      setSelectedCategoryTab(cat);
                      setActiveTab('category');
                    }}
                    className={cn(
                      "px-6 py-2 rounded-full border text-xs font-black uppercase tracking-widest transition-all shrink-0",
                      selectedCategory === cat ? "bg-orange-600 border-orange-600 text-white" : "bg-white border-zinc-100 text-zinc-400 hover:border-zinc-300"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grid Header */}
              <div className="flex items-center justify-between">
                <h3 className="font-black text-xl tracking-tight">À la une</h3>
                <span 
                  onClick={() => { setSelectedCategory('Tous'); setActiveTab('search'); }}
                  className="text-orange-600 text-xs font-bold uppercase tracking-widest cursor-pointer hover:underline"
                >
                  Voir tout
                </span>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 gap-4">
                {isInitialLoading ? (
                  [...Array(4)].map((_, i) => <ProductCardSkeleton key={i} />)
                ) : homeProducts.length === 0 ? (
                  <div className="col-span-2 py-20 text-center text-zinc-300">
                    <ShoppingBag className="w-20 h-20 mx-auto mb-4 opacity-5" />
                    <p className="font-bold uppercase tracking-widest text-[10px]">L'inventaire est vide</p>
                  </div>
                ) : (
                  homeProducts
                    .filter(p => {
                      if (selectedCategory === 'student') {
                        const seller = allUsersProfiles[p.sellerId] || globalUserProfileCache[p.sellerId];
                        return !!(
                          seller?.isStudent === true || 
                          seller?.is_student === true || 
                          (seller?.isStudent as any) === 'true' || 
                          (seller?.isStudent as any) === 'vrai' || 
                          (seller?.badges as string[])?.some((b: any) => typeof b === 'string' && (b.toLowerCase().includes('étudiant') || b.toLowerCase().includes('etudiant')))
                        );
                      }
                      return selectedCategory === 'Tous' || p.category === selectedCategory;
                    })
                    .map(p => (
                    <ProductCard 
                      key={p.id} 
                      product={{ ...p, likesCount: getLikesCount(p) }} 
                      onClick={() => setSelectedProduct(p)} 
                      favorite={favorites.includes(p.id)}
                      onFavorite={(e) => toggleFavorite(p.id, e)}
                      onBuy={(e) => { e.stopPropagation(); startConversation(p); }}
                      sellerProfile={getSellerProfile(allUsersProfiles[p.sellerId] || globalUserProfileCache[p.sellerId])}
                    />
                  ))
                )}
              </div>
              
              <div className="py-20" />
            </motion.div>
        )}



          {activeTab === 'search' && (
              <motion.div 
                key="search"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-6 space-y-8"
              >
              <div className="space-y-4">
                <header className="flex items-center justify-between">
                  <div>
                    <h2 className="text-4xl font-black tracking-tighter uppercase italic">Explorer</h2>
                    <div className="h-1.5 w-12 bg-orange-600 rounded-full mt-1" />
                  </div>
                  <Button 
                    variant="ghost" 
                    className={cn(
                      "rounded-full p-3 transition-colors",
                      isFiltersOpen ? "bg-orange-100 text-orange-600" : "bg-zinc-100 text-zinc-400"
                    )}
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                  >
                    <Filter size={20} />
                  </Button>
                </header>

                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300 group-focus-within:text-orange-500 transition-colors" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Que cherchez-vous ?" 
                    className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white border border-zinc-100 shadow-sm focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all font-medium"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-600 transition-all"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {isFiltersOpen && (
                    <motion.div 
                      key="filters"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-4 bg-zinc-50 p-6 rounded-[2rem] border border-zinc-100 shadow-inner"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800">Condition</label>
                          <div className="flex flex-wrap gap-2">
                             {['Tous', "Comme neuf", "Très bon état", "Satisfaisant", "C'est gâté (pour pièces)"].map(c => (
                               <button 
                                 key={c}
                                 onClick={() => setFilterCondition(c)}
                                 className={cn(
                                   "px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all border",
                                   filterCondition === c ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-500 border-zinc-200"
                                 )}
                               >
                                 {c}
                               </button>
                             ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800">Type d'annonce</label>
                          <div className="flex flex-wrap gap-2">
                             {['Tous', 'Vente', 'Troc', 'Troc +'].map(t => (
                               <button 
                                 key={t}
                                 onClick={() => setFilterListingType(t)}
                                 className={cn(
                                   "px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all border",
                                   filterListingType === t ? "bg-orange-600 border-orange-600 text-white shadow-sm" : "bg-white text-zinc-500 border-zinc-200"
                                 )}
                               >
                                 {t}
                               </button>
                             ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800">Prix Max</label>
                          <input 
                            type="number" 
                            placeholder="F CFA" 
                            className="w-full bg-white border border-zinc-200 p-3 rounded-xl text-xs font-bold outline-none focus:border-orange-500"
                            onChange={(e) => setFilterPriceMax(e.target.value ? Number(e.target.value) : null)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800">Quartier</label>
                        <CustomDropdown 
                          value={filterNeighborhood} 
                          options={['Tous', ...NEIGHBORHOODS]} 
                          onChange={setFilterNeighborhood} 
                        />
                      </div>
                      
                      <div className="pt-2">
                        <button
                          onClick={() => setFilterCertifiedOnly(!filterCertifiedOnly)}
                          className={cn(
                            "w-full px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2",
                            filterCertifiedOnly
                              ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-600/25"
                              : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                          )}
                        >
                          <BadgeCheck size={16} className={cn("transition-colors", filterCertifiedOnly ? "text-white" : "text-orange-600")} />
                          {filterCertifiedOnly ? "Comptes certifiés uniquement : ON" : "Filtrer par comptes certifiés"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                  {[
                    { id: 'newest', label: 'Nouveautés' },
                    { id: 'price-asc', label: 'Prix croissant' },
                    { id: 'price-desc', label: 'Prix décroissant' },
                    { id: 'oldest', label: 'Ancienneté' },
                  ].map(sort => (
                    <button
                      key={sort.id}
                      onClick={() => setSortBy(sort.id as any)}
                      className={cn(
                        "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                        sortBy === sort.id 
                          ? "bg-zinc-900 text-white border-zinc-900 shadow-lg shadow-zinc-900/20" 
                          : "bg-white text-zinc-400 border-zinc-100 hover:border-zinc-200"
                      )}
                    >
                      {sort.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {filteredProducts.map(p => (
                  <ProductCard 
                    key={p.id} 
                    product={{ ...p, likesCount: getLikesCount(p) }} 
                    onClick={() => setSelectedProduct(p)} 
                    favorite={favorites.includes(p.id)}
                    onFavorite={(e) => toggleFavorite(p.id, e)}
                    onBuy={(e) => { e.stopPropagation(); startConversation(p); }}
                    sellerProfile={getSellerProfile(allUsersProfiles[p.sellerId] || globalUserProfileCache[p.sellerId])}
                  />
                ))}
                {filteredProducts.length === 0 && (
                  <div className="col-span-full py-32 text-center opacity-20 font-black uppercase tracking-widest text-xs">
                    Aucune publication trouvée
                  </div>
                )}
              </div>

              {explorerLoading && (
                <div className="flex justify-center items-center py-6">
                  <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              <div ref={explorerSentinelRef} className="h-4 w-full" />
            </motion.div>
        )}

          {activeTab === 'student' && (
            <motion.div 
              key="student"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-6 space-y-8"
            >
              <div className="space-y-4">
                <header className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      onClick={() => setActiveTab('home')} 
                      className="p-2 hover:bg-zinc-100 rounded-full text-zinc-600 transition-colors"
                    >
                      <ArrowLeft size={24} />
                    </Button>
                    <div>
                      <h2 className="text-4xl font-black tracking-tighter uppercase italic text-emerald-600 font-sans">Espace Étudiant</h2>
                      <div className="h-1.5 w-12 bg-emerald-600 rounded-full mt-1" />
                    </div>
                  </div>
                </header>

                {/* 3D glb model animation */}
                <div className="w-full flex items-center justify-center bg-white rounded-[2.5rem] overflow-hidden mb-6 relative">
                  {/* @ts-ignore */}
                  <model-viewer
                    src="/white_board___school___stationery.glb"
                    auto-rotate="true"
                    auto-rotate-delay="0"
                    rotation-per-second="18deg"
                    interaction-prompt="none"
                    loading="lazy"
                    shadow-intensity="0"
                    power-preference="high-performance"
                    touch-action="pan-y"
                    style={{ width: '100%', height: '240px', backgroundColor: 'transparent' }}
                    alt="Animation 3D Tableau Blanc"
                  />
                </div>

                <div className="flex items-center gap-3 w-full">
                  <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300 group-focus-within:text-emerald-500 transition-colors" />
                    <input 
                      type="text" 
                      value={studentSearchQuery}
                      onChange={e => setStudentSearchQuery(e.target.value)}
                      placeholder="Rechercher parmi les publications étudiantes..." 
                      className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white border border-zinc-100 shadow-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium text-sm"
                    />
                    {studentSearchQuery && (
                      <button 
                        onClick={() => setStudentSearchQuery('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-600 transition-all font-medium"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    className={cn(
                      "rounded-2xl h-14 w-14 shrink-0 transition-all flex items-center justify-center p-0 border border-zinc-100 shadow-sm",
                      isStudentFiltersOpen ? "bg-emerald-100 text-emerald-600 border-emerald-200" : "bg-white text-zinc-400 hover:text-zinc-600"
                    )}
                    onClick={() => setIsStudentFiltersOpen(!isStudentFiltersOpen)}
                  >
                    <Filter size={20} />
                  </Button>
                </div>

                <AnimatePresence>
                  {isStudentFiltersOpen && (
                    <motion.div 
                      key="student-filters"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-4 bg-zinc-50 p-6 rounded-[2rem] border border-zinc-100 shadow-inner overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800">École (Campus)</label>
                          <CustomDropdown 
                            value={studentFilterSchool} 
                            options={['Tous', ...CAMPUS_SCHOOLS]} 
                            onChange={setStudentFilterSchool} 
                            placeholder="Toutes les écoles"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800">Prix Max</label>
                          <input 
                            type="number" 
                            placeholder="F CFA" 
                            value={studentFilterPriceMax !== null ? studentFilterPriceMax : ''}
                            className="w-full bg-white border border-zinc-200 p-3 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                            onChange={(e) => setStudentFilterPriceMax(e.target.value ? Number(e.target.value) : null)}
                          />
                        </div>

                        <div className="space-y-2 col-span-full">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800">État du produit</label>
                          <div className="flex flex-wrap gap-2">
                             {['Tous', "Comme neuf", "Très bon état", "Satisfaisant", "C'est gâté (pour pièces)"].map(c => (
                               <button 
                                 key={c}
                                 onClick={() => setStudentFilterCondition(c)}
                                 className={cn(
                                   "px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all border",
                                   studentFilterCondition === c ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white text-zinc-500 border-zinc-200"
                                 )}
                               >
                                 {c}
                               </button>
                             ))}
                          </div>
                        </div>

                        <div className="space-y-2 col-span-full">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800">Type d'annonce</label>
                          <div className="flex flex-wrap gap-2">
                             {['Tous', 'Vente', 'Troc', 'Troc +'].map(t => (
                               <button 
                                 key={t}
                                 onClick={() => setStudentFilterListingType(t)}
                                 className={cn(
                                   "px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all border",
                                   studentFilterListingType === t ? "bg-emerald-600 border-emerald-600 text-white shadow-sm" : "bg-white text-zinc-500 border-zinc-200"
                                 )}
                               >
                                 {t}
                               </button>
                             ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                  {[
                    { id: 'newest', label: 'Nouveautés' },
                    { id: 'price-asc', label: 'Prix croissant' },
                    { id: 'price-desc', label: 'Prix décroissant' },
                    { id: 'oldest', label: 'Ancienneté' },
                  ].map(sort => (
                    <button
                      key={sort.id}
                      onClick={() => setStudentSortBy(sort.id as any)}
                      className={cn(
                        "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                        studentSortBy === sort.id 
                          ? "bg-zinc-900 text-white border-zinc-900 shadow-lg shadow-zinc-900/20" 
                          : "bg-white text-zinc-400 border-zinc-100 hover:border-zinc-200"
                      )}
                    >
                      {sort.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {filteredStudentProducts.map(p => (
                  <ProductCard 
                    key={p.id} 
                    product={{ ...p, likesCount: getLikesCount(p) }} 
                    onClick={() => setSelectedProduct(p)} 
                    favorite={favorites.includes(p.id)}
                    onFavorite={(e) => toggleFavorite(p.id, e)}
                    onBuy={(e) => { e.stopPropagation(); startConversation(p); }}
                    sellerProfile={getSellerProfile(allUsersProfiles[p.sellerId] || globalUserProfileCache[p.sellerId])}
                  />
                ))}
                {filteredStudentProducts.length === 0 && (
                  <div className="col-span-full py-20 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs">
                    <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    Aucun article étudiant correspondant
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'category' && selectedCategoryTab && (() => {
            const meta = CATEGORY_METADATA[selectedCategoryTab] || {
              model: "/technical_difficulties.glb",
              alt: "Modèle 3D",
              title: `Rubrique ${selectedCategoryTab}`,
              colorClass: "text-zinc-600",
              bgGrad: "bg-zinc-600",
              badgeBg: "bg-zinc-50 border-zinc-100 text-zinc-600"
            };
            return (
              <motion.div 
                key={selectedCategoryTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-6 space-y-8"
              >
                <div className="space-y-4">
                  <header className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="ghost" 
                        onClick={() => {
                          setActiveTab('home');
                          setSelectedCategoryTab(null);
                        }} 
                        className="p-2 hover:bg-zinc-100 rounded-full text-zinc-600 transition-colors"
                      >
                        <ArrowLeft size={24} />
                      </Button>
                      <div>
                        <h2 className={cn("text-4xl font-black tracking-tighter uppercase italic", meta.colorClass)}>
                          {meta.title}
                        </h2>
                        <div className={cn("h-1.5 w-12 rounded-full mt-1", meta.bgGrad)} />
                      </div>
                    </div>
                  </header>

                  {/* 3D glb model animation */}
                  <div className="w-full flex items-center justify-center bg-white rounded-[2.5rem] overflow-hidden mb-6 relative">
                    {/* @ts-ignore */}
                    <model-viewer
                      key={selectedCategoryTab}
                      src={meta.model}
                      auto-rotate="true"
                      auto-rotate-delay="0"
                      rotation-per-second="18deg"
                      interaction-prompt="none"
                      loading="lazy"
                      shadow-intensity="0"
                      power-preference="high-performance"
                      touch-action="pan-y"
                      style={{ width: '100%', height: '240px', backgroundColor: 'transparent' }}
                      alt={meta.alt}
                    />
                  </div>

                  <div className="flex items-center gap-3 w-full">
                    <div className="relative flex-1 group">
                      <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300 transition-colors", `group-focus-within:${meta.colorClass}`)} />
                      <input 
                        type="text" 
                        value={categorySearchQuery}
                        onChange={e => setCategorySearchQuery(e.target.value)}
                        placeholder={`Rechercher dans ${selectedCategoryTab}...`} 
                        className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white border border-zinc-100 shadow-sm focus:ring-4 focus:ring-zinc-500/10 focus:border-zinc-500 outline-none transition-all font-medium text-sm"
                      />
                      {categorySearchQuery && (
                        <button 
                          onClick={() => setCategorySearchQuery('')}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-600 transition-all font-medium"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      className={cn(
                        "rounded-2xl h-14 w-14 shrink-0 transition-all flex items-center justify-center p-0 border border-zinc-100 shadow-sm",
                        isCategoryFiltersOpen ? `${meta.badgeBg}` : "bg-white text-zinc-400 hover:text-zinc-600"
                      )}
                      onClick={() => setIsCategoryFiltersOpen(!isCategoryFiltersOpen)}
                    >
                      <Filter size={20} />
                    </Button>
                  </div>

                  <AnimatePresence>
                    {isCategoryFiltersOpen && (
                      <motion.div 
                        key="category-filters"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-4 bg-zinc-50 p-6 rounded-[2rem] border border-zinc-100 shadow-inner overflow-hidden"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800">Prix Max</label>
                            <input 
                              type="number" 
                              placeholder="F CFA" 
                              value={categoryFilterPriceMax !== null ? categoryFilterPriceMax : ''}
                              className="w-full bg-white border border-zinc-200 p-3 rounded-xl text-xs font-bold outline-none focus:border-zinc-500"
                              onChange={(e) => setCategoryFilterPriceMax(e.target.value ? Number(e.target.value) : null)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800">Type d'annonce</label>
                            <div className="flex flex-wrap gap-2">
                              {['Tous', 'Vente', 'Troc', 'Troc +'].map(t => (
                                <button 
                                  key={t}
                                  onClick={() => setCategoryFilterListingType(t)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all border",
                                    categoryFilterListingType === t ? "bg-zinc-900 border-zinc-900 text-white shadow-sm" : "bg-white text-zinc-500 border-zinc-200"
                                  )}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2 col-span-full">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800">État du produit</label>
                            <div className="flex flex-wrap gap-2">
                              {['Tous', "Comme neuf", "Très bon état", "Satisfaisant", "C'est gâté (pour pièces)"].map(c => (
                                <button 
                                  key={c}
                                  onClick={() => setCategoryFilterCondition(c)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all border",
                                    categoryFilterCondition === c ? "bg-zinc-900 border-zinc-900 text-white shadow-sm" : "bg-white text-zinc-500 border-zinc-200"
                                  )}
                                >
                                  {c}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                    {[
                      { id: 'newest', label: 'Nouveautés' },
                      { id: 'price-asc', label: 'Prix croissant' },
                      { id: 'price-desc', label: 'Prix décroissant' },
                      { id: 'oldest', label: 'Ancienneté' },
                    ].map(sort => (
                      <button
                        key={sort.id}
                        onClick={() => setCategorySortBy(sort.id as any)}
                        className={cn(
                          "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                          categorySortBy === sort.id 
                            ? "bg-zinc-900 text-white border-zinc-900 shadow-lg shadow-zinc-900/20" 
                            : "bg-white text-zinc-400 border-zinc-100 hover:border-zinc-200"
                        )}
                      >
                        {sort.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {filteredCategoryProducts.map(p => (
                    <ProductCard 
                      key={p.id} 
                      product={{ ...p, likesCount: getLikesCount(p) }} 
                      onClick={() => setSelectedProduct(p)} 
                      favorite={favorites.includes(p.id)}
                      onFavorite={(e) => toggleFavorite(p.id, e)}
                      onBuy={(e) => { e.stopPropagation(); startConversation(p); }}
                      sellerProfile={getSellerProfile(allUsersProfiles[p.sellerId] || globalUserProfileCache[p.sellerId])}
                    />
                  ))}
                  {filteredCategoryProducts.length === 0 && (
                    <div className="col-span-full py-20 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs">
                      <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-10" />
                      Aucun article correspondant dans cette rubrique
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })()}

          {activeTab === 'favorites' && (
            <motion.div 
              key="favorites"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-10 flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
            >
              <div className="w-24 h-24 rounded-[2.5rem] bg-orange-500/10 flex items-center justify-center text-orange-600 mb-6 shadow-[0_20px_40px_rgba(249,115,22,0.1)] relative">
                <Heart size={44} className="animate-pulse fill-orange-500/10 text-orange-600" />
                <div className="absolute top-0 right-0 w-4 h-4 bg-orange-500 rounded-full border-4 border-white animate-bounce" />
              </div>
              <h2 className="text-3xl font-black tracking-tight text-zinc-950 uppercase italic mb-3">
                Mes Favoris
              </h2>
              <p className="text-zinc-500 text-sm max-w-xs mx-auto leading-relaxed mb-8">
                Conservez tous les articles qui vous font vibrer dans cette rubrique dédiée pour y accéder à tout moment.
              </p>
              
              <div className="inline-flex items-center gap-2 px-6 py-3.5 bg-zinc-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-zinc-950/20 active:scale-95 transition-all">
                <span>✨ Bientôt disponible</span>
              </div>
            </motion.div>
          )}

          {activeTab === 'sell' && (
            <motion.div 
              key="sell"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-6"
            >
              <SellScreen 
                onComplete={() => { setActiveTab('home'); setEditingProduct(null); }} 
                user={user} 
                initialProduct={editingProduct}
              />
            </motion.div>
          )}

          {activeTab === 'messages' && (
             <motion.div 
              key="messages"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="py-6 space-y-6 h-full flex flex-col"
            >
              <header className="shrink-0">
                <h2 className="text-3xl font-black tracking-tighter">MESSAGES</h2>
                <div className="h-1.5 w-12 bg-orange-600 rounded-full mt-1" />
              </header>

              <div className="flex-1 overflow-hidden">
                {activeConversationId ? (
                  <ChatWindow 
                    conversationId={activeConversationId} 
                    user={user} 
                    profile={profile}
                    products={products}
                    onBack={() => setActiveConversationId(null)} 
                    onPreviewImage={setPreviewImage}
                  />
                ) : (
                  <div className="space-y-4 h-full overflow-y-auto no-scrollbar pb-32">
                    {conversations.length === 0 ? (
                      <div className="p-10 bg-white rounded-[2rem] border border-zinc-100 flex flex-col items-center text-center gap-4">
                        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-200">
                          <MessageCircle className="w-8 h-8" />
                        </div>
                        <div>
                          <h3 className="font-bold">Silencieux ici...</h3>
                          <p className="text-xs text-zinc-400 max-w-[200px] mx-auto mt-1">Trouvez un objet et commencez à troquer pour voir vos discussions ici.</p>
                        </div>
                        <Button variant="outline" className="text-xs px-6" onClick={() => setActiveTab('home')}>Parcourir</Button>
                      </div>
                    ) : (
                      conversations.map(conv => {
                        const unreadCount = unreadPerConversation[conv.id] || 0;
                        const isSelected = selectedMessages.includes(conv.id);
                        return (
                        <div key={conv.id} className="relative">
                          {isMessagesEditMode && (
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isSelected) {
                                    setSelectedMessages(prev => prev.filter(id => id !== conv.id));
                                  } else {
                                    setSelectedMessages(prev => [...prev, conv.id]);
                                  }
                                }}
                                className={cn(
                                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                  isSelected ? "bg-orange-600 border-orange-600 text-white" : "border-zinc-300 bg-white"
                                )}
                              >
                                {isSelected && <Check size={14} strokeWidth={3} />}
                              </button>
                            </div>
                          )}
                          <div 
                            onPointerDown={(e) => handleConvPeekStart(conv.id, e)}
                            onPointerUp={clearPeekTimers}
                            onPointerLeave={clearPeekTimers}
                            onPointerCancel={clearPeekTimers}
                            onClick={() => {
                              if (isMessagesEditMode) {
                                if (isSelected) {
                                  setSelectedMessages(prev => prev.filter(id => id !== conv.id));
                                } else {
                                  setSelectedMessages(prev => [...prev, conv.id]);
                                }
                              } else {
                                setActiveConversationId(conv.id);
                              }
                            }}
                            className={cn(
                              "p-5 bg-white rounded-[2rem] border transition-all flex items-center gap-4 group relative",
                              isSelected ? "ring-2 ring-orange-600 bg-orange-50 border-orange-200" : "border-zinc-100 shadow-sm hover:border-orange-200 hover:shadow-lg",
                              isMessagesEditMode ? "pl-14 cursor-pointer" : "cursor-pointer"
                            )}
                          >
                          <AnimatePresence>
                            {peekedConversationId === conv.id && (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 bg-black/10 backdrop-blur-[40px] backdrop-saturate-[180%]"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="max-w-sm w-full flex flex-col gap-4 items-center">
                                  <motion.div 
                                    initial={{ scale: 0.8, opacity: 0, y: 30 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.8, opacity: 0, y: 30 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    className="w-full bg-white/60 backdrop-blur-[40px] p-6 rounded-[2rem] text-zinc-900 shadow-[0_32px_120px_-20px_rgba(0,0,0,0.3)] border border-white/50"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center gap-4">
                                      <ConversationRecipientAvatar participantNames={conv.participantNames} participantIds={conv.participantIds} currentUser={user} />
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-lg truncate">
                                          {conv.participantNames?.find(n => n !== user?.displayName) || `Utilisateur ${conv.participantIds?.find(id => id !== user?.uid)?.slice(0,4)}`}
                                        </h4>
                                        <p className="text-sm font-semibold text-zinc-500 truncate">{conv.productTitle || 'Article'}</p>
                                      </div>
                                    </div>
                                  </motion.div>

                                  <motion.div
                                    initial={{ scale: 0.8, opacity: 0, y: -20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.8, opacity: 0, y: -20 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.1 }}
                                    className="bg-white/60 backdrop-blur-[40px] rounded-2xl w-full text-center overflow-hidden shadow-[0_16px_64px_rgba(0,0,0,0.15)] flex flex-col divide-y divide-zinc-200/50 border border-white/50"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <button 
                                      onClick={() => {
                                        safeConfirm("Supprimer cette discussion ?", async () => {
                                          // Optimistic delete
                                          setConversations(prev => prev.filter(c => c.id !== conv.id));
                                          const convCacheKey = `conversations_${user!.uid}`;
                                          if (globalDataCache[convCacheKey] !== undefined) {
                                            globalDataCache[convCacheKey] = globalDataCache[convCacheKey].filter((c: any) => c.id !== conv.id);
                                          }
                                          handleConvPeekEnd();
                                          try {
                                            await deleteDoc(doc(db, 'conversations', conv.id));
                                          } catch (err) {
                                            handleFirestoreError(err, OperationType.DELETE, `conversations/${conv.id}`);
                                          }
                                        });
                                      }}
                                      className="flex items-center justify-center w-full px-5 py-4 text-red-600 active:bg-black/5 transition-colors font-semibold text-[15px] border-b border-zinc-200/50"
                                    >
                                      Supprimer la conversation
                                    </button>
                                    <button 
                                      onClick={handleConvPeekEnd}
                                      className="flex items-center justify-center w-full px-5 py-4 text-zinc-900 active:bg-black/5 transition-colors font-semibold text-[15px]"
                                    >
                                      Annuler
                                    </button>
                                  </motion.div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <ConversationRecipientAvatar participantNames={conv.participantNames} participantIds={conv.participantIds} currentUser={user} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-black text-[10px] uppercase tracking-tighter text-zinc-400 truncate max-w-[150px]">
                                {conv.productTitle || 'Article'}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] text-zinc-300 font-bold uppercase">
                                  {conv.updatedAt?.seconds 
                                    ? new Date(conv.updatedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : '...'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <ConversationRecipientName participantNames={conv.participantNames} participantIds={conv.participantIds} currentUser={user} />
                              {unreadCount > 0 && (
                                <motion.div 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="min-w-[1.25rem] h-5 bg-orange-600 rounded-full flex items-center justify-center px-1.5 shadow-lg shadow-orange-600/30"
                                >
                                  <span className="text-[10px] font-black text-white">{unreadCount}</span>
                                </motion.div>
                              )}
                            </div>
                            <div className={cn("text-xs truncate", unreadCount > 0 ? "text-zinc-950 font-bold" : "text-zinc-400")}>{conv.lastMessage}</div>
                          </div>
                        </div>
                        </div>
                      );})
                    )
                  }
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
             <motion.div 
              key="profile"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 space-y-8"
            >
              {!user ? (
                 <div className="py-20 text-center space-y-8">
                   <div className="w-24 h-24 bg-orange-100 text-orange-600 rounded-[3rem] flex items-center justify-center mx-auto shadow-xl shadow-orange-600/10 active:scale-95 transition-all">
                     <UserIcon size={40} strokeWidth={2.5} />
                   </div>
                   <div className="space-y-3">
                     <h2 className="text-3xl font-black italic tracking-tighter uppercase text-zinc-900">REJOIGNEZ-NOUS</h2>
                     <p className="text-sm font-bold text-zinc-400 px-6 leading-relaxed uppercase tracking-widest text-[10px]">Créez un compte pour vendre, troquer <br/> et discuter avec la communauté.</p>
                   </div>
                   <div className="flex flex-col gap-3 px-10">
                     <Button variant="primary" className="py-4 uppercase tracking-widest text-xs font-black" onClick={() => { setAuthMode('signup'); setActiveTab('auth'); }}>S'inscrire</Button>
                     <Button variant="outline" className="py-4 uppercase tracking-widest text-xs font-black border-zinc-200" onClick={() => { setAuthMode('login'); setActiveTab('auth'); }}>Déjà un compte ?</Button>
                   </div>
                 </div>
              ) : profileView === 'main' ? (
                <>
                  <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-xl shadow-zinc-200/50 overflow-hidden space-y-6">
                    {/* Cover Banner */}
                    <div className="h-32 bg-zinc-100 relative overflow-hidden">
                      {profile?.coverURL ? (
                        <img src={profile.coverURL} className="w-full h-full object-cover" alt="Couverture" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-orange-400/20 to-orange-600/20 flex items-center justify-center">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600/40">TrocShop Lounge</span>
                        </div>
                      )}
                    </div>

                    <div className="px-8 pb-8 -mt-14 relative z-10 space-y-6">
                      <div className="flex items-end justify-between">
                        {profile?.photoURL || user?.photoURL ? (
                          <img src={profile?.photoURL || user?.photoURL} className="w-20 h-20 rounded-[2rem] border-4 border-white shadow-md object-cover relative bg-white" alt="Me" />
                        ) : (
                          <div className="w-20 h-20 rounded-[2rem] border-4 border-white shadow-md bg-orange-100 flex items-center justify-center text-orange-600 text-2xl font-black uppercase relative z-10">
                             {user?.displayName?.[0] || 'U'}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <div className="flex flex-col items-center px-4 py-2 bg-zinc-50 rounded-2xl cursor-pointer" onClick={() => setProfileView('listings')}>
                            <span className="font-black text-lg">{products.filter(p => p.sellerId === user?.uid).length}</span>
                            <span className="text-[8px] font-black uppercase text-zinc-400">Annonces</span>
                          </div>
                          <div className="flex flex-col items-center px-4 py-2 bg-zinc-50 rounded-2xl cursor-pointer" onClick={() => setProfileView('favorites')}>
                            <span className="font-black text-lg">
                              {favorites.length > 0 && products.length === 0
                                ? favorites.length
                                : favorites.filter(pId => products.some(p => p.id === pId)).length}
                            </span>
                            <span className="text-[8px] font-black uppercase text-zinc-400">Favoris</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col items-start gap-1.5">
                          <h2 className="text-2xl font-black tracking-tighter leading-none truncate">{user?.displayName}</h2>
                          <div className="flex flex-col items-start gap-1.5">
                            {(() => {
                              const isCertified = (profile?.is_certified as any) === true || (profile?.is_certified as any) === 'vrai' || (profile?.isCertified as any) === true || (profile?.isCertified as any) === 'vrai' || (profile?.['is certified'] as any) === true || (profile?.['is certified'] as any) === 'vrai' || (profile?.badges as string[])?.some(b => b?.toLowerCase().includes('certif'));
                              const isVerified = profile?.isVerified;
                              const isPartner = isPartnerUser(profile);
                              return (
                                <>
                                  {isPartner && (
                                    <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-3 py-1 rounded-xl text-[9px] font-black tracking-widest text-white shrink-0 shadow-md shadow-emerald-600/15 flex items-center gap-1 leading-none uppercase h-5">
                                      <Shield size={12} className="fill-white/20 select-none shrink-0" />
                                      Partenaire
                                    </div>
                                  )}
                                  {isCertified && (
                                    <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1 rounded-xl text-[9px] font-black tracking-widest text-white shrink-0 shadow-md shadow-orange-600/15 flex items-center gap-1 leading-none uppercase h-5">
                                      <BadgeCheck size={12} className="fill-white/20 select-none shrink-0" />
                                      Certifié
                                    </div>
                                  )}
                                  {isVerified && !isCertified && (
                                    <div className="bg-gradient-to-r from-blue-500 to-sky-600 px-3 py-1 rounded-xl text-[9px] font-black tracking-widest text-white shrink-0 shadow-md shadow-blue-600/15 flex items-center gap-1 leading-none uppercase h-5">
                                      <Check size={12} strokeWidth={4} className="shrink-0" />
                                      Vérifié
                                    </div>
                                  )}
                                  {profile?.isStudent && (
                                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1 rounded-xl text-[9px] font-black tracking-widest text-white shrink-0 shadow-md shadow-emerald-600/15 flex items-center gap-1.5 leading-none uppercase h-5">
                                      <span className="text-xs shrink-0 select-none">🎓</span>
                                      <span>{profile.studentSchool || 'Campus'}</span>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                           <div className="flex items-center gap-1">
                             <Star size={12} className="text-orange-600 fill-orange-600" />
                             <span className="text-xs font-black">{privateRatingStats.count > 0 ? privateRatingStats.rating : (profile?.rating || 0)}</span>
                             <span className="text-[10px] text-zinc-400 font-bold">({privateRatingStats.count > 0 ? privateRatingStats.count : (profile?.reviewCount || 0)} avis)</span>
                           </div>
                           <div className="h-3 w-px bg-zinc-200" />
                           <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">{profile?.city || 'Yamoussoukro'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {profile?.badges && filterUserBadges(profile.badges, profile.createdAt).filter(b => !b.toLowerCase().includes('certif')).length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Récompenses & Badges</h4>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                          {filterUserBadges(profile.badges, profile.createdAt).filter(b => !b.toLowerCase().includes('certif')).map(badge => (
                            <div key={badge} className="px-4 py-3 bg-zinc-50 text-[10px] font-black uppercase text-zinc-600 rounded-2xl border border-zinc-100 shadow-sm flex items-center gap-2 shrink-0">
                              <div className="w-5 h-5 bg-orange-600 rounded-lg flex items-center justify-center text-white">
                                <Star size={10} />
                              </div>
                              {badge}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <p className="text-zinc-500 text-sm leading-relaxed italic px-4 py-3 bg-zinc-50 rounded-2xl border border-zinc-100 border-dashed">"{profile?.bio}"</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-2 mt-4">Mon Espace</h4>
                    <Button variant="outline" className="w-full justify-between p-5 bg-white border-none shadow-sm" onClick={() => setProfileView('listings')}>
                      <div className="flex items-center gap-3">
                        <Tag className="w-5 h-5 text-orange-600" />
                        <span className="font-bold">Mes Annonces</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-300" />
                    </Button>
                    {/* MASKED FAVORITES
                    <Button variant="outline" className="w-full justify-between p-5 bg-white border-none shadow-sm" onClick={() => setProfileView('favorites')}>
                      <div className="flex items-center gap-3">
                        <Heart className="w-5 h-5 text-orange-600" />
                        <span className="font-bold">Mes Favoris</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-300" />
                    </Button>
                    */}

                     <Button variant="outline" className="w-full justify-between p-5 bg-white border-none shadow-sm cursor-pointer hover:bg-zinc-50" onClick={() => setProfileView('security')}>
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-orange-600 fill-orange-650/10" />
                        <span className="font-bold">Centre de sécurité TrocShop</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-300" />
                    </Button>

                    <Button variant="outline" className="w-full justify-between p-5 bg-white border-none shadow-sm" onClick={() => setProfileView('settings')}>
                      <div className="flex items-center gap-3">
                        <SettingsIcon className="w-5 h-5 text-zinc-400" />
                        <span className="font-bold">Paramètres Profil</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-300" />
                    </Button>

                    <Button 
                      variant="outline" 
                      className="w-full justify-between p-5 bg-white border-none shadow-sm" 
                      onClick={async () => {
                        const shareUrl = "https://troc-shop-store.vercel.app/";
                        const isCapacitor = !!(window as any).Capacitor;
                        if (isCapacitor) {
                          try {
                            await CapacitorShare.share({
                              title: "TrocShop",
                              text: "Découvrez TrocShop, l'application de troc entre particuliers !",
                              url: shareUrl,
                              dialogTitle: "Partager l'application",
                            });
                            return;
                          } catch (err) {
                            console.log("Capacitor Share failed", err);
                          }
                        }

                        // Web context (or Capacitor fallback)
                        if (navigator.share) {
                          try {
                            await navigator.share({
                              title: "TrocShop",
                              text: "Découvrez TrocShop, l'application de troc entre particuliers !",
                              url: shareUrl
                            });
                          } catch (e) {
                            console.warn("navigator.share failed or blocked (e.g. inside iframe), falling back to clipboard:", e);
                            const success = await safeCopyToClipboard(shareUrl);
                            if (success) {
                              toast.success("Lien de l'application copié !");
                            } else {
                              toast.error("Impossible de copier le lien automatiquement. Vous pouvez copier : " + shareUrl);
                            }
                          }
                        } else {
                          const success = await safeCopyToClipboard(shareUrl);
                          if (success) {
                            toast.success("Lien de l'application copié dans le presse-papiers !");
                          } else {
                            toast.error("Impossible de copier le lien automatiquement. Vous pouvez copier : " + shareUrl);
                          }
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Share className="w-5 h-5 text-orange-600" />
                        <span className="font-bold">Partager l'application</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-300" />
                    </Button>

                    <Button 
                      variant="outline" 
                      className="w-full justify-between p-5 bg-white border-none shadow-sm cursor-pointer hover:bg-zinc-50" 
                      onClick={() => {
                        window.open("https://wa.me/2250160232164?text=Bonjour%20TrocShop,%20je%20souhaite%20signaler%20un%20bug%20ou%20sugg%C3%A9rer%20une%20am%C3%A9lioration%20:%20", "_blank");
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 flex items-center justify-center shrink-0">
                          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#25D366] text-[#25D366] shrink-0" xmlns="http://www.w3.org/2000/svg">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.729-1.45L0 24zm6.59-4.846c1.6.95 3.1 1.4 4.8 1.4 5.3 0 9.7-4.3 9.7-9.7 0-2.6-1-5-2.8-6.8-1.8-1.8-4.2-2.8-6.8-2.8-5.3 0-9.7 4.3-9.7 9.7 0 1.9.5 3.8 1.5 5.4l-.9 3.5 3.6-.9zM17.5 14.9c-.3-.2-1.7-1-1.9-1.1-.3-.1-.5-.1-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.2-.4-2.2-1.4-.8-.7-1.3-1.6-1.5-1.9-.2-.3-.02-.5.1-.6.1-.1.3-.3.4-.5.1-.2 0-.3-.05-.5-.1-.2-.7-1.7-1-2.4-.3-.7-.6-.6-.8-.6-.2 0-.4 0-.6 0-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7 0 1.6 1.2 3.2 1.3 3.4.1.2 2.4 3.7 5.9 5.2.8.3 1.5.6 2 .7.9.3 1.7.2 2.3.1.7-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.3-.1-.3-.3-.4-.6-.5z"/>
                          </svg>
                        </span>
                        <span className="font-bold">Rapporter un bug / Amélioration</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-300" />
                    </Button>

                    <div className="p-5 bg-white rounded-3xl shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                          profile?.notificationsEnabled !== false ? "bg-orange-100 text-orange-600" : "bg-zinc-100 text-zinc-400"
                        )}>
                          <Bell size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-zinc-900 leading-tight">Notifications</p>
                          <p className="text-[10px] text-zinc-400 font-bold">Alertes temps réel</p>
                        </div>
                      </div>
                      <button 
                        onClick={async () => {
                          const newVal = profile?.notificationsEnabled === false;
                          if (newVal && 'Notification' in window) {
                            Notification.requestPermission();
                          }
                          if (user) {
                            try {
                              await updateDoc(doc(db, 'users', user.uid), { notificationsEnabled: newVal });
                              setProfile(prev => prev ? { ...prev, notificationsEnabled: newVal } : null);
                            } catch (e: any) {
                              console.error("Failed to update notification settings:", e?.message || String(e));
                            }
                          }
                        }}
                        className={cn(
                          "w-12 h-6 rounded-full p-1 transition-all duration-300",
                          profile?.notificationsEnabled !== false ? "bg-orange-600" : "bg-zinc-200"
                        )}
                      >
                        <motion.div 
                          animate={{ x: profile?.notificationsEnabled !== false ? 24 : 0 }}
                          className="w-4 h-4 bg-white rounded-full shadow-sm"
                        />
                      </button>
                    </div>

                    <Button variant="ghost" className="w-full text-red-500 hover:bg-red-50 flex items-center justify-center gap-2 mt-4 font-black uppercase text-[10px] tracking-widest py-4" onClick={handleLogout}>
                      <LogOut className="w-4 h-4" />
                      <span>Déconnexion</span>
                    </Button>
                  </div>
                </>
              ) : profileView === 'security' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <header className="flex items-center gap-4">
                    <button onClick={() => setProfileView('main')} className="p-3 bg-white border border-zinc-100 rounded-2xl hover:bg-zinc-50 active:scale-95 transition-all">
                      <ArrowLeft className="w-5 h-5 text-zinc-900" />
                    </button>
                    <h2 className="text-xl font-black uppercase tracking-tighter">
                      Centre de sécurité
                    </h2>
                  </header>

                  <div className="bg-white p-6 rounded-[2.5rem] border border-zinc-100 shadow-xl shadow-zinc-200/40 space-y-6 text-zinc-800">
                    <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
                      <div className="w-12 h-12 rounded-[1.2rem] bg-orange-50 text-orange-600 flex items-center justify-center">
                        <Shield className="w-6 h-6 fill-orange-600/10" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Votre sécurité avant tout</p>
                        <p className="text-sm font-black uppercase tracking-tight text-zinc-900">Charte de confiance TrocShop</p>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-700 leading-relaxed font-bold">
                      Votre sécurité est notre priorité absolue. Pour éviter les mauvaises surprises et faire de bonnes affaires en toute confiance, voici les règles d’or à respecter sur l’application.
                    </p>

                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 text-xs font-black flex items-center justify-center">1</span>
                        Ventes locales à Yamoussoukro : Les 3 règles d’or
                      </h4>
                      
                      <div className="pl-8 space-y-4 text-xs text-zinc-650 leading-relaxed">
                        <p className="font-semibold">Pour tous les vendeurs classiques de la ville, appliquez strictement ces consignes :</p>
                        
                        <div className="space-y-3">
                          <div className="flex gap-2.5 items-start">
                            <span className="text-base select-none shrink-0">❌</span>
                            <div>
                              <strong className="text-zinc-900 font-extrabold uppercase text-[10px] tracking-wider block mb-0.5">Pas de paiement à l'avance</strong>
                              Ne donnez jamais d'argent (ni espèces, ni Mobile Money) avant d'avoir vu, touché et vérifié le produit de vos propres yeux. Le paiement ou le troc effectif se fait uniquement au moment de la remise en main propre.
                            </div>
                          </div>
                          
                          <div className="flex gap-2.5 items-start">
                            <span className="text-base select-none shrink-0">📍</span>
                            <div>
                              <strong className="text-zinc-900 font-extrabold uppercase text-[10px] tracking-wider block mb-0.5">Rendez-vous dans des lieux publics</strong>
                              Ne fixez jamais de rendez-vous dans des endroits isolés, sombres ou privés. Choisissez toujours des milieux animés, sécurisés et très fréquentés (campus de l'INPHB, grandes gares routières, grands carrefours).
                            </div>
                          </div>
                          
                          <div className="flex gap-2.5 items-start">
                            <span className="text-base select-none shrink-0">🔒</span>
                            <div>
                              <strong className="text-zinc-900 font-extrabold uppercase text-[10px] tracking-wider block mb-0.5">Gardez vos informations secrètes</strong>
                              Ne partagez jamais vos mots de passe, vos codes secrets secrets Mobile Money ou vos coordonnées de carte bancaire dans la messagerie. L'équipe TrocShop ne vous demandera jamais un code confidentiel.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-zinc-150 pt-5">
                      <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight flex items-center gap-2 flex-wrap">
                        <span className="w-6 h-6 rounded-lg bg-green-100 text-green-700 text-xs font-black flex items-center justify-center">2</span>
                        L'exception : Les Fournisseurs Directs (Abidjan)
                      </h4>
                      
                      <div className="pl-8 space-y-3 text-xs text-zinc-650 leading-relaxed">
                        <p className="font-semibold">
                          Certaines grandes entreprises de confiance basées à Abidjan publient leurs offres sur TrocShop. Elles sont les seules autorisées à déroger à la règle :
                        </p>
                        
                        <div className="space-y-3">
                          <p>
                            <strong className="text-zinc-900 font-extrabold uppercase text-[10px] tracking-wider block mb-0.5">Le Badge Bouclier (🛡️)</strong>
                            Ces partenaires officiels certifiés sont directement identifiables grâce à un badge en forme de bouclier vert affiché sur leur profil et leurs produits.
                          </p>
                          
                          <p>
                            <strong className="text-zinc-900 font-extrabold uppercase text-[10px] tracking-wider block mb-0.5">Le paiement à l'avance autorisé</strong>
                            L'équipe TrocShop a contrôlé de manière rigoureuse l'identité, l'adresse physique et la moralité professionnelle de ces entreprises. Vous pouvez leur payer à l'avance par Mobile Money en toute sécurité.
                          </p>
                          
                          <p>
                            <strong className="text-zinc-900 font-extrabold uppercase text-[10px] tracking-wider block mb-0.5 font-sans">Livraison gratuite assurée</strong>
                            TrocShop gère personnellement et gratuitement le transport de l'article depuis Abidjan jusqu'à votre point de retrait à Yamoussoukro, assurant ainsi une livraison 100 % garantie.
                          </p>
                        </div>

                        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-2.5 mt-4">
                          <span className="text-base select-none shrink-0">⚠️</span>
                          <p className="text-[11px] text-red-800 font-bold leading-normal">
                            Attention : Si un vendeur classique n'ayant pas le badge de bouclier vert 🛡️ sur son profil vous demande quoi que ce soit d'autre qu'une remise en main propre, refusez immédiatement et signalez-le à l'équipe. Tout compte coupable de tentative de fraude sera banni définitivement.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : profileView === 'settings' ? (
                 profile && <ProfileSettings 
                    profile={profile} 
                    onBack={() => setProfileView('main')} 
                    onSave={async (newData) => {
                       if (!user) return;
                       const userRef = doc(db, 'users', user.uid);
                       try {
                         await updateDoc(userRef, newData);
                         setProfile(prev => prev ? { ...prev, ...newData } : null);
                       } catch (e: any) {
                         console.error("Profile update failed:", e?.message || String(e));
                         alert("Impossible d'enregistrer les modifications du profil. Veuillez réessayer.");
                       }
                    }}
                 />
              ) : (
                <div className="space-y-6">
                  <header className="flex items-center gap-4">
                    <button onClick={() => setProfileView('main')} className="p-3 bg-white border border-zinc-100 rounded-2xl">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-2xl font-black uppercase tracking-tighter">
                      {profileView === 'listings' ? 'MES ANNONCES' : 'MES FAVORIS'}
                    </h2>
                  </header>
                  <div className="grid grid-cols-2 gap-4">
                    {(profileView === 'listings' 
                      ? products.filter(p => p.sellerId === user?.uid)
                      : products.filter(p => favorites.includes(p.id))
                    ).map(p => (
                      <div key={p.id} className="relative group">
                        <ProductCard 
                          product={{ ...p, likesCount: getLikesCount(p) }} 
                          onClick={() => setSelectedProduct(p)} 
                          favorite={favorites.includes(p.id)}
                          onFavorite={(e) => toggleFavorite(p.id, e)}
                          onBuy={(e) => { e.stopPropagation(); startConversation(p); }}
                          isOwner={p.sellerId === user?.uid}
                          sellerProfile={getSellerProfile(allUsersProfiles[p.sellerId] || globalUserProfileCache[p.sellerId])}
                        />
                        {profileView === 'listings' && (
                          <div className="absolute top-2 left-2 flex gap-2 z-20">
                              <button 
                                onClick={(e) => handleDeleteProduct(p.id, e)}
                                className="p-3 bg-red-600 text-white rounded-2xl shadow-xl active:scale-75 transition-all border border-red-500"
                              >
                                <Trash2 size={16} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingProduct(p);
                                  setActiveTab('sell');
                                }}
                                className="p-3 bg-zinc-900 text-white rounded-2xl shadow-xl active:scale-75 transition-all border border-zinc-700"
                              >
                                <SettingsIcon size={16} />
                              </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {(profileView === 'listings' ? products.filter(p => p.sellerId === user?.uid) : products.filter(p => favorites.includes(p.id))).length === 0 && (
                      <div className="col-span-2 py-20 text-center text-zinc-300">
                        <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-10" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Rien à afficher ici</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed md:absolute bottom-28 left-6 right-6 md:left-6 md:right-6 md:w-auto z-[99] bg-white text-zinc-900 p-4 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-zinc-150 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <img 
                src="/icon.jpg" 
                alt="TrocShop Logo" 
                className="w-12 h-12 rounded-2xl object-cover border border-zinc-100 shadow-sm shrink-0" 
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">TrocShop</p>
                <p className="text-xs font-bold text-zinc-900 truncate">Installer l'application</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <Button 
                onClick={handleInstallClick}
                className="bg-orange-600 text-white font-black uppercase text-[10px] tracking-widest px-4 py-2.5 rounded-xl border border-orange-500 hover:bg-orange-700 transition-all shadow-md active:scale-95"
              >
                Installer
              </Button>
              <button 
                onClick={() => setShowInstallBanner(false)}
                className="text-zinc-400 hover:text-zinc-650 p-1.5 hover:bg-zinc-100/50 rounded-full transition-colors shrink-0"
                title="Ignorer"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav */}
      {activeTab !== 'auth' && (
        <nav className={cn(
          "fixed md:absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom,16px))] md:bottom-6 left-6 right-6 z-[100] h-20 transition-all duration-300",
          (activeConversationId || isNavHidden || activeTab === 'notifications' || (false)) ? "translate-y-32 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
        )}>
          <div className="h-full bg-white/40 backdrop-blur-[40px] backdrop-saturate-[180%] border border-white/50 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] px-6 flex items-center justify-around relative overflow-visible">
            
            {/* Spotlight / Limelight Reflector */}
            <div 
              ref={bottomLimelightRef}
              className={cn(
                "absolute top-0 z-10 w-12 h-[4px] rounded-full bg-orange-600 shadow-[0_45px_15px_rgba(234,88,12,0.45)]",
                isBottomLimelightReady ? 'transition-[left] duration-300 ease-in-out' : ''
              )}
              style={{ left: '-999px', opacity: 0 }}
            >
              {/* Downward shining spotlight rays */}
              <div className="absolute left-[-40%] top-[4px] w-[180%] h-14 [clip-path:polygon(10%_100%,30%_0,70%_0,90%_100%)] bg-gradient-to-b from-orange-600/25 to-transparent pointer-events-none animate-pulse" />
            </div>

            <div ref={el => { bottomNavItemRefs.current[0] = el }} className="relative z-20 flex-1 flex justify-center">
              <NavButton active={activeTab === 'home'} onClick={() => { setActiveTab('home'); setActiveConversationId(null); setSelectedSellerId(null); setPreviousProduct(null); }} icon={<HomeIcon size={24} />} />
            </div>

            <div ref={el => { bottomNavItemRefs.current[1] = el }} className="relative z-20 flex-1 flex justify-center">
              <NavButton active={activeTab === 'search'} onClick={() => { setActiveTab('search'); setActiveConversationId(null); setSelectedSellerId(null); setPreviousProduct(null); }} icon={<Search size={24} />} />
            </div>

            <div ref={el => { bottomNavItemRefs.current[2] = el }} className="relative z-20 flex-1 flex justify-center">
              <div className="relative">
                 <button 
                  onClick={() => {
                    if (!user) {
                      setAuthMode('login');
                      setActiveTab('auth');
                    } else {
                      setActiveTab('sell');
                      setActiveConversationId(null);
                      setSelectedSellerId(null);
                      setPreviousProduct(null);
                    }
                  }}
                  className={cn(
                    "w-16 h-16 bg-orange-600 text-white rounded-[1.8rem] flex items-center justify-center -translate-y-10 shadow-2xl shadow-orange-600/50 active:scale-95 transition-all border-4 border-white group",
                    activeTab === 'sell' ? "scale-105 shadow-orange-600/80 border-orange-50" : ""
                  )}
                >
                  <Plus size={32} className="group-hover:rotate-90 transition-transform duration-500" />
                </button>
              </div>
            </div>

            <div ref={el => { bottomNavItemRefs.current[3] = el }} className="relative z-20 flex-1 flex justify-center">
              <NavButton 
                active={activeTab === 'favorites'} 
                onClick={() => { setActiveTab('favorites'); setActiveConversationId(null); setSelectedSellerId(null); setPreviousProduct(null); }} 
                icon={<Heart size={24} />} 
                count={user ? favorites.length : 0}
              />
            </div>

            <div ref={el => { bottomNavItemRefs.current[4] = el }} className="relative z-20 flex-1 flex justify-center font-bold">
              <NavButton 
                active={activeTab === 'messages'} 
                onClick={() => {
                   if (!user) {
                     setAuthMode('login');
                     setActiveTab('auth');
                   } else {
                     setActiveTab('messages');
                     setActiveConversationId(null);
                     setSelectedSellerId(null);
                     setPreviousProduct(null);
                   }
                }} 
                icon={<MessageCircle size={24} />} 
                count={unreadMessages}
              />
            </div>
          </div>
        </nav>
      )}

      {/* Auth required warning Modal */}
      <AnimatePresence>
        {authRequiredMessage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed md:absolute inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl border border-zinc-100"
            >
              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <UserIcon size={30} className="stroke-[2.5]" />
              </div>
              <div className="space-y-2">
                <h3 className="font-black text-2xl tracking-tighter uppercase text-zinc-900 leading-none">Connexion requise</h3>
                <div className="h-1 w-12 bg-orange-600 mx-auto rounded-full" />
              </div>
              <p className="text-zinc-600 text-sm font-semibold leading-relaxed">
                {authRequiredMessage}
              </p>
              
              <div className="flex flex-col gap-3 pt-2">
                <button 
                  onClick={redirectToLogin}
                  className="w-full h-12 bg-orange-600 rounded-2xl text-white font-black text-xs uppercase tracking-widest hover:bg-orange-700 active:scale-95 transition-all flex items-center justify-center shadow-xl shadow-orange-600/20"
                >
                  Se connecter
                </button>
                <button 
                  onClick={redirectToSignup}
                  className="w-full h-12 bg-white border-2 border-orange-600 rounded-2xl text-orange-600 font-black text-xs uppercase tracking-widest hover:bg-orange-50 active:scale-95 transition-all flex items-center justify-center shadow-sm"
                >
                  S'inscrire
                </button>
                <button 
                  onClick={cancelAuthRequired}
                  className="w-full py-2 text-zinc-400 font-bold text-[10px] uppercase tracking-widest hover:text-zinc-600 transition-colors"
                >
                  Plus tard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Version Checker Update Modal */}
      <AnimatePresence>
        {showVersionModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed md:absolute inset-0 z-[210] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl border border-zinc-100"
            >
              <div className="px-6 py-3 bg-orange-50 text-orange-600 rounded-2xl inline-flex items-center justify-center mx-auto shadow-sm animate-pulse font-black text-xs uppercase tracking-widest leading-none border border-orange-100">
                Ekip TrocShop
              </div>
              <div className="space-y-2">
                <h3 className="font-black text-2xl tracking-tighter uppercase text-zinc-900 leading-none">Mise à jour disponible</h3>
                <div className="h-1 w-12 bg-orange-600 mx-auto rounded-full" />
              </div>
              <p className="text-zinc-600 text-sm font-semibold leading-relaxed">
                Une nouvelle version de l'application est disponible <span className="text-orange-600 font-bold">(v{serverVersion})</span>. Mettez-la à jour pour profiter de toutes les nouveautés !
              </p>
              <div className="space-y-3 pt-2">
                <button 
                  onClick={() => {
                    window.open(updateDownloadUrl, '_blank');
                  }}
                  className="w-full h-12 bg-orange-600 rounded-2xl text-white font-black text-xs uppercase tracking-widest hover:bg-orange-700 active:scale-95 transition-all flex items-center justify-center shadow-xl shadow-orange-600/20"
                >
                  Mettre à jour
                </button>
                <button 
                  onClick={() => setShowVersionModal(false)}
                  className="w-full h-12 bg-zinc-100 hover:bg-zinc-200 active:scale-95 rounded-2xl text-zinc-500 font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center"
                >
                  Plus tard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductSheet 
            product={{ ...selectedProduct, likesCount: getLikesCount(selectedProduct) }} 
            onClose={() => setSelectedProduct(null)} 
            user={user} 
            onContact={() => startConversation(selectedProduct)} 
            onExchange={() => {
              if (!user) {
                triggerAuthRequired("Pour proposer un troc sur cet article, vous devez d'abord vous connecter ou créer un compte.");
              } else {
                setShowExchangePicker(true);
              }
            }}
            favorite={favorites.includes(selectedProduct.id)}
            onFavorite={() => toggleFavorite(selectedProduct.id)}
            onMarkAsSold={handleMarkAsSold}
            onSellerClick={(id) => { 
              if (!user) {
                triggerAuthRequired("Pour visiter le profil d'un autre membre, vous devez d'abord vous connecter ou créer un compte.");
                return;
              }
              setPreviousProduct(selectedProduct);
              setSelectedProduct(null); 
              if (id === user?.uid) {
                setActiveTab('profile');
              } else {
                setSelectedSellerId(id); 
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExchangePicker && selectedProduct && (
          <ExchangePicker 
            myProducts={products.filter(p => p.sellerId === user?.uid)}
            targetProduct={selectedProduct}
            onSelect={(ids, priceAdj) => handleProposeExchange(selectedProduct, ids, priceAdj)}
            onClose={() => setShowExchangePicker(false)}
          />
        )}
      </AnimatePresence>
      
      {/* Public Profile View */}
      <AnimatePresence>
        {selectedSellerId && publicProfile && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed md:absolute inset-0 z-[60] bg-white overflow-y-auto no-scrollbar"
          >
            <div className="max-w-xl mx-auto px-6 py-12 pb-32">
                {/* Cover Photo Header */}
                <div className="relative h-40 bg-gradient-to-tr from-orange-400 to-orange-500 rounded-[2.5rem] overflow-hidden mb-8 border border-zinc-100 shadow-lg">
                  {publicProfile.coverURL ? (
                    <img src={publicProfile.coverURL} className="w-full h-full object-cover" alt="Couverture de boutique" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-25">
                      <ShoppingBag className="w-16 h-16 text-white" />
                    </div>
                  )}
                  <button 
                    onClick={() => {
                      setSelectedSellerId(null);
                      if (previousProduct) {
                        setSelectedProduct(previousProduct);
                        setPreviousProduct(null);
                      }
                    }} 
                    className="absolute top-4 left-4 p-3 bg-white/95 backdrop-blur-md text-zinc-900 rounded-2xl active:scale-75 transition-all shadow-md"
                  >
                    <ArrowLeft size={16} />
                  </button>
                </div>

                <div className="flex flex-col items-center text-center space-y-6 mb-12">
                  <div className="w-32 h-32 rounded-[2.5rem] bg-orange-100 flex items-center justify-center text-orange-600 text-4xl font-black italic shadow-2xl relative">
                    {publicProfile.photoURL ? <img src={publicProfile.photoURL} className="w-full h-full object-cover rounded-[2.5rem]" alt={publicProfile.displayName} /> : publicProfile.displayName[0]}
                    {(() => {
                      const isCert = (publicProfile.is_certified as any) === true || (publicProfile.is_certified as any) === 'vrai' || (publicProfile.isCertified as any) === true || (publicProfile.isCertified as any) === 'vrai' || (publicProfile['is certified'] as any) === true || (publicProfile['is certified'] as any) === 'vrai' || (publicProfile.badges as string[])?.some(b => b?.toLowerCase().includes('certif'));
                      const isVer = publicProfile.isVerified;
                      return (
                        <>
                          {isCert && (
                            <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full w-8 h-8 flex items-center justify-center text-white border-4 border-white shadow-md">
                              <BadgeCheck size={16} className="fill-white/20 select-none" />
                            </div>
                          )}
                          {isVer && !isCert && (
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white border-4 border-white shadow-md">
                              <Check size={16} strokeWidth={4} />
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div className="space-y-2 flex flex-col items-center">
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">{publicProfile.displayName}</h2>
                    <div className="flex flex-col items-center gap-2">
                      {(() => {
                        const isCert = (publicProfile.is_certified as any) === true || (publicProfile.is_certified as any) === 'vrai' || (publicProfile.isCertified as any) === true || (publicProfile.isCertified as any) === 'vrai' || (publicProfile['is certified'] as any) === true || (publicProfile['is certified'] as any) === 'vrai' || (publicProfile.badges as string[])?.some(b => b?.toLowerCase().includes('certif'));
                        const isVer = publicProfile.isVerified;
                        const isPartner = isPartnerUser(publicProfile);
                        return (
                          <>
                            {isPartner && (
                              <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-3 py-1 rounded-xl text-[9px] font-black tracking-widest text-white shrink-0 shadow-md shadow-emerald-600/15 flex items-center gap-1 leading-none uppercase h-5">
                                <Shield size={12} className="fill-white/20 select-none shrink-0" />
                                Partenaire
                              </div>
                            )}
                            {isCert && (
                              <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1 rounded-xl text-[9px] font-black tracking-widest text-white shrink-0 shadow-md shadow-orange-600/15 flex items-center gap-1 leading-none uppercase h-5">
                                <BadgeCheck size={12} className="fill-white/20 select-none shrink-0" />
                                Certifié
                              </div>
                            )}
                            {isVer && !isCert && (
                              <div className="bg-gradient-to-r from-blue-500 to-sky-600 px-3 py-1 rounded-xl text-[9px] font-black tracking-widest text-white shrink-0 shadow-md shadow-blue-600/15 flex items-center gap-1 leading-none uppercase h-5">
                                <Check size={12} strokeWidth={4} className="shrink-0" />
                                Vérifié
                              </div>
                            )}
                            {publicProfile?.isStudent && (
                              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1 rounded-xl text-[9px] font-black tracking-widest text-white shrink-0 shadow-md shadow-emerald-600/15 flex items-center gap-1.5 leading-none uppercase h-5">
                                <span className="text-xs shrink-0 select-none">🎓</span>
                                <span>{publicProfile.studentSchool || 'Campus'}</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex items-center justify-center gap-4 text-zinc-400 font-bold text-xs uppercase tracking-widest">
                       <div className="flex items-center gap-1 text-zinc-700">
                          <MapPin size={14} className="text-orange-600" />
                          <span>Yamoussoukro</span>
                       </div>
                       <div className="w-1 h-1 bg-zinc-300 rounded-full" />
                       <div className="flex items-center gap-1">
                          <Star size={12} className="text-orange-500 fill-orange-500" />
                          <span className="text-zinc-800 font-black">{publicRatingStats.count > 0 ? publicRatingStats.rating : (publicProfile.rating || 0)}</span>
                          <span className="text-[10px] text-zinc-400 font-bold font-sans lowercase">({publicRatingStats.count > 0 ? publicRatingStats.count : (publicProfile.reviewCount || 0)} avis)</span>
                       </div>
                    </div>
                  </div>
                  <p className="text-zinc-500 font-medium max-w-md italic">"{publicProfile.bio || 'Passionné(e) de TrocShop !'}"</p>
                  
                  <div className="flex gap-2">
                    {filterUserBadges(publicProfile.badges, publicProfile.createdAt)?.filter(b => !b.toLowerCase().includes('certif')).map(badge => (
                      <span key={badge} className="px-3 py-1 bg-zinc-900 text-white rounded-lg text-[8px] font-black uppercase tracking-widest">
                        {badge}
                      </span>
                    ))}
                  </div>
               </div>

               <div className="space-y-8">
                  <div className="flex items-center justify-between border-b-4 border-orange-600 w-fit pb-2">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter">Boutique</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {sellerProducts.length > 0 ? sellerProducts.map(p => (
                       <ProductCard 
                        key={p.id} 
                        product={{ ...p, likesCount: getLikesCount(p) }} 
                        onClick={() => setSelectedProduct(p)} 
                        favorite={favorites.includes(p.id)}
                        onFavorite={(e) => toggleFavorite(p.id, e)}
                        onBuy={(e) => { e.stopPropagation(); startConversation(p); }}
                        sellerProfile={getSellerProfile(allUsersProfiles[p.sellerId] || globalUserProfileCache[p.sellerId])}
                      />
                    )) : (
                       <div className="col-span-full py-20 text-center opacity-20 font-black uppercase tracking-widest">Aucun article en vente</div>
                    )}
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      

      <AnimatePresence>
        {showSecurityRulesModal && (
          <div className="fixed md:absolute inset-0 z-[1000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[2.5rem] p-6 shadow-2xl border border-zinc-100 flex flex-col space-y-6 text-zinc-850"
            >
              <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 select-none">
                <div className="w-12 h-12 rounded-[1.2rem] bg-orange-50 text-orange-600 flex items-center justify-center font-black text-xl shrink-0">
                  🛡️
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Message de l'équipe</p>
                  <p className="text-sm font-black uppercase tracking-tight text-zinc-900">Ekip TrocShop</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-zinc-650 font-extrabold leading-relaxed">
                  Pour une expérience sans mauvaise surprise, engagez-vous à respecter nos 3 règles d'or :
                </p>

                <div className="space-y-3 text-xs text-zinc-750 leading-relaxed pl-1">
                  <div className="flex gap-2.5 items-start">
                    <span className="text-sm select-none shrink-0">❌</span>
                    <p className="font-semibold">
                      <strong className="text-zinc-900 font-extrabold">Zéro dépôt à l'avance</strong> (sauf pour nos Fournisseurs Directs d'Abidjan).
                    </p>
                  </div>
                  
                  <div className="flex gap-2.5 items-start">
                    <span className="text-sm select-none shrink-0">📍</span>
                    <p className="font-semibold">
                      <strong className="text-zinc-900 font-extrabold">Rencontres en public uniquement</strong> (Gare, grand carrefour, campus).
                    </p>
                  </div>
                  
                  <div className="flex gap-2.5 items-start">
                    <span className="text-sm select-none shrink-0">🔒</span>
                    <p className="font-semibold">
                      <strong className="text-zinc-900 font-extrabold">Gardez vos secrets</strong> (Ne donnez jamais votre code de carte, Mobile Money ou mot de passe dans le chat).
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                variant="primary" 
                className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] shadow-lg shadow-orange-600/15 cursor-pointer" 
                onClick={() => setShowSecurityRulesModal(false)}
              >
                J'ai compris et je m'engage
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
            className="fixed md:absolute inset-0 z-[10000] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md"
          >
            {/* Top close button */}
            <motion.button
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              onClick={() => setPreviewImage(null)}
              className="absolute top-6 right-6 p-4 rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-90 transition-all z-[10010] flex items-center justify-center cursor-pointer shadow-lg"
            >
              <X size={24} />
            </motion.button>

            {/* Image display */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative max-w-full max-h-[85vh] rounded-[2rem] overflow-hidden border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewImage}
                alt="Aperçu"
                className="max-h-[80vh] w-auto max-w-full object-contain pointer-events-auto rounded-[2rem]"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
       {/* Real-time floating in-app sliding notification toast / bubble */}
       <AnimatePresence>
         {inAppNotification && (
           <motion.div
             initial={{ y: -100, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             exit={{ y: -100, opacity: 0 }}
             transition={{ type: "spring", stiffness: 350, damping: 25 }}
             onClick={() => {
               if (inAppNotification.type === 'message') {
                 setActiveTab('messages');
               } else {
                 setActiveTab('favorites');
               }
               setInAppNotification(null);
             }}
             className="fixed md:absolute top-[140px] md:top-36 left-4 right-4 z-[10100] bg-zinc-900/95 text-white backdrop-blur-md border border-white/10 px-5 py-4 rounded-[1.8rem] shadow-2xl flex items-center gap-4 cursor-pointer"
           >
             <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
               {inAppNotification.type === 'message' ? (
                 <MessageCircle size={18} className="text-white fill-orange-500" />
               ) : (
                 <Bell size={18} className="text-white fill-orange-500" />
               )}
             </div>
             <div className="flex-1 min-w-0 text-left">
               <h4 className="font-extrabold text-xs uppercase tracking-wider text-orange-400 leading-none">{inAppNotification.title}</h4>
               <p className="text-xs text-zinc-300 mt-1.5 truncate leading-tight font-medium">{inAppNotification.body}</p>
             </div>
           </motion.div>
         )}
       </AnimatePresence>

       {/* Custom Confirmation Dialog for Iframe Support */}
       <AnimatePresence>
         {customConfirm && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed md:absolute inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
           >
             <motion.div 
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               exit={{ scale: 0.9, y: 20 }}
               className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full space-y-6 text-center border border-zinc-100 shadow-2xl"
             >
               <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                 <AlertTriangle size={28} />
               </div>
               <div className="space-y-2">
                 <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900 leading-none">Confirmation</h3>
                 <p className="text-xs text-zinc-500 font-medium leading-relaxed">{customConfirm.message}</p>
               </div>
               <div className="flex gap-3">
                 <button 
                   onClick={() => {
                     const cb = customConfirm.onConfirm;
                     setCustomConfirm(null);
                     cb();
                   }}
                   className="flex-1 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-orange-600/20 active:scale-95 transition-all cursor-pointer"
                 >
                   Confirmer
                 </button>
                 <button 
                   onClick={() => setCustomConfirm(null)}
                   className="flex-1 py-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-2xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all cursor-pointer"
                 >
                   Annuler
                 </button>
               </div>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>

       <AnimatePresence>
         {customAlert && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed md:absolute inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
           >
             <motion.div 
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               exit={{ scale: 0.9, y: 20 }}
               className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full space-y-6 text-center border border-zinc-100 shadow-2xl"
             >
               <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto", customAlert && (customAlert.toLowerCase().includes('erreur') || customAlert.toLowerCase().includes('incorrect') || customAlert.toLowerCase().includes('impossible') || customAlert.toLowerCase().includes('obligatoire') || customAlert.toLowerCase().includes('déjà') || customAlert.toLowerCase().includes('incorrecte') || customAlert.toLowerCase().includes('pas de') || customAlert.toLowerCase().includes('🚨')) ? "bg-rose-50 text-rose-600 animate-bounce" : (customAlert && (customAlert.toLowerCase().includes('succès') || customAlert.toLowerCase().includes('réussi') || customAlert.toLowerCase().includes('reçue') || customAlert.toLowerCase().includes('publiée')) ? "bg-emerald-50 text-emerald-600 animate-pulse" : "bg-amber-50 text-amber-600"))}>
                 {customAlert && (customAlert.toLowerCase().includes('erreur') || customAlert.toLowerCase().includes('incorrect') || customAlert.toLowerCase().includes('impossible') || customAlert.toLowerCase().includes('obligatoire') || customAlert.toLowerCase().includes('déjà') || customAlert.toLowerCase().includes('incorrecte') || customAlert.toLowerCase().includes('pas de') || customAlert.toLowerCase().includes('🚨')) ? <AlertTriangle size={28} /> : <Check size={28} />}
               </div>
               {(() => {
                  const lowercase = customAlert.toLowerCase();
                  const isError = lowercase.includes('erreur') || 
                                  lowercase.includes('incorrect') || 
                                  lowercase.includes('impossible') || 
                                  lowercase.includes('obligatoire') || 
                                  lowercase.includes('déjà') || 
                                  lowercase.includes('pas de') || 
                                  lowercase.includes('incorrecte') || 
                                  lowercase.includes('pas correspondent') || 
                                  lowercase.includes('aucun') || 
                                  lowercase.includes('refusé') || 
                                  lowercase.includes('bloquée') || 
                                  lowercase.includes('maximum') || 
                                  lowercase.includes('désolé') || 
                                  lowercase.includes('🚨');
                  
                  const isSuccess = lowercase.includes('succès') || 
                                    lowercase.includes('réussi') || 
                                    lowercase.includes('reçue') || 
                                    lowercase.includes('publiée') || 
                                    lowercase.includes('modifiée') || 
                                    lowercase.includes('merci') || 
                                    lowercase.includes('bienvenue') || 
                                    lowercase.includes('copié') || 
                                    lowercase.includes('félicitation');

                  return (
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                        {isError ? "Notification" : isSuccess ? "Succès" : "Information"}
                      </h4>
                      <p className="text-xs text-zinc-650 font-semibold leading-relaxed">{customAlert}</p>
                    </div>
                  );
                })()}
               <button 
                 onClick={() => setCustomAlert(null)}
                 className="w-full py-4 bg-zinc-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-zinc-950/20 active:scale-95 transition-all cursor-pointer"
               >
                 D'accord
               </button>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>

       {/* Troc Proposal Feedback Overlay */}
       <AnimatePresence>
         {showTrocFeedback && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed md:absolute inset-0 z-[1000] bg-orange-600 flex flex-col items-center justify-center p-8 text-center"
           >
             <motion.div 
               initial={{ scale: 0.8, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               className="space-y-8"
             >
               <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center text-orange-600 mx-auto shadow-2xl">
                 <motion.div
                   initial={{ pathLength: 0 }}
                   animate={{ pathLength: 1 }}
                   transition={{ duration: 0.5 }}
                 >
                   <Check size={48} strokeWidth={4} />
                 </motion.div>
               </div>
               <div className="space-y-4">
                 <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">Demande Envoyée !</h2>
                 <p className="text-white/80 font-medium max-w-xs mx-auto">Votre proposition a été transmise à l'utilisateur. Patientez jusqu'à sa décision.</p>
               </div>
               <button 
                  onClick={() => setShowTrocFeedback(false)}
                  className="px-12 py-5 bg-white/20 backdrop-blur-xl border border-white/20 rounded-full text-white text-[10px] font-black uppercase tracking-widest"
               >
                 D'accord
               </button>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>

        {/* Barre de navigation virtuelle Android/iOS tout en bas du châssis */}
        <div className="hidden md:block absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-950/40 rounded-full z-50" />
      </div>
    </div>
  );
}

function NavButton({ active, icon, onClick, count }: { active: boolean; icon: React.ReactNode; onClick: () => void; count?: number }) {
  return (
    <button onClick={onClick} className={cn(
      "w-12 h-12 flex items-center justify-center rounded-2xl transition-all relative",
      active ? "text-orange-600 scale-110" : "text-zinc-500 hover:text-orange-600"
    )}>
      {icon}
      {count !== undefined && count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce-short">
          {count > 9 ? '9+' : count}
        </span>
      )}
      {active && (
        <div className="absolute -bottom-1 w-1 h-1 bg-orange-500 rounded-full" />
      )}
    </button>
  );
}

function SellScreen({ onComplete, user, initialProduct }: { onComplete: () => void; user: User | null; initialProduct?: Product | null }) {
  const [title, setTitle] = useState(() => {
    if (initialProduct) return initialProduct.title;
    try { return localStorage.getItem('sell_draft_title') || ''; } catch { return ''; }
  });
  const [desc, setDesc] = useState(() => {
    if (initialProduct) return initialProduct.description;
    try { return localStorage.getItem('sell_draft_desc') || ''; } catch { return ''; }
  });
  const [price, setPrice] = useState(() => {
    if (initialProduct) return initialProduct.price?.toString();
    try { return localStorage.getItem('sell_draft_price') || ''; } catch { return ''; }
  });
  const [category, setCategory] = useState(() => {
    if (initialProduct) return initialProduct.category;
    try { return localStorage.getItem('sell_draft_category') || CATEGORIES[0]; } catch { return CATEGORIES[0]; }
  });
  const [neighborhood, setNeighborhood] = useState(() => {
    if (initialProduct) return initialProduct.neighborhood;
    try { return localStorage.getItem('sell_draft_neighborhood') || ''; } catch { return ''; }
  });
  const [condition, setCondition] = useState(() => {
    if (initialProduct) return initialProduct.condition;
    try { return localStorage.getItem('sell_draft_condition') || 'Comme neuf'; } catch { return 'Comme neuf'; }
  });

  const [listingType, setListingType] = useState<'sale' | 'troc' | 'mixed'>(() => {
    if (initialProduct) return initialProduct.listingType || 'sale';
    return 'sale';
  });
  const [exchangeWanted, setExchangeWanted] = useState(() => {
    if (initialProduct) return initialProduct.exchangeWanted || '';
    return '';
  });
  const [canTravel, setCanTravel] = useState(() => {
    if (initialProduct) return initialProduct.canTravel || false;
    return false;
  });
  const [meetingPoint, setMeetingPoint] = useState(() => {
    if (initialProduct) return initialProduct.meetingPoint || MEETING_POINTS[0];
    return MEETING_POINTS[0];
  });
  const [customMeetingPoint, setCustomMeetingPoint] = useState('');
  const [availability, setAvailability] = useState(() => {
    if (initialProduct) return initialProduct.availability || AVAILABILITY_OPTIONS[0];
    return AVAILABILITY_OPTIONS[0];
  });

  const [isImproving, setIsImproving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [publishStatus, setPublishStatus] = useState('');
  const [compressing, setCompressing] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>(() => {
    if (initialProduct) return initialProduct.images;
    try {
      const saved = localStorage.getItem('sell_draft_images');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter(img => typeof img === 'string') : [];
    } catch {
      return [];
    }
  });

  const aiImproveDesc = async () => {
    if (!desc.trim()) {
      alert("Veuillez d'abord écrire une courte description.");
      return;
    }
    setIsImproving(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Génère une description sous forme de liste à puces (maximum 4 puces) pour cet objet : "${desc}". Pas de phrases longues, juste des caractéristiques clés. Pas d'introduction ni de conclusion.`,
        config: {
          systemInstruction: "Tu es un assistant qui génère exclusivement des listes à puces ultra-courtes pour des annonces. Chaque puce doit faire moins de 8 mots. Style direct.",
        }
      });
      if (response.text) {
        setDesc(response.text);
      }
    } catch (err) {
      console.error("AI improvement failed:", err?.message || String(err));
      alert("Impossible d'améliorer avec l'IA pour le moment. Réessayez plus tard.");
    } finally {
      setIsImproving(false);
    }
  };
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialProduct) return;
    try {
      localStorage.setItem('sell_draft_title', title);
      localStorage.setItem('sell_draft_desc', desc);
      localStorage.setItem('sell_draft_price', price);
      localStorage.setItem('sell_draft_category', category);
      localStorage.setItem('sell_draft_neighborhood', neighborhood);
      localStorage.setItem('sell_draft_condition', condition);
      // Extra safety for images - ensure they are only strings and not circular
      const safeImages = Array.isArray(imagePreviews) 
        ? imagePreviews.filter(img => typeof img === 'string' && img.length < 2000000) 
        : [];
      localStorage.setItem('sell_draft_images', JSON.stringify(safeImages));
    } catch (e) {
      // Quota exceeded or other issue
      console.warn("Draft persistence failed:", e?.message || String(e));
    }
  }, [title, desc, price, category, neighborhood, condition, imagePreviews, initialProduct]);

  const clearDraft = () => {
    localStorage.removeItem('sell_draft_title');
    localStorage.removeItem('sell_draft_desc');
    localStorage.removeItem('sell_draft_price');
    localStorage.removeItem('sell_draft_category');
    localStorage.removeItem('sell_draft_neighborhood');
    localStorage.removeItem('sell_draft_condition');
    localStorage.removeItem('sell_draft_images');
  };

  useEffect(() => {
    // Search for profile to prefill neighborhood
    const fetchProfile = async () => {
      if (user) {
        const p = await fetchUserProfileCached(user.uid);
        if (p && p.neighborhood) {
          setNeighborhood(p.neighborhood);
        }
      }
    };
    fetchProfile();
  }, [user]);

  if (!user) return (
     <div className="py-20 text-center space-y-6">
      <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
        <UserIcon className="w-10 h-10" />
      </div>
      <div className="space-y-2">
        <h3 className="text-2xl font-black italic tracking-tighter uppercase">HÉ HO !</h3>
        <p className="text-xs text-zinc-500 font-black uppercase tracking-widest leading-relaxed">Connectez-vous pour commencer <br/> à vendre sur TrocShop.</p>
      </div>
      <Button onClick={onComplete} variant="outline" className="w-full rounded-2xl py-4">Retour</Button>
    </div>
  );

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    if (imagePreviews.length + files.length > 4) {
      alert("La publication d'une annonce requiert exactement 4 photos. Pas plus de 4 photos.");
      return;
    }

    setCompressing(true);
    try {
      const newPreviews: string[] = [];
      for (const file of files) {
        const reader = new FileReader();
        const p = new Promise<string>((resolve, reject) => {
          reader.onloadend = async () => {
            try {
              const compressed = await compressImage(reader.result as string);
              resolve(compressed);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error("Lecture fichier échouée"));
          reader.readAsDataURL(file);
        });
        const result = await p;
        newPreviews.push(result);
      }
      setImagePreviews(prev => [...prev, ...newPreviews]);
    } catch (err: any) {
      console.error("Erreur traitement image:", err?.message || String(err));
      alert("Désolé, impossible de traiter cette image. Elle est peut-être trop lourde.");
    } finally {
      setCompressing(false);
      if (e.target) e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
        }
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.70));
      };
    });
  };

  const [showInAppCamera, setShowInAppCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startCamera = async () => {
    if (imagePreviews.length >= 4) {
      alert("La publication d'une annonce requiert exactement 4 photos. Pas plus.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      });
      setCameraStream(stream);
      setShowInAppCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 200);
    } catch (err) {
      console.warn("Browser camera denied/unavailable, defaulting to device capture:", err);
      (document.getElementById('camera-upload') as HTMLInputElement)?.click();
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowInAppCamera(false);
  };

  const capturePhoto = async () => {
    if (videoRef.current) {
      try {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const rawUrl = canvas.toDataURL('image/jpeg', 0.85);
          const compressed = await compressImage(rawUrl);
          setImagePreviews(prev => [...prev, compressed]);
        }
      } catch (err) {
        console.error("Camera capture error:", err);
      } finally {
        stopCamera();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Le titre est obligatoire pour publier l'annonce.");
      return;
    }
    if (!desc.trim()) {
      alert("La description détaillée est obligatoire pour publier l'annonce.");
      return;
    }
    if (!category) {
      alert("La catégorie est obligatoire.");
      return;
    }
    if (!neighborhood) {
      alert("Veuillez sélectionner le quartier (Yamoussoukro).");
      return;
    }
    if (!condition) {
      alert("Veuillez sélectionner l'état de l'objet.");
      return;
    }
    if (listingType !== 'sale' && !exchangeWanted.trim()) {
      alert("Veuillez préciser ce que vous cherchez en échange.");
      return;
    }
    if (!meetingPoint) {
      alert("Le lieu de rendez-vous est obligatoire.");
      return;
    }
    if (!availability) {
      alert("La disponibilité pour la rencontre est obligatoire.");
      return;
    }
    if (imagePreviews.length !== 4) {
      alert("La publication d'une annonce requiert exactement 4 photos. Pas plus, pas moins.");
      return;
    }

    if (listingType !== 'troc') {
      const parsedPrice = parseFloat(price);
      if (!price || isNaN(parsedPrice) || parsedPrice <= 0) {
        alert("L'ajout du prix est obligatoire. Seuls les trocs simples peuvent être d'un prix optionnel.");
        return;
      }
    }
    if (meetingPoint === 'Personnalisé' && !customMeetingPoint.trim()) {
      alert("Veuillez préciser le lieu de RDV personnalisé.");
      return;
    }
    const finalMeetingPoint = meetingPoint === 'Personnalisé' ? customMeetingPoint.trim() : meetingPoint;

    setPublishStatus("Vérification des informations...");
    setLoading(true);
    try {
      const productRef = initialProduct ? doc(db, 'products', initialProduct.id) : doc(collection(db, 'products'));
      const productId = productRef.id;
      const userId = user!.uid;

      // Parallel upload of base64 images with progress
      setPublishStatus("Optimisation et upload des 4 photos...");
      const uploadPromises = imagePreviews.map(async (img) => {
        if (img.startsWith('http')) {
          return img;
        } else if (img.startsWith('data:')) {
          return await uploadImageToCloudinary(img);
        }
        return img;
      });

      let imageUrls: string[] = [];
      try {
        imageUrls = await Promise.all(uploadPromises);
      } catch (uploadError) {
        console.warn("Storage upload warning during product publish/update, falling back to local storage URLs:", uploadError);
        imageUrls = [...imagePreviews];
      }

      setPublishStatus("Envoi des données de l'annonce à la base de données...");
      if (initialProduct) {
        await updateDoc(productRef, {
          title,
          description: desc,
          price: (listingType === 'troc') ? 0 : Number(price),
          condition: condition as any,
          category,
          neighborhood,
          listingType,
          exchangeWanted,
          canTravel,
          meetingPoint: finalMeetingPoint,
          availability,
          images: imageUrls,
          updatedAt: serverTimestamp(),
        }).catch(e => {
          throw e;
        });
        alert("Annonce modifiée !");
      } else {
        const newProduct: Omit<Product, 'id'> = {
          title,
          description: desc,
          price: (listingType === 'troc') ? 0 : Number(price),
          condition: condition as any,
          category,
          neighborhood,
          listingType,
          exchangeWanted,
          canTravel,
          meetingPoint: finalMeetingPoint,
          availability,
          images: imageUrls,
          sellerId: user!.uid,
          sellerName: user!.displayName || 'Vendeur',
          status: 'available',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(productRef, newProduct).catch(e => {
          throw e;
        });
        clearDraft();
        alert("Annonce publiée !");
      }
      onComplete();
    } catch (err: any) {
      console.error("Publication of product failed:", err);
      let errMsg = "Désolé, une erreur s'est produite lors de l'enregistrement de votre annonce.";
      const errStr = err?.message || String(err);
      if (errStr.includes("permissions") || errStr.includes("permission-denied") || errStr.includes("insufficient permissions")) {
        errMsg = "Erreur de permissions Firebase : Vous n'êtes pas autorisé à modifier ou publier des articles dans cette base de données.";
      } else if (errStr.includes("quota") || errStr.includes("resource-exhausted")) {
        errMsg = "Quota Firebase dépassé : Plus aucun nouvel article ne peut être créé car la limite quotidienne gratuite du serveur est atteinte.";
      } else if (errStr.includes("offline") || errStr.includes("offline")) {
        errMsg = "Vous êtes actuellement hors ligne ou votre connexion est trop faible.";
      }
      alert(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
      setPublishStatus("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-sm mx-auto">
      <div className="space-y-3">
        <h2 className="text-4xl font-black tracking-tighter uppercase italic leading-none">
          {initialProduct ? 'MODIFIER' : 'PUBLIER'}
        </h2>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Postez votre annonce en 30 secondes</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-zinc-800 tracking-[0.2em] ml-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera size={14} />
              Photos ({imagePreviews.length}/4)
            </div>
            <span className="text-[8px] font-black text-rose-600">Exactement 4 obligatoires</span>
          </label>
          
          <div className="space-y-4">
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => (document.getElementById('gallery-upload') as HTMLInputElement)?.click()}
                className="flex-1 h-14 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-center justify-center gap-2 text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 transition-all active:scale-95 group"
              >
                <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                <span className="text-[10px] font-black uppercase tracking-widest">Galerie</span>
              </button>
              <button 
                type="button"
                onClick={startCamera}
                className="flex-1 h-14 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center gap-2 text-orange-400 hover:border-orange-600 hover:text-orange-600 transition-all active:scale-95 group"
              >
                <Camera className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-[10px] font-black uppercase tracking-widest">Prendre une Photo</span>
              </button>
            </div>

            {showInAppCamera && (
              <div className="fixed md:absolute inset-0 bg-black/95 z-[999] flex flex-col justify-between p-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-white text-xs font-black uppercase tracking-widest">Prendre une photo</h3>
                  <button type="button" onClick={stopCamera} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white active:scale-95 font-bold">
                    ✕
                  </button>
                </div>
                
                <div className="flex-1 my-4 flex items-center justify-center relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                </div>

                <div className="flex justify-center items-center pb-6">
                  <button 
                    type="button"
                    onClick={capturePhoto} 
                    className="w-20 h-20 bg-white rounded-full p-1.5 active:scale-90 transition-transform shadow-lg"
                  >
                    <div className="w-full h-full rounded-full border-4 border-black bg-white flex items-center justify-center">
                      <div className="w-5 h-5 bg-orange-600 rounded-full" />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {imagePreviews.length > 0 && (
              <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 px-1">
                {imagePreviews.map((p, i) => (
                  <div key={i} className="aspect-square h-24 w-24 shrink-0 relative rounded-xl overflow-hidden border-2 border-white group shadow-sm transition-all hover:scale-105 active:scale-95">
                    <img src={p} className="w-full h-full object-cover" alt="Preview" />
                    <button 
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 backdrop-blur-md text-white rounded-full flex items-center justify-center text-[10px] shadow-lg opacity-100 transition-opacity z-10"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {compressing && (
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-[8px] font-black uppercase text-orange-600 tracking-widest">Traitement...</span>
            </div>
          )}

          <input 
            id="gallery-upload"
            type="file" 
            onChange={handleImageChange} 
            className="hidden" 
            accept="image/*"
            multiple
          />
          <input 
            id="camera-upload"
            type="file" 
            onChange={handleImageChange} 
            className="hidden" 
            accept="image/*"
            capture="environment"
          />
        </div>

        <div className="space-y-5">
          {/* Listing Type Selection */}
          <div className="bg-zinc-100 p-1 rounded-[2rem] flex gap-1">
            <button
              type="button"
              onClick={() => setListingType('sale')}
              className={cn(
                "flex-1 py-4 px-2 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all",
                listingType === 'sale' ? "bg-white text-orange-600 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              Vente
            </button>
            <button
              type="button"
              onClick={() => setListingType('troc')}
              className={cn(
                "flex-1 py-4 px-2 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all",
                listingType === 'troc' ? "bg-white text-orange-600 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              Troc
            </button>
            <button
              type="button"
              onClick={() => setListingType('mixed')}
              className={cn(
                "flex-1 py-4 px-2 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all",
                listingType === 'mixed' ? "bg-white text-orange-600 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              Troc +
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-800 tracking-widest ml-1">Ce que vous publiez</label>
              <input 
                value={title} onChange={e => setTitle(e.target.value)}
                className="w-full p-5 rounded-3xl bg-white border border-zinc-100 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/50 outline-none font-black uppercase tracking-tight shadow-sm transition-all" 
                placeholder="Ex: IPHONE 13 PRO MAX" required 
              />
            </div>
            
            <motion.div layout className="grid grid-cols-1 gap-4">
              {listingType !== 'troc' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-800 tracking-widest ml-1">
                    {listingType === 'mixed' ? "Somme que vous ajoutez (Obligatoire)" : "Prix (CFA)"}
                  </label>
                  <div className="relative">
                    <input 
                      type="number" value={price} onChange={e => setPrice(e.target.value)}
                      className="w-full p-5 rounded-3xl bg-white border border-zinc-100 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/50 outline-none font-black italic shadow-sm transition-all text-lg" 
                      placeholder="0" required
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-300 font-bold text-xs uppercase tracking-widest pointer-events-none">F CFA</span>
                  </div>
                </div>
              )}

              {listingType !== 'sale' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-800 tracking-widest ml-1">Que cherchez-vous en échange ?</label>
                  <div className="relative">
                    <input 
                      value={exchangeWanted} onChange={e => setExchangeWanted(e.target.value)}
                      className="w-full p-5 rounded-3xl bg-white border border-zinc-100 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/50 outline-none font-black uppercase shadow-sm transition-all placeholder:text-[10px]" 
                      placeholder="Ex: PC, SMARTPHONE, MOTO..." required
                    />
                    <Handshake className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-200" size={20} />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-800 tracking-widest ml-1">État de l'objet</label>
                <CustomDropdown 
                  value={condition} 
                  options={["Comme neuf", "Très bon état", "Satisfaisant", "C'est gâté (pour pièces)"]} 
                  onChange={(v) => setCondition(v as any)} 
                />
              </div>
            </motion.div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-800 tracking-widest ml-1">Catégorie</label>
              <CustomDropdown 
                value={category} 
                options={CATEGORIES} 
                onChange={setCategory} 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-800 tracking-widest ml-1">Quartier (Yamoussoukro)</label>
              <CustomDropdown 
                value={neighborhood} 
                options={NEIGHBORHOODS} 
                onChange={setNeighborhood} 
                placeholder="Choisissez le lieu"
              />
              <button
                type="button"
                onClick={() => setCanTravel(!canTravel)}
                className={cn(
                  "flex items-center gap-2 pl-2 transition-all group",
                  canTravel ? "text-orange-600" : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                  canTravel ? "bg-orange-600 border-orange-600 shadow-sm" : "border-zinc-200"
                )}>
                  {canTravel && <Check size={14} className="text-white" />}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Je peux me déplacer</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-800 tracking-widest ml-1 flex items-center gap-2">
                  <MapPin size={12} /> Lieu de RDV
                </label>
                <CustomDropdown 
                  value={meetingPoint} 
                  options={MEETING_POINTS} 
                  onChange={setMeetingPoint} 
                />
                {meetingPoint === "Personnalisé" && (
                  <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="bg-orange-50 text-orange-800 text-[10px] p-3 rounded-xl flex items-start gap-2">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5 text-orange-600" />
                      <p className="leading-tight font-medium">Pour votre sécurité, veuillez choisir un lieu public et fréquenté pour effectuer vos trocs (ex: Supermarché, Place publique).</p>
                    </div>
                    <input
                      type="text"
                      className="w-full p-4 rounded-[1.5rem] bg-white border border-zinc-100 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/50 outline-none font-medium text-sm shadow-sm transition-all"
                      placeholder="Ex: Devant la pharmacie..."
                      value={customMeetingPoint}
                      onChange={(e) => setCustomMeetingPoint(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-800 tracking-widest ml-1 flex items-center gap-2">
                  <Clock size={12} /> Disponibilité
                </label>
                <CustomDropdown 
                  value={availability} 
                  options={AVAILABILITY_OPTIONS} 
                  onChange={setAvailability} 
                />
              </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-zinc-800 tracking-widest ml-1">
                 Description Détaillée
               </label>
               <textarea 
                value={desc} onChange={e => setDesc(e.target.value)}
                className="w-full p-5 rounded-[2rem] bg-white border border-zinc-100 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/50 outline-none min-h-[160px] font-medium text-sm leading-relaxed shadow-sm transition-all" 
                placeholder="Détaillez l'état, les défauts, les accessoires inclus..." required 
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-6">
          <Button 
            variant="primary" 
            className="w-full py-6 rounded-[2.5rem] bg-orange-600 hover:bg-orange-700 shadow-2xl shadow-orange-600/40 font-black uppercase tracking-[0.4em] text-[10px]" 
            type="submit" 
            disabled={loading}
          >
            {loading ? 'PUBLICATION EN COURS...' : initialProduct ? 'ENREGISTRER LES MODIFICATIONS' : 'PUBLIER MAINTENANT'}
          </Button>

          {loading && publishStatus && (
            <div className="p-4 bg-orange-50/80 rounded-2xl border border-orange-100 flex items-center gap-3 animate-pulse">
              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-800 leading-none">{publishStatus}</p>
            </div>
          )}

          <button 
            type="button" 
            onClick={onComplete}
            className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            Annuler et retourner
          </button>
        </div>
      </div>
    </form>
  );
}


function ExchangePicker({ myProducts, onSelect, onClose, targetProduct }: { myProducts: Product[], onSelect: (ids: string[], priceAdjustment: number) => void, onClose: () => void, targetProduct: Product }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [priceAdjustment, setPriceAdjustment] = useState<number>(0);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed md:absolute inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="bg-white w-full max-w-xl rounded-[3.5rem] overflow-hidden flex flex-col max-h-[90vh] shadow-3xl"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-10 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-6 mb-8">
             <div className="flex-1">
                <h3 className="text-3xl font-black uppercase tracking-tighter leading-tight italic border-l-8 border-orange-600 pl-6">
                  {targetProduct.listingType === 'mixed' ? "PROPOSER UNE OFFRE" : "PROPOSER UN TROC"}
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-2 ml-8">
                  {targetProduct.listingType === 'mixed' ? "Sélectionnez votre article à échanger" : "Sélectionnez vos articles & ajustement"}
                </p>
                <div className="mt-4 ml-8">
                  <p className="text-lg font-black text-zinc-900 truncate uppercase tracking-tighter">{targetProduct.title}</p>
                  <p className="text-sm font-black text-orange-600 italic">{formatPrice(targetProduct.price)} FCFA</p>
                </div>
             </div>
             <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-orange-600 shadow-2xl shrink-0 rotate-3 transform hover:rotate-0 transition-transform">
                <img src={targetProduct.images[0]} className="w-full h-full object-cover" alt=""/>
             </div>
          </div>
          
          {targetProduct.listingType !== 'mixed' && (
            <div className="space-y-4 ml-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-800 tracking-widest">
                  Ajuster avec une somme (Optionnel)
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={priceAdjustment || ''} 
                    onChange={e => setPriceAdjustment(Number(e.target.value))}
                    placeholder="Montant en F CFA (optionnel)"
                    className="w-full bg-white border border-zinc-200 p-4 rounded-2xl text-sm font-black italic outline-none focus:border-orange-500 shadow-sm transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 font-bold text-[10px] uppercase tracking-widest pointer-events-none">F CFA</span>
                </div>
              </div>
            </div>
          )}

          <div className="h-px bg-zinc-200 w-full my-8" />
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black uppercase tracking-widest text-zinc-900">Vos articles ({selectedIds.length})</h4>
            <button onClick={onClose} className="p-3 bg-white shadow-sm rounded-xl hover:bg-zinc-100 transition-colors">
               <X size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar">
          {myProducts.length === 0 ? (
            <div className="py-20 text-center space-y-8">
              <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center mx-auto">
                 <ShoppingBag className="w-12 h-12 text-zinc-200" />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-black text-zinc-900 uppercase tracking-widest">Aucun article disponible</p>
                <p className="text-xs text-zinc-400 font-medium max-w-xs mx-auto">Vous devez avoir au moins une annonce en ligne pour proposer un échange.</p>
              </div>
              <Button variant="primary" onClick={onClose} className="mx-auto rounded-full py-4 px-8 uppercase text-[10px] font-black tracking-widest">Retour</Button>
            </div>
          ) : (
           myProducts.map((p, i) => {
             const isSelected = selectedIds.includes(p.id);
             return (
               <motion.div 
                 key={p.id}
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: i * 0.05 }}
                 onClick={() => toggleSelect(p.id)}
                 className={cn(
                   "group flex items-center gap-6 p-6 bg-zinc-50 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-300 shadow-sm relative",
                   isSelected ? "border-orange-600 bg-white ring-4 ring-orange-100" : "border-transparent hover:border-zinc-200"
                 )}
               >
                 <div className="w-20 h-20 bg-white rounded-3xl overflow-hidden border border-zinc-100 shrink-0 shadow-inner">
                   <img src={p.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt=""/>
                 </div>
                 <div className="flex-1 min-w-0 space-y-1">
                   <h4 className="font-black uppercase tracking-tight text-lg truncate group-hover:text-orange-600 transition-colors">{p.title}</h4>
                   <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{p.category}</span>
                     <span className="w-1 h-1 bg-zinc-300 rounded-full" />
                     <p className="text-orange-600 font-black text-sm italic">{formatPrice(p.price)} FCFA</p>
                   </div>
                 </div>
                 <div className={cn(
                   "w-10 h-10 rounded-xl border flex items-center justify-center transition-all",
                   isSelected ? "bg-orange-600 border-orange-600 text-white" : "bg-white border-zinc-200 text-transparent"
                 )}>
                   <Check size={20} strokeWidth={4} />
                 </div>
               </motion.div>
             );
           })
          )}
        </div>

        <div className="p-8 border-t border-zinc-100 bg-zinc-50/50">
          <Button 
            variant="primary" 
            className="w-full py-6 rounded-[2.5rem] shadow-2xl shadow-orange-600/40 font-black uppercase tracking-[0.2em] text-[10px]"
            onClick={() => onSelect(selectedIds, priceAdjustment)}
            disabled={
              targetProduct.listingType === 'mixed'
                ? (selectedIds.length === 0)
                : (selectedIds.length === 0 && priceAdjustment <= 0)
            }
          >
            CONFIRMER LA PROPOSITION
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProductSheet({ 
  product, 
  onClose, 
  user, 
  onContact, 
  onExchange,
  favorite, 
  onFavorite, 
  onSellerClick,
  onMarkAsSold
}: { 
  product: Product; 
  onClose: () => void; 
  user: User | null; 
  onContact: () => void; 
  onExchange?: () => void;
  favorite?: boolean; 
  onFavorite?: () => void; 
  onSellerClick?: (id: string) => void;
  onMarkAsSold: (productId: string) => void;
}) {
  const [currentImg, setCurrentImg] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [sellerProfile, setSellerProfile] = useState<UserProfile | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const isOwner = user?.uid === product.sellerId;

  const isSellerPartner = isPartnerUser(sellerProfile);

  useEffect(() => {
    product.images.forEach(src => {
      const img = new Image();
      img.src = src;
    });
    
    const fetchSeller = async () => {
      try {
        const cachedProfile = await fetchUserProfileCached(product.sellerId);
        if (cachedProfile) setSellerProfile(cachedProfile as UserProfile);
      } catch (e) {
        if (!(e instanceof Error && e.message.includes('offline'))) {
          handleFirestoreError(e, OperationType.GET, `users/${product.sellerId}`);
        }
      }
    };
    fetchSeller();
  }, [product.sellerId]);

  return (
    <>
      <AnimatePresence>
        {zoomedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { e.stopPropagation(); }}
            className="fixed md:absolute inset-0 z-[110] bg-black/95 flex items-center justify-center p-4 cursor-default"
          >
            <button 
              onClick={(e) => { e.stopPropagation(); setZoomedImage(null); }}
              className="absolute top-8 right-8 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center text-white transition-all z-[120]"
            >
              <X size={24} />
            </button>
            <motion.img 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={zoomedImage} 
              className="max-w-full max-h-full object-contain rounded-2xl"
              alt="Zoomed"
              onClick={(e) => { e.stopPropagation(); }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        className="fixed md:absolute inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6"
        onClick={onClose}
      >
        <div 
          className="w-full h-full bg-white rounded-t-[3rem] overflow-hidden flex flex-col relative"
          onClick={e => e.stopPropagation()}
        >
        {/* Carousel Section */}
        <div className="w-full h-[50vh] bg-zinc-50 relative group flex flex-col shrink-0 overflow-hidden">
          <div className="flex-1 relative overflow-hidden bg-white">
            <motion.div 
               className="flex h-full cursor-default"
               animate={{ x: `-${currentImg * 100}%` }}
               transition={{ type: "tween", ease: "easeInOut", duration: 0.15 }}
            >
              {product.images.map((img, i) => (
                <div key={i} className="w-full h-full shrink-0 flex items-center justify-center p-3 md:p-12">
                  <motion.div 
                    initial={false}
                    animate={{ 
                      scale: currentImg === i ? 1 : 0.85,
                      rotate: currentImg === i ? 0 : (i < currentImg ? -2 : 2),
                      opacity: currentImg === i ? 1 : 0.3
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    className="w-full h-full relative cursor-zoom-in group/img shadow-[0_48px_96px_-24px_rgba(0,0,0,0.12)] rounded-[2.5rem] md:rounded-[4rem] overflow-hidden bg-zinc-50 border border-zinc-100"
                    onClick={() => setZoomedImage(img)}
                  >
                    <img 
                      src={img} 
                      className="w-full h-full object-cover" 
                      alt="" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/5 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-20 h-20 bg-white/30 backdrop-blur-2xl rounded-full flex items-center justify-center border border-white/40 shadow-2xl scale-75 group-hover/img:scale-100 transition-transform duration-500">
                        <Maximize2 size={32} className="text-white" />
                      </div>
                    </div>
                  </motion.div>
                </div>
              ))}
            </motion.div>

            {/* Pagination Dots - Modern dots */}
            {product.images.length > 1 && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2.5 px-4 py-3 bg-black/5 backdrop-blur-xl rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {product.images.map((_, i) => (
                   <button 
                    key={i}
                    onClick={() => setCurrentImg(i)}
                    className={cn(
                      "transition-all duration-500 rounded-full",
                      i === currentImg 
                        ? "w-8 h-2 bg-orange-600 shadow-[0_0_12px_rgba(234,88,12,0.4)]" 
                        : "w-2 h-2 bg-zinc-300 hover:bg-zinc-400"
                    )}
                   />
                ))}
              </div>
            )}

            {/* Photo Counter Badge - More Minimal */}
            {product.images.length > 1 && (
              <div className="absolute top-8 right-8 z-20 px-4 py-2 bg-white/90 backdrop-blur-xl rounded-2xl text-[10px] font-black text-zinc-900 border border-zinc-100 shadow-xl tracking-[0.2em] uppercase flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-pulse" />
                <span>{currentImg + 1} / {product.images.length}</span>
              </div>
            )}

            {product.images.length > 1 && (
              <>
                {/* Navigation Arrows - Better Glassmorphism */}
                <div className="absolute top-1/2 -translate-y-1/2 left-8 right-8 flex justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-700 z-30">
                  <button 
                    onClick={() => setCurrentImg(Math.max(0, currentImg - 1))}
                    className={cn(
                      "w-16 h-16 rounded-[2rem] bg-white/95 backdrop-blur-2xl border border-zinc-100 text-zinc-900 flex items-center justify-center pointer-events-auto transition-all active:scale-75 hover:bg-zinc-900 hover:text-white shadow-[0_16px_32px_-8px_rgba(0,0,0,0.1)] hover:shadow-orange-600/20",
                      currentImg === 0 && "opacity-0 pointer-events-none translate-x-10"
                    )}
                  >
                    <ArrowLeft size={24} />
                  </button>
                  <button 
                    onClick={() => setCurrentImg(Math.min(product.images.length - 1, currentImg + 1))}
                    className={cn(
                      "w-16 h-16 rounded-[2rem] bg-white/95 backdrop-blur-2xl border border-zinc-100 text-zinc-900 flex items-center justify-center pointer-events-auto transition-all active:scale-75 hover:bg-zinc-900 hover:text-white shadow-[0_16px_32px_-8px_rgba(0,0,0,0.1)] hover:shadow-orange-600/20",
                      currentImg === product.images.length - 1 && "opacity-0 pointer-events-none -translate-x-10"
                    )}
                  >
                    <ArrowRight size={24} />
                  </button>
                </div>
              </>
            )}

            {/* Back Button */}
            <button 
              onClick={onClose}
              className="absolute top-6 left-6 w-12 h-12 bg-white/95 backdrop-blur-md rounded-2xl flex items-center justify-center text-zinc-900 active:scale-95 transition-all shadow-md z-30 border border-zinc-150"
            >
              <ArrowLeft size={24} />
            </button>
          </div>

          {/* Interactive Thumbnail Gallery */}
          {product.images.length > 1 && (
            <div className="px-8 pb-8 pt-2 bg-white overflow-x-auto no-scrollbar">
              <div className="flex gap-4 min-w-max mx-auto justify-center">
                {product.images.map((img, i) => (
                  <button 
                    key={i} 
                    onClick={() => setCurrentImg(i)}
                    className={cn(
                      "relative w-20 h-20 rounded-2xl md:rounded-[1.75rem] overflow-hidden transition-all duration-500 shrink-0 group/thumb active:scale-90",
                      i === currentImg 
                        ? "p-1 bg-gradient-to-br from-orange-500 to-orange-600 scale-110 shadow-2xl shadow-orange-600/30 z-10" 
                        : "bg-zinc-100 hover:scale-105 opacity-40 hover:opacity-100"
                    )}
                  >
                    <div className="w-full h-full rounded-[1.4rem] overflow-hidden bg-white">
                      <img src={img} className="w-full h-full object-cover" alt="" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}


        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-40 bg-white">
          <div className="p-8 md:p-14 space-y-12">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <span className="px-4 py-1.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-black uppercase tracking-widest">{product.category}</span>
                <span className="px-4 py-1.5 bg-zinc-100 text-zinc-600 rounded-full text-[10px] font-black uppercase tracking-widest">{product.condition}</span>
                {product.listingType && (
                  <span className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                    product.listingType === 'troc' ? "bg-blue-100 text-blue-700" :
                    product.listingType === 'mixed' ? "bg-orange-100 text-orange-700" :
                    "bg-zinc-100 text-zinc-600"
                  )}>
                    {product.listingType === 'sale' ? 'Vente Directe' : product.listingType === 'troc' ? 'Troc Uniquement' : 'Troc +'}
                  </span>
                )}
              </div>
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-tight text-zinc-900 border-l-8 border-orange-600 pl-8">{product.title}</h2>
              <div className="flex flex-col gap-4">
                {product.listingType === 'sale' && (
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-black text-orange-600 italic px-8 py-3 bg-orange-50 rounded-[2rem] w-fit shadow-sm">{formatPrice(product.price)} FCFA</div>
                  </div>
                )}
                {product.listingType === 'mixed' && (
                  <div className="flex flex-col gap-3 p-6 bg-orange-50/50 rounded-[2.5rem] border border-orange-100/50">
                    <span className="text-[10px] font-black uppercase text-orange-500 tracking-[0.2em]">
                      Somme ajoutée par le vendeur (Obligatoire)
                    </span>
                    <div className="text-4xl font-black text-orange-600 italic">{formatPrice(product.price)} FCFA</div>
                  </div>
                )}
                {product.listingType !== 'sale' && (
                  <div className="flex flex-col gap-2 p-6 bg-blue-50 rounded-[2.5rem] border border-blue-100">
                    <span className="text-[10px] font-black uppercase text-blue-400 tracking-[0.2em] flex items-center gap-2">
                       <Repeat size={14} /> Souhaite en échange
                    </span>
                    <p className="text-2xl font-black uppercase tracking-tight text-blue-700">{product.exchangeWanted || 'Proposez ce que vous avez !'}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 bg-zinc-50 rounded-[2.5rem] border border-zinc-100 space-y-2">
                <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                  <MapPin size={12} className="text-orange-600" /> Lieu de rencontre
                </span>
                <p className="font-black uppercase tracking-tight text-sm">{product.meetingPoint || 'À convenir'}</p>
                <div className="flex items-center gap-1.5 mt-2">
                   <div className={cn("w-1.5 h-1.5 rounded-full", product.canTravel ? "bg-green-500" : "bg-red-400")} />
                   <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                     {product.canTravel ? "Peut se déplacer" : "À récupérer sur place"}
                   </span>
                </div>
              </div>
              <div className="p-6 bg-zinc-50 rounded-[2.5rem] border border-zinc-100 space-y-2">
                <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                  <Clock size={12} className="text-orange-600" /> Disponibilité
                </span>
                <p className="font-black uppercase tracking-tight text-sm">{product.availability || 'À convenir'}</p>
              </div>
            </div>

            {/* Product Tags/Features */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-3 bg-zinc-50 px-6 py-3 rounded-2xl border border-zinc-100">
                <Tag size={16} className="text-orange-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{product.category}</span>
              </div>
              <div className="flex items-center gap-3 bg-zinc-50 px-6 py-3 rounded-2xl border border-zinc-100">
                <Star size={16} className="text-orange-600" fill="currentColor" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{product.condition}</span>
              </div>

            </div>

            <div className="flex flex-col gap-3">
             <div className="bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
                <div className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-2">Ville</div>
                <div className="flex items-center gap-1.5 font-bold text-zinc-700 text-xs">
                   <MapPin size={14} className="text-orange-600 shrink-0" />
                   <span>{sellerProfile?.city || 'Non renseigné'}</span>
                </div>
             </div>
             <div className="bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
                <div className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-2">Quartier</div>
                <div className="flex items-center gap-1.5 font-bold text-zinc-700 text-xs">
                   <Navigation size={14} className="text-orange-600 shrink-0" />
                   <span>{product.neighborhood || sellerProfile?.neighborhood || 'Non renseigné'}</span>
                </div>
             </div>
             <div className="bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
                <div className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-2">Annonce</div>
                <div className="flex items-center gap-1.5 font-bold text-zinc-700 text-xs">
                   <Clock size={14} className="text-orange-600 shrink-0" />
                   <span>{product.createdAt?.seconds ? new Date(product.createdAt.seconds * 1000).toLocaleDateString('fr-FR') : 'Récent'}</span>
                </div>
             </div>
          </div>

            {/* Direct Supplier and Security Warning card */}
            <div className={cn(
              "p-5 rounded-[2rem] border transition-all flex items-start gap-3.5 shadow-sm",
              isSellerPartner 
                ? "bg-emerald-50/55 border-emerald-100/80" 
                : "bg-red-50/50 border-red-150/50"
            )}>
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm self-start mt-0.5",
                isSellerPartner ? "bg-emerald-600 text-white shadow-emerald-650/15" : "bg-red-600 text-white shadow-red-650/15"
              )}>
                <Shield size={18} className={cn("fill-white/10", isSellerPartner && "animate-pulse")} />
              </div>
              <div className="flex-1 min-w-0">
                {isSellerPartner ? (
                  <>
                    <h4 className="text-xs font-black uppercase tracking-tighter leading-tight text-emerald-950 flex items-center gap-1.5 select-none">
                      <span>🛡️ Fournisseur Direct</span>
                    </h4>
                    <p className="text-[11px] text-emerald-850 font-bold leading-relaxed mt-1">
                      Pour ce partenaire de confiance basé à Abidjan, le paiement à l'avance est exceptionnellement autorisé. La livraison de vos trocs et achats est gérée et garantie gratuitement par TrocShop.
                    </p>
                  </>
                ) : (
                  <>
                    <h4 className="text-xs font-black uppercase tracking-tighter leading-tight text-red-950 select-none">
                      ⚠️ Sécurité : Remise en main propre
                    </h4>
                    <p className="text-[11px] text-red-850 font-extrabold leading-relaxed mt-1">
                      Ce vendeur n'a pas le badge bouclier 🛡️. Refusez tout paiement ou dépôt à l'avance sous n'importe quel prétexte. La transaction et le paiement doivent s'effectuer uniquement lors de la rencontre physique en public.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Description</h3>
            <p className="text-zinc-600 font-medium leading-relaxed bg-zinc-50 p-6 rounded-[2rem] border border-zinc-100 whitespace-pre-wrap">
              {product.description}
            </p>
          </div>

          <div 
            className="p-8 bg-zinc-900 rounded-[2.5rem] text-white flex flex-col gap-6 shadow-xl"
          >
             <div onClick={() => onSellerClick?.(product.sellerId)} className="flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity">
               <div className="flex items-center gap-4">
                  {sellerProfile?.photoURL ? (
                    <img src={sellerProfile.photoURL} className="w-16 h-16 rounded-2xl object-cover" alt="Seller" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-orange-600 flex items-center justify-center text-3xl font-black italic shadow-inner">
                      {product.sellerName[0]}
                    </div>
                  )}
                  <div>
                     <div className="flex items-center gap-2 flex-wrap">
                       <p className="font-black uppercase tracking-tighter text-lg">{product.sellerName}</p>
                       {isSellerPartner && (
                         <Shield size={14} className="text-emerald-500 fill-emerald-500 shrink-0 animate-pulse" />
                       )}
                     </div>
                  </div>
               </div>
               <Button onClick={(e) => { e.stopPropagation(); onSellerClick?.(product.sellerId); }} variant="ghost" className="border border-white/20 rounded-full px-6 text-[10px] uppercase font-black tracking-widest text-white hover:bg-white/10">Voir le profil</Button>
             </div>
             
             {false && (
               <div className="flex justify-end border-t border-white/10 pt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const msg = encodeURIComponent(`Bonjour, je souhaite signaler le vendeur "${product.sellerName}" de l'annonce "${product.title}" (ID: ${product.id}).`);
                      window.open(`https://wa.me/2250160232164?text=${msg}`, "_blank");
                    }}
                    className="flex items-center gap-2 text-xs font-black uppercase text-red-400 hover:text-red-300 transition-colors tracking-wider"
                  >
                    <ShieldAlert size={14} className="text-red-400" />
                    <span>Signaler le vendeur</span>
                  </button>
               </div>
             )}
          </div>

          <div className="pt-8 space-y-12 pb-32">
             <ReviewSection targetId={product.id} targetType="product" user={user} onFocusChange={setIsReviewing} />
             <div className="border-t border-zinc-100 pt-12">
                <ReviewSection targetId={product.sellerId} targetType="user" user={user} onFocusChange={setIsReviewing} />
             </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {!isReviewing && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute bottom-6 left-6 right-6 z-[70] flex flex-col gap-3"
          >
            {isOwner ? (
              <div className="bg-zinc-900/90 backdrop-blur-3xl text-white p-5 rounded-[2rem] flex items-center justify-between shadow-2xl border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-600 rounded-2xl flex items-center justify-center">
                    <UserIcon size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Votre annonce</p>
                    <p className="text-sm font-black uppercase tracking-tight">Gérer l'article</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      safeConfirm("Êtes-vous sûr de vouloir marquer cet article comme vendu ?", () => {
                        onMarkAsSold?.(product.id);
                        onClose();
                      });
                    }}
                    variant="ghost" 
                    className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 px-2"
                  >
                    Vendu
                  </Button>
                  <Button 
                    onClick={() => {
                      onClose();
                      onSellerClick?.(user.uid);
                    }}
                    variant="ghost" 
                    className="text-[10px] font-black uppercase tracking-widest text-orange-500 hover:text-orange-400"
                  >
                    Modifier
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex gap-2 w-full">
                  {product.listingType === 'sale' && (
                    <motion.div className="flex-1" whileTap={{ scale: 0.95 }}>
                      <Button 
                        onClick={() => { 
                          onClose();
                          onContact(); 
                        }} 
                        className="w-full h-14 bg-zinc-900 text-white rounded-2xl shadow-2xl shadow-zinc-900/20 hover:bg-black transition-all flex items-center justify-center gap-2 px-4 border border-white/5"
                      >
                        <MessageCircle size={18} className="text-orange-600" />
                        <span className="text-[10px] font-black uppercase tracking-[0.1em]">Discuter</span>
                      </Button>
                    </motion.div>
                  )}
                  {(product.listingType === 'troc' || product.listingType === 'mixed') && (
                    <motion.div className="flex-1" whileTap={{ scale: 0.95 }}>
                      <Button 
                        onClick={() => {
                          onExchange?.();
                        }}
                        className="w-full h-14 bg-orange-600 text-white rounded-2xl shadow-2xl shadow-orange-600/30 hover:bg-orange-700 transition-all flex items-center justify-center gap-2 px-4 border border-orange-500/30"
                      >
                        <Repeat size={18} fill="white" />
                        <span className="text-[10px] font-black uppercase tracking-[0.1em]">
                          {product.listingType === 'mixed' ? "Proposer une offre" : "Proposer un troc"}
                        </span>
                      </Button>
                    </motion.div>
                  )}
                </div>
                
                <div className="flex gap-3">
                  {/* MASKED FAVORITES BUTTON
                  <button 
                    onClick={onFavorite} 
                    className={cn(
                      "flex-1 h-14 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3 backdrop-blur-2xl border-2",
                      favorite ? "bg-red-500/10 text-red-500 border-red-500/20 shadow-lg shadow-red-500/10" : "bg-white/80 text-zinc-400 border-zinc-100 shadow-sm"
                    )}
                  >
                    <Heart size={20} className={favorite ? "fill-red-500" : ""} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {favorite ? `Dans mes favoris (${product.likesCount || 0})` : `Ajouter aux favoris (${product.likesCount || 0})`}
                    </span>
                  </button>
                  */}
    


                  <button 
                    onClick={() => {
                      const appStoreUrl = "https://troc-shop-store.vercel.app/";
                      const msg = encodeURIComponent(`Découvre l'article "${product.title}" sur TrocShop ! Télécharge l'application TrocShop Store ici pour le découvrir : ${appStoreUrl}`);
                      window.open(`https://api.whatsapp.com/send?text=${msg}`, "_blank");
                    }}
                    className="flex-1 h-14 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center gap-3 active:scale-95 transition-all border border-emerald-100 shadow-sm"
                    title="Partager sur WhatsApp"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-11.507c-.124-.208-.493-.324-.961-.557-.468-.232-2.76-1.361-3.189-1.517-.43-.156-.742-.232-.961.096-.219.329-.841 1.048-1.031 1.272-.192.223-.383.25-.851.016-3.155-1.564-4.266-2.584-5.307-4.382-.271-.467-.027-.721.207-.954.21-.21.468-.545.702-.818.235-.272.312-.455.469-.759.157-.303.078-.568-.039-.8-.117-.233-.961-2.315-1.317-3.176-.347-.833-.701-.722-.961-.735-.248-.013-.531-.015-.813-.015-.282 0-.742.106-1.129.53-.387.424-1.48 1.446-1.48 3.525 0 2.078 1.51 4.08 1.722 4.364.212.284 2.973 4.538 7.199 6.362 1.005.434 1.79.693 2.404.888 1.01.321 1.93.276 2.656.168.809-.12 2.483-.984 2.833-1.936.35-.952.35-1.768.246-1.936-.104-.168-.372-.284-.741-.468z"/>
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">Partager sur WhatsApp</span>
                  </button>

                  {!isOwner && (
                    <button 
                      onClick={() => {
                        const msg = encodeURIComponent(`Bonjour, je souhaite signaler le vendeur "${product.sellerName}" de l'annonce "${product.title}" (ID: ${product.id}).`);
                        window.open(`https://wa.me/2250160232164?text=${msg}`, "_blank");
                      }}
                      className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center active:scale-95 transition-all border border-red-100 shadow-sm shrink-0"
                      title="Signaler ce vendeur"
                    >
                      <ShieldAlert size={20} className="text-red-600" />
                    </button>
                  )}


                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
   </>
  );
}


