import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { App as CapacitorApp } from '@capacitor/app';
import { Share as CapacitorShare } from '@capacitor/share';
import { 
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
  startAfter
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, serverTimestamp, firebaseConfig } from './lib/firebase';
import { Product, UserProfile, Message, Conversation, Review, Transaction } from './types';
import { LocalRecordingWaveform } from './components/LocalRecordingWaveform';
import trocBannerBg from './images /troc_banner_bg_1779040283471.png';
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

// Global in-memory cache for user profiles to avoid repeated and concurrent Firestore reads
export const globalUserProfileCache: Record<string, any> = {};
export const globalUserProfilePromises: Record<string, Promise<any>> = {};

export const isQuotaExceeded = (): boolean => {
  if (typeof window !== 'undefined') {
    return (window as any).__firestore_quota_exceeded === true;
  }
  return false;
};

export const fetchUserProfileCached = async (uid: string): Promise<any> => {
  if (!uid) return null;
  if (globalUserProfileCache[uid]) {
    return globalUserProfileCache[uid];
  }
  if (isQuotaExceeded()) {
    console.warn("fetchUserProfileCached skipped: Quota exceeded flag active.");
    return null;
  }
  if (globalUserProfilePromises[uid]) {
    return globalUserProfilePromises[uid];
  }

  const promise = getDoc(doc(db, 'users', uid))
    .then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        globalUserProfileCache[uid] = data;
        return data;
      }
      return null;
    })
    .catch((err) => {
      console.warn(`Error loading user profile for ${uid}:`, err?.message || String(err));
      return null;
    });

  globalUserProfilePromises[uid] = promise;
  return promise;
};

export const CAMPUS_SCHOOLS = [
  "INP-HB",
  "ISCAE",
  "ESAM",
  "HEC-AD",
  "PIGIER",
  "ESETEC",
  "I.H.B.I",
  "UIYA",
  "2IFTP",
  "ES-BTP",
  "IUSTJP2",
  "INFJ"
];

// --- Custom sandboxed-iframe safe confirm and alert assistants ---
export const safeConfirm = (message: string, onConfirm: () => void) => {
  if (typeof window !== 'undefined' && (window as any).safeConfirm) {
    (window as any).safeConfirm(message, onConfirm);
  } else {
    if (confirm(message)) {
      onConfirm();
    }
  }
};

export const safeAlert = (message: string) => {
  if (typeof window !== 'undefined' && (window as any).safeAlert) {
    (window as any).safeAlert(message);
  } else {
    alert(message);
  }
};

export const toast = {
  success: (message: string) => {
    safeAlert(message);
  },
  error: (message: string) => {
    safeAlert(message);
  }
};

// --- Components ---

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
      className="fixed inset-0 z-[999] bg-white flex flex-col items-center justify-center p-6 overflow-hidden"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center relative z-10 flex flex-col items-center justify-center"
      >
        <h1 className="text-orange-600 text-5xl font-black italic tracking-tighter mb-4 select-none">
          TrocShop
        </h1>
        
        {/* Animated 999 loader below TrocShop */}
        <div className="flex gap-1.5 items-center justify-center mt-2">
          {['9', '9', '9'].map((char, index) => (
            <motion.span
              key={index}
              className="text-orange-600 text-3xl font-black italic select-none"
              animate={{
                y: [0, -10, 0],
                opacity: [0.35, 1, 0.35]
              }}
              transition={{
                duration: 1.0,
                repeat: Infinity,
                delay: index * 0.18,
                ease: "easeInOut"
              }}
            >
              {char}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'outline' }) => {
  const variants = {
    primary: 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-600/20',
    secondary: 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg shadow-zinc-900/10',
    ghost: 'bg-transparent hover:bg-zinc-100 text-zinc-600',
    outline: 'border border-zinc-200 hover:bg-zinc-50 text-zinc-700',
  };
  
  return (
    <button 
      className={cn(
        'px-4 py-2.5 rounded-2xl font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100 cursor-pointer',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const CustomDropdown = ({ value, options, onChange, placeholder = "Sélectionner" }: { value: string, options: string[], onChange: (v: string) => void, placeholder?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-between transition-all outline-none",
          isOpen ? "ring-2 ring-orange-500/20 border-orange-500/50" : ""
        )}
      >
        <span className={cn("text-sm font-medium", value ? "text-zinc-900" : "text-zinc-400")}>
          {value || placeholder}
        </span>
        <ChevronRight size={18} className={cn("text-zinc-400 transition-transform duration-300", isOpen ? "rotate-90" : "")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-[60] left-0 right-0 mt-2 bg-white rounded-2xl border border-zinc-100 shadow-2xl overflow-hidden max-h-60 overflow-y-auto no-scrollbar"
          >
            <div className="p-2 space-y-1">
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors",
                    value === opt ? "bg-orange-50 text-orange-600" : "hover:bg-zinc-50 text-zinc-600"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const LoginForm = ({ onLogin, onToggle }: { onLogin: (firstName: string, lastName: string, pass: string) => void, onToggle: () => void }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    if (!firstName || !lastName || !password) {
      alert("Veuillez remplir tous les champs !");
      return;
    }
    onLogin(firstName, lastName, password);
  };

  return (
    <div className="w-full space-y-6">
      <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-xl space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Prénom</label>
            <input 
              type="text" 
              value={firstName} 
              onChange={e => setFirstName(e.target.value)} 
              placeholder="Ex: Marc" 
              className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-100 outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Nom</label>
            <input 
              type="text" 
              value={lastName} 
              onChange={e => setLastName(e.target.value)} 
              placeholder="Ex: Yao" 
              className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-100 outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium" 
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Mot de passe</label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Votre mot de passe" 
              className="w-full p-4 rounded-2xl bg-zinc-50 border-none outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium" 
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-orange-600 transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        <Button 
          variant="primary" 
          className="w-full py-5 rounded-3xl bg-orange-600 hover:bg-orange-700 shadow-orange-600/20 font-black uppercase tracking-widest text-[10px]"
          onClick={handleLogin}
        >
          Se connecter
        </Button>
      </div>
      <p className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
        Pas encore de compte ? <button onClick={onToggle} className="text-orange-600 hover:underline">S'inscrire gratuitement</button>
      </p>
    </div>
  );
};

const SignupForm = ({ onSignup, onToggle }: { onSignup: (data: any) => void, onToggle: () => void }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    phoneVisibility: 'public',
    city: 'Yamoussoukro',
    password: '',
    confirmPassword: '',
    isStudent: false,
    studentSchool: CAMPUS_SCHOOLS[0]
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = () => {
    if (!formData.firstName || !formData.lastName || !formData.phoneNumber || !formData.password) {
      alert("Veuillez remplir tous les champs !");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      alert("Les mots de passe ne correspondent pas !");
      return;
    }
    onSignup(formData);
  };

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-xl space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Prénom</label>
            <input 
              type="text" 
              value={formData.firstName} 
              onChange={e => setFormData({...formData, firstName: e.target.value})} 
              placeholder="Ex: Marc" 
              className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-100 outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Nom</label>
            <input 
              type="text" 
              value={formData.lastName} 
              onChange={e => setFormData({...formData, lastName: e.target.value})} 
              placeholder="Ex: Yao" 
              className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-100 outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium" 
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Téléphone</label>
          <div className="flex gap-2">
            <div className="bg-zinc-50 px-4 py-4 rounded-2xl border border-zinc-100 flex items-center justify-center gap-2 text-xs font-black text-zinc-400">
              <span>+225</span>
            </div>
            <input 
              type="tel" 
              value={formData.phoneNumber} 
              onChange={e => setFormData({...formData, phoneNumber: e.target.value})} 
              placeholder="0700000000" 
              className="flex-1 p-4 rounded-2xl bg-zinc-50 border border-zinc-100 outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium" 
            />
          </div>
        </div>

        {/* Checkbox "Je suis étudiant" placed right after phone */}
        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-3 cursor-pointer p-4 rounded-2xl bg-zinc-50 border border-zinc-100 hover:bg-zinc-100/40 select-none transition-colors">
            <input 
              type="checkbox" 
              checked={formData.isStudent} 
              onChange={e => setFormData({...formData, isStudent: e.target.checked})} 
              className="w-5 h-5 accent-orange-600 rounded cursor-pointer" 
            />
            <span className="text-xs font-black uppercase tracking-wider text-zinc-700">🎓 Je suis étudiant</span>
          </label>

          {/* Conditional message and School CustomDropdown */}
          {formData.isStudent && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 overflow-visible"
            >
              <div className="p-4 bg-orange-50/80 border border-orange-100 rounded-2xl text-xs text-orange-850 leading-relaxed font-black">
                Bienvenue sur l'espace Campus ! Ici, on troque et on vend entre étudiants de Yamoussoukro. Choisis ton école.
              </div>
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Choisis ton école</label>
                <CustomDropdown
                  value={formData.studentSchool}
                  options={CAMPUS_SCHOOLS}
                  onChange={val => setFormData({...formData, studentSchool: val})}
                  placeholder="Sélectionne ton école"
                />
              </div>
            </motion.div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-805 ml-1">Mot de passe</label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
              placeholder="Choisissez un mot de passe" 
              className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-100 outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium" 
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Confirmer</label>
          <input 
            type="password" 
            value={formData.confirmPassword} 
            onChange={e => setFormData({...formData, confirmPassword: e.target.value})} 
            placeholder="Confirmez votre mot de passe" 
            className="w-full p-4 rounded-2xl bg-zinc-50 border-none outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium" 
          />
        </div>

        <Button 
          variant="primary" 
          className="w-full py-5 rounded-3xl bg-orange-600 hover:bg-orange-700 shadow-orange-600/20 font-black uppercase tracking-widest text-[10px]"
          onClick={handleSignup}
        >
          Créer mon compte
        </Button>
      </div>
      <p className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
        Vous avez déjà un compte ? <button onClick={onToggle} className="text-orange-600 hover:underline">Se connecter</button>
      </p>
    </div>
  );
};

const ReviewAuthorName = ({ uid, defaultName, resolvedProfile }: { uid: string; defaultName: string; resolvedProfile?: any }) => {
  const [profileState, setProfileState] = useState<any>(null);

  useEffect(() => {
    if (resolvedProfile) return;
    if (!uid) return;
    fetchUserProfileCached(uid).then((data) => {
      if (data) setProfileState(data);
    });
  }, [uid, resolvedProfile]);

  const profile = resolvedProfile || profileState;

  const isCertified = (profile?.is_certified as any) === true || (profile?.is_certified as any) === 'vrai' || (profile?.isCertified as any) === true || (profile?.isCertified as any) === 'vrai' || (profile?.['is certified'] as any) === true || (profile?.['is certified'] as any) === 'vrai' || (profile?.badges as string[])?.some(b => b?.toLowerCase().includes('certif'));

  return (
    <div className="flex items-center gap-2">
      {profile?.photoURL ? (
        <img src={profile.photoURL} className="w-8 h-8 rounded-xl object-cover border border-zinc-100 shrink-0" alt="Avatar" />
      ) : (
        <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0">
          {(profile?.displayName || defaultName || '?')[0].toUpperCase()}
        </div>
      )}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-black text-[10px] uppercase tracking-widest text-zinc-400">
            {profile?.displayName || defaultName}
          </span>
          {isCertified && (
            <BadgeCheck size={14} className="text-orange-600 fill-orange-600 text-white shrink-0" />
          )}
          {profile?.isStudent && (
            <span className="shrink-0 px-2 py-0.5 bg-blue-50 text-blue-750 border border-blue-100 rounded-full text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5" title={`Étudiant à ${profile.studentSchool || ''}`}>
              <GraduationCap size={10} className="text-blue-600" />
              <span>Etudiant</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const ConversationRecipientInfo = ({ participantNames, participantIds, currentUser }: { participantNames: string[], participantIds: string[], currentUser: any }) => {
  const otherId = participantIds?.find(id => id !== currentUser?.uid);
  const defaultName = participantNames?.find(n => n !== currentUser?.displayName) || `Utilisateur ${otherId?.slice(0, 4) || ''}`;
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!otherId) return;
    fetchUserProfileCached(otherId).then((data) => {
      if (data) setProfile(data);
    });
  }, [otherId]);

  const defaultLetter = (participantNames?.find(n => n !== currentUser?.displayName) || 'U')[0].toUpperCase();
  const isCertified = (profile?.is_certified as any) === true || (profile?.is_certified as any) === 'vrai' || (profile?.isCertified as any) === true || (profile?.isCertified as any) === 'vrai' || (profile?.['is certified'] as any) === true || (profile?.['is certified'] as any) === 'vrai' || (profile?.badges as string[])?.some(b => b?.toLowerCase().includes('certif'));

  return (
    <div className="flex items-center gap-3 min-w-0">
      {/* Avatar */}
      {profile?.photoURL ? (
        <img src={profile.photoURL} className="w-14 h-14 rounded-[1.2rem] object-cover border-2 border-white shadow-sm shrink-0" alt="Avatar" />
      ) : (
        <div className="w-14 h-14 bg-orange-50 rounded-[1.2rem] flex items-center justify-center text-orange-600 font-black text-xl border-2 border-white shadow-sm shrink-0">
          {defaultLetter}
        </div>
      )}

      {/* Nom + Badges */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="font-black text-sm tracking-tighter truncate text-zinc-950">
          {profile?.displayName || defaultName}
        </span>
        {isCertified && (
          <BadgeCheck size={14} className="text-orange-600 fill-orange-600 text-white shrink-0" />
        )}
        {profile?.isStudent && (
          <span className="shrink-0 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5" title={`Étudiant à ${profile.studentSchool || ''}`}>
            <GraduationCap size={10} className="text-blue-600" />
            <span>Etudiant</span>
          </span>
        )}
      </div>
    </div>
  );
};

const ReviewSection = ({ 
  targetId, 
  targetType, 
  user, 
  onFocusChange,
  onReviewSubmitted
}: { 
  targetId: string, 
  targetType: 'user' | 'product', 
  user: User | null, 
  onFocusChange?: (focused: boolean) => void,
  onReviewSubmitted?: (rating: number) => void
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [authorProfiles, setAuthorProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    let active = true;
    const field = targetType === 'user' ? 'toUserId' : 'toProductId';
    const q = query(
      collection(db, 'reviews'),
      where(field, '==', targetId),
      orderBy('createdAt', 'desc')
    );
    getDocs(q).then((snap) => {
      if (!active) return;
      const revs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Review));
      setReviews(revs);
    }).catch((e) => {
      if (active) {
        handleFirestoreError(e, OperationType.LIST, 'reviews');
      }
    });
    return () => {
      active = false;
    };
  }, [targetId, targetType]);

  useEffect(() => {
    if (!reviews || reviews.length === 0) return;
    let active = true;
    Promise.all(reviews.map(async r => {
      try {
        const data = await fetchUserProfileCached(r.fromUserId);
        return { id: r.fromUserId, data };
      } catch (err) {
        return { id: r.fromUserId, data: null };
      }
    })).then((results) => {
      if (!active) return;
      const map: Record<string, any> = {};
      results.forEach(res => {
        if (res.data) {
          map[res.id] = res.data;
        }
      });
      setAuthorProfiles(prev => ({ ...prev, ...map }));
    });
    return () => {
      active = false;
    };
  }, [reviews]);

  const handleSubmit = async () => {
    // Security check: ensure user is authenticated and target reference is valid
    if (!auth.currentUser || !user || !targetId) {
      alert("Vous devez être connecté pour soumettre un avis.");
      return;
    }
    if (user.uid === targetId || !rating || !comment.trim()) return;
    
    // Enforce 1 review limit per user
    const hasReviewed = reviews.some(r => r.fromUserId === user.uid);
    if (hasReviewed) {
      alert(targetType === 'user' ? "Vous avez déjà donné votre avis sur ce vendeur !" : "Vous avez déjà donné votre avis sur cet article !");
      return;
    }

    setLoading(true);
    const field = targetType === 'user' ? 'toUserId' : 'toProductId';
    try {
      const batch = writeBatch(db);
      const reviewRef = doc(collection(db, 'reviews'));
      
      batch.set(reviewRef, {
        fromUserId: user.uid,
        fromUserName: user.displayName || 'Utilisateur',
        toUserId: targetType === 'user' ? targetId : '',
        toProductId: targetType === 'product' ? targetId : '',
        rating,
        comment,
        createdAt: serverTimestamp()
      });

      // Update user stats right here on user submit action to avoid recursive updates in onSnapshot
      if (targetType === 'user') {
        const newRevs = [...reviews, { rating } as Review];
        const avg = newRevs.reduce((acc, r) => acc + r.rating, 0) / newRevs.length;
        const userRef = doc(db, 'users', targetId);
        batch.update(userRef, {
          rating: Number(avg.toFixed(1)),
          reviewCount: newRevs.length
        });

        // Promptly update memory cache to keep UI speed intact
        if (globalUserProfileCache[targetId]) {
          globalUserProfileCache[targetId].rating = Number(avg.toFixed(1));
          globalUserProfileCache[targetId].reviewCount = newRevs.length;
        }
      }

      // Notify the recipient
      let receiverId = targetId;
      let reviewBody = `Nouvel avis (${rating} étoiles) : "${comment.slice(0, 50)}${comment.length > 50 ? '...' : ''}"`;
      
      if (targetType === 'product') {
        const pSnap = await getDoc(doc(db, 'products', targetId));
        if (pSnap.exists()) {
          receiverId = pSnap.data().sellerId;
        }
      }

      if (receiverId && receiverId !== user.uid) {
        const notifRef = doc(collection(db, 'users', receiverId, 'notifications'));
        batch.set(notifRef, {
          type: 'comment',
          title: 'Nouveau commentaire',
          body: reviewBody,
          toUserId: receiverId,
          fromUserId: user.uid,
          fromUserName: user.displayName || 'Utilisateur',
          productId: targetType === 'product' ? targetId : '',
          createdAt: serverTimestamp(),
          read: false
        });
      }

      await batch.commit();
      
      // Update local state without needing another Firestore query
      const localReview: Review = {
        id: reviewRef.id,
        fromUserId: user.uid,
        fromUserName: user.displayName || 'Utilisateur',
        toUserId: targetType === 'user' ? targetId : '',
        toProductId: targetType === 'product' ? targetId : '',
        rating,
        comment,
        createdAt: new Date() as any
      };
      setReviews(prev => [localReview, ...prev]);

      alert("Votre avis a bien été envoyé ! Merci pour votre retour.");
      
      // Trigger callback if provided
      if (onReviewSubmitted) {
        onReviewSubmitted(rating);
      }

      setRating(0);
      setComment('');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'reviews');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-xl tracking-tight uppercase">
          {targetType === 'product' ? 'Avis sur ce produit' : 'Avis sur le vendeur'}
        </h3>
        <div className="flex items-center gap-1 text-orange-600 font-black">
          <Star size={16} className="fill-current" />
          <span>{reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : 'N/A'}</span>
          <span className="text-zinc-300 font-bold ml-1">({reviews.length})</span>
        </div>
      </div>

      {user && user.uid !== targetId && (
        <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100 space-y-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onClick={() => setRating(s)} className={cn("transition-all", rating >= s ? "text-orange-500 scale-110" : "text-zinc-200")}>
                <Star size={24} fill={rating >= s ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <textarea 
            value={comment}
            onChange={e => setComment(e.target.value)}
            onFocus={() => onFocusChange?.(true)}
            onBlur={() => onFocusChange?.(false)}
            placeholder={targetType === 'product' ? "Ce que vous pensez de l'article..." : "Votre expérience avec ce vendeur..."}
            className="w-full p-4 rounded-2xl bg-white border border-zinc-100 min-h-[100px] outline-none focus:ring-4 focus:ring-orange-500/5 text-sm font-medium"
          />
          <Button variant="primary" disabled={loading || !rating || !comment.trim()} onClick={handleSubmit} className="w-full rounded-2xl uppercase tracking-widest font-black text-xs py-4">
            {loading ? "Envoi..." : "Publier l'avis"}
          </Button>
        </div>
      )}

      {user && user.uid === targetId && (
        <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl text-center">
           <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">Vous ne pouvez pas vous noter vous-même</p>
        </div>
      )}

      <div className="space-y-4">
        {reviews.map(r => (
          <div key={r.id} className="p-5 bg-white rounded-2xl border border-zinc-100 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <ReviewAuthorName uid={r.fromUserId} defaultName={r.fromUserName} resolvedProfile={authorProfiles[r.fromUserId]} />
              <div className="flex gap-0.5 text-orange-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={10} fill={i < r.rating ? "currentColor" : "none"} />
                ))}
              </div>
            </div>
            <p className="text-sm font-medium text-zinc-600 italic">"{r.comment}"</p>
          </div>
        ))}
        {reviews.length === 0 && (
          <p className="text-center text-xs font-bold text-zinc-300 py-4 uppercase tracking-widest">Aucun avis pour le moment</p>
        )}
      </div>
    </div>
  );
};

const ProfileSettings = ({ profile, onSave, onBack }: { profile: UserProfile, onSave: (data: Partial<UserProfile>) => void, onBack: () => void }) => {
  const [data, setData] = useState({
    displayName: profile.displayName || '',
    bio: profile.bio || '',
    phoneNumber: profile.phoneNumber || '',
    neighborhood: profile.neighborhood || '',
    city: profile.city || 'Yamoussoukro',
    phoneVisibility: profile.phoneVisibility || 'public',
    photoURL: profile.photoURL || '',
    coverURL: profile.coverURL || '',
    isStudent: profile.isStudent || false,
    studentSchool: profile.studentSchool || CAMPUS_SCHOOLS[0]
  });
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleImageUpload = (type: 'photo' | 'cover', file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const isCover = type === 'cover';
        const MAX_WIDTH = isCover ? 1920 : 1200;
        const MAX_HEIGHT = isCover ? 1080 : 1200;
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
        
        const base64Image = canvas.toDataURL('image/jpeg', 0.9);
        if (type === 'photo') {
          setData(prev => ({ ...prev, photoURL: base64Image }));
        } else {
          setData(prev => ({ ...prev, coverURL: base64Image }));
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setLoading(true);
    let updatedBadges = [...(profile.badges || [])];
    if (data.isStudent) {
      if (!updatedBadges.includes('🎓 Étudiant')) {
        updatedBadges.push('🎓 Étudiant');
      }
    } else {
      updatedBadges = updatedBadges.filter(b => b !== '🎓 Étudiant');
    }
    
    const finalData = {
      ...data,
      badges: updatedBadges
    };
    await onSave(finalData);
    setLoading(false);
    onBack();
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-white border border-zinc-100 rounded-2xl shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-black uppercase tracking-tighter">PARAMÈTRES</h2>
      </header>

      {/* Cover and Profile Upload Cards */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-zinc-100 shadow-xl space-y-6">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1 block mb-2">PHOTOS DU PROFIL</label>
          
          {/* Cover Photo Upload */}
          <div className="relative h-32 bg-zinc-100 rounded-2xl overflow-hidden group border border-zinc-200 shadow-inner flex items-center justify-center">
            {data.coverURL ? (
              <img src={data.coverURL} className="w-full h-full object-cover" alt="Couverture" />
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-400 gap-1.5 p-4 text-center">
                <Camera size={20} className="text-zinc-400" />
                <span className="text-[8px] font-black uppercase tracking-widest">Photo de couverture</span>
              </div>
            )}
            <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-[9px] uppercase font-black tracking-widest gap-2">
              <Camera size={14} />
              Importer la couverture
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload('cover', file);
                }}
              />
            </label>
          </div>

          {/* Profile Photo Upload */}
          <div className="flex justify-center -mt-12 relative z-10">
            <div className="relative w-24 h-24 rounded-[1.8rem] bg-orange-100 border-4 border-white shadow-xl overflow-hidden group flex items-center justify-center">
              {data.photoURL ? (
                <img src={data.photoURL} className="w-full h-full object-cover" alt="Profil" />
              ) : (
                <span className="text-orange-600 text-3xl font-black italic">{profile.displayName?.[0] || 'U'}</span>
              )}
              <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-[8px] uppercase font-black tracking-widest gap-1 p-2 text-center leading-none">
                <Camera size={12} />
                <span>Modifier photo</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload('photo', file);
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Nom d'affichage</label>
          <input 
            type="text" 
            value={data.displayName} 
            onChange={e => setData({...data, displayName: e.target.value})}
            className="w-full p-4 rounded-2xl bg-zinc-50 border-none outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Bio</label>
          <textarea 
            value={data.bio} 
            onChange={e => setData({...data, bio: e.target.value})}
            className="w-full p-4 rounded-2xl bg-zinc-50 border-none outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium min-h-[100px]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Téléphone</label>
          <input 
            type="tel" 
            value={data.phoneNumber} 
            onChange={e => setData({...data, phoneNumber: e.target.value})}
            className="w-full p-4 rounded-2xl bg-zinc-50 border-none outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium"
          />
        </div>

        <div className="space-y-1.5 opacity-50">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Ville</label>
          <div className="w-full p-4 rounded-2xl bg-zinc-100 border-none text-sm font-bold text-zinc-700">
            Yamoussoukro
          </div>
        </div>

        <div className="space-y-1.5 relative">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Quartier</label>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full p-4 rounded-2xl bg-zinc-50 border-none outline-none text-sm font-semibold flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-orange-500/20"
          >
            <span className={data.neighborhood ? "text-zinc-900" : "text-zinc-400"}>
              {data.neighborhood || "Sélectionnez un quartier"}
            </span>
            <ChevronDown size={16} className={`text-zinc-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>
          
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-[110] left-0 right-0 mt-2 bg-white rounded-2xl border border-zinc-100 shadow-2xl max-h-60 overflow-y-auto p-2 space-y-1"
              >
                <button
                  type="button"
                  onClick={() => {
                    setData({...data, neighborhood: ''});
                    setIsDropdownOpen(false);
                  }}
                  className="w-full text-left p-3 rounded-xl hover:bg-zinc-50 text-xs font-bold text-zinc-400 transition-colors"
                >
                  Aucun quartier
                </button>
                {NEIGHBORHOODS.map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setData({...data, neighborhood: q});
                      setIsDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-xl text-xs font-black transition-colors flex items-center justify-between",
                      data.neighborhood === q ? "bg-orange-50 text-orange-600" : "hover:bg-zinc-50 text-zinc-700"
                    )}
                  >
                    <span>{q}</span>
                    {data.neighborhood === q && <Check size={14} className="text-orange-600" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Toggle statut étudiant */}
        <div className="p-5 bg-zinc-50 rounded-3xl border border-zinc-100/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                data.isStudent ? "bg-orange-100 text-orange-600" : "bg-zinc-100 text-zinc-400"
              )}>
                <GraduationCap size={20} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-zinc-900 leading-tight">Statut Étudiant</p>
                <p className="text-[10px] text-zinc-400 font-bold">Activer le badge et l'espace Campus</p>
              </div>
            </div>
            
            <button 
              type="button"
              onClick={() => {
                setData(prev => ({ ...prev, isStudent: !prev.isStudent }));
              }}
              className={cn(
                "w-12 h-6 rounded-full p-1 transition-all duration-300",
                data.isStudent ? "bg-orange-600" : "bg-zinc-200"
              )}
            >
              <motion.div 
                animate={{ x: data.isStudent ? 24 : 0 }}
                className="w-4 h-4 bg-white rounded-full shadow-sm"
              />
            </button>
          </div>

          <AnimatePresence>
            {data.isStudent && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-1.5 pt-1 overflow-visible"
              >
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Sélectionne ton école</label>
                <CustomDropdown
                  value={data.studentSchool}
                  options={CAMPUS_SCHOOLS}
                  onChange={val => setData(prev => ({ ...prev, studentSchool: val }))}
                  placeholder="Sélectionne ton école"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pt-4 space-y-4">
           {loading ? (
             <div className="flex justify-center p-4">
               <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
             </div>
           ) : (
             <Button variant="primary" className="w-full py-4 uppercase font-black tracking-widest rounded-2xl shadow-orange-600/20" onClick={handleSubmit}>
               Sauvegarder
             </Button>
           )}
        </div>
      </div>
    </div>
  );
};

const ProductCardSkeleton = () => (
    <div className="bg-white rounded-[2rem] overflow-hidden border border-zinc-100 animate-pulse transition-all">
      <div className="aspect-[4/5] bg-zinc-100 skeleton" />
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="w-16 h-4 bg-zinc-50 rounded-full skeleton" />
          <div className="w-12 h-4 bg-zinc-50 rounded-full skeleton" />
        </div>
        <div className="h-4 w-3/4 bg-zinc-100 rounded skeleton" />
        <div className="h-5 w-1/2 bg-zinc-50 rounded skeleton" />
      </div>
    </div>
);

const ProductCard = ({ product, onClick, favorite, onFavorite, onBuy, isOwner }: { product: Product; onClick: () => void; favorite?: boolean; onFavorite?: (e: React.MouseEvent) => void; onBuy?: (e: React.MouseEvent) => void, isOwner?: boolean }) => {
  const isDisabled = product.status === 'pending' || product.status === 'sold' || product.transactionInProgress || (product as any)['transactionInProgress'] === true;
  const [isCertified, setIsCertified] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [studentSchool, setStudentSchool] = useState('');

  useEffect(() => {
    if (!product.sellerId) return;
    fetchUserProfileCached(product.sellerId).then((data) => {
      if (data) {
        const cert = (data.is_certified as any) === true || (data.is_certified as any) === 'vrai' || (data.isCertified as any) === true || (data.isCertified as any) === 'vrai' || (data['is certified'] as any) === true || (data['is certified'] as any) === 'vrai' || (data.badges as string[])?.some(b => b?.toLowerCase().includes('certif'));
        setIsCertified(cert);
        setIsStudent(!!data.isStudent);
        setStudentSchool(data.studentSchool || '');
      }
    });
  }, [product.sellerId]);

  return (
    <motion.div 
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileTap={isDisabled ? undefined : { scale: 0.98 }}
      onClick={isDisabled ? undefined : onClick}
      className={cn(
        "group bg-white rounded-[2rem] overflow-hidden border transition-all duration-300 relative",
        isDisabled ? "cursor-default border-zinc-200 opacity-90" : "cursor-pointer border-zinc-100 hover:shadow-[0_15px_30px_rgba(0,0,0,0.05)]"
      )}
    >
      {!isDisabled && (
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onFavorite?.(e); }}
            className="px-3 py-2 rounded-full bg-white/90 backdrop-blur-md flex items-center gap-2 border border-zinc-100 shadow-sm transition-all active:scale-75 hover:bg-white"
          >
            <Heart className={cn("w-4 h-4 transition-colors", favorite ? "fill-red-500 text-red-500" : "text-zinc-400")} />
            <span className="text-[10px] font-black text-orange-600">{product.likesCount || 0}</span>
          </button>
        </div>
      )}

    <div className="aspect-[4/5] relative overflow-hidden bg-zinc-100">
      <img 
        src={product.images[0] || 'https://images.unsplash.com/photo-1594498259353-c0ad33568dad?w=800&q=80'} 
        alt={product.title}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-700"
      />
      <div className="absolute bottom-3 left-3 flex flex-col gap-2">
        <div className="bg-zinc-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest text-white shadow-lg w-fit">
          {product.condition}
        </div>
        {product.status !== 'sold' && (product.status === 'pending' || product.transactionInProgress || (product as any)['transactionInProgress'] === true) && (
          <div className="bg-orange-500 backdrop-blur-md px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest text-white shadow-lg flex items-center gap-1.5 w-fit animate-pulse">
            <Clock size={10} />
            Transaction en cours
          </div>
        )}
        {product.status === 'sold' && (
          <div className="bg-red-600 backdrop-blur-md px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest text-white shadow-lg flex items-center gap-1.5 w-fit">
            <ShoppingBag size={10} />
            Vendu
          </div>
        )}
      </div>
      {!isOwner ? (
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      ) : (
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
    <div className="p-4 flex items-center justify-between gap-2 bg-white">
      <div className="flex-1 min-w-0">
        <h3 className="font-black text-zinc-900 truncate text-sm mb-1 uppercase tracking-tighter leading-tight font-sans">{product.title}</h3>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            {product.price > 0 ? (
              <span className="text-orange-600 font-extrabold tracking-tight italic text-base flex items-baseline">
                {formatPrice(product.price)}
                <span className="text-[11px] ml-1 uppercase not-italic font-black text-orange-600 tracking-normal opacity-100">FCFA</span>
              </span>
            ) : (
              <span className="text-blue-600 font-black tracking-tighter text-[10px] uppercase font-sans">
                Troc Simple
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isCertified && (
          <div className="shrink-0 flex items-center justify-center p-1 bg-orange-50 border border-orange-100 rounded-xl" title="Vendeur Certifié">
            <BadgeCheck size={20} className="text-orange-600 fill-orange-600 text-white shrink-0" />
          </div>
        )}
        {isStudent && (
          <div className="shrink-0 flex items-center justify-center p-1 bg-blue-50 border border-blue-100 rounded-xl" title={`Étudiant à ${studentSchool || ''}`}>
            <GraduationCap size={20} className="text-blue-600 shrink-0" />
          </div>
        )}
      </div>
    </div>
  </motion.div>
  );
};

const TrocVerificationModal = ({ exchange, user, onVerify, onClose }: { exchange: any, user: User | null, onVerify: (code: string) => Promise<boolean> | boolean, onClose: () => void }) => {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isVerifying, setIsVerifying] = useState(false);
  const isSeller = exchange.sellerId === user?.uid;

  const handleVerifyClick = async () => {
    if (code.length !== 4) return;
    setIsVerifying(true);
    setStatus('idle');
    try {
      const isOk = await onVerify(code);
      if (isOk) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white p-8 rounded-[3rem] shadow-2xl max-w-sm w-full space-y-8 text-center"
      >
        <div className="w-20 h-20 bg-orange-100 rounded-[2rem] flex items-center justify-center mx-auto">
          <Handshake className="w-10 h-10 text-orange-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase tracking-tighter italic leading-none">
            {exchange.type === 'purchase' ? "Validation de la vente" : "Validation du Troc"}
          </h2>
          <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-2">
            {isSeller ? "Donnez ce code à l'acheteur" : "Saisissez le code du vendeur"}
          </p>
        </div>

        {isSeller ? (
          <div className="bg-zinc-50 p-8 rounded-3xl border-2 border-dashed border-orange-200">
            <span className="text-5xl font-black tracking-[0.2em] italic text-zinc-900">{exchange.trocCode || '----'}</span>
          </div>
        ) : (
          <div className="space-y-4">
             <input 
              type="text" 
              maxLength={4} 
              value={code}
              onChange={e => {
                setStatus('idle');
                setCode(e.target.value.replace(/\D/g, ''));
              }}
              placeholder="0000"
              disabled={isVerifying || status === 'success'}
              className={cn(
                "w-full text-center text-5xl font-black italic tracking-[0.3em] p-6 rounded-[2rem] bg-zinc-50 border-2 outline-none focus:ring-4 text-zinc-900 transition-all",
                status === 'success' ? "border-green-500 bg-green-50 text-green-700" :
                status === 'error' ? "border-red-500 bg-red-50 text-red-700 animate-shake" :
                "border-transparent focus:ring-orange-500/20 bg-zinc-50"
              )}
             />

             {status === 'success' && (
               <p className="text-xs font-black text-green-600 uppercase tracking-wider">
                 Code correct ! Validation réussie.
               </p>
             )}

             {status === 'error' && (
               <p className="text-xs font-black text-red-600 uppercase tracking-wider">
                 Code incorrect ! Veuillez réessayer.
               </p>
             )}

             <Button 
              variant="primary" 
              className={cn(
                "w-full py-5 rounded-3xl font-black uppercase tracking-widest text-[11px]",
                status === 'success' ? "bg-green-600 hover:bg-green-700 shadow-green-600/20" : ""
              )}
              disabled={code.length !== 4 || isVerifying || status === 'success'}
              onClick={handleVerifyClick}
             >
               {isVerifying ? "Vérification..." : status === 'success' ? "Code validé" : "Vérifier le code"}
             </Button>
          </div>
        )}

        <button onClick={onClose} className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-600 transition-colors">
           Fermer
         </button>
      </motion.div>
    </motion.div>
  );
};

const MyTrocSection = ({ 
  exchanges, 
  user, 
  products, 
  onStatusUpdate, 
  onVerifyCode, 
  onStartChat,
  onTabChange
}: { 
  exchanges: any[], 
  user: User | null, 
  products: Product[], 
  onStatusUpdate: (exId: string, status: string) => void, 
  onVerifyCode: (ex: any) => void, 
  onStartChat?: (userId: string, productId?: string) => void,
  onTabChange?: (tab: 'ongoing' | 'past') => void
}) => {
  const [activeTab, setActiveTabInternal] = useState<'ongoing' | 'past'>('ongoing');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTrocs, setSelectedTrocs] = useState<string[]>([]);

  const setActiveTab = (tab: 'ongoing' | 'past') => {
    setActiveTabInternal(tab);
    onTabChange?.(tab);
  };

  const handleDeleteExchange = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    safeConfirm("Voulez-vous vraiment supprimer ce troc de l'historique ?", async () => {
      try {
        await deleteDoc(doc(db, 'exchanges', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `exchanges/${id}`);
      }
    });
  };

  const filteredExchanges = useMemo(() => {
    // Show both trade requests and purchase offers as requested
    const sorted = [...exchanges].sort((a, b) => {
      const timeA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
      const timeB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
    if (activeTab === 'ongoing') {
      return sorted.filter(e => e.status === 'pending' || e.status === 'accepted');
    }
    return sorted.filter(e => e.status === 'completed' || e.status === 'cancelled');
  }, [exchanges, activeTab]);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-black tracking-tighter uppercase italic">Mes Transactions</h2>
        <div className="h-1.5 w-12 bg-orange-600 rounded-full mt-1" />
      </header>

      <div className="flex bg-white p-1.5 rounded-full border border-zinc-100 shadow-sm relative z-10">
        <button 
          onClick={() => { setActiveTab('ongoing'); setIsEditMode(false); setSelectedTrocs([]); }}
          className={cn(
            "flex-1 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === 'ongoing' ? "bg-zinc-900 text-white shadow-lg" : "text-zinc-400 hover:text-zinc-600"
          )}
        >
          En cours ({exchanges.filter(e => e.status === 'pending' || e.status === 'accepted').length})
        </button>
        <button 
          onClick={() => setActiveTab('past')}
          className={cn(
            "flex-1 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === 'past' ? "bg-zinc-900 text-white shadow-lg" : "text-zinc-400 hover:text-zinc-600"
          )}
        >
          Historique
        </button>
      </div>

      <div className="space-y-4 pb-32">
        {filteredExchanges.map(ex => {
          const isSeller = ex.sellerId === user?.uid;
          const exchangeProducts = products.filter(p => ex.exchangeProductIds?.includes(p.id)) || (ex.exchangeProductId ? products.filter(p => p.id === ex.exchangeProductId) : []);
          const isSelected = selectedTrocs.includes(ex.id);

          return (
            <motion.div 
              key={ex.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => {
                if (isEditMode && activeTab === 'past') {
                  if (isSelected) setSelectedTrocs(prev => prev.filter(id => id !== ex.id));
                  else setSelectedTrocs(prev => [...prev, ex.id]);
                }
              }}
              className={cn("bg-white p-6 rounded-[2rem] border shadow-sm space-y-5 transition-all relative",
                isEditMode && activeTab === 'past' ? "cursor-pointer pl-14" : "",
                isSelected ? "ring-2 ring-orange-600 bg-orange-50 border-orange-200" : "border-zinc-100"
              )}
            >
              {isEditMode && activeTab === 'past' && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    isSelected ? "bg-orange-600 border-orange-600 text-white" : "border-zinc-300 bg-white"
                  )}>
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="bg-orange-50 text-orange-600 text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest">
                     {ex.type === 'exchange' ? 'Échange' : 'Achat'}
                   </div>
                   <div className={cn(
                     "text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest",
                     ex.status === 'pending' ? "bg-zinc-100 text-zinc-500" : 
                     ex.status === 'accepted' ? "bg-green-50 text-green-600" :
                     ex.status === 'completed' ? "bg-zinc-900 text-white" : "bg-red-50 text-red-600"
                   )}>
                     {ex.status === 'pending' ? (isSeller ? 'Demande reçue' : 'En attente') : 
                      ex.status === 'accepted' ? 'Accepté' :
                      ex.status === 'completed' ? 'Terminé' : 'Annulé'}
                   </div>
                </div>
                <div className="text-[10px] font-bold text-zinc-400">
                  {ex.updatedAt?.seconds ? new Date(ex.updatedAt.seconds * 1000).toLocaleDateString() : 'Aujourd\'hui'}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <img src={ex.productImage || 'https://images.unsplash.com/photo-1594498259353-c0ad33568dad?w=200&q=80'} className="w-16 h-16 rounded-2xl object-cover shadow-sm bg-zinc-100" />
                  <div className="absolute -bottom-2 -right-2 bg-white p-1 rounded-lg border border-zinc-100 shadow-sm">
                    <Handshake size={12} className="text-orange-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-xs uppercase truncate tracking-tight">{ex.productTitle}</h4>
                  <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-1">
                    {ex.type === 'purchase' ? (
                      isSeller ? "Vous avez reçu une proposition d'achat" : "Vous aimeriez acheter ceci"
                    ) : (
                      isSeller ? 'Proposé par un acheteur' : 'Vous avez proposé ceci'
                    )}
                  </p>
                </div>
                {ex.type === 'exchange' && (
                  <div className="flex -space-x-3 overflow-hidden">
                    {exchangeProducts.slice(0, 3).map((p, idx) => (
                      <div key={p.id} className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white ring-2 ring-orange-50 shrink-0">
                        <img src={p.images?.[0]} className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {exchangeProducts.length > 3 && (
                      <div className="w-12 h-12 rounded-2xl bg-zinc-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-zinc-400 ring-2 ring-orange-50 shrink-0">
                        +{exchangeProducts.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {ex.priceAdjustment > 0 && (
                <div className="px-5 py-3 bg-zinc-50 rounded-2xl flex items-center justify-between border border-dashed border-zinc-200">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Somme ajoutée</span>
                  <span className="text-sm font-black text-orange-600 italic">+{formatPrice(ex.priceAdjustment)}</span>
                </div>
              )}

              {ex.status === 'pending' && isSeller && (
                <div className="flex gap-2">
                  <Button variant="primary" className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest" onClick={() => onStatusUpdate(ex.id, 'accepted')}>
                    Accepter
                  </Button>
                  <Button variant="outline" className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-none bg-red-50 text-red-600" onClick={() => onStatusUpdate(ex.id, 'cancelled')}>
                    Refuser
                  </Button>
                </div>
              )}

              {ex.status === 'accepted' && (
                <div className="space-y-2">
                  <Button 
                    variant="secondary" 
                    className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] bg-zinc-900 shadow-xl shadow-zinc-900/20" 
                    onClick={() => onVerifyCode(ex)}
                  >
                     {isSeller ? (ex.type === 'purchase' ? "Confirmer la vente" : "Confirmer le troc") : "Saisir le code"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 border border-orange-100" 
                    onClick={() => onStartChat?.(isSeller ? ex.buyerId : ex.sellerId, ex.productId)}
                  >
                     Commencer à discuter
                  </Button>
                </div>
              )}
              
              {!isSeller && ex.status === 'pending' && (
                <p className="text-center text-[10px] font-bold text-zinc-400 italic">En attente de réponse du vendeur...</p>
              )}

              {ex.status === 'completed' && ((isSeller && !ex.sellerRating) || (!isSeller && !ex.buyerRating)) && (
                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 text-center mb-3">Expérience terminée ! Laissez un avis.</p>
                  <ReviewSection 
                    targetId={isSeller ? ex.buyerId : ex.sellerId} 
                    targetType="user" 
                    user={user} 
                    onReviewSubmitted={async (submittedRating) => {
                      if (!user) return;
                      try {
                        const exRef = doc(db, 'exchanges', ex.id);
                        await updateDoc(exRef, {
                          [isSeller ? 'sellerRating' : 'buyerRating']: submittedRating,
                          updatedAt: serverTimestamp()
                        });
                      } catch (err) {
                        try {
                          handleFirestoreError(err, OperationType.UPDATE, 'exchanges');
                        } catch (rethrown: any) {
                          console.error("Failed to update exchange rating:", rethrown?.message || String(rethrown));
                        }
                      }
                    }}
                  />
                </div>
              )}


            </motion.div>
          );
        })}
        {filteredExchanges.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Handshake className="w-10 h-10 text-zinc-200" />
            </div>
            <h3 className="font-black uppercase tracking-widest text-[11px] text-zinc-400">Aucune transaction à afficher</h3>
            <p className="text-[10px] text-zinc-300 font-medium max-w-[200px] mx-auto mt-2">Commencez par proposer un échange ou un achat !</p>
          </div>
        )}
      </div>

      {activeTab === 'past' && (
        <div className="fixed bottom-6 inset-x-6 flex gap-2 z-50 p-2 bg-white/70 backdrop-blur-3xl rounded-[2.5rem] border border-white shadow-[0_32px_64px_rgba(0,0,0,0.1)]">
           <button 
             onClick={() => {
               setIsEditMode(!isEditMode);
               if (!isEditMode) setSelectedTrocs([]);
             }}
             className={cn(
               "flex-[0.8] py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2",
               isEditMode ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50"
             )}
           >
             {isEditMode ? <><Check size={14} /> Fait</> : <><Edit3 size={14} /> Modifier</>}
           </button>
           
           {isEditMode && (
             <>
               <button 
                 onClick={() => {
                    if (selectedTrocs.length === filteredExchanges.length) {
                      setSelectedTrocs([]);
                    } else {
                      setSelectedTrocs(filteredExchanges.map(e => e.id));
                    }
                 }}
                 className="flex-1 py-4 bg-zinc-100 border border-zinc-200 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest text-zinc-600 transition-all flex items-center justify-center gap-2 hover:bg-zinc-200"
               >
                 <ListChecks size={14} /> {selectedTrocs.length === filteredExchanges.length ? 'Désél.' : 'Tout sél.'}
               </button>
               <button 
                 disabled={selectedTrocs.length === 0}
                 onClick={() => {
                   safeConfirm(`Supprimer ${selectedTrocs.length} troc(s) de l'historique ?`, async () => {
                     const batch = writeBatch(db);
                     selectedTrocs.forEach(id => {
                       batch.delete(doc(db, 'exchanges', id));
                     });
                     try {
                       await batch.commit();
                       setSelectedTrocs([]);
                       setIsEditMode(false);
                     } catch (e) {
                       handleFirestoreError(e, OperationType.DELETE, `exchanges mass delete`);
                     }
                   });
                 }}
                 className={cn(
                   "flex-[0.8] py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl",
                   selectedTrocs.length > 0 ? "bg-red-600 text-white shadow-red-600/20" : "bg-zinc-100 text-zinc-400 cursor-not-allowed border-transparent"
                 )}
               >
                 <Trash2 size={14} /> ({selectedTrocs.length})
               </button>
             </>
           )}
        </div>
      )}
    </div>
  );
};

// --- Main App ---



export default function App() {
  const LOCAL_VERSION = "1.0.0";
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [updateDownloadUrl, setUpdateDownloadUrl] = useState("https://troc-shop-store.vercel.app/");
  const [serverVersion, setServerVersion] = useState<string | null>(null);

  useEffect(() => {
    const checkAppVersion = async () => {
      try {
        const configDocRef = doc(db, 'appConfig', 'version');
        const configDoc = await getDoc(configDocRef);
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
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const isQuota = errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('exhausted');
        if (isQuota) {
          console.warn("Firestore quota reached (expected on free tier). The app will run smoothly using offline cache.");
          if (typeof window !== 'undefined') {
            (window as any).__firestore_quota_exceeded = true;
            try {
              window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
            } catch (e) {}
          }
        } else {
          console.error("Failed to fetch app configuration / version:", err);
          handleFirestoreError(err, OperationType.GET, 'appConfig/version');
        }
      }
    };
    checkAppVersion();
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [homeProducts, setHomeProducts] = useState<Product[]>([]);
  const [explorerPages, setExplorerPages] = useState<Record<number, Product[]>>({});
  const [explorerPageLastDocs, setExplorerPageLastDocs] = useState<Record<number, any>>({});
  const [explorerHasMore, setExplorerHasMore] = useState(true);
  const [explorerLoading, setExplorerLoading] = useState(false);
  const explorerUnsubsRef = useRef<Record<number, () => void>>({});

  const explorerProducts = useMemo(() => {
    const flat: Product[] = [];
    const keys = Object.keys(explorerPages).map(Number).sort((a, b) => a - b);
    keys.forEach(k => {
      flat.push(...explorerPages[k]);
    });
    return flat;
  }, [explorerPages]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [filterPriceMax, setFilterPriceMax] = useState<number | null>(null);
  const [filterCondition, setFilterCondition] = useState<string>('Tous');
  const [filterNeighborhood, setFilterNeighborhood] = useState<string>('Tous');
  const [filterListingType, setFilterListingType] = useState<string>('Tous');
  const [filterStudentMode, setFilterStudentMode] = useState<boolean>(false);
  const [filterStudentSchool, setFilterStudentSchool] = useState<string>('Tous');
  const [filterCertifiedOnly, setFilterCertifiedOnly] = useState<boolean>(false);
  const [certifiedSellers, setCertifiedSellers] = useState<Record<string, boolean>>({});
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isNotificationEditMode, setIsNotificationEditMode] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
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

  const [showTrocVerifier, setShowTrocVerifier] = useState<any | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingTrocs, setPendingTrocs] = useState(0);
  const bottomNavItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bottomLimelightRef = useRef<HTMLDivElement | null>(null);
  const [isBottomLimelightReady, setIsBottomLimelightReady] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'mytroc' | 'sell' | 'messages' | 'profile' | 'auth' | 'notifications'>(() => {
    // Handle PWA shortcuts or URL parameters
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && ['home', 'search', 'mytroc', 'sell', 'messages', 'profile', 'notifications'].includes(tab)) {
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
      mytroc: 3,
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
  const [allUsersProfilesRaw, setAllUsersProfiles] = useState<Record<string, UserProfile>>({});
  const allUsersProfiles = useMemo(() => {
    return new Proxy(allUsersProfilesRaw, {
      get: (target, prop) => {
        if (typeof prop === 'string' && !(prop in target)) {
          return {};
        }
        return Reflect.get(target, prop);
      }
    });
  }, [allUsersProfilesRaw]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showStudentBubble, setShowStudentBubble] = useState(false);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [profileView, setProfileView] = useState<'main' | 'listings' | 'favorites' | 'settings'>('main');
  const [showExchangePicker, setShowExchangePicker] = useState(false);
  const [authFailedHelp, setAuthFailedHelp] = useState<string | null>(null);
  const isCreatingProfile = useRef(false);
  const unsubProfileRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Process redirect sign-in result for mobile/Capacitor environments
    const processRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          const u = result.user;
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
      if (unsubProfileRef.current) {
        unsubProfileRef.current();
        unsubProfileRef.current = null;
      }
      setUser(u);
      if (u) {
        if (activeTab === 'auth') setActiveTab('home');
        const userRef = doc(db, 'users', u.uid);
        
        // Mark user as online instantly in Firestore
        updateDoc(userRef, { isOnline: true }).catch(() => {
          // Fallback if document doesn't exist yet
        });

        unsubProfileRef.current = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const pData = snap.data();
            setProfile(pData as UserProfile);
            globalUserProfileCache[u.uid] = pData;
          } else if (!isCreatingProfile.current) {
            isCreatingProfile.current = true;
            const newProfile: UserProfile = {
              uid: u.uid,
              displayName: u.displayName || 'Utilisateur',
              email: u.email || '',
              photoURL: u.photoURL || '',
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
          handleFirestoreError(e, OperationType.GET, `users/${u.uid}`);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Add beforeunload event inside the effect to set offline on browser closed or tab switched
    const handleUnloadPresence = () => {
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        // We write to Firestore. Even if connection is closing, browser will attempt this fast.
        updateDoc(userRef, { isOnline: false }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleUnloadPresence);

    return () => {
      unsubscribe();
      if (unsubProfileRef.current) unsubProfileRef.current();
      window.removeEventListener('beforeunload', handleUnloadPresence);
      handleUnloadPresence();
    };
  }, []);

  // Separate favorites listener to ensure proper cleanup on logout
  useEffect(() => {
    if (!user) {
      setFavorites([]);
      return;
    }

    const unsub = onSnapshot(collection(db, 'users', user.uid, 'favorites'), (snap) => {
      setFavorites(snap.docs.map(d => d.id));
    }, (e) => {
      // Only report if still logged in as this user to avoid race condition error on logout
      if (auth.currentUser?.uid === user.uid) {
        handleFirestoreError(e, OperationType.GET, `users/${user.uid}/favorites`);
      }
    });

    return () => unsub();
  }, [user?.uid]);



  const loadExplorerPage = (pageIndex: number, lastDocOption: any) => {
    if (explorerLoading) return;
    if (isQuotaExceeded()) {
      console.warn("loadExplorerPage skipped: Quota exceeded flag active.");
      setExplorerLoading(false);
      return;
    }
    setExplorerLoading(true);

    let q = query(
      collection(db, 'products'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    if (pageIndex > 0 && lastDocOption) {
      q = query(
        collection(db, 'products'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDocOption),
        limit(20)
      );
    }

    getDocs(q).then((snapshot) => {
      const pList = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];
      
      setExplorerPages(prev => ({
        ...prev,
        [pageIndex]: pList
      }));

      if (snapshot.docs.length > 0) {
        const lastDocOfThisPage = snapshot.docs[snapshot.docs.length - 1];
        setExplorerPageLastDocs(prev => ({
          ...prev,
          [pageIndex]: lastDocOfThisPage
        }));
      }

      if (snapshot.docs.length < 20) {
        setExplorerHasMore(false);
      } else {
        setExplorerHasMore(true);
      }
      
      setExplorerLoading(false);
    }).catch((err) => {
      const errMsg = err?.message || String(err);
      const isQuota = errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('exhausted');
      if (isQuota) {
        console.warn("Quota exceeded loading explorer page:", errMsg);
      } else {
        console.error("Error loading explorer page:", err);
      }
      if (!(err instanceof Error && err.message.includes('offline'))) {
        handleFirestoreError(err, OperationType.LIST, `products-explorer-page-${pageIndex}`);
      }
      setExplorerLoading(false);
    });
  };

  useEffect(() => {
    let active = true;
    
    // Load page 0 of explorer products on mount
    loadExplorerPage(0, null);

    if (isQuotaExceeded()) {
      console.warn("Home products fetching skipped: Quota exceeded flag active.");
      setIsInitialLoading(false);
      return;
    }

    // Load first 10 home products on mount
    const qHome = query(
      collection(db, 'products'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    getDocs(qHome).then((snapshot) => {
      if (!active) return;
      const p = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];
      setHomeProducts(p);
      setIsInitialLoading(false);
    }).catch((e) => {
      if (!active) return;
      if (!(e instanceof Error && e.message.includes('offline'))) {
        handleFirestoreError(e, OperationType.LIST, 'products');
      }
      setIsInitialLoading(false);
    });

    return () => {
      active = false;
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
  }, [homeProducts, explorerProducts]);

  useEffect(() => {
    if (activeTab !== 'search') return;
    
    const handleScroll = () => {
      const threshold = 300; // Trigger loading 300px before bottom
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      
      if (docHeight - (scrollTop + windowHeight) < threshold) {
        if (!explorerLoading && explorerHasMore) {
          const pageKeys = Object.keys(explorerPages).map(Number);
          const lastPageIndex = pageKeys.length > 0 ? Math.max(...pageKeys) : -1;
          const nextPageIndex = lastPageIndex + 1;
          const lastDoc = lastPageIndex >= 0 ? explorerPageLastDocs[lastPageIndex] : null;
          
          if (nextPageIndex === 0 || lastDoc) {
            loadExplorerPage(nextPageIndex, lastDoc);
          }
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab, explorerPages, explorerPageLastDocs, explorerLoading, explorerHasMore]);

  useEffect(() => {
    const fetchCertifiedSellers = async () => {
      if (isQuotaExceeded()) {
        console.warn("fetchCertifiedSellers skipped: Quota exceeded flag active.");
        return;
      }
      try {
        const q = query(
          collection(db, 'users'),
          where('isCertified', '==', true),
          limit(200)
        );
        const snapshot = await getDocs(q);
        const usersMap: Record<string, UserProfile> = {};
        snapshot.forEach(docSnap => {
          const profileData = docSnap.data();
          usersMap[docSnap.id] = { uid: docSnap.id, ...profileData } as UserProfile;
          // Pre-populate global cache to speed up sub-component cached lookups to 0 reads!
          globalUserProfileCache[docSnap.id] = profileData;
        });
        setAllUsersProfiles(usersMap);
      } catch (e: any) {
        console.warn("Error fetching certified users profiles:", e?.message || String(e));
      }
    };
    fetchCertifiedSellers();
  }, []);


  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [previousProduct, setPreviousProduct] = useState<Product | null>(null);
  const [publicProfile, setPublicProfile] = useState<UserProfile | null>(null);
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authRequiredMessage, setAuthRequiredMessage] = useState<string | null>(null);

  const triggerAuthRequired = (message: string) => {
    setAuthRequiredMessage(message);
  };

  const closeAuthRequired = () => {
    setAuthRequiredMessage(null);
    setAuthMode('login');
    setActiveTab('auth');
  };

  // Handle selected seller profile loading
  useEffect(() => {
    const loadSellerProfile = async () => {
      if (!selectedSellerId) {
        setPublicProfile(null);
        setSellerProducts([]);
        return;
      }
      
      try {
        let profileData: UserProfile | null = null;
        if (globalUserProfileCache[selectedSellerId]) {
          profileData = globalUserProfileCache[selectedSellerId] as UserProfile;
        } else {
          const docRef = doc(db, 'users', selectedSellerId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            profileData = docSnap.data() as UserProfile;
            globalUserProfileCache[selectedSellerId] = profileData;
          }
        }

        if (profileData) {
          setPublicProfile(profileData);
          
          const q = query(
            collection(db, 'products'),
            where('sellerId', '==', selectedSellerId),
            orderBy('createdAt', 'desc')
          );
          const productsSnap = await getDocs(q);
          setSellerProducts(productsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const isQuota = errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('exhausted');
        if (isQuota) {
          console.warn("Quota exceeded loading seller profile (expected on free tier):", errMsg);
        } else {
          console.error("Error loading seller profile:", errMsg);
        }
        handleFirestoreError(err, OperationType.GET, `users/${selectedSellerId}`);
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
      try {
        await deleteDoc(doc(db, 'products', id));
        safeAlert("Annonce supprimée.");
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
      }
    });
  };

  const handleDeleteNotification = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    safeConfirm("Voulez-vous vraiment supprimer cette notification ?", async () => {
      try {
        await deleteDoc(doc(db, 'users', user!.uid, 'notifications', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `notifications/${id}`);
      }
    });
  };

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

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
          } else if (profileView !== 'main') {
            setProfileView('main');
            handled = true;
          } else if (activeTab !== 'home') {
            setActiveTab('home');
            handled = true;
          }

          if (!handled) {
            try {
              CapacitorApp.minimizeApp();
            } catch (err) {
              console.warn("Could not minimize app on back button:", err);
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
    activeTab
  ]);

  const activeConversationIdRef = useRef<string | null>(null);
  const profileRef = useRef<UserProfile | null>(null);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadMessages(0);
      setPendingTrocs(0);
      return;
    }

    // Notification permission request
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const q = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    let isFirst = true;
    const unsub = onSnapshot(q, (snap) => {
      const allNotifs = snap.docs.map(d => ({ id: d.id, ...d.data() }) as any);
      setNotifications(allNotifs);

      const unreadNotifs = allNotifs.filter(n => !n.read);
      const msgNotifs = unreadNotifs.filter(n => n.type === 'message');
      const trocNotifs = unreadNotifs.filter(n => n.type === 'troc');

      setUnreadMessages(msgNotifs.length);
      setPendingTrocs(trocNotifs.length);

      if (isFirst) {
        isFirst = false;
        return;
      }

      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notif = change.doc.data() as any;
          const currentChatId = activeConversationIdRef.current;
          const currentProfile = profileRef.current;
          const isCurrentChat = currentChatId === notif.conversationId;

          if (
            'Notification' in window && 
            Notification.permission === 'granted' &&
            currentProfile?.notificationsEnabled !== false &&
            (notif.type !== 'message' || !isCurrentChat || document.hidden)
          ) {
            const title = notif.title;
            const options = {
              body: notif.body,
              icon: '/icon.svg',
              badge: '/icon.svg',
              tag: (notif.type === 'message' ? (notif.conversationId || change.doc.id) : (notif.id || change.doc.id)).toString(),
              renotify: true
            };

            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.ready.then(reg => {
                reg.showNotification(title, options);
              });
            } else {
              new Notification(title, options);
            }
          }
        }
      });
    }, (e) => {
      if (!(e instanceof Error && e.message.includes('offline')) && !e.message?.includes('index')) {
        handleFirestoreError(e, OperationType.GET, `users/${user.uid}/notifications`);
      }
    });

    return () => unsub();
  }, [user?.uid]);

  // Conversations - dépend de user?.uid
  useEffect(() => {
    if (!user) {
      setConversations([]);
      return;
    }
    const q = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc'),
      limit(30)
    );
    const unsubConv = onSnapshot(q, (snap) => {
      const convs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
      setConversations(convs.sort((a, b) => {
        const t1 = (a.updatedAt as any)?.seconds || 0;
        const t2 = (b.updatedAt as any)?.seconds || 0;
        return t2 - t1;
      }));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'conversations'));

    return () => unsubConv();
  }, [user?.uid]);

  // Exchanges - dépend de user?.uid avec fusion locale
  useEffect(() => {
    if (!user?.uid) {
      setExchanges([]);
      return;
    }
    const qBuyer = query(
      collection(db, 'exchanges'),
      where('buyerId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );
    const qSeller = query(
      collection(db, 'exchanges'),
      where('sellerId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    let buyerExchanges: any[] = [];
    let sellerExchanges: any[] = [];

    const merge = () => {
      const map: Record<string, any> = {};
      buyerExchanges.forEach(e => { map[e.id] = e; });
      sellerExchanges.forEach(e => { map[e.id] = e; });
      setExchanges(Object.values(map).sort((a, b) => {
        const t1 = (a.updatedAt as any)?.seconds || 0;
        const t2 = (b.updatedAt as any)?.seconds || 0;
        return t2 - t1;
      }));
    };

    const unsubEx1 = onSnapshot(qBuyer, (snap) => {
      buyerExchanges = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      merge();
    }, (e) => {
       if (!e.message?.includes('index')) handleFirestoreError(e, OperationType.LIST, 'exchanges');
    });

    const unsubEx2 = onSnapshot(qSeller, (snap) => {
      sellerExchanges = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      merge();
    }, (e) => {
       if (!e.message?.includes('index')) handleFirestoreError(e, OperationType.LIST, 'exchanges');
    });

    return () => {
      unsubEx1();
      unsubEx2();
    };
  }, [user?.uid]);



  useEffect(() => {
    if (user && activeConversationId) {
      const q = query(
        collection(db, 'users', user.uid, 'notifications'),
        where('conversationId', '==', activeConversationId),
        where('read', '==', false)
      );
      getDocs(q).then(snap => {
        if (snap.empty) return;
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.update(d.ref, { read: true }));
        batch.commit().catch(err => console.warn("Could not commit read status notification batch:", err?.message || String(err)));
      }).catch(err => console.warn("Could not fetch notifications for conversation:", err?.message || String(err)));
    }
  }, [activeConversationId, user]);

  useEffect(() => {
    if (user && activeTab === 'mytroc') {
      const q = query(
        collection(db, 'users', user.uid, 'notifications'),
        where('type', '==', 'troc'),
        where('read', '==', false)
      );
      getDocs(q).then(snap => {
        if (snap.empty) return;
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.update(d.ref, { read: true }));
        batch.commit().catch(err => console.warn("Could not commit troc notification batch:", err?.message || String(err)));
      }).catch(err => console.warn("Could not fetch troc notifications:", err?.message || String(err)));
    }
  }, [activeTab, user]);

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
                             (filterListingType === 'Les deux' && p.listingType === 'mixed');
      const matchPrice = !filterPriceMax || p.price <= filterPriceMax;
      
      const seller = allUsersProfiles[p.sellerId];
      const isSellerCertified = seller ? (
        (seller.is_certified as any) === true || 
        (seller.is_certified as any) === 'vrai' || 
        (seller.isCertified as any) === true || 
        (seller.isCertified as any) === 'vrai' || 
        (seller['is certified'] as any) === true || 
        (seller['is certified'] as any) === 'vrai' || 
        (seller.badges as string[])?.some((b: string) => b?.toLowerCase().includes('certif'))
      ) : false;
      const matchCertified = !filterCertifiedOnly || isSellerCertified;
      
      const matchAvailable = p.status !== 'sold' && p.is_available !== false;

      // Student and School Filters
      let matchStudent = true;
      if (filterStudentMode) {
        const isSellerStudent = seller?.isStudent === true;
        if (!isSellerStudent) {
          matchStudent = false;
        } else if (filterStudentSchool !== 'Tous') {
          const sellerSchool = seller?.studentSchool;
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
        buyerId: user.uid,
        buyerName: user.displayName,
        sellerId: targetProduct.sellerId,
        exchangeProductIds: myProductIds,
        exchangeProductTitles: exItems.map(p => p.title),
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
        body: `${user.displayName} vous propose un troc pour votre article "${targetProduct.title}"`,
        toUserId: targetProduct.sellerId,
        fromUserId: user.uid,
        fromUserName: user.displayName,
        productId: targetProduct.id,
        exchangeId: exRef.id,
        createdAt: serverTimestamp(),
        read: false
      });

      await batch.commit();
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
      await updateDoc(exRef, { 
        status: 'completed',
        updatedAt: serverTimestamp() 
      });
      const exSnap = await getDoc(exRef);
      if (exSnap.exists()) {
        const exData = exSnap.data();
        const prodId = exData.productId;
        await updateDoc(doc(db, 'products', prodId), { 
          status: 'sold',
          transactionInProgress: false,
          updatedAt: serverTimestamp()
        });

        // Notify Seller to delete sold listing
        const notifSellerRef = doc(collection(db, 'users', exData.sellerId, 'notifications'));
        await setDoc(notifSellerRef, {
          type: 'system',
          title: 'Article vendu ! 🛍️',
          body: `Votre article "${exData.productTitle}" a été vendu. Veuillez s'il vous plaît le retirer du catalogue.`,
          toUserId: exData.sellerId,
          fromUserId: 'system',
          fromUserName: 'TrocShop',
          productId: prodId,
          createdAt: serverTimestamp(),
          read: false
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'exchanges');
    }
  };

  const handleGenerateTrocCode = async (ex: any) => {
    if (!user) {
      alert("Veuillez vous connecter pour effectuer cette action.");
      return;
    }
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    try {
      const batch = writeBatch(db);
      const exRef = doc(db, 'exchanges', ex.id);
      
      batch.update(exRef, {
        trocCode: code,
        updatedAt: serverTimestamp()
      });

      if (ex.productId) {
        batch.update(doc(db, 'products', ex.productId), {
          transactionInProgress: true,
          updatedAt: serverTimestamp()
        });
      }

      if (ex.exchangeProductIds && Array.isArray(ex.exchangeProductIds)) {
        ex.exchangeProductIds.forEach((id: string) => {
          batch.update(doc(db, 'products', id), {
            transactionInProgress: true,
            updatedAt: serverTimestamp()
          });
        });
      }

      await batch.commit();
      setJustGeneratedCodeExIds(prev => [...prev, ex.id]);
      setShowTrocVerifier({ ...ex, trocCode: code });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'exchanges');
    }
  };

  const handleVerifyTrocCode = async (ex: any, inputCode: string): Promise<boolean> => {
    if (!user) {
      alert("Veuillez vous connecter pour effectuer cette action.");
      return false;
    }
    try {
      // Get a fresh snapshot of the exchange document from Firestore to avoid stale state.
      const freshSnap = await getDoc(doc(db, 'exchanges', ex.id));
      if (!freshSnap.exists()) {
        alert("Cette transaction n'existe plus.");
        return false;
      }
      
      const freshEx = { id: freshSnap.id, ...freshSnap.data() } as any;
      
      if (freshEx.trocCode === inputCode) {
        const batch = writeBatch(db);
        const exRef = doc(db, 'exchanges', freshEx.id);
        
        batch.update(exRef, {
          status: 'completed',
          updatedAt: serverTimestamp()
        });

        // Mark products as sold
        batch.update(doc(db, 'products', freshEx.productId), { 
          is_available: false, 
          status: 'sold',
          transactionInProgress: false,
          updatedAt: serverTimestamp() 
        });

        // Notify listing owner (sellerId) to delete listing
        const notifSellerRef = doc(collection(db, 'users', freshEx.sellerId, 'notifications'));
        batch.set(notifSellerRef, {
          type: 'system',
          title: 'Article vendu ! 🛍️',
          body: `Votre article "${freshEx.productTitle}" a été vendu. Veuillez s'il vous plaît le retirer du catalogue.`,
          toUserId: freshEx.sellerId,
          fromUserId: 'system',
          fromUserName: 'TrocShop',
          productId: freshEx.productId,
          transactionId: freshEx.id,
          conversationId: '',
          createdAt: serverTimestamp(),
          read: false
        });
        
        if (freshEx.exchangeProductIds && Array.isArray(freshEx.exchangeProductIds)) {
          freshEx.exchangeProductIds.forEach((id: string, idx: number) => {
            batch.update(doc(db, 'products', id), { 
              is_available: false, 
              status: 'sold',
              transactionInProgress: false,
              updatedAt: serverTimestamp() 
            });

            const title = freshEx.exchangeProductTitles?.[idx] || "Votre article proposé";
            const notifBuyerRef = doc(collection(db, 'users', freshEx.buyerId, 'notifications'));
            batch.set(notifBuyerRef, {
              type: 'system',
              title: 'Article troqué ! 🔄',
              body: `Votre article "${title}" a été échangé. Veuillez s'il vous plaît le retirer du catalogue.`,
              toUserId: freshEx.buyerId,
              fromUserId: 'system',
              fromUserName: 'TrocShop',
              productId: id,
              transactionId: freshEx.id,
              conversationId: '',
              createdAt: serverTimestamp(),
              read: false
            });
          });
        } else if (freshEx.exchangeProductId) {
          batch.update(doc(db, 'products', freshEx.exchangeProductId), { 
            is_available: false, 
            status: 'sold',
            transactionInProgress: false,
            updatedAt: serverTimestamp() 
          });

          const title = freshEx.exchangeProductTitle || "Votre article proposé";
          const notifBuyerRef = doc(collection(db, 'users', freshEx.buyerId, 'notifications'));
          batch.set(notifBuyerRef, {
            type: 'system',
            title: 'Article troqué ! 🔄',
            body: `Votre article "${title}" a été échangé. Veuillez s'il vous plaît le retirer du catalogue.`,
            toUserId: freshEx.buyerId,
            fromUserId: 'system',
            fromUserName: 'TrocShop',
            productId: freshEx.exchangeProductId,
            transactionId: freshEx.id,
            conversationId: '',
            createdAt: serverTimestamp(),
            read: false
          });
        }

        await batch.commit();
        alert(freshEx.type === 'purchase' ? "Validation réussie ! Vente effectuée avec succès." : "Validation réussie ! Troc effectué avec succès.");
        setShowTrocVerifier(null);
        return true;
      } else {
        alert("Code incorrect ! Le code saisi ne correspond pas à celui de la transaction.");
        return false;
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'exchanges');
      return false;
    }
  };

  const handleExchangeStatusUpdate = async (exId: string, status: string) => {
    if (!user) {
      alert("Veuillez vous connecter pour effectuer cette action.");
      return;
    }
    try {
      const exRef = doc(db, 'exchanges', exId);
      const exSnap = await getDoc(exRef);
      if (!exSnap.exists()) return;
      
      const exData = exSnap.data();
      // Prevent duplicate status updates and notifications
      if (exData.status === status) return;

      const batch = writeBatch(db);
      batch.update(exRef, { 
        status,
        updatedAt: serverTimestamp() 
      });

      const buyerId = exData.buyerId;
      const sellerId = exData.sellerId;
      
      // Notify buyer only if status actually changed
      const notifRef = doc(collection(db, 'users', buyerId, 'notifications'));
      batch.set(notifRef, {
        type: 'troc',
        title: status === 'accepted' ? 'Troc accepté !' : 'Troc refusé',
        body: status === 'accepted' 
          ? `Votre proposition pour "${exData.productTitle}" a été acceptée ! Ouvrez la messagerie pour discuter.` 
          : `Désolé, votre proposition pour "${exData.productTitle}" a été refusée.`,
        toUserId: buyerId,
        fromUserId: sellerId,
        fromUserName: user?.displayName || 'Vendeur',
        productId: exData.productId,
        transactionId: '',
        conversationId: '',
        createdAt: serverTimestamp(),
        read: false
      });

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'exchanges');
    }
  };

  const handleLogout = () => {
    if (user) {
      updateDoc(doc(db, 'users', user.uid), { isOnline: false }).catch(() => {});
    }
    signOut(auth);
    setUser(null);
    setProfile(null);
    setActiveTab('home');
    setActiveConversationId(null);
  };

  const handleMarkAsSold = async (productId: string) => {
    try {
      await updateDoc(doc(db, 'products', productId), {
        is_available: false,
        updatedAt: serverTimestamp()
      });
      alert("L'article a été marqué comme vendu.");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'products');
    }
  };

  const toggleFavorite = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) {
      triggerAuthRequired("Pour aimer cet article et l'ajouter à vos favoris, vous devez d'abord vous connecter ou créer un compte.");
      return;
    }

    const favRef = doc(db, 'users', user.uid, 'favorites', id);
    const productRef = doc(db, 'products', id);
    const batch = writeBatch(db);

    try {
      if (favorites.includes(id)) {
        batch.delete(favRef);
        batch.update(productRef, {
           likesCount: increment(-1)
        });
      } else {
        batch.set(favRef, {
          productId: id,
          createdAt: serverTimestamp()
        });
        batch.update(productRef, {
           likesCount: increment(1)
        });

        // Trigger notification for seller
        const pSnap = await getDoc(productRef);
        if (pSnap.exists()) {
          const pData = pSnap.data();
          if (pData.sellerId !== user.uid) {
            const notifRef = doc(collection(db, 'users', pData.sellerId, 'notifications'));
            batch.set(notifRef, {
              type: 'favorite',
              title: 'Nouveau favori !',
              body: `${user.displayName} a ajouté "${pData.title}" à ses favoris.`,
              toUserId: pData.sellerId,
              fromUserId: user.uid,
              fromUserName: user.displayName,
              productId: id,
              createdAt: serverTimestamp(),
              read: false
            });
          }
        }
      }
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `favorites_and_likes_sync/${id}`);
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
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-orange-100 selection:text-orange-900 overflow-x-hidden">
      {firestoreQuotaExceeded && (
        <div className="fixed top-28 left-4 right-4 z-[99] max-w-lg mx-auto bg-orange-50/95 backdrop-blur-xl border border-orange-200/50 rounded-2xl p-3.5 shadow-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
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
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
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
        "fixed top-4 left-4 right-4 z-[100] bg-white/40 backdrop-blur-[40px] backdrop-saturate-[180%] border border-white/50 rounded-[2rem] px-6 h-20 flex flex-col justify-center shadow-[0_20px_50px_rgba(0,0,0,0.05)]",
        selectedSellerId ? "hidden invisible pointer-events-none" : ""
      )}>
        <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setActiveTab('home')}>
                <span className="text-2xl font-black italic tracking-tighter text-orange-600 select-none">TrocShop</span>
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
                  {notifications.some(n => !n.read) && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-orange-600 rounded-full border-2 border-white animate-pulse" />
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
      <main className="pt-28 pb-36 px-6 max-w-lg mx-auto min-h-screen relative">

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
                  className="w-20 h-20 bg-orange-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-orange-600/30 mb-8"
                >
                  <UserIcon className="text-white w-10 h-10" />
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


              </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div 
              key="notifications"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-40"
            >
               <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setActiveTab('home')}
                    className="p-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-full transition-all active:scale-75 flex items-center justify-center shrink-0 shadow-sm"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <h2 className="text-3xl font-black italic tracking-tighter uppercase text-zinc-900 border-b-4 border-orange-600 inline-block">Notifications</h2>
               </div>

               {notifications.length === 0 ? (
                 <div className="py-20 text-center space-y-4 opacity-20">
                   <Bell size={48} className="mx-auto" />
                   <p className="font-black uppercase tracking-widest text-xs">Aucune notification</p>
                 </div>
               ) : (
                 <div className="space-y-3">
                    {notifications.map((n, i) => {
                      const id = n.id || i.toString();
                      const isSelected = selectedNotifications.includes(id);
                      return (
                        <motion.div 
                          key={id}
                          onClick={async () => {
                            if (isNotificationEditMode) {
                              setSelectedNotifications(prev => 
                                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                              );
                            } else {
                              if (!n.read) {
                                try {
                                  await updateDoc(doc(db, 'users', user!.uid, 'notifications', id), { read: true });
                                } catch (e: any) {
                                  console.error("Error marking notification as read:", e?.message || String(e));
                                }
                              }
                            }
                          }}
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            "p-5 rounded-[2rem] border transition-all flex items-center gap-4 relative cursor-pointer",
                            n.read ? "bg-white border-zinc-100" : "bg-orange-600/5 border-orange-200 shadow-sm",
                            isSelected && "ring-2 ring-orange-600 bg-orange-600/10"
                          )}
                        >

                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm self-start",
                            n.read ? "bg-zinc-50 text-zinc-400" : "bg-orange-600 text-white shadow-orange-600/10"
                          )}>
                            {isSelected ? <CheckCircle2 size={24} /> : (n.type === 'message' ? <MessageCircle size={24} /> : <Bell size={24} />)}
                          </div>
                          <div className="flex-1 min-w-0">
                              <h4 className={cn("font-black uppercase tracking-tighter leading-tight", n.read ? "text-zinc-600" : "text-zinc-900")}>
                                {n.title}
                              </h4>
                              <p className={cn("text-xs mt-1", n.read ? "text-zinc-400" : "text-zinc-500 font-medium")}>
                                {n.body}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                   </div>
                 )}

                 {/* Notifications Bottom Controls */}
                 {notifications.length > 0 && (
                   <div className="fixed bottom-6 inset-x-6 flex gap-2 z-[150] p-2 bg-white/90 backdrop-blur-3xl rounded-[2.5rem] border border-zinc-150 shadow-[0_32px_64px_rgba(0,0,0,0.1)]">
                      <button 
                        onClick={() => {
                          setIsNotificationEditMode(prev => {
                            if (prev) setSelectedNotifications([]);
                            return !prev;
                          });
                        }}
                        className={cn(
                          "flex-[0.8] py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2",
                          isNotificationEditMode ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 text-zinc-500"
                        )}
                      >
                        {isNotificationEditMode ? <><Check size={14} /> Fait</> : <><Edit3 size={14} /> Modifier</>}
                      </button>
                      
                      {!isNotificationEditMode ? (
                        <button 
                          onClick={async () => {
                            const batch = writeBatch(db);
                            notifications.forEach(n => {
                              if (!n.read) {
                                batch.update(doc(db, 'users', user!.uid, 'notifications', n.id), { read: true });
                              }
                            });
                            try {
                              await batch.commit();
                            } catch (e) {
                              handleFirestoreError(e, OperationType.UPDATE, `users/${user!.uid}/notifications`);
                            }
                          }}
                          className="flex-1 py-4 rounded-[1.8rem] bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-orange-600/20 hover:bg-orange-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <CheckCheck size={14} /> Tout lu
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={() => {
                               if (selectedNotifications.length === notifications.length) {
                                 setSelectedNotifications([]);
                               } else {
                                 setSelectedNotifications(notifications.map(n => n.id));
                               }
                            }}
                            className="flex-1 py-4 bg-zinc-100 border border-zinc-200 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest text-zinc-600 transition-all flex items-center justify-center gap-2 hover:bg-zinc-200"
                          >
                            <ListChecks size={14} /> {selectedNotifications.length === notifications.length ? 'Désél.' : 'Tout sél.'}
                          </button>
                          <button 
                            disabled={selectedNotifications.length === 0}
                            onClick={() => {
                              safeConfirm(`Supprimer ${selectedNotifications.length} notification(s) ?`, async () => {
                                const batch = writeBatch(db);
                                selectedNotifications.forEach(id => {
                                  batch.delete(doc(db, 'users', user!.uid, 'notifications', id));
                                });
                                try {
                                  await batch.commit();
                                  setSelectedNotifications([]);
                                  setIsNotificationEditMode(false);
                                } catch (e) {
                                  handleFirestoreError(e, OperationType.DELETE, `users/${user!.uid}/notifications`);
                                }
                              });
                            }}
                            className={cn(
                              "flex-[0.8] py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl",
                              selectedNotifications.length > 0 ? "bg-red-600 text-white shadow-red-600/20" : "bg-zinc-100 text-zinc-400 cursor-not-allowed border-transparent"
                            )}
                          >
                            <Trash2 size={14} /> ({selectedNotifications.length})
                          </button>
                        </>
                      )}
                   </div>
                 )}
              </motion.div>
            )}


      {activeTab === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-6 space-y-8"
            >
              <motion.div 
                layout
                className="bg-zinc-900 rounded-[3rem] p-8 sm:p-10 text-white overflow-hidden relative shadow-2xl shadow-zinc-900/40 min-h-[220px] sm:min-h-[260px] flex flex-col justify-center group"
              >
                {/* Background Banner Image */}
                <img 
                  src={trocBannerBg} 
                  alt="Troc banner background" 
                  className="absolute inset-0 w-full h-full object-cover z-0 transition-transform duration-1000 group-hover:scale-105" 
                />
                {/* Black overlay for better text readability */}
                <div className="absolute inset-0 bg-black/40 z-0" />

                <div className="relative z-10 space-y-4 sm:space-y-6 pt-4">
                  <motion.h2 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl sm:text-5xl font-black leading-[0.9] tracking-tighter"
                  >
                    VOS OBJETS ONT <br/>DE LA VALEUR.
                  </motion.h2>
                  <motion.p 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-zinc-200 text-sm sm:text-base font-medium max-w-[180px] sm:max-w-[220px]"
                  >
                    Troquez ou vendez vos articles en un clin d'œil.
                  </motion.p>
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Button variant="primary" className="py-3 px-8 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-orange-600/40 active:scale-95 transition-all w-fit group-hover:scale-105" onClick={() => setActiveTab('sell')}>
                      Commencer
                    </Button>
                  </motion.div>
                </div>
              </motion.div>

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
                    setSelectedCategory('student');
                    setShowStudentBubble(true);
                  }}
                  className={cn(
                    "px-6 py-2 rounded-full border text-xs font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-1.5",
                    selectedCategory === 'student' ? "bg-emerald-600 border-emerald-600 text-white" : "bg-emerald-50 border-emerald-100 border-dashed text-emerald-600 hover:bg-emerald-100/40"
                  )}
                >
                  <span className="text-sm select-none">🎓</span>
                  <span>Mode Étudiant</span>
                </button>

                {/* Other Categories */}
                {CATEGORIES.map((cat) => (
                  <button 
                    key={cat} 
                    onClick={() => setSelectedCategory(cat)}
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
                        return allUsersProfiles[p.sellerId]?.isStudent === true;
                      }
                      return selectedCategory === 'Tous' || p.category === selectedCategory;
                    })
                    .map(p => (
                    <ProductCard 
                      key={p.id} 
                      product={p} 
                      onClick={() => setSelectedProduct(p)} 
                      favorite={favorites.includes(p.id)}
                      onFavorite={(e) => toggleFavorite(p.id, e)}
                      onBuy={(e) => { e.stopPropagation(); startConversation(p); }}
                    />
                  ))
                )}
              </div>
              
              {/* Informative popup for Mode Étudiant */}
              <AnimatePresence>
                {showStudentBubble && (
                  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 15 }}
                      className="bg-white max-w-xs w-full p-6 rounded-[2.5rem] border border-zinc-100 shadow-2xl text-center space-y-6"
                    >
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl mx-auto">
                        🎓
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-black text-base text-zinc-900 tracking-tight uppercase">Espace Campus</h3>
                        <p className="text-[11px] text-zinc-500 font-bold leading-relaxed">
                          Va dans la page explorer si tu veux effectuer des filtres plus précis pour le mode étudiant.
                        </p>
                      </div>
                      <Button 
                        variant="primary" 
                        className="w-full py-4 uppercase font-black tracking-widest text-[9px] bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                        onClick={() => setShowStudentBubble(false)}
                      >
                        J'ai compris
                      </Button>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

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
                             {['Tous', "Déjà utilisé mais bon", "Très bon état", "Satisfaisant", "C'est gâté (pour pièces)"].map(c => (
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
                             {['Tous', 'Vente', 'Troc', 'Les deux'].map(t => (
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
                      
                      {/* Mode Étudiant Search Filter */}
                      <div className="space-y-2 border-t border-zinc-200/50 pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            const nextVal = !filterStudentMode;
                            setFilterStudentMode(nextVal);
                            if (!nextVal) {
                              setFilterStudentSchool('Tous');
                            }
                          }}
                          className={cn(
                            "w-full px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2",
                            filterStudentMode
                              ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                              : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                          )}
                        >
                          <span className="text-sm select-none">🎓</span>
                          {filterStudentMode ? "Mode Étudiant : ACTIF" : "Filtrer par Mode Étudiant"}
                        </button>

                        {filterStudentMode && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.98, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="space-y-1.5 mt-2"
                          >
                            <label className="text-[9px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1">
                              <span>📚</span> Choisir l'école
                            </label>
                            <CustomDropdown 
                              value={filterStudentSchool} 
                              options={['Tous', ...CAMPUS_SCHOOLS]} 
                              onChange={setFilterStudentSchool} 
                              placeholder="Filtrer par école"
                            />
                          </motion.div>
                        )}
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
                    product={p} 
                    onClick={() => setSelectedProduct(p)} 
                    favorite={favorites.includes(p.id)}
                    onFavorite={(e) => toggleFavorite(p.id, e)}
                    onBuy={(e) => { e.stopPropagation(); startConversation(p); }}
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
            </motion.div>
          )}

          {activeTab === 'mytroc' && (
            <motion.div 
              key="mytroc"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6"
            >
              <MyTrocSection 
                exchanges={exchanges} 
                user={user} 
                products={products}
                onStatusUpdate={handleExchangeStatusUpdate}
                onVerifyCode={(ex) => {
                  if (ex.sellerId === user?.uid && !ex.trocCode) {
                    handleGenerateTrocCode(ex);
                  } else {
                    setShowTrocVerifier(ex);
                  }
                }}
                onStartChat={async (otherId, prodId) => {
                  if (!user) return;
                  let targetProd = products.find(p => p.id === prodId);
                  const convId = [user.uid, otherId, prodId].sort().join('_');
                  const convRef = doc(db, 'conversations', convId);
                  
                  setActiveConversationId(convId);
                  setActiveTab('messages');
                  setSelectedProduct(null);

                  try {
                    const snap = await getDoc(convRef);
                    if (!snap.exists()) {
                      // Security check: ensure user is authenticated
                      if (!auth.currentUser) {
                        alert("Vous devez être connecté pour commencer une discussion.");
                        return;
                      }

                      const batch = writeBatch(db);
                      let partnerName = 'Utilisateur';

                      if (globalUserProfileCache[otherId]) {
                        partnerName = globalUserProfileCache[otherId].displayName || 'Utilisateur';
                      } else {
                        const partnerSnap = await getDoc(doc(db, 'users', otherId));
                        if (partnerSnap.exists()) {
                          const pData = partnerSnap.data();
                          globalUserProfileCache[otherId] = pData;
                          partnerName = pData.displayName || 'Utilisateur';
                        }
                      }
                      
                      batch.set(convRef, {
                        id: convId,
                        participantIds: [user.uid, otherId],
                        participantNames: [user.displayName || 'Utilisateur', partnerName],
                        productId: prodId || '',
                        sellerId: targetProd ? targetProd.sellerId : otherId,
                        productTitle: targetProd ? targetProd.title : "Troc",
                        productImage: targetProd && targetProd.images ? targetProd.images[0] : "",
                        productPrice: targetProd ? targetProd.price : 0,
                        lastMessage: targetProd ? `Discutons à propos de l'article : ${targetProd.title}` : "Discutons à propos de notre échange",
                        lastSenderId: user.uid,
                        updatedAt: serverTimestamp(),
                      });

                      const msgRef = doc(collection(convRef, 'messages'));
                      batch.set(msgRef, {
                        senderId: user.uid,
                        text: targetProd ? `Discutons à propos de l'article : ${targetProd.title}` : "Discutons à propos de notre échange",
                        createdAt: serverTimestamp(),
                      });

                      await batch.commit();
                    }
                  } catch (e) {
                    console.error("Error creating/reconciling chat:", e);
                  }
                }}
                onTabChange={setMytrocSubTab}
              />
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
                onProductCreated={(newProduct) => {
                  setHomeProducts(prev => [newProduct, ...prev]);
                }}
                onProductUpdated={(updatedProduct) => {
                  setHomeProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
                }}
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
                        const unreadCount = notifications.filter(n => n.type === 'message' && n.conversationId === conv.id && !n.read).length;
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
                                      <ConversationRecipientInfo participantNames={conv.participantNames} participantIds={conv.participantIds} currentUser={user} />
                                      <div className="flex-1 min-w-0">
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
                                          try {
                                            await deleteDoc(doc(db, 'conversations', conv.id));
                                            handleConvPeekEnd();
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

                          <ConversationRecipientInfo participantNames={conv.participantNames} participantIds={conv.participantIds} currentUser={user} />
                          <div className="flex-1 min-w-0 flex flex-col justify-between h-14">
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
                              <div className={cn("text-xs truncate", unreadCount > 0 ? "text-zinc-950 font-bold" : "text-zinc-400")}>{conv.lastMessage}</div>
                              {unreadCount > 0 && (
                                <motion.div 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="min-w-[1.25rem] h-5 bg-orange-600 rounded-full flex items-center justify-center px-1.5 shadow-lg shadow-orange-600/30 shrink-0"
                                >
                                  <span className="text-[10px] font-black text-white">{unreadCount}</span>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        </div>
                        </div>
                      );})
                    )
                  }
                  </div>
                )}
                {/* Conversations Bottom Controls */}
                {!activeConversationId && conversations.length > 0 && false && (
                  <div className="fixed bottom-24 inset-x-6 flex gap-2 z-50 p-2 bg-white/70 backdrop-blur-3xl rounded-[2.5rem] border border-white shadow-[0_32px_64px_rgba(0,0,0,0.1)]">
                     <button 
                       onClick={() => {
                         setIsMessagesEditMode(prev => {
                           if (prev) setSelectedMessages([]);
                           return !prev;
                         });
                       }}
                       className={cn(
                         "flex-[0.8] py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2",
                         isMessagesEditMode ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                       )}
                     >
                       {isMessagesEditMode ? <><Check size={14} /> Fait</> : <><Edit3 size={14} /> Modifier</>}
                     </button>
                     
                     {isMessagesEditMode && (
                       <>
                         <button 
                           onClick={() => {
                              if (selectedMessages.length === conversations.length) {
                                setSelectedMessages([]);
                              } else {
                                setSelectedMessages(conversations.map(c => c.id));
                              }
                           }}
                           className="flex-1 py-4 bg-zinc-100 border border-zinc-200 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest text-zinc-600 transition-all flex items-center justify-center gap-2 hover:bg-zinc-200"
                         >
                           <ListChecks size={14} /> {selectedMessages.length === conversations.length ? 'Désél.' : 'Tout sél.'}
                         </button>
                         <button 
                           disabled={selectedMessages.length === 0}
                           onClick={async () => {
                             if (confirm(`Supprimer ${selectedMessages.length} conversation(s) ?`)) {
                               const batch = writeBatch(db);
                               selectedMessages.forEach(id => {
                                 batch.delete(doc(db, 'conversations', id));
                               });
                               try {
                                 await batch.commit();
                                 setSelectedMessages([]);
                                 setIsMessagesEditMode(false);
                               } catch (e) {
                                 handleFirestoreError(e, OperationType.DELETE, `conversations mass delete`);
                               }
                             }
                           }}
                           className={cn(
                             "flex-[0.8] py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl",
                             selectedMessages.length > 0 ? "bg-red-600 text-white shadow-red-600/20" : "bg-zinc-100 text-zinc-400 cursor-not-allowed border-transparent"
                           )}
                         >
                           <Trash2 size={14} /> ({selectedMessages.length})
                         </button>
                       </>
                     )}
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
                            <span className="font-black text-lg">{favorites.length}</span>
                            <span className="text-[8px] font-black uppercase text-zinc-400">Favoris</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="text-2xl font-black tracking-tighter leading-none truncate">{user?.displayName}</h2>
                          {(() => {
                            const isCertified = (profile?.is_certified as any) === true || (profile?.is_certified as any) === 'vrai' || (profile?.isCertified as any) === true || (profile?.isCertified as any) === 'vrai' || (profile?.['is certified'] as any) === true || (profile?.['is certified'] as any) === 'vrai' || (profile?.badges as string[])?.some(b => b?.toLowerCase().includes('certif'));
                            const isVerified = profile?.isVerified;
                            return (
                              <>
                                {isCertified && (
                                  <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-2 py-1 rounded-xl text-[9px] font-black tracking-widest text-white shrink-0 shadow-md shadow-orange-600/15 flex items-center gap-1 leading-none uppercase h-5">
                                    <BadgeCheck size={12} className="fill-white/20 select-none shrink-0" />
                                    Certifié
                                  </div>
                                )}
                                {isVerified && !isCertified && (
                                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white p-0.5 shadow-sm shrink-0">
                                    <Check size={12} strokeWidth={4} />
                                  </div>
                                )}
                                {profile?.isStudent && (
                                  <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-2 py-1.5 rounded-xl text-[8px] font-black tracking-wider text-white shrink-0 shadow-md shadow-emerald-600/15 flex items-center gap-1 leading-none uppercase">
                                    <span className="text-xs shrink-0 select-none">🎓</span>
                                    <span>{profile.studentSchool || 'Campus'}</span>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                           <div className="flex items-center gap-1">
                             <Star size={12} className="text-orange-600 fill-orange-600" />
                             <span className="text-xs font-black">{profile?.rating || 0}</span>
                             <span className="text-[10px] text-zinc-400 font-bold">({profile?.reviewCount || 0} avis)</span>
                           </div>
                           <div className="h-3 w-px bg-zinc-200" />
                           <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">{profile?.city || 'Yamoussoukro'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {profile?.badges && profile.badges.filter(b => !b.toLowerCase().includes('certif')).length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Récompenses & Badges</h4>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                          {profile.badges.filter(b => !b.toLowerCase().includes('certif')).map(badge => (
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
                    <Button variant="outline" className="w-full justify-between p-5 bg-white border-none shadow-sm" onClick={() => setProfileView('favorites')}>
                      <div className="flex items-center gap-3">
                        <Heart className="w-5 h-5 text-orange-600" />
                        <span className="font-bold">Mes Favoris</span>
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
                        const shareUrl = "https://troc-shop-kgfn.vercel.app/";
                        try {
                          await CapacitorShare.share({
                            title: "TrocShop",
                            text: "Découvrez TrocShop, l'application de troc entre particuliers !",
                            url: shareUrl,
                            dialogTitle: "Partager l'application",
                          });
                        } catch (err) {
                          console.log("Capacitor Share failed, using web API or clipboard fallback...", err);
                          if (navigator.share) {
                            try {
                              await navigator.share({
                                title: "TrocShop",
                                text: "Découvrez TrocShop, l'application de troc entre particuliers !",
                                url: shareUrl
                              });
                            } catch (e) {
                              console.error("Error sharing with web api:", e);
                            }
                          } else {
                            try {
                              await navigator.clipboard.writeText(shareUrl);
                              toast.success("Lien de l'application copié dans le presse-papiers !");
                            } catch (err2) {
                              console.error("Failed to copy:", err2);
                              toast.error("Impossible de copier le lien automatiquement.");
                            }
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
                          product={p} 
                          onClick={() => setSelectedProduct(p)} 
                          favorite={favorites.includes(p.id)}
                          onFavorite={(e) => toggleFavorite(p.id, e)}
                          onBuy={(e) => { e.stopPropagation(); startConversation(p); }}
                          isOwner={p.sellerId === user?.uid}
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

      {/* Bottom Nav */}
      {activeTab !== 'auth' && (
        <nav className={cn(
          "fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,16px))] md:bottom-6 left-6 right-6 z-[100] h-20 transition-all duration-300",
          (activeConversationId || isNavHidden || activeTab === 'notifications' || (activeTab === 'mytroc' && mytrocSubTab === 'past')) ? "translate-y-32 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
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
                active={activeTab === 'mytroc'} 
                onClick={() => { setActiveTab('mytroc'); setActiveConversationId(null); setSelectedSellerId(null); setPreviousProduct(null); }} 
                icon={<Handshake size={24} />} 
                count={pendingTrocs}
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
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
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
              <button 
                onClick={closeAuthRequired}
                className="w-full h-12 bg-orange-600 rounded-2xl text-white font-black text-xs uppercase tracking-widest hover:bg-orange-700 active:scale-95 transition-all flex items-center justify-center shadow-xl shadow-orange-600/20"
              >
                Se connecter / S'inscrire
              </button>
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
            className="fixed inset-0 z-[210] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl border border-zinc-100"
            >
              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-pulse">
                <Sparkles size={30} className="stroke-[2.5]" />
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
            product={selectedProduct} 
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
            className="fixed inset-0 z-[60] bg-white overflow-y-auto no-scrollbar"
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
                    <div className="flex items-center gap-2">
                      <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">{publicProfile.displayName}</h2>
                      {(() => {
                        const isCert = (publicProfile.is_certified as any) === true || (publicProfile.is_certified as any) === 'vrai' || (publicProfile.isCertified as any) === true || (publicProfile.isCertified as any) === 'vrai' || (publicProfile['is certified'] as any) === true || (publicProfile['is certified'] as any) === 'vrai' || (publicProfile.badges as string[])?.some(b => b?.toLowerCase().includes('certif'));
                        const isVer = publicProfile.isVerified;
                        return (
                          <>
                            {isCert && (
                              <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-2 py-1 rounded-xl text-[9px] font-black tracking-widest text-white shrink-0 shadow-md shadow-orange-600/15 flex items-center gap-1 leading-none uppercase h-5">
                                <BadgeCheck size={12} className="fill-white/20 select-none shrink-0" />
                                Certifié
                              </div>
                            )}
                            {isVer && !isCert && (
                              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white p-0.5 shadow-sm shrink-0">
                                <Check size={12} strokeWidth={4} />
                              </div>
                            )}
                            {publicProfile?.isStudent && (
                              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-2 py-1.5 rounded-xl text-[8px] font-black tracking-wider text-white shrink-0 shadow-md shadow-emerald-600/15 flex items-center gap-1 leading-none uppercase">
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
                          <span className="text-zinc-800 font-black">{publicProfile.rating || 0}</span>
                          <span className="text-[10px] text-zinc-400 font-bold font-sans lowercase">({publicProfile.reviewCount || 0} avis)</span>
                       </div>
                    </div>
                  </div>
                  <p className="text-zinc-500 font-medium max-w-md italic">"{publicProfile.bio || 'Passionné(e) de TrocShop !'}"</p>
                  
                  <div className="flex gap-2">
                    {publicProfile.badges?.filter(b => !b.toLowerCase().includes('certif')).map(badge => (
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
                        product={p} 
                        onClick={() => setSelectedProduct(p)} 
                        favorite={favorites.includes(p.id)}
                        onFavorite={(e) => toggleFavorite(p.id, e)}
                        onBuy={(e) => { e.stopPropagation(); startConversation(p); }}
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
        {showTrocVerifier && (
          <TrocVerificationModal 
            exchange={showTrocVerifier}
            user={user}
            onClose={() => {
              setJustGeneratedCodeExIds(prev => prev.filter(id => id !== showTrocVerifier.id));
              setShowTrocVerifier(null);
            }}
            onVerify={(code) => handleVerifyTrocCode(showTrocVerifier, code)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-[10000] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md"
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
       {/* Custom Confirmation Dialog for Iframe Support */}
       <AnimatePresence>
         {customConfirm && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
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
             className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
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
             className="fixed inset-0 z-[1000] bg-orange-600 flex flex-col items-center justify-center p-8 text-center"
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

function SellScreen({ 
  onComplete, 
  user, 
  initialProduct,
  onProductCreated,
  onProductUpdated
}: { 
  onComplete: () => void; 
  user: User | null; 
  initialProduct?: Product | null;
  onProductCreated?: (p: Product) => void;
  onProductUpdated?: (p: Product) => void;
}) {
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
    try { return localStorage.getItem('sell_draft_condition') || 'Déjà utilisé mais bon'; } catch { return 'Déjà utilisé mais bon'; }
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
      if (user && auth.currentUser) {
        let p: UserProfile | null = null;
        if (globalUserProfileCache[user.uid]) {
          p = globalUserProfileCache[user.uid] as UserProfile;
        } else {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            p = snap.data() as UserProfile;
            globalUserProfileCache[user.uid] = p;
          }
        }
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
    
    if (imagePreviews.length + files.length > 8) {
      alert("Maximum 8 photos autorisées.");
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
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
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
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
    });
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
    if (imagePreviews.length < 4) {
      alert("Veuillez ajouter au moins 4 photos (8 maximum).");
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

    setLoading(true);
    try {
      if (initialProduct) {
        const updatedFields = {
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
          images: imagePreviews,
          updatedAt: serverTimestamp(),
        };
        await updateDoc(doc(db, 'products', initialProduct.id), updatedFields).catch(e => handleFirestoreError(e, OperationType.UPDATE, `products/${initialProduct.id}`));
        
        if (onProductUpdated) {
          onProductUpdated({
            ...initialProduct,
            ...updatedFields,
            price: (listingType === 'troc') ? 0 : Number(price),
            updatedAt: new Date()
          } as Product);
        }
        
        alert("Annonce modifiée !");
      } else {
        const productRef = doc(collection(db, 'products'));
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
          images: imagePreviews,
          sellerId: user!.uid,
          sellerName: user!.displayName || 'Vendeur',
          status: 'available',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(productRef, newProduct).catch(e => handleFirestoreError(e, OperationType.WRITE, 'products'));
        
        if (onProductCreated) {
          onProductCreated({
            id: productRef.id,
            ...newProduct,
            createdAt: new Date(),
            updatedAt: new Date()
          } as Product);
        }

        clearDraft();
        alert("Annonce publiée !");
      }
      onComplete();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'products');
    } finally {
      setLoading(false);
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
              Photos ({imagePreviews.length}/8)
            </div>
            <span className="text-[8px] opacity-60">Min 4 recommandées</span>
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
                onClick={() => (document.getElementById('camera-upload') as HTMLInputElement)?.click()}
                className="flex-1 h-14 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center gap-2 text-orange-400 hover:border-orange-600 hover:text-orange-600 transition-all active:scale-95 group"
              >
                <Camera className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-[10px] font-black uppercase tracking-widest">Prendre une Photo</span>
              </button>
            </div>

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
              Les deux
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
                  <label className="text-[10px] font-black uppercase text-zinc-800 tracking-widest ml-1">Prix (CFA)</label>
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
                  options={["Déjà utilisé mais bon", "Très bon état", "Satisfaisant", "C'est gâté (pour pièces)"]} 
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
      className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6"
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
                <h3 className="text-3xl font-black uppercase tracking-tighter leading-tight italic border-l-8 border-orange-600 pl-6">PROPOSER UN TROC</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-2 ml-8">Sélectionnez vos articles & ajustement</p>
                <div className="mt-4 ml-8">
                  <p className="text-lg font-black text-zinc-900 truncate uppercase tracking-tighter">{targetProduct.title}</p>
                  <p className="text-sm font-black text-orange-600 italic">{formatPrice(targetProduct.price)} FCFA</p>
                </div>
             </div>
             <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-orange-600 shadow-2xl shrink-0 rotate-3 transform hover:rotate-0 transition-transform">
                <img src={targetProduct.images[0]} className="w-full h-full object-cover" alt=""/>
             </div>
          </div>
          
          <div className="space-y-4 ml-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-800 tracking-widest">
                {targetProduct.listingType === 'mixed' ? "Ajuster avec une somme (Obligatoire)" : "Ajuster avec une somme (Optionnel)"}
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  value={priceAdjustment || ''} 
                  onChange={e => setPriceAdjustment(Number(e.target.value))}
                  placeholder={targetProduct.listingType === 'mixed' ? "" : "Montant en F CFA (optionnel)"}
                  className="w-full bg-white border border-zinc-200 p-4 rounded-2xl text-sm font-black italic outline-none focus:border-orange-500 shadow-sm transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 font-bold text-[10px] uppercase tracking-widest pointer-events-none">F CFA</span>
              </div>
            </div>
          </div>

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
                ? (selectedIds.length === 0 || priceAdjustment <= 0)
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

  useEffect(() => {
    product.images.forEach(src => {
      const img = new Image();
      img.src = src;
    });
    
    const fetchSeller = async () => {
      try {
        if (!product.sellerId) return;
        if (globalUserProfileCache[product.sellerId]) {
          setSellerProfile(globalUserProfileCache[product.sellerId] as UserProfile);
        } else {
          const snap = await getDoc(doc(db, 'users', product.sellerId));
          if (snap.exists()) {
            const pData = snap.data() as UserProfile;
            globalUserProfileCache[product.sellerId] = pData;
            setSellerProfile(pData);
          }
        }
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
            className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-4 cursor-default"
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
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6"
        onClick={onClose}
      >
        <div 
          className="w-full md:max-w-6xl h-full md:h-[95vh] bg-white rounded-t-[3rem] md:rounded-[3.5rem] overflow-hidden flex flex-col md:flex-row shadow-2xl relative"
          onClick={e => e.stopPropagation()}
        >
        {/* Carousel Section */}
        <div className="w-full md:w-3/5 h-[50vh] md:h-full bg-zinc-50 relative group flex flex-col shrink-0 overflow-hidden border-r border-zinc-200">
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
                    {product.listingType === 'sale' ? 'Vente Directe' : product.listingType === 'troc' ? 'Troc Uniquement' : 'Les deux (Vente + Troc)'}
                  </span>
                )}
              </div>
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-tight text-zinc-900 border-l-8 border-orange-600 pl-8">{product.title}</h2>
              <div className="flex flex-col gap-4">
                {product.listingType !== 'troc' && (
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-black text-orange-600 italic px-8 py-3 bg-orange-50 rounded-[2rem] w-fit shadow-sm">{formatPrice(product.price)} FCFA</div>
                    {product.listingType === 'mixed' && <span className="text-xl font-bold text-zinc-400">+</span>}
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

          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Description</h3>
            <p className="text-zinc-600 font-medium leading-relaxed bg-zinc-50 p-6 rounded-[2rem] border border-zinc-100 whitespace-pre-wrap">
              {product.description}
            </p>
          </div>

          <div 
            onClick={() => onSellerClick?.(product.sellerId)}
            className="p-8 bg-zinc-900 rounded-[2.5rem] text-white flex items-center justify-between shadow-xl cursor-pointer hover:bg-zinc-800 transition-colors"
          >
             <div className="flex items-center gap-4">
                {sellerProfile?.photoURL ? (
                  <img src={sellerProfile.photoURL} className="w-16 h-16 rounded-2xl object-cover" alt="Seller" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-orange-600 flex items-center justify-center text-3xl font-black italic shadow-inner">
                    {product.sellerName[0]}
                  </div>
                )}
                <div>
                   <div className="flex items-center gap-2">
                     <p className="font-black uppercase tracking-tighter text-xl">{product.sellerName}</p>
                   </div>

                </div>
             </div>
             <Button variant="ghost" className="border border-white/20 rounded-full px-6 text-[10px] uppercase font-black tracking-widest">Voir le profil</Button>
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
                      if (window.confirm("Êtes-vous sûr de vouloir marquer cet article comme vendu ?")) {
                        onMarkAsSold?.(product.id);
                        onClose();
                      }
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
                        <span className="text-[10px] font-black uppercase tracking-[0.1em]">Proposer un troc</span>
                      </Button>
                    </motion.div>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={onFavorite} 
                    className={cn(
                      "flex-1 h-14 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3 backdrop-blur-2xl border-2",
                      favorite ? "bg-red-500/10 text-red-500 border-red-500/20 shadow-lg shadow-red-500/10" : "bg-white/80 text-zinc-400 border-zinc-100 shadow-sm"
                    )}
                  >
                    <Heart size={20} className={favorite ? "fill-red-500" : ""} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{favorite ? "Dans mes favoris" : "Ajouter aux favoris"}</span>
                  </button>
    
                  <button 
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: product.title, url: window.location.href }).catch(() => {});
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                        alert("Lien copié !");
                      }
                    }} 
                    className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-500 hover:bg-zinc-200 flex items-center justify-center active:scale-95 transition-all border border-zinc-200 shadow-sm"
                  >
                    <Share size={20} />
                  </button>
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

const formatTime = (time: number) => {
  if (isNaN(time) || !isFinite(time)) return "0:00";
  const mins = Math.floor(time / 60);
  const secs = Math.floor(Math.round(time % 60));
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const COMMON_EMOJIS = ["❤️", "😂", "😮", "😢", "🔥", "👍", "🙏"];

function MessageBubble({ 
  message, 
  isMe, 
  products, 
  onReply, 
  onReact,
  user,
  onPreviewImage
}: { 
  message: Message; 
  isMe: boolean; 
  products: Product[]; 
  onReply: (m: Message) => void;
  onReact: (m: Message, emoji: string) => void;
  user: User | null;
  onPreviewImage?: (url: string) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [senderProfile, setSenderProfile] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const longPressTimer = useRef<any>(null);
  
  useEffect(() => {
    if (message.senderId) {
      fetchUserProfileCached(message.senderId).then((data) => {
        if (data) setSenderProfile(data);
      });
    }
  }, [message.senderId]);
  
  const targetProduct = products.find(p => p.id === message.productId);
  const exchangeProduct = products.find(p => p.id === message.exchangeProductId);
  
  const handleStartLongPress = () => {
    longPressTimer.current = setTimeout(() => {
      setIsFocused(true);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 300);
  };

  const handleEndLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {isFocused && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsFocused(false)}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 bg-transparent backdrop-blur-[25px]"
          >
            <div className={cn("max-w-sm w-full flex flex-col gap-4", isMe ? "items-end" : "items-start")}>
              <motion.div 
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.1 }}
                className="flex items-center bg-white/60 backdrop-blur-[40px] px-4 py-2 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.1)] gap-2 border border-white/50"
                onClick={e => e.stopPropagation()}
              >
                {["👍", "❤️", "😂", "😮", "😢", "👎"].map(emoji => (
                  <motion.button 
                    key={emoji}
                    whileTap={{ scale: 0.6, y: -10 }}
                    onClick={() => {
                      onReact(message, emoji);
                      setIsFocused(false);
                    }}
                    className="text-[28px] hover:scale-125 transition-transform origin-bottom"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </motion.div>

              <motion.div 
                 layoutId={`msg-${message.id}`}
                 transition={{ type: "spring", stiffness: 400, damping: 35 }}
                 onClick={e => e.stopPropagation()}
                 className={cn(
                   "px-5 py-3.5 rounded-3xl shadow-2xl relative max-w-[85%] text-lg font-medium",
                   isMe ? "bg-orange-600 text-white rounded-br-sm border border-orange-500" : "bg-white text-zinc-900 rounded-bl-sm border border-white"
                 )}
              >
                {message.audioUrl ? "🎤 Note vocale (Audio)" : message.text}
                {message.isExchangeProposal && <p className={cn("text-[10px] font-black uppercase mt-2 tracking-widest", isMe ? "text-orange-200" : "text-orange-600")}>Proposition d'échange</p>}
              </motion.div>

              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: -20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.2 }}
                className="bg-white/60 backdrop-blur-[40px] rounded-2xl w-64 overflow-hidden shadow-[0_16px_64px_rgba(0,0,0,0.15)] flex flex-col divide-y divide-zinc-200/50 border border-white/50"
                onClick={e => e.stopPropagation()}
              >
                <button 
                  onClick={() => {
                    onReply(message);
                    setIsFocused(false);
                  }}
                  className="flex items-center justify-between w-full px-5 py-3.5 text-zinc-900 active:bg-black/5 transition-colors text-left"
                >
                  <span className="font-semibold text-[15px]">Répondre</span>
                  <Reply size={20} className="text-zinc-500" />
                </button>
                <button 
                  onClick={() => setIsFocused(false)}
                  className="flex items-center justify-between w-full px-5 py-3.5 text-red-500 active:bg-red-500/10 transition-colors text-left"
                >
                  <span className="font-semibold text-[15px]">Annuler</span>
                  <X size={20} />
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        className={cn("flex flex-col group relative", isMe ? "items-end" : "items-start")}
        onPointerDown={handleStartLongPress}
        onPointerUp={handleEndLongPress}
        onPointerLeave={handleEndLongPress}
        onPointerCancel={handleEndLongPress}
        onContextMenu={(e) => {
          e.preventDefault();
          setIsFocused(true);
        }}
      >
        {message.replyTo && (
          <div className={cn(
            "mb-1 px-4 py-2 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center gap-2 max-w-[70%] text-[10px] font-bold text-zinc-400",
            isMe ? "mr-4" : "ml-4"
          )}>
            <CornerUpLeft size={10} />
            <span className="truncate italic">"{message.replyTo.text}"</span>
          </div>
        )}
        
        <div className={cn("flex items-end gap-2 max-w-[90%]", isMe ? "flex-row-reverse" : "flex-row")}>
          {!isMe && !message.isSystem && (
            senderProfile?.photoURL ? (
              <img src={senderProfile.photoURL} className="w-8 h-8 rounded-full object-cover shrink-0 mb-1 border" alt="" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0 mb-1">
                {(senderProfile?.displayName || 'U')[0].toUpperCase()}
              </div>
            )
          )}
          <motion.div 
            layoutId={`msg-${message.id}`}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "px-6 py-4 rounded-[2.5rem] text-[17px] font-medium shadow-sm transition-all relative overflow-hidden",
              isMe 
                ? "bg-zinc-900 text-white rounded-tr-none shadow-zinc-900/40" 
                : message.isSystem 
                  ? "bg-white text-zinc-900 rounded-2xl border-4 border-orange-600 shadow-2xl" 
                  : "bg-white text-zinc-900 rounded-tl-none border border-zinc-100"
            )}
          >
            {message.image ? (
              <img 
                src={message.image} 
                alt="Photo" 
                className="max-w-[250px] w-full rounded-[1.5rem] cursor-pointer hover:opacity-90 active:scale-95 transition-all" 
                referrerPolicy="no-referrer"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreviewImage?.(message.image!);
                }}
              />
            ) : message.audioUrl ? (
              <div className="flex flex-col gap-3 min-w-[300px] w-full py-1">
                 <div className="flex items-center gap-4">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (audioRef.current) {
                          if (isPlaying) {
                            audioRef.current.pause();
                          } else {
                            audioRef.current.play();
                          }
                          setIsPlaying(!isPlaying);
                        }
                      }}
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-95 shrink-0",
                        isMe ? "bg-orange-600 text-white" : "bg-zinc-900 text-white"
                      )}
                    >
                      {isPlaying ? (
                        <Pause size={20} fill="currentColor" />
                      ) : (
                        <Play size={20} fill="currentColor" className="ml-1" />
                      )}
                    </button>
                    
                    <div className="flex-1 space-y-2 pr-2">
                       <div className="flex items-end gap-1 h-8 px-1">
                          {[...Array(32)].map((_, i) => {
                            const progress = (currentTime / (duration || 0.1)) * 100;
                            const isPlayed = (i / 32) * 100 < progress;
                            return (
                              <div 
                                key={i} 
                                className={cn(
                                  "flex-1 rounded-full transition-all duration-100",
                                  isPlayed 
                                    ? "bg-orange-500" 
                                    : (isMe ? "bg-white/20" : "bg-zinc-200")
                                )} 
                                style={{ 
                                  height: `${20 + Math.abs(Math.sin((i + (isPlaying ? currentTime * 4 : 0)) * 0.4)) * 80}%`,
                                  opacity: isPlayed ? 1 : 0.4
                                }} 
                              />
                            );
                          })}
                       </div>
                       <div className="flex justify-between items-center px-1">
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">
                            {isPlaying ? "En lecture" : "Note vocale"}
                          </span>
                          <span className="text-[9px] font-black opacity-60 font-mono whitespace-nowrap">
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </span>
                       </div>
                    </div>
                 </div>
                 <audio 
                  ref={audioRef} 
                  src={message.audioUrl} 
                  className="hidden" 
                />
              </div>
            ) : (
              <span className="leading-relaxed">{message.text}</span>
            )}
            
            {message.isExchangeProposal && (targetProduct || exchangeProduct) && (
              <div className="mt-4 p-4 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 space-y-4 text-white">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-600 rounded-xl text-white">
                       <Star size={16} fill="currentColor" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/80">PROPOSITION D'ÉCHANGE</span>
                 </div>
                 
                 <div className="flex items-center gap-4 bg-white/95 p-4 rounded-2xl shadow-sm border border-zinc-100 relative mt-2 text-zinc-900">
                    {exchangeProduct && (
                      <div className="flex-1 flex flex-col items-center text-center gap-1 min-w-0">
                        <span className="text-[6px] font-black text-orange-600 uppercase tracking-[0.2em] mb-1">OFFRE</span>
                        <img src={exchangeProduct.images[0]} className="w-14 h-14 rounded-xl object-cover shadow-inner" />
                        <p className="text-[10px] font-bold text-zinc-900 truncate w-full">{exchangeProduct.title}</p>
                      </div>
                    )}
                    <div className="flex flex-col items-center gap-1 text-orange-600/30">
                      <ArrowLeft size={14} className="rotate-180" />
                      <span className="text-[6px] font-black tracking-widest leading-none">TROC</span>
                      <ArrowLeft size={14} />
                    </div>
                    {targetProduct && (
                      <div className="flex-1 flex flex-col items-center text-center gap-1 min-w-0 opacity-60">
                        <span className="text-[6px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">DEMANDE</span>
                        <img src={targetProduct.images[0]} className="w-14 h-14 rounded-xl object-cover grayscale-[50%]" />
                        <p className="text-[10px] font-bold text-zinc-400 truncate w-full">{targetProduct.title}</p>
                      </div>
                    )}
                  </div>
              </div>
            )}
          </motion.div>
  
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => onReply(message)}
              className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center hover:bg-zinc-200 hover:text-zinc-600 transition-all active:scale-90"
            >
              <Reply size={14} />
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowReactions(!showReactions)}
                className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center hover:bg-zinc-200 hover:text-zinc-600 transition-all active:scale-90"
              >
                <Smile size={14} />
              </button>
              
              <AnimatePresence>
                {showReactions && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    className={cn(
                      "absolute bottom-full mb-2 bg-white rounded-full shadow-2xl border border-zinc-100 p-1 flex gap-1 z-[100] whitespace-nowrap",
                      isMe ? "right-0" : "left-0"
                    )}
                  >
                    {COMMON_EMOJIS.map(emoji => (
                      <button 
                        key={emoji}
                        onClick={() => {
                          onReact(message, emoji);
                          setShowReactions(false);
                        }}
                        className="w-8 h-8 flex items-center justify-center hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
  
        <div className={cn("flex items-center gap-2 mt-2", isMe ? "flex-row-reverse" : "flex-row")}>
          <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest px-1">
            {message.createdAt?.seconds ? new Date(message.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
          </span>
          {message.reactions && Object.entries(message.reactions).some(([_, uids]) => uids.length > 0) && (
            <div className="flex gap-1">
              {Object.entries(message.reactions).map(([emoji, uids]) => uids.length > 0 && (
                <div 
                  key={emoji} 
                  className={cn(
                    "bg-white border px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 shadow-sm",
                    uids.includes(user?.uid || '') ? "border-orange-200 bg-orange-50" : "border-zinc-100"
                  )}
                  onClick={() => onReact(message, emoji)}
                >
                  <span>{emoji}</span>
                  {uids.length > 1 && <span className="font-bold">{uids.length}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const TransactionRatingModal = ({ 
  transaction, 
  user, 
  onClose 
}: { 
  transaction: Transaction; 
  user: User | null; 
  onClose: () => void 
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isBuyer = transaction.buyerId === user?.uid;
  const targetId = isBuyer ? transaction.sellerId : transaction.buyerId;
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!targetId) return;
    if (globalUserProfileCache[targetId]) {
      setTargetProfile({ uid: targetId, ...globalUserProfileCache[targetId] } as UserProfile);
    } else {
      getDoc(doc(db, 'users', targetId)).then(snap => {
        if (snap.exists()) {
          const pData = snap.data();
          globalUserProfileCache[targetId] = pData;
          setTargetProfile({ uid: snap.id, ...pData } as UserProfile);
        }
      }).catch(err => console.warn("Could not load user profile for review modal:", err?.message || String(err)));
    }
  }, [targetId]);

  const handleSubmit = async () => {
    // Security check: ensure user is authenticated and references are valid
    if (!auth.currentUser || !user || !targetId || !transaction?.id) {
      alert("Une erreur est survenue (non authentifié ou référence de transaction invalide).");
      return;
    }
    if (!rating) return;
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      
      // Add Review
      const reviewRef = doc(collection(db, 'reviews'));
      batch.set(reviewRef, {
        fromUserId: user.uid,
        fromUserName: user.displayName || 'Utilisateur',
        toUserId: targetId || '',
        toProductId: transaction.productId || '',
        rating,
        comment,
        createdAt: serverTimestamp()
      });

      // Update target user stats directly inside the batch to avoid recursive onSnapshot writes
      if (targetId) {
        const currentCount = targetProfile?.reviewCount || 0;
        const currentRating = targetProfile?.rating || 0;
        const newCount = currentCount + 1;
        const newRating = Number(((currentRating * currentCount + rating) / newCount).toFixed(1));

        const userRef = doc(db, 'users', targetId);
        batch.update(userRef, {
          rating: newRating,
          reviewCount: newCount
        });

        // Promptly update memory cache to keep UI speed intact
        if (globalUserProfileCache[targetId]) {
          globalUserProfileCache[targetId].rating = newRating;
          globalUserProfileCache[targetId].reviewCount = newCount;
        }
      }

      // Update transaction rated flag
      const transRef = doc(db, 'transactions', transaction.id);
      batch.update(transRef, {
        [isBuyer ? 'buyerRated' : 'sellerRated']: true,
        updatedAt: serverTimestamp()
      });

      await batch.commit();
      onClose();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'reviews');
    }
    setIsSubmitting(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[250] bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[3rem] p-8 w-full max-w-sm text-center space-y-6 shadow-2xl"
      >
        <div className="w-20 h-20 bg-orange-100 rounded-[2rem] flex items-center justify-center mx-auto mb-2">
          <Star className="w-10 h-10 text-orange-600 fill-orange-600" />
        </div>
        
        <div className="space-y-1">
          <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none">Félicitations !</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Transaction terminée avec succès</p>
        </div>

        <div className="space-y-4">
           <p className="text-sm font-medium text-zinc-600">Notez votre expérience avec <span className="font-black text-zinc-900">{targetProfile?.displayName || 'le partenaire'}</span></p>
           
           <div className="flex justify-center gap-2">
             {[1, 2, 3, 4, 5].map(s => (
               <button 
                 key={s} 
                 onClick={() => setRating(s)}
                 className={cn("transition-all", rating >= s ? "text-orange-500 scale-110" : "text-zinc-200")}
               >
                 <Star size={32} fill={rating >= s ? "currentColor" : "none"} />
               </button>
             ))}
           </div>

           <textarea 
             value={comment}
             onChange={e => setComment(e.target.value)}
             placeholder="Un petit mot sur la transaction..."
             className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-100 min-h-[100px] outline-none focus:ring-4 focus:ring-orange-500/10 text-sm font-medium"
           />
        </div>

        <div className="space-y-3">
          <Button 
            variant="primary" 
            disabled={!rating || isSubmitting}
            onClick={handleSubmit}
            className="w-full py-5 rounded-3xl font-black uppercase tracking-widest text-[11px]"
          >
            {isSubmitting ? "Envoi..." : "Envoyer ma note"}
          </Button>
          <button onClick={onClose} className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600">
            Passer pour le moment
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

function ChatWindow({ conversationId, user, profile, products, onBack, onPreviewImage }: { conversationId: string; user: User | null; profile: UserProfile | null; products: Product[]; onBack: () => void; onPreviewImage?: (url: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conv, setConv] = useState<Conversation | null>(null);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingTransactionId, setRatingTransactionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const [otherProfile, setOtherProfile] = useState<UserProfile | null>(null);

  const otherParticipantId = useMemo(() => {
    return conv?.participantIds?.find(id => id !== user?.uid) || '';
  }, [conv?.participantIds, user?.uid]);

  useEffect(() => {
    if (!otherParticipantId) return;
    fetchUserProfileCached(otherParticipantId).then((data) => {
      if (data) {
        setOtherProfile(data as UserProfile);
      } else {
        setOtherProfile(null);
      }
    });
  }, [otherParticipantId]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordingDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const isRecordingRef = useRef(false);

  const startRecording = async () => {
    if (isRecordingRef.current) return;
    setIsRecording(true);
    isRecordingRef.current = true;
    setRecordingDuration(0);
    setRecordingStream(null);
    try {
      if (window.navigator?.vibrate) window.navigator.vibrate(50);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setRecordingStream(stream);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setRecordingStream(null);
        if (audioChunksRef.current.length === 0) return;
        
        let typeStr = mediaRecorder.mimeType || 'audio/webm';
        if (!typeStr.includes('audio')) typeStr = 'audio/mp4';

        const audioBlob = new Blob(audioChunksRef.current, { type: typeStr });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          if (base64Audio.length > 800 * 1024) {
             alert("Note vocale trop longue ou trop volumineuse.");
             return;
          }
          await sendVoiceNote(base64Audio, recordingDuration);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      // Check if user lifted finger while starting
      if (!isRecordingRef.current) {
         setRecordingStream(null);
         stream.getTracks().forEach(track => track.stop());
         return;
      }

      mediaRecorder.start(200);
    } catch (err: any) {
      console.warn("Microphone access:", err?.message || String(err));
      setIsRecording(false);
      isRecordingRef.current = false;
      setRecordingStream(null);
      if (err.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
        alert("L'accès au microphone a été refusé. Veuillez l'autoriser pour envoyer des vocaux, ou ouvrir l'application dans un nouvel onglet.");
      } else {
        alert("Impossible d'accéder au microphone: " + (err.message || 'Erreur inconnue'));
      }
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    isRecordingRef.current = false;
    setRecordingStream(null);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      if (window.navigator?.vibrate) window.navigator.vibrate(20);
    }
  };

  const sendVoiceNote = async (audioUrl: string, durationInSeconds: number) => {
    if (!user) return;
    try {
      const convRef = doc(db, 'conversations', conversationId);
      const batch = writeBatch(db);
      const msgRef = doc(collection(convRef, 'messages'));
      
      batch.set(msgRef, { 
        senderId: user.uid, 
        text: "Note vocale", 
        audioUrl,
        duration: durationInSeconds || 1,
        createdAt: serverTimestamp() 
      });
      
      batch.update(convRef, { 
        lastMessage: "🎤 Note vocale", 
        lastSenderId: user.uid, 
        updatedAt: serverTimestamp() 
      });

      // Notify recipient
      const receiverId = conv?.participantIds?.find(id => id !== user.uid);
      if (receiverId) {
        const notifRef = doc(collection(db, 'users', receiverId, 'notifications'));
        batch.set(notifRef, {
          type: 'message',
          title: `Message de ${user.displayName || 'TrocShop'}`,
          body: "🎤 Note vocale",
          toUserId: receiverId,
          fromUserId: user.uid,
          fromUserName: user.displayName,
          conversationId: conversationId,
          createdAt: serverTimestamp(),
          read: false
        });
      }
      
      await batch.commit();
    } catch (e: any) {
      console.error("Voice note error:", e?.message || String(e));
      alert("Erreur lors de l'envoi de la note vocale. Le fichier est peut-être trop volumineux.");
      handleFirestoreError(e, OperationType.WRITE, `messages`);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsubMessages = onSnapshot(q, (snap) => {
      const newMessages = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      const previousCount = prevMessagesCountRef.current;
      setMessages(newMessages);
      
      // Auto-scroll on initial load or if a new message is received.
      // Do not auto-scroll if message count is the same (e.g. adding a reaction)
      if (previousCount === 0 || newMessages.length > previousCount) {
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 100);
      }
      
      prevMessagesCountRef.current = newMessages.length;
    }, (e) => handleFirestoreError(e, OperationType.GET, `conversations/${conversationId}/messages`));

    return () => unsubMessages();
  }, [conversationId]);

  useEffect(() => {
    const unsubConv = onSnapshot(doc(db, 'conversations', conversationId), (d) => {
       if (d.exists()) setConv({ id: d.id, ...d.data() } as Conversation);
    }, (e) => handleFirestoreError(e, OperationType.GET, `conversations/${conversationId}`));

    return () => unsubConv();
  }, [conversationId]);

  useEffect(() => {
    if (!user || !conv?.productId) {
      setTransaction(null);
      return;
    }
    const qTrans = query(
      collection(db, 'transactions'),
      where('productId', '==', conv.productId),
      where('participantIds', 'array-contains', user.uid)
    );
    const unsubTrans = onSnapshot(qTrans, (snap) => {
      if (!snap.empty) {
        const trans = { id: snap.docs[0].id, ...snap.docs[0].data() } as Transaction;
        setTransaction(trans);
        
        // Show rating modal if completed and not yet rated by current user
        const isBuyer = trans.buyerId === user.uid;
        const hasRated = isBuyer ? trans.buyerRated : trans.sellerRated;
        if (trans.status === 'completed' && !hasRated) {
          setShowRatingModal(true);
        }
      } else {
        setTransaction(null);
      }
    }, (e) => handleFirestoreError(e, OperationType.GET, `conversations/${conversationId}/transactions`));

    return () => unsubTrans();
  }, [conv?.productId, user?.uid, conversationId]);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    const text = newMessage.trim();
    setNewMessage('');
    setShowEmojiPicker(false);
    
    try {
      const convRef = doc(db, 'conversations', conversationId);
      
      // Verification before batch to avoid silent failure if conv missing
      const convSnap = await getDoc(convRef);
      if (!convSnap.exists()) {
         console.warn("Conversation document is missing! Attempting to recreate...");
         // This might happen if index is out of sync. Recreating with basic info.
         // But normally startConversation handles this.
         throw new Error("Conversation non trouvée. Veuillez relancer la discussion.");
      }

      const batch = writeBatch(db);
      const msgRef = doc(collection(convRef, 'messages'));
      
      const messageData: any = { 
        senderId: user.uid, 
        text, 
        createdAt: serverTimestamp() 
      };

      if (replyingTo) {
        messageData.replyTo = {
          id: replyingTo.id,
          text: replyingTo.text,
          senderId: replyingTo.senderId
        };
        setReplyingTo(null);
      }

      batch.set(msgRef, messageData);
      batch.update(convRef, { 
        lastMessage: text, 
        lastSenderId: user.uid, 
        updatedAt: serverTimestamp() 
      });

      // Notify recipient
      const receiverId = convSnap.data()?.participantIds?.find((id: string) => id !== user.uid);
      if (receiverId) {
        const notifRef = doc(collection(db, 'users', receiverId, 'notifications'));
        batch.set(notifRef, {
          type: 'message',
          title: `Message de ${user.displayName || 'TrocShop'}`,
          body: text,
          toUserId: receiverId,
          fromUserId: user.uid,
          fromUserName: user.displayName,
          conversationId: conversationId,
          createdAt: serverTimestamp(),
          read: false
        });
      }
      
      await batch.commit();
    } catch (err: any) {
      console.error("Plus d'infos sur l'erreur d'envoi:", err?.message || String(err));
      alert("Impossible d'envoyer le message. Vérifiez votre connexion.");
      setNewMessage(text);
    }
  };

  const handleReact = async (msg: Message, emoji: string) => {
    if (!user) return;
    const msgRef = doc(db, 'conversations', conversationId, 'messages', msg.id);
    const currentReactions = msg.reactions || {};
    const uids = currentReactions[emoji] || [];
    
    let newUids;
    if (uids.includes(user.uid)) {
      newUids = uids.filter(id => id !== user.uid);
    } else {
      newUids = [...uids, user.uid];
    }

    await updateDoc(msgRef, {
      [`reactions.${emoji}`]: newUids
    }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `messages/${msg.id}`));
  };

  const handleShareNumber = async () => {
    if (!user || !profile) return;
    try {
      const text = `Mon numéro de téléphone est : +225 ${profile.phoneNumber}`;
      const convRef = doc(db, 'conversations', conversationId);
      const batch = writeBatch(db);
      const msgRef = doc(collection(convRef, 'messages'));
      
      batch.set(msgRef, { 
        senderId: user.uid, 
        text, 
        createdAt: serverTimestamp(),
        isSystem: true
      });
      
      batch.update(convRef, { 
        lastMessage: "Numéro partagé", 
        lastSenderId: user.uid, 
        updatedAt: serverTimestamp() 
      });
      
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `messages`);
    }
  };

  const handleDelete = async () => {
    safeConfirm("Voulez-vous supprimer définitivement cette conversation ?", async () => {
      try {
        await deleteDoc(doc(db, 'conversations', conversationId));
        onBack();
        safeAlert("Conversation supprimée.");
      } catch (err) {
        safeAlert("Erreur lors de la suppression de la conversation.");
        handleFirestoreError(err, OperationType.DELETE, `conversations/${conversationId}`);
      }
    });
  };

  const handleConcludeDeal = async () => {
    if (!user || !conv || !conv.productId) return;
    if (!confirm("Conclure l'accord pour cet article ? Un code de validation sera généré.")) return;

    try {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      const batch = writeBatch(db);
      
      // Update Product
      const prodRef = doc(db, 'products', conv.productId);
      batch.update(prodRef, {
        status: 'pending',
        updatedAt: serverTimestamp()
      });

      // Create Transaction
      const transRef = doc(collection(db, 'transactions'));
      const buyerId = conv.participantIds.find(id => id !== user.uid)!;
      
      batch.set(transRef, {
        productId: conv.productId,
        productTitle: conv.productTitle || 'Article',
        productImage: conv.productImage || '',
        buyerId,
        sellerId: user.uid,
        participantIds: [user.uid, buyerId],
        price: conv.productPrice || 0,
        status: 'code_generated', // Start with code generated
        verificationCode: code,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        buyerRated: false,
        sellerRated: false
      });

      // Add system message
      const msgRef = doc(collection(db, 'conversations', conversationId, 'messages'));
      batch.set(msgRef, {
        senderId: user.uid,
        text: `Accord conclu ! Le vendeur a généré un code de validation de 4 chiffres.`,
        isSystem: true,
        createdAt: serverTimestamp()
      });

      // Notify buyer
      const notifRef = doc(collection(db, 'users', buyerId, 'notifications'));
      batch.set(notifRef, {
        type: 'transaction',
        title: 'Accord conclu !',
        body: `Le vendeur a accepté la vente pour "${conv.productTitle}". Entrez le code lors de la rencontre.`,
        toUserId: buyerId,
        fromUserId: user.uid,
        fromUserName: user.displayName,
        productId: conv.productId,
        transactionId: transRef.id,
        createdAt: serverTimestamp(),
        read: false
      });

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'transactions');
    }
  };

  const handleGenerateCode = async () => {
    if (!transaction || !user) return;
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    try {
      await updateDoc(doc(db, 'transactions', transaction.id), {
        verificationCode: code,
        status: 'code_generated',
        updatedAt: serverTimestamp()
      });
      
      // System message
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        senderId: user.uid,
        text: "Code de validation généré par le vendeur.",
        isSystem: true,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `transactions/${transaction.id}`);
    }
  };

  const handleVerifyCode = async () => {
    if (!transaction || !user) return;
    if (inputCode === transaction.verificationCode) {
      try {
        const batch = writeBatch(db);
        
        // Update Transaction
        batch.update(doc(db, 'transactions', transaction.id), {
          status: 'completed',
          updatedAt: serverTimestamp()
        });

        // Update Product
        batch.update(doc(db, 'products', transaction.productId), {
          status: 'sold',
          is_available: false,
          transactionInProgress: false,
          updatedAt: serverTimestamp()
        });

        // Notify Seller to delete sold listing
        const notifRef = doc(collection(db, 'users', transaction.sellerId, 'notifications'));
        batch.set(notifRef, {
          type: 'system',
          title: 'Article vendu ! 🛍️',
          body: `Votre article "${transaction.productTitle}" a été vendu. Veuillez s'il vous plaît le retirer du catalogue.`,
          toUserId: transaction.sellerId,
          fromUserId: 'system',
          fromUserName: 'TrocShop',
          productId: transaction.productId,
          transactionId: transaction.id,
          createdAt: serverTimestamp(),
          read: false
        });

        // System message
        batch.set(doc(collection(db, 'conversations', conversationId, 'messages')), {
          senderId: user.uid,
          text: "Transaction terminée avec succès ! Félicitations.",
          isSystem: true,
          createdAt: serverTimestamp()
        });

        await batch.commit();
        setIsVerifyingCode(false);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `transactions/${transaction.id}`);
      }
    } else {
      alert("Code incorrect. Veuillez réessayer.");
    }
  };

  const handleCancelTransaction = async () => {
    if (!transaction || !user) return;
    if (!confirm("Annuler la transaction en cours ? L'article repassera en disponible.")) return;

    try {
      const batch = writeBatch(db);
      
      batch.update(doc(db, 'transactions', transaction.id), {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });

      batch.update(doc(db, 'products', transaction.productId), {
        status: 'available',
        is_available: true,
        updatedAt: serverTimestamp()
      });

      batch.set(doc(collection(db, 'conversations', conversationId, 'messages')), {
        senderId: user.uid,
        text: "La transaction a été annulée.",
        isSystem: true,
        createdAt: serverTimestamp()
      });

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `transactions/${transaction.id}`);
    }
  };

  const handleConfirmTransaction = async (transactionId: string, inputCode?: string) => {
    try {
      const transactionRef = doc(db, 'transactions', transactionId);
      const transactionSnap = await getDoc(transactionRef);

      if (!transactionSnap.exists()) {
        toast.error('Transaction introuvable');
        return;
      }

      const transactionData = transactionSnap.data();
      const isSeller = transactionData.sellerId === user?.uid;
      const isBuyer = transactionData.buyerId === user?.uid;

      if (!isSeller && !isBuyer) {
        toast.error('Vous n\'êtes pas autorisé à modifier cette transaction');
        return;
      }

      // Cas 1 : Le vendeur clique pour générer le code de sécurité
      if (isSeller) {
        if (transactionData.sellerConfirmed) {
          toast.success('Vous avez déjà confirmé votre côté');
          return;
        }

        const secureCode = Math.floor(1000 + Math.random() * 9000).toString();
        
        await updateDoc(transactionRef, {
          sellerConfirmed: true,
          verificationCode: secureCode,
          updatedAt: serverTimestamp()
        });
        
        toast.success('Code généré avec succès ! Transmettez-le à l\'acheteur.');
        return;
      }

      // Cas 2 : L'acheteur saisit le code reçu en face à face
      if (isBuyer) {
        if (!inputCode || inputCode.trim().length !== 4) {
          toast.error('Veuillez entrer un code valide à 4 chiffres');
          return;
        }

        if (inputCode !== transactionData.verificationCode) {
          toast.error('Code de validation incorrect');
          return;
        }

        await updateDoc(transactionRef, {
          buyerConfirmed: true,
          status: 'completed',
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        if (transactionData.productId) {
          const productRef = doc(db, 'products', transactionData.productId);
          await updateDoc(productRef, {
            status: transactionData.type === 'vente' ? 'sold' : 'exchanged',
            transactionInProgress: false,
            updatedAt: serverTimestamp()
          });

          // Notify Seller to delete sold listing
          const notifSellerRef = doc(collection(db, 'users', transactionData.sellerId, 'notifications'));
          await setDoc(notifSellerRef, {
            type: 'system',
            title: 'Article vendu ! 🛍️',
            body: `Votre article "${transactionData.productTitle}" a été vendu. Veuillez s'il vous plaît le retirer du catalogue.`,
            toUserId: transactionData.sellerId,
            fromUserId: 'system',
            fromUserName: 'TrocShop',
            productId: transactionData.productId,
            transactionId: transactionId,
            createdAt: serverTimestamp(),
            read: false
          });
        }

        toast.success('Transaction validée et complétée !');
        setShowRatingModal(true);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${transactionId}`);
    }
  };

  const otherName = conv?.participantNames?.find(n => n !== user?.displayName) || conv?.participantIds?.find(id => id !== user?.uid)?.slice(0, 8) || "Discuter";
  const sellerId = conv?.sellerId || products.find(p => p.id === conv?.productId)?.sellerId;
  const isSeller = sellerId === user?.uid;

  return (
    <motion.div 
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      className="fixed inset-0 z-[200] bg-zinc-50 flex flex-col overflow-hidden h-[100dvh]"
    >
      <header className="absolute top-0 left-0 right-0 z-50 p-4 pt-safe pb-2 bg-transparent pointer-events-none">
        <div className="max-w-xl mx-auto space-y-2">
          {/* Top Bubble - Navigation and User with glassmorphism style */}
          <div className="bg-white/45 backdrop-blur-[35px] backdrop-saturate-[180%] border border-white/60 rounded-[2rem] px-4 h-20 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.04)] pointer-events-auto">
            <div className="flex items-center gap-3.5 w-full">
              <button 
                onClick={onBack} 
                className="w-11 h-11 text-zinc-950 flex items-center justify-center active:scale-90 transition-all font-black bg-white border border-zinc-150 rounded-full shrink-0 shadow-sm"
              >
                <ChevronLeft size={20} className="stroke-[3] inline-block -ml-0.5" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-100/65 flex items-center justify-center text-orange-600 font-extrabold italic shadow-sm overflow-hidden border border-orange-200/50 shrink-0">
                  {otherName?.[0] || 'T'}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 font-sans">
                    <h3 className="font-extrabold uppercase tracking-tight text-sm leading-none text-zinc-800 truncate max-w-[160px]">
                      {otherName}
                    </h3>
                    {(() => {
                      const isOtherCertified = (otherProfile?.is_certified as any) === true || (otherProfile?.is_certified as any) === 'vrai' || (otherProfile?.isCertified as any) === true || (otherProfile?.isCertified as any) === 'vrai' || (otherProfile?.['is certified'] as any) === true || (otherProfile?.['is certified'] as any) === 'vrai';
                      return (
                        <>
                          {isOtherCertified && (
                            <BadgeCheck size={14} className="text-orange-600 fill-orange-600 text-white shrink-0" />
                          )}
                          {otherProfile?.isStudent && (
                            <span className="shrink-0 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5" title={`Étudiant à ${otherProfile.studentSchool || ''}`}>
                              <GraduationCap size={10} className="text-blue-600" />
                              <span>Etudiant</span>
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div className="mt-1">
                    {otherProfile?.isOnline ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0" />
                        CONNECTÉ
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full shrink-0" />
                        DÉCONNECTÉ
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bubble - Product Info with same glassmorphism style */}
          {conv?.productTitle && (
            <motion.div 
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex justify-center"
            >
              <div className="bg-white/45 backdrop-blur-[35px] border border-white/60 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-all cursor-pointer pointer-events-auto hover:bg-white/55">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 overflow-hidden shrink-0 border border-zinc-150 shadow-inner">
                  {conv.productImage ? (
                    <img src={conv.productImage} className="w-full h-full object-cover" alt={conv.productTitle} />
                  ) : (
                    <div className="w-full h-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">TS</div>
                  )}
                </div>
                <div className="flex flex-col">
                  <h4 className="font-bold text-xs text-zinc-500 leading-none">{conv.productTitle}</h4>
                  <p className="text-sm font-black text-orange-600 mt-1 leading-none uppercase">
                    {formatPrice(conv.productPrice || 0)} FCFA
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative flex flex-col bg-transparent">

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-32 space-y-4 no-scrollbar relative z-10 transition-all duration-300 pt-48 md:pt-40">
          <div className="pb-10 pt-4 flex flex-col gap-4">
            {transaction && transaction.status !== 'completed' && (
              <div className="mx-auto w-full max-w-sm">
                {/* Section de validation sécurisée de la transaction */}
                <div className="p-4 border-t border-zinc-100 bg-orange-50/50 rounded-2xl my-3">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        Sécurisation de l'échange
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        (transaction.status as string) === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {(transaction.status as string) === 'completed' ? 'Terminée' : 'En attente'}
                      </span>
                    </div>

                    {/* Interface côté VENDEUR */}
                    {transaction.sellerId === user?.uid && (
                      <div className="flex flex-col gap-2">
                        {!transaction.sellerConfirmed ? (
                          <button
                            onClick={() => handleConfirmTransaction(transaction.id)}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                          >
                            <Handshake size={16} />
                            Confirmer & Générer le code
                          </button>
                        ) : (
                          <div className="bg-white p-3 rounded-xl border border-orange-200 text-center">
                            <p className="text-xs text-zinc-500 mb-1">Donnez ce code secret à l'acheteur en face à face :</p>
                            <p className="text-2xl font-black tracking-widest text-orange-600 animate-pulse">
                              {transaction.verificationCode || "----"}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Interface côté ACHETEUR */}
                    {transaction.buyerId === user?.uid && (
                      <div className="flex flex-col gap-2">
                        {transaction.sellerConfirmed && !transaction.buyerConfirmed ? (
                          <div className="flex flex-col gap-2">
                            <p className="text-xs text-zinc-600 font-medium">
                              Le vendeur a validé. Entrez le code à 4 chiffres qu'il vous donne :
                            </p>
                            <div className="flex gap-2">
                              <input
                                id="verificationCodeInput"
                                type="number"
                                pattern="[0-9]*"
                                maxLength={4}
                                placeholder="Ex: 1234"
                                className="flex-1 bg-white border border-zinc-300 rounded-xl px-3 py-2 text-center font-bold tracking-widest text-zinc-800 focus:outline-none focus:border-orange-500 text-sm"
                                onInput={(e) => {
                                  const target = e.target as HTMLInputElement;
                                  if (target.value.length > 4) target.value = target.value.slice(0, 4);
                                }}
                              />
                              <button
                                onClick={() => {
                                  const inputEl = document.getElementById('verificationCodeInput') as HTMLInputElement;
                                  handleConfirmTransaction(transaction.id, inputEl?.value);
                                }}
                                className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-4 rounded-xl text-sm transition-all active:scale-95"
                              >
                                Valider
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center p-2 bg-zinc-100 rounded-xl">
                            <p className="text-xs text-zinc-500">
                              {transaction.buyerConfirmed 
                                ? "Vous avez validé la transaction avec succès !" 
                                : "En attente du top départ et du code du vendeur..."}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {messages.map((m) => (
              <MessageBubble 
                key={m.id} 
                message={m} 
                isMe={m.senderId === user?.uid} 
                products={products} 
                onReply={setReplyingTo}
                onReact={handleReact}
                user={user}
                onPreviewImage={onPreviewImage}
              />
            ))}
            
            {messages.length === 0 && (
              <div className="py-20 text-center opacity-10">
                <MessageCircle className="w-16 h-16 mx-auto mb-4" strokeWidth={1} />
                <p className="font-black uppercase tracking-[0.2em] text-[10px]">Démarrez la conversation</p>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="flex-none p-4 bg-white border-t border-zinc-100 z-50 relative">
          <AnimatePresence>
            {isRecording && (
              <motion.div 
                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.9 }}
                className="absolute bottom-full left-4 right-4 mb-4 mx-auto max-w-sm bg-gradient-to-r from-red-500 to-rose-600 text-white px-5 py-3 rounded-[2rem] shadow-2xl shadow-red-500/30 flex items-center justify-between border border-white/10 backdrop-blur-xl z-[70]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                  </span>
                  <span className="font-extrabold uppercase tracking-widest text-[9px] leading-none shrink-0">REC</span>
                </div>
                
                {/* Visual Real-time Waveform */}
                <div className="mx-2 flex-1 flex justify-center">
                  <LocalRecordingWaveform stream={recordingStream} />
                </div>

                <div className="text-[10px] font-black italic tabular-nums bg-white/20 px-2.5 py-1 rounded-full border border-white/10 shrink-0">
                  {formatTime(recordingDuration)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="max-w-3xl mx-auto space-y-4">
            {transaction?.status === 'completed' ? (
              <div className="p-4 bg-zinc-900 rounded-2xl text-center">
                 <p className="text-[10px] font-black uppercase tracking-widest text-white">Transaction validée avec succès</p>
              </div>
            ) : (
              <>
                {!isInputFocused && !transaction && (
                  <div className="flex gap-2 pb-2">
                    <button 
                      onClick={handleShareNumber}
                      className="flex-1 h-10 bg-zinc-100 text-zinc-600 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Phone size={12} /> Numéro
                    </button>
                  </div>
                )}
                
                {replyingTo && (
                  <div className="flex items-center justify-between bg-zinc-100 p-3 rounded-2xl text-[10px] text-zinc-500 font-bold mb-2">
                     <span className="truncate">Réponse à : {replyingTo.text}</span>
                     <button onClick={() => setReplyingTo(null)} className="p-1"><X size={12} /></button>
                  </div>
                )}

                <div className="relative group">
                  <AnimatePresence>
                    {showEmojiPicker && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full left-0 mb-4 bg-white rounded-[2rem] shadow-2xl border border-zinc-100 p-4 grid grid-cols-6 gap-2 w-72 z-50 origin-bottom-left"
                      >
                        {Array.from(new Set(COMMON_EMOJIS.concat(["👍", "👎", "😊", "😂", "🥰", "😎", "🤔", "🙌", "💀", "👀", "🔥", "💯"]))).map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setNewMessage(prev => prev + emoji);
                            }}
                            className="text-2xl hover:scale-125 transition-transform active:scale-95"
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {isRecording && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1.5 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="absolute inset-0 bg-red-600/20 rounded-full animate-ping pointer-events-none"
                      />
                    )}
                  </AnimatePresence>

                  <form 
                    onSubmit={onSend} 
                    className={cn(
                      "flex items-center gap-2 bg-zinc-100 rounded-3xl p-2 transition-all",
                      isInputFocused && "bg-white ring-4 ring-orange-500/5 border-orange-100"
                    )}
                  >
                    <button 
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setShowEmojiPicker(!showEmojiPicker);
                      }}
                      className={cn("w-10 h-10 flex items-center justify-center rounded-2xl transition-colors", showEmojiPicker ? "bg-orange-100 text-orange-600" : "text-zinc-400")}
                    >
                      <Smile size={20} />
                    </button>

                    <label className="w-10 h-10 flex items-center justify-center rounded-2xl transition-colors text-zinc-400 hover:text-orange-600 cursor-pointer">
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          // Compress image using canvas
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const img = new Image();
                            img.onload = async () => {
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
                              ctx?.drawImage(img, 0, 0, width, height);
                              
                              const base64Image = canvas.toDataURL('image/jpeg', 0.6); // Compress to 60% quality jpeg
                              
                              if (base64Image.length > 800 * 1024) {
                                alert("L'image compressée est encore trop volumineuse. Essayez une autre.");
                                return;
                              }
                              
                              try {
                                const convRef = doc(db, 'conversations', conversationId);
                                const batch = writeBatch(db);
                                const msgRef = doc(collection(convRef, 'messages'));
                                
                                const messageData: any = { 
                                  senderId: user!.uid, 
                                  text: '📷 Photo', 
                                  image: base64Image,
                                  createdAt: serverTimestamp(),
                                  isRead: false
                                };
                                
                                batch.set(msgRef, messageData);
                                batch.update(convRef, {
                                  lastMessage: '📷 Photo',
                                  lastSenderId: user!.uid,
                                  updatedAt: serverTimestamp()
                                });
                                
                                await batch.commit();
                              } catch (err: any) {
                                console.error("Upload error:", err.message);
                                alert("Impossible d'envoyer l'image. " + err.message);
                              }
                            };
                            img.src = reader.result as string;
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      <ImageIcon size={20} />
                    </label>

                    <input 
                      type="text" 
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onFocus={() => {
                        setIsInputFocused(true);
                        setShowEmojiPicker(false);
                      }}
                      onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
                      placeholder="Message..."
                      className="flex-1 bg-transparent border-none outline-none py-2 px-4 text-sm font-medium"
                    />
                    
                    <div className="flex items-center gap-1">
                      {!newMessage.trim() ? (
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            if (isRecording) {
                              stopRecording();
                            } else {
                              startRecording();
                            }
                          }}
                          className={cn("w-10 h-10 flex items-center justify-center rounded-2xl transition-all", isRecording ? "bg-red-500 text-white scale-110 shadow-lg shadow-red-500/20 animate-pulse" : "text-zinc-400 hover:text-orange-600")}
                        >
                          <Mic size={20} />
                        </button>
                      ) : (
                        <button 
                          type="submit"
                          className="w-10 h-10 bg-orange-600 text-white flex items-center justify-center rounded-2xl shadow-lg shadow-orange-600/20 active:scale-90 transition-all font-black"
                        >
                          <Send size={18} />
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {showRatingModal && transaction && (
        <TransactionRatingModal 
          transaction={transaction}
          user={user}
          onClose={() => setShowRatingModal(false)}
        />
      )}
  </motion.div>
  );
}
