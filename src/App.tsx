import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
  increment
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, serverTimestamp, firebaseConfig } from './lib/firebase';
import { Product, UserProfile, Message, Conversation, Review, Transaction } from './types';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import { 
  Search, 
  PlusCircle, 
  MessageCircle, 
  User as UserIcon, 
  Home as HomeIcon,
  ShoppingBag,
  LogOut,
  ChevronRight,
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
  ListChecks
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatPrice } from './lib/utils';
import { NEIGHBORHOODS, CATEGORIES, CITIES, MEETING_POINTS, AVAILABILITY_OPTIONS } from './constants';

// --- Components ---

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
      className="fixed inset-0 z-[999] bg-zinc-950 flex flex-col items-center justify-center p-6 overflow-hidden"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center relative z-10"
      >
        <div className="w-24 h-24 bg-orange-600 rounded-[2rem] flex items-center justify-center mb-6 mx-auto relative shadow-2xl shadow-orange-600/50">
          <Repeat size={40} className="text-white" strokeWidth={3} />
        </div>
        
        <h1 className="text-white text-3xl font-black italic tracking-tighter mb-4 uppercase">
          TrocShop<span className="text-orange-600">.</span>
        </h1>
      </motion.div>
      
      <div className="absolute bottom-12 left-0 right-0 text-center space-y-4">
        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em] px-8">
          La nouvelle façon d'échanger à Yamoussoukro
        </p>
        <p className="text-[8px] text-zinc-500 font-black tracking-[0.5em] uppercase">
          by Y999
        </p>
      </div>
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
    confirmPassword: ''
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

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Mot de passe</label>
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

const ReviewSection = ({ targetId, targetType, user, onFocusChange }: { targetId: string, targetType: 'user' | 'product', user: User | null, onFocusChange?: (focused: boolean) => void }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const field = targetType === 'user' ? 'toUserId' : 'toProductId';
    const q = query(
      collection(db, 'reviews'),
      where(field, '==', targetId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const revs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Review))
        .sort((a, b) => {
          const t1 = a.createdAt?.seconds || 0;
          const t2 = b.createdAt?.seconds || 0;
          return t2 - t1;
        });
      setReviews(revs);

      // Update user stats if it's a user profile
      if (targetType === 'user' && revs.length > 0) {
        const avg = revs.reduce((acc, r) => acc + r.rating, 0) / revs.length;
        updateDoc(doc(db, 'users', targetId), {
          rating: Number(avg.toFixed(1)),
          reviewCount: revs.length
        }).catch(() => {});
      }
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'reviews'));
    return () => unsub();
  }, [targetId, targetType]);

  const handleSubmit = async () => {
    if (!user || user.uid === targetId || !rating || !comment.trim()) return;
    
    // Enforce 1 review limit per user
    const hasReviewed = reviews.some(r => r.fromUserId === user.uid);
    if (hasReviewed) {
      alert("Vous avez déjà laissé un avis.");
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
        [field]: targetId,
        rating,
        comment,
        createdAt: serverTimestamp()
      });

      // Notify the recipient
      let receiverId = targetId;
      let reviewBody = `Nouvel avis (${rating} étoiles) : "${comment.slice(0, 50)}${comment.length > 50 ? '...' : ''}"`;
      
      if (targetType === 'product') {
        const pSnap = await getDoc(doc(db, 'products', targetId));
        if (pSnap.exists()) {
          receiverId = pSnap.data().sellerId;
        }
      }

      if (receiverId !== user.uid) {
        const notifRef = doc(collection(db, 'users', receiverId, 'notifications'));
        batch.set(notifRef, {
          type: 'comment',
          title: 'Nouveau commentaire',
          body: reviewBody,
          toUserId: receiverId,
          fromUserId: user.uid,
          fromUserName: user.displayName,
          productId: targetType === 'product' ? targetId : null,
          createdAt: serverTimestamp(),
          read: false
        });
      }

      await batch.commit();

      // Update aggregate stats for the target (user or product)
      const newCount = reviews.length + 1;
      const newRating = Number(((reviews.reduce((acc, r) => acc + r.rating, 0) + rating) / newCount).toFixed(1));

      if (targetType === 'user') {
        const userRef = doc(db, 'users', targetId);
        await updateDoc(userRef, {
          rating: newRating,
          reviewCount: newCount
        }).catch(e => handleFirestoreError(e, OperationType.UPDATE, 'users'));
      } else if (targetType === 'product') {
        const productRef = doc(db, 'products', targetId);
        await updateDoc(productRef, {
          rating: newRating,
          reviewCount: newCount
        }).catch(e => handleFirestoreError(e, OperationType.UPDATE, 'products'));
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

      {!reviews.some(r => r.fromUserId === user?.uid) && user && user.uid !== targetId && (
        <div className="p-5 bg-orange-50 rounded-[2.5rem] border border-orange-100/50 space-y-6 shadow-inner">
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(s => (
                <motion.button 
                  key={s} 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setRating(s)} 
                  className={cn("transition-all duration-300", rating >= s ? "text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]" : "text-zinc-200")}
                >
                  <Star size={36} fill={rating >= s ? "currentColor" : "none"} strokeWidth={rating >= s ? 0 : 2} />
                </motion.button>
              ))}
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600/60 italic">
              {rating === 0 ? "Votre note" : `${rating} / 5 étoiles`}
            </p>
          </div>

          <textarea 
            value={comment}
            onChange={e => setComment(e.target.value)}
            onFocus={() => onFocusChange?.(true)}
            onBlur={() => onFocusChange?.(false)}
            placeholder="Dites-nous ce que vous avez pensé de ce troc..."
            className="w-full p-5 rounded-3xl bg-white border-zinc-100 min-h-[120px] outline-none focus:ring-4 focus:ring-orange-500/10 text-sm font-medium text-zinc-600 leading-relaxed shadow-sm transition-all resize-none"
          />

          <Button 
            variant="primary" 
            disabled={loading || !rating || !comment.trim()} 
            onClick={handleSubmit} 
            className="w-full h-14 rounded-2xl uppercase tracking-[0.2em] font-black text-[11px] shadow-xl shadow-orange-600/20"
          >
            {loading ? "Chargement..." : "Publier l'avis"}
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
              <span className="font-black text-[10px] uppercase tracking-widest text-zinc-400">{r.fromUserName}</span>
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

const OTPInput = ({ value, onChange, onComplete, disabled }: { value: string, onChange: (v: string) => void, onComplete: () => void, disabled?: boolean }) => {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (disabled) return;
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    
    const newVal = value.split('');
    // Fill or clear depending on if val exists
    if (!val) {
      newVal[index] = '';
    } else {
      newVal[index] = val;
    }
    
    const finalValue = newVal.join('');
    onChange(finalValue);
    
    if (val && index < 3) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (disabled) return;
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        inputs.current[index - 1]?.focus();
      }
    }
  };

  useEffect(() => {
    if (value.length === 4 && !value.includes('')) {
      onComplete();
    }
  }, [value, onComplete]);

  return (
    <div className="flex justify-center gap-2">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleChange(e, i)}
          onKeyDown={e => handleKeyDown(e, i)}
          disabled={disabled}
          autoFocus={i === 0 && !value}
          className={cn(
            "w-12 h-14 bg-white border-2 border-zinc-100 rounded-xl text-center text-xl font-black text-orange-600 outline-none transition-all shadow-sm",
            disabled ? "opacity-50" : "focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10",
            value[i] ? "border-orange-200 bg-orange-50" : ""
          )}
        />
      ))}
    </div>
  );
};

const ProfileSettings = ({ profile, user, onSave, onBack }: { profile: UserProfile, user: User | null, onSave: (data: Partial<UserProfile>) => void, onBack: () => void }) => {
  const [data, setData] = useState({
    displayName: profile.displayName || '',
    bio: profile.bio || '',
    phoneNumber: profile.phoneNumber || '',
    neighborhood: profile.neighborhood || '',
    photoURL: profile.photoURL || '',
    coverURL: profile.coverURL || '',
    city: profile.city || 'Yamoussoukro',
    phoneVisibility: profile.phoneVisibility || 'public'
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'photoURL' | 'coverURL') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 800 * 1024) {
      alert("L'image est trop lourde (max 800 Ko). Veuillez la compresser.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setData(prev => ({ ...prev, [field]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await onSave(data);
      setLoading(false);
      setSaved(true);
      setTimeout(() => onBack(), 1500);
    } catch (err) {
      setLoading(false);
      alert("Erreur lors de la sauvegarde.");
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-white border border-zinc-100 rounded-2xl shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-black uppercase tracking-tighter">PARAMÈTRES</h2>
      </header>

      <div className="bg-white p-6 rounded-[2.5rem] border border-zinc-100 shadow-xl space-y-6">
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative group">
            {data.photoURL ? (
              <img src={data.photoURL} className="w-24 h-24 rounded-[2.5rem] border-4 border-white shadow-xl object-cover" />
            ) : (
               <div className="w-24 h-24 rounded-[2.5rem] bg-orange-100 flex items-center justify-center text-orange-600 text-3xl font-black">{data.displayName?.[0] || 'U'}</div>
            )}
            <input 
              type="file" 
              ref={avatarInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={e => handleFileChange(e, 'photoURL')} 
            />
            <button 
              onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 bg-orange-600 text-white p-2.5 rounded-2xl shadow-lg active:scale-95 transition-all border-4 border-white"
            >
              <Camera size={16} />
            </button>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Changer ma photo</p>
        </div>

        <div className="space-y-1.5 pt-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Photo de Couverture</label>
          <div className="relative h-40 rounded-[2rem] overflow-hidden bg-zinc-50 border border-zinc-100 group shadow-inner">
             {data.coverURL ? (
               <img src={data.coverURL} className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full flex items-center justify-center text-zinc-300">
                 <ImageIcon size={40} />
               </div>
             )}
             <input 
               type="file" 
               ref={coverInputRef} 
               className="hidden" 
               accept="image/*" 
               onChange={e => handleFileChange(e, 'coverURL')} 
             />
             <button 
               onClick={() => coverInputRef.current?.click()}
               className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
             >
               <div className="bg-orange-600 p-4 rounded-2xl shadow-xl">
                 <Camera size={24} />
               </div>
             </button>
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

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Quartier</label>
          <CustomDropdown 
            value={data.neighborhood || ''} 
            options={NEIGHBORHOODS} 
            onChange={v => setData({...data, neighborhood: v})} 
          />
        </div>

        <div className="pt-4 space-y-4">
           {loading ? (
             <div className="flex justify-center p-4">
               <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
             </div>
           ) : saved ? (
              <div className="w-full py-4 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest border border-green-100 italic">
                <Check size={16} strokeWidth={4} /> Modifications enregistrées
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

const ProductCard = ({ product, onClick, favorite, onFavorite, onBuy, isOwner }: { product: Product; onClick: () => void; favorite?: boolean; onFavorite?: (e: React.MouseEvent) => void; onBuy?: (e: React.MouseEvent) => void, isOwner?: boolean }) => (
    <motion.div 
    layout="position"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    whileTap={{ scale: 0.98 }}
    onClick={() => {
      if (product.status !== 'pending' && product.status !== 'sold') {
        onClick();
      }
    }}
    className="group cursor-pointer bg-white rounded-[2rem] overflow-hidden border border-zinc-100 hover:shadow-[0_15px_30px_rgba(0,0,0,0.05)] transition-all duration-300 relative"
  >
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
      {(product.status === 'available' || !product.status) && (
        <button 
          onClick={(e) => { e.stopPropagation(); onFavorite?.(e); }}
          className="px-3 py-2 rounded-full bg-white/90 backdrop-blur-md flex items-center gap-2 border border-zinc-100 shadow-sm transition-all active:scale-75 hover:bg-white"
        >
          <Heart className={cn("w-4 h-4 transition-colors", favorite ? "fill-red-500 text-red-500" : "text-zinc-400")} />
          <span className="text-[10px] font-black text-orange-600">{product.likesCount || 0}</span>
        </button>
      )}
    </div>

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
        {product.status === 'pending' && (
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
    <div className="p-4">
      <h3 className="font-black text-zinc-900 truncate text-sm mb-1 uppercase tracking-tighter leading-tight font-sans">{product.title}</h3>
      <div className="mt-2">
        {product.listingType !== 'troc' && (
          <span className="text-orange-600 font-black tracking-tight italic text-base block">
            {formatPrice(product.price)}
            <span className="text-[8px] ml-1 uppercase not-italic opacity-40">FCFA</span>
          </span>
        )}
        {(product.listingType === 'troc' || product.listingType === 'mixed') && (
          <span className="text-[9px] font-black uppercase text-blue-600 tracking-tighter line-clamp-1 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md w-fit mt-1">
            <Repeat size={10} /> {product.exchangeWanted || 'À débattre'}
          </span>
        )}
      </div>
    </div>
  </motion.div>
);


const TrocVerificationModal = ({ exchange, user, onVerify, onClose }: { exchange: any, user: User | null, onVerify: (code: string) => void, onClose: () => void }) => {
  const [code, setCode] = useState('');
  const isSeller = exchange.sellerId === user?.uid;

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
        className="bg-white p-6 md:p-8 rounded-[3rem] shadow-2xl max-w-[90%] md:max-w-sm w-full space-y-6 md:space-y-8 text-center"
      >
        <div className="w-16 h-16 md:w-20 md:h-20 bg-orange-100 rounded-[1.8rem] md:rounded-[2rem] flex items-center justify-center mx-auto">
          <Handshake className="w-8 h-8 md:w-10 md:h-10 text-orange-600" />
        </div>
        <div className="space-y-4">
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter italic leading-none">Validation du Troc</h2>
          <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-1">
            {isSeller ? "Donnez ce code à l'acheteur" : "Saisissez le code du vendeur"}
          </p>
        </div>

        {isSeller ? (
          <div className="bg-zinc-50 p-6 md:p-8 rounded-3xl border-2 border-dashed border-orange-200 overflow-hidden">
            <span className="text-3xl md:text-5xl font-black tracking-[0.2em] italic text-zinc-900 block truncate">{exchange.trocCode || '----'}</span>
          </div>
        ) : (
          <div className="w-full max-w-full overflow-hidden px-1">
             <div className="w-full bg-zinc-50 rounded-[2rem] p-2 border border-zinc-100 shadow-inner">
               <input 
                type="text" 
                maxLength={4} 
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
                className="w-full text-center text-3xl md:text-4xl font-black italic tracking-[0.1em] py-5 md:py-6 bg-transparent outline-none focus:ring-0 text-zinc-900 cursor-text"
               />
             </div>
             <p className="text-[10px] italic font-medium text-zinc-400 mt-4">Saisissez le code fourni par le vendeur.</p>
             <Button 
              variant="primary" 
              className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-orange-600/20 mt-4"
              disabled={code.length !== 4}
              onClick={() => onVerify(code)}
             >
               OK
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

const MyTrocSection = ({ exchanges, user, products, onStatusUpdate, onVerifyCode, onStartChat }: { exchanges: any[], user: User | null, products: Product[], onStatusUpdate: (exId: string, status: string) => void, onVerifyCode: (ex: any) => void, onStartChat?: (sellerId: string) => void }) => {
  const [activeTab, setActiveTab] = useState<'ongoing' | 'past'>('ongoing');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTrocs, setSelectedTrocs] = useState<string[]>([]);

  const handleDeleteExchange = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'exchanges', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `exchanges/${id}`);
    }
  };

  const filteredExchanges = useMemo(() => {
    // Only show barters (exchanges) in My Troc section as requested
    const barterOnly = exchanges.filter(e => e.type === 'exchange');
    if (activeTab === 'ongoing') {
      return barterOnly.filter(e => e.status === 'pending' || e.status === 'accepted');
    }
    return barterOnly.filter(e => e.status === 'completed' || e.status === 'cancelled');
  }, [exchanges, activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 mb-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase italic">Mon Troc</h2>
          <div className="h-1.5 w-12 bg-orange-600 rounded-full mt-1" />
        </div>
        
        <div className="grid grid-cols-2 bg-white p-1 rounded-full border border-zinc-100 shadow-sm relative z-10 w-full">
          <button 
            onClick={() => { setActiveTab('ongoing'); setIsEditMode(false); setSelectedTrocs([]); }}
            className={cn(
              "py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all",
              activeTab === 'ongoing' ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            En cours ({exchanges.filter(e => (e.type === 'exchange') && (e.status === 'pending' || e.status === 'accepted')).length})
          </button>
          <button 
            onClick={() => setActiveTab('past')}
            className={cn(
              "py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all",
              activeTab === 'past' ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            Historique
          </button>
        </div>
      </div>

      <div className="space-y-4 pb-12">
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
                    {isSeller ? 'Proposé par un acheteur' : 'Vous avez proposé ceci'}
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

                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onStartChat) onStartChat(ex.sellerId === user?.uid ? ex.buyerId : ex.sellerId);
                          }}
                          className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-zinc-900/20"
                        >
                          <MessageCircle size={14} className="text-orange-600" />
                          <span>Discuter</span>
                        </button>
                        {isSeller && ex.status === 'pending' && (
                          <div className="flex flex-1 gap-2">
                            <Button variant="primary" className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest" onClick={() => onStatusUpdate(ex.id, 'accepted')}>
                              Accepter
                            </Button>
                            <Button variant="outline" className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-none bg-red-50 text-red-600" onClick={() => onStatusUpdate(ex.id, 'cancelled')}>
                              Refuser
                            </Button>
                          </div>
                        )}
                      </div>

              {ex.status === 'accepted' && (
                <div className="space-y-2">
                  <Button 
                    variant="secondary" 
                    className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] bg-zinc-900 shadow-xl shadow-zinc-900/20" 
                    onClick={() => onVerifyCode(ex)}
                  >
                     {isSeller ? "Confirmer l'échange" : "Saisir le code"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 border border-orange-100" 
                    onClick={() => onStartChat?.(isSeller ? ex.buyerId : ex.sellerId)}
                  >
                     Commencer à discuter
                  </Button>
                </div>
              )}
              
              {!isSeller && ex.status === 'pending' && (
                <p className="text-center text-[10px] font-bold text-zinc-400 italic">En attente de réponse du vendeur...</p>
              )}

              {ex.status === 'completed' && (
                 <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100/50">
                   {(!isSeller ? ex.buyerRating : ex.sellerRating) ? (
                     <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Votre avis :</p>
                        <div className="flex gap-1 text-orange-500 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={10} fill={i < (!isSeller ? ex.buyerRating : ex.sellerRating) ? "currentColor" : "none"} />
                          ))}
                        </div>
                        <p className="text-sm font-medium text-zinc-600 italic">"{!isSeller ? ex.buyerComment : ex.sellerComment}"</p>
                     </div>
                   ) : (
                     <>
                       <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 text-center mb-3">Expérience terminée ! Laissez un avis.</p>
                       <ReviewSection targetId={isSeller ? ex.buyerId : ex.sellerId} targetType="user" user={user} />
                     </>
                   )}
                 </div>
               )}

               {(ex.status === 'completed' || ex.status === 'cancelled') && (
                 <div className="flex justify-end pt-2 border-t border-zinc-50">
                   <button 
                     onClick={(e) => {
                       if (confirm("Supprimer cette transaction de l'historique ?")) {
                        handleDeleteExchange(ex.id, e);
                       }
                     }}
                     className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 p-2"
                   >
                     <Trash2 size={12} /> Supprimer
                   </button>
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
            <h3 className="font-black uppercase tracking-widest text-[11px] text-zinc-400">Aucun troc à afficher</h3>
            <p className="text-[10px] text-zinc-300 font-medium max-w-[200px] mx-auto mt-2">Commencez par proposer un échange sur un article !</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App ---



export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [filterPriceMax, setFilterPriceMax] = useState<number | null>(null);
  const [filterCondition, setFilterCondition] = useState<string>('Tous');
  const [filterNeighborhood, setFilterNeighborhood] = useState<string>('Tous');
  const [filterListingType, setFilterListingType] = useState<string>('Tous');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isNotificationEditMode, setIsNotificationEditMode] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [peekedNotificationId, setPeekedNotificationId] = useState<string | null>(null);
  
  const [isMessagesEditMode, setIsMessagesEditMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [peekedConversationId, setPeekedConversationId] = useState<string | null>(null);
  const [notifInputCodes, setNotifInputCodes] = useState<{[key: string]: string}>({});
  const [ratingTransaction, setRatingTransaction] = useState<Transaction | null>(null);

  const [isMyTrocEditMode, setIsMyTrocEditMode] = useState(false);
  const [selectedTrocs, setSelectedTrocs] = useState<string[]>([]);

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
  const [showTrocVerifier, setShowTrocVerifier] = useState<any | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingTrocs, setPendingTrocs] = useState(0);
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [previousProduct, setPreviousProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [profileView, setProfileView] = useState<'main' | 'listings' | 'favorites' | 'settings'>('main');
  const [showExchangePicker, setShowExchangePicker] = useState(false);
  const isCreatingProfile = useRef(false);
  const unsubProfileRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Connection test logic as per critical directive
    const checkConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (e) {
        if (e instanceof Error && e.message.includes('offline')) {
          console.warn("Firestore offline - will retry automatically.");
        }
      }
    };
    checkConnection();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (unsubProfileRef.current) {
        unsubProfileRef.current();
        unsubProfileRef.current = null;
      }
      setUser(u);
      if (u) {
        if (activeTab === 'auth') setActiveTab('home');
        const userRef = doc(db, 'users', u.uid);
        unsubProfileRef.current = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
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
              badges: []
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

    return () => {
      unsubscribe();
      if (unsubProfileRef.current) unsubProfileRef.current();
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

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc')
    );
    
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => {
      if (!(e instanceof Error && e.message.includes('offline'))) {
        handleFirestoreError(e, OperationType.GET, `users/${user.uid}/notifications`);
      }
    });

    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const p = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((prod: any) => !prod.isTemporary && prod.status !== 'deleted') as Product[];
      setProducts(p);
      setIsInitialLoading(false);
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, 'products');
      setIsInitialLoading(false);
    });

    return () => unsubscribe();
  }, []);


  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [publicProfile, setPublicProfile] = useState<UserProfile | null>(null);
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Handle selected seller profile loading
  useEffect(() => {
    const loadSellerProfile = async () => {
      if (!selectedSellerId) {
        setPublicProfile(null);
        setSellerProducts([]);
        return;
      }
      
      try {
        const docRef = doc(db, 'users', selectedSellerId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPublicProfile(docSnap.data() as UserProfile);
          
          const q = query(
            collection(db, 'products'),
            where('sellerId', '==', selectedSellerId),
            orderBy('createdAt', 'desc')
          );
          const productsSnap = await getDocs(q);
          const p = productsSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter((prod: any) => !prod.isTemporary && prod.status !== 'deleted') as Product[];
          setSellerProducts(p);
        }
      } catch (err: any) {
        console.error("Error loading seller profile:", err?.message || err);
      }
    };
    loadSellerProfile();
  }, [selectedSellerId]);

  const handleEmailLogin = async (firstName: string, lastName: string, pass: string) => {
    try {
      if (!firstName || !lastName || !pass) return;
      setLoading(true);
      const email = `${firstName.toLowerCase().trim()}.${lastName.toLowerCase().trim()}@trocshop.user`;
      await signInWithEmailAndPassword(auth, email, pass);
      setActiveTab('home');
    } catch (e: any) {
      console.error("Login error:", e?.message || e);
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        alert("Nom, prénom ou mot de passe incorrect.");
      } else if (e.code === 'auth/operation-not-allowed') {
        alert("🚨 Action Requise: Le fournisseur 'Email/Mot de passe' n'est pas activé.\n\nAllez sur https://console.firebase.google.com/project/" + (firebaseConfig.projectId) + "/authentication/providers et activez 'E-mail/Mot de passe'.");
      } else {
        alert("Erreur de connexion : " + (e.message || "Impossible de se connecter."));
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
      isCreatingProfile.current = true;
      
      const email = `${data.firstName.toLowerCase().trim()}.${data.lastName.toLowerCase().trim()}@trocshop.user`;
      console.log("Registering with:", email);
      
      const cred = await createUserWithEmailAndPassword(auth, email, data.password);
      
      // Update Auth Profile
      await updateProfile(cred.user, {
        displayName: `${data.firstName} ${data.lastName}`,
      });

      const userRef = doc(db, 'users', cred.user.uid);
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
        badges: ['Nouveau']
      };
      
      console.log("Saving profile for:", cred.user.uid);
      await setDoc(userRef, newProfile).catch(e => handleFirestoreError(e, OperationType.WRITE, 'users'));
      setProfile(newProfile);
      
      alert("Inscription réussie ! Bienvenue sur TrocShop.");
      setActiveTab('home');
    } catch (e: any) {
      console.error("Signup Error:", e?.message || e);
      if (e.code === 'auth/email-already-in-use') {
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

  const handleUpdateCover = async (url: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { coverURL: url }).catch(e => handleFirestoreError(e, OperationType.UPDATE, 'users'));
      setProfile(prev => prev ? { ...prev, coverURL: url } : null);
    } catch (e: any) {
      console.error("Cover update error:", e);
    }
  };

  const handleUpdateAvatar = async (url: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { photoURL: url }).catch(e => handleFirestoreError(e, OperationType.UPDATE, 'users'));
      setProfile(prev => prev ? { ...prev, photoURL: url } : null);
    } catch (e: any) {
      console.error("Avatar update error:", e);
    }
  };
  const handleLogin = async () => {
    if (loading) return;
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
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
          badges: ['Bienvenue']
        };
        await setDoc(userRef, newProfile).catch(e => handleFirestoreError(e, OperationType.WRITE, 'users'));
        setProfile(newProfile);
      }
      setActiveTab('home');
    } catch (e: any) {
      console.error("Auth error:", e?.code, e?.message || e);
      if (e?.code === 'auth/popup-blocked') {
        alert("La fenêtre de connexion Google a été bloquée. Veuillez ouvrir l'application dans un nouvel onglet ou autoriser les pop-ups (en haut dans la barre d'adresse) pour vous connecter avec Google.");
      } else if (e?.code === 'auth/cancelled-popup-request' || e?.code === 'auth/popup-closed-by-user') {
        // Ignorer silencieusement si l'utilisateur annule la popup
      } else if (e?.code === 'auth/operation-not-allowed') {
        alert("🚨 Action Requise: Le fournisseur 'Google' n'est pas activé dans votre console Firebase.\n\nAllez sur https://console.firebase.google.com/project/" + (firebaseConfig.projectId) + "/authentication/providers et activez 'Google'.");
      } else {
        alert("Erreur de connexion avec Google: " + (e?.message || 'Inconnue'));
      }
    } finally {
      setTimeout(() => setLoading(false), 500); // Wait a bit before allowing another attempt
    }
  };

  const handleDeleteProduct = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Voulez-vous vraiment supprimer cette annonce ?")) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      alert("Annonce supprimée.");
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `products/${id}`);
    }
  };

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      return;
    }
    // Notification permission request
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const q = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', user.uid)
    );
    const unsubConv = onSnapshot(q, (snap) => {
      const convs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
      setConversations(convs.sort((a, b) => {
        const t1 = (a.updatedAt as any)?.seconds || 0;
        const t2 = (b.updatedAt as any)?.seconds || 0;
        return t2 - t1;
      }));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'conversations'));

    // Notification listener
    const qNotif = query(
      collection(db, 'users', user.uid, 'notifications'),
      where('read', '==', false),
      orderBy('createdAt', 'desc')
    );
    let isFirst = true;
    const unsubNotif = onSnapshot(qNotif, (snap) => {
      const allUnread = snap.docs.map(d => ({ id: d.id, ...d.data() }) as any);
      const msgNotifs = allUnread.filter(n => n.type === 'message');
      const trocNotifs = allUnread.filter(n => n.type === 'troc');
      
      setUnreadMessages(msgNotifs.length);
      setPendingTrocs(trocNotifs.length);

      // Handle immediate marking as read for active chat or tab
      if (activeConversationId) {
        msgNotifs.forEach(n => {
          if (n.conversationId === activeConversationId && !n.read) {
            updateDoc(doc(db, 'users', user.uid, 'notifications', n.id), { read: true }).catch(() => {});
          }
        });
      }

      if (activeTab === 'mytroc') {
        trocNotifs.forEach(n => {
          if (!n.read) {
            updateDoc(doc(db, 'users', user.uid, 'notifications', n.id), { read: true }).catch(() => {});
          }
        });
      }

      // Process new notifications for popups
      if (isFirst) {
        isFirst = false;
        return;
      }

      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notif = change.doc.data() as any;
          const isCurrentChat = activeConversationId === notif.conversationId;

          // Only show popup if it's NOT the current chat or if the document is hidden
          if (
            'Notification' in window && 
            Notification.permission === 'granted' &&
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
      if (!e.message?.includes('index')) {
        handleFirestoreError(e, OperationType.LIST, `users/${user.uid}/notifications`);
      }
    });

    const qExchanges = query(
      collection(db, 'exchanges'),
      where('buyerId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );
    const qExchangesSeller = query(
      collection(db, 'exchanges'),
      where('sellerId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubEx1 = onSnapshot(qExchanges, (snap) => {
      const e1 = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setExchanges(prev => {
        const other = prev.filter(p => p.sellerId === user.uid);
        return [...e1, ...other].sort((a,b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      });
    }, (e) => {
       if (!e.message?.includes('index')) handleFirestoreError(e, OperationType.LIST, 'exchanges');
    });

    const unsubEx2 = onSnapshot(qExchangesSeller, (snap) => {
      const e2 = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setExchanges(prev => {
        const other = prev.filter(p => p.buyerId === user.uid);
        return [...e2, ...other].sort((a,b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      });
    }, (e) => {
       if (!e.message?.includes('index')) handleFirestoreError(e, OperationType.LIST, 'exchanges');
    });

    return () => {
      unsubConv();
      unsubNotif();
      unsubEx1();
      unsubEx2();
    };
  }, [user, activeConversationId, activeTab]);

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
        batch.commit();
      });
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
        batch.commit();
      });
    }
  }, [activeTab, user]);

  const filteredProducts = useMemo(() => {
    const searchLower = searchQuery.toLowerCase().trim();
    const terms = searchLower.split(' ').filter(Boolean);
    
    let filtered = products.filter(p => {
      if (p.isTemporary) return false;
      
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
      const matchAvailable = p.status !== 'sold' && p.is_available !== false;
      
      return matchSearch && matchCondition && matchNeighborhood && matchListingType && matchPrice && matchAvailable;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      if (sortBy === 'oldest') return dateA - dateB;
      return dateB - dateA; // newest first
    });
  }, [searchQuery, products, sortBy, filterCondition, filterPriceMax, filterNeighborhood, filterListingType]);

  const startConversation = async (p: Product) => {
    if (!user) {
      setAuthMode('login');
      setActiveTab('auth');
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
    try {
      const exRef = doc(db, 'exchanges', exId);
      await updateDoc(exRef, { 
        status: 'completed',
        updatedAt: serverTimestamp() 
      });
      const exSnap = await getDoc(exRef);
      if (exSnap.exists()) {
        const prodId = exSnap.data().productId;
        await updateDoc(doc(db, 'products', prodId), { 
          status: 'sold',
          updatedAt: serverTimestamp()
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'exchanges');
    }
  };

  const handleGenerateTrocCode = async (ex: any) => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    try {
      await updateDoc(doc(db, 'exchanges', ex.id), {
        trocCode: code,
        updatedAt: serverTimestamp()
      });
      setShowTrocVerifier({ ...ex, trocCode: code });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'exchanges');
    }
  };

  const handleVerifyTrocCode = async (ex: any, inputCode: string) => {
    if (ex.trocCode === inputCode) {
      try {
        const batch = writeBatch(db);
        const exRef = doc(db, 'exchanges', ex.id);
        
        batch.update(exRef, {
          status: 'completed',
          updatedAt: serverTimestamp()
        });

        // Mark products as sold
        batch.update(doc(db, 'products', ex.productId), { 
          is_available: false, 
          status: 'sold',
          updatedAt: serverTimestamp() 
        });
        
        if (ex.exchangeProductIds && Array.isArray(ex.exchangeProductIds)) {
          ex.exchangeProductIds.forEach((id: string) => {
            batch.update(doc(db, 'products', id), { 
              is_available: false, 
              status: 'sold',
              updatedAt: serverTimestamp() 
            });
          });
        }

        await batch.commit();
        alert("Accord validé avec succès ! Félicitations.");
        setShowTrocVerifier(null);
        
        // Success state for buyer notification if applicable
        if (onSuccess) onSuccess();
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'exchanges');
      }
    } else {
      alert("Code incorrect !");
    }
  };

  const handleExchangeStatusUpdate = async (exId: string, status: string) => {
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
        createdAt: serverTimestamp(),
        read: false
      });

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'exchanges');
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setActiveTab('home');
    setActiveConversationId(null);
  };

  const handleMarkAsSold = async (productId: string) => {
    try {
      const pRef = doc(db, 'products', productId);
      const pSnap = await getDoc(pRef);
      if (!pSnap.exists()) return;
      const pData = pSnap.data();

      await updateDoc(pRef, {
        is_available: false,
        status: 'sold',
        updatedAt: serverTimestamp()
      });

      // Send instruction notification to the user
      const notifRef = doc(collection(db, 'users', user!.uid, 'notifications'));
      await setDoc(notifRef, {
        type: 'system',
        title: 'Article Vendu !',
        body: `Votre article "${pData.title}" est marqué comme vendu. Pensez à le supprimer de votre profil si la transaction est définitive.`,
        toUserId: user!.uid,
        createdAt: serverTimestamp(),
        read: false
      });

      alert("L'article a été marqué comme vendu.");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'products');
    }
  };

  const toggleFavorite = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) {
      alert("Connectez-vous pour ajouter des favoris");
      return;
    }

    const p = products.find(p => p.id === id);
    if (p && (p.status === 'pending' || p.status === 'sold')) {
      alert("Cet article n'est plus disponible pour les favoris.");
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
    <div className="min-h-screen bg-[#F2F2F7] text-zinc-900 font-sans selection:bg-orange-100 selection:text-orange-900 overflow-x-hidden">
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
      
      {(!selectedSellerId) && (
        <header className={cn(
          "fixed top-4 left-4 right-4 z-[100] bg-white/40 backdrop-blur-[40px] backdrop-saturate-[180%] border border-white/50 rounded-[2rem] px-6 h-20 flex flex-col justify-center shadow-[0_20px_50px_rgba(0,0,0,0.05)]"
        )}>
        <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setActiveTab('home')}>
                <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20 group-active:scale-95 transition-all">
                  <Repeat size={20} className="text-white" strokeWidth={3} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-black italic tracking-tighter text-zinc-900 leading-none">TrocShop.</span>
                </div>
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
                <button onClick={() => { setActiveTab('profile'); setProfileView('main'); }} className="relative group">
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
                    if (activeTab !== 'auth') {
                      setAuthMode('login');
                      setActiveTab('auth');
                    } else {
                      setAuthMode(authMode === 'login' ? 'signup' : 'login');
                    }
                  }} 
                  className="py-2.5 px-6 rounded-full text-[10px] font-black uppercase tracking-widest bg-orange-600 text-white hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20 active:scale-95"
                >
                  {activeTab === 'auth' ? (authMode === 'login' ? 'Inscription' : 'Connexion') : 'Connexion'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      )}

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
               <div className="flex items-center justify-between">
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
                                } catch (e) {
                                  console.error("Error marking notification as read:", e?.message || e);
                                }
                              }
                            }
                          }}
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            "p-5 rounded-[2rem] border transition-all flex items-center gap-3 relative cursor-pointer group/notif",
                            n.read ? "bg-white border-zinc-100" : "bg-orange-600/5 border-orange-200 shadow-sm"
                          )}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm("Supprimer cette notification ?")) {
                                  try {
                                    await deleteDoc(doc(db, 'users', user!.uid, 'notifications', id));
                                  } catch (err) {
                                    handleFirestoreError(err, OperationType.DELETE, `users/${user!.uid}/notifications`);
                                  }
                                }
                              }}
                              className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 active:scale-90 transition-all shrink-0"
                            >
                              <Trash2 size={16} />
                            </button>
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-all",
                              n.read ? "bg-zinc-50 text-zinc-400" : "bg-orange-600 text-white shadow-orange-600/10"
                            )}>
                              {n.type === 'message' ? <MessageCircle size={24} /> : <Bell size={24} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className={cn("font-black uppercase tracking-tighter leading-tight", n.read ? "text-zinc-600" : "text-zinc-900")}>
                                  {n.title}
                                </h4>
                                <p className={cn("text-xs mt-1", n.read ? "text-zinc-400" : "text-zinc-500 font-medium")}>
                                  {n.body}
                                </p>
                                
                                {n.type === 'troc_code_verification' && (
                                  <div className="mt-4 p-4 bg-orange-600/5 rounded-3xl border border-orange-100 space-y-4">
                                    <div className="text-center">
                                      <p className="text-[9px] font-black uppercase text-orange-600 tracking-widest mb-3">Saisir le Code</p>
                                      <OTPInput 
                                        value={notifInputCodes[n.id] || ''}
                                        onChange={(val) => setNotifInputCodes(prev => ({ ...prev, [n.id]: val }))}
                                        disabled={isVerifyingCode === n.id}
                                        onComplete={async () => {
                                          const code = notifInputCodes[n.id];
                                          if (!code || code.length < 4) return;
                                          
                                          setIsVerifyingCode(n.id);
                                          try {
                                            const transSnap = await getDoc(doc(db, 'transactions', n.transactionId));
                                            if (transSnap.exists() && transSnap.data().verificationCode === code) {
                                              const batch = writeBatch(db);
                                              const transactionId = n.transactionId;
                                              const productId = transSnap.data().productId;

                                              batch.update(doc(db, 'transactions', transactionId), {
                                                status: 'completed',
                                                updatedAt: serverTimestamp()
                                              });

                                              batch.update(doc(db, 'products', productId), {
                                                status: 'sold',
                                                is_available: false,
                                                updatedAt: serverTimestamp()
                                              });

                                              batch.update(doc(db, 'users', user!.uid, 'notifications', n.id), {
                                                type: 'troc_rating_prompt',
                                                title: 'Transaction réussie !',
                                                body: 'Tout est prêt ! Vous pouvez maintenant noter le vendeur.',
                                                read: false
                                              });

                                              await batch.commit();
                                              setNotifInputCodes(prev => {
                                                const newCodes = { ...prev };
                                                delete newCodes[n.id];
                                                return newCodes;
                                              });
                                            } else {
                                              alert("Code incorrect.");
                                            }
                                          } catch (err) {
                                            handleFirestoreError(err, OperationType.UPDATE, 'transactions');
                                          }
                                          setIsVerifyingCode(null);
                                        }}
                                      />
                                    </div>
                                    <Button 
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        const code = notifInputCodes[n.id];
                                        if (!code || code.length < 4) return;
                                        
                                        // Manual trigger if needed
                                        setIsVerifyingCode(n.id);
                                        // Same logic as onComplete...
                                      }}
                                      disabled={isVerifyingCode === n.id || (notifInputCodes[n.id]?.length || 0) < 4}
                                      className="w-full bg-orange-600 text-white rounded-2xl h-12 flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20"
                                    >
                                      {isVerifyingCode === n.id ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      ) : (
                                        <>
                                          <CheckCircle2 size={16} />
                                          <span className="text-[10px] font-black uppercase tracking-widest">Valider l'échange</span>
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                )}

                                {n.type === 'troc_rating_prompt' && (
                                  <div className="mt-4 space-y-3">
                                    <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-2xl border border-green-100">
                                      <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                                        <Check size={14} strokeWidth={4} />
                                      </div>
                                      <span className="text-[10px] font-black uppercase tracking-widest leading-none">Code validé avec succès !</span>
                                    </div>
                                    <button 
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                          const transSnap = await getDoc(doc(db, 'transactions', n.transactionId));
                                          if (transSnap.exists()) {
                                            setRatingTransaction({ id: transSnap.id, ...transSnap.data() } as Transaction);
                                          }
                                        } catch (err) {
                                          console.error("Error loading transaction for rating:", err);
                                        }
                                      }}
                                      className="w-full py-3 bg-zinc-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-zinc-900/20"
                                    >
                                      Noter le vendeur
                                    </button>
                                  </div>
                                )}
                              </div>
                          </div>
                          </motion.div>
                        );
                      })}
                   </div>
                 )}

                 {/* Notifications Bottom Controls */}
                 {notifications.length > 0 && !isNotificationEditMode && (
                   <div className="fixed bottom-6 inset-x-6 flex gap-2 z-50 p-2 bg-white/70 backdrop-blur-[30px] rounded-[2.5rem] border border-white shadow-[0_32px_64px_rgba(0,0,0,0.1)]">
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
                {/* Background Illustration */}
                <div className="absolute inset-0 z-0">
                  <img 
                    src="/src/assets/images/troc_banner_bg_1779040283471.png" 
                    className="w-full h-full object-cover opacity-100 scale-[1.02] group-hover:scale-110 transition-transform duration-1000" 
                    alt="Illustration Troc"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                </div>

                <div className="relative z-10 space-y-4 sm:space-y-6">
                  <motion.h2 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl sm:text-5xl font-black leading-[0.9] tracking-tighter"
                  >
                    VOS OBJETS ONT <br/>DE LA VALEUR.
                  </motion.h2>
                  <motion.p 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-zinc-400 text-sm sm:text-base font-medium max-w-[180px] sm:max-w-[220px]"
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
                <div className="absolute -bottom-16 -right-16 w-80 h-80 bg-orange-600/10 rounded-full blur-[80px]" />
              </motion.div>

              {/* Categories */}
              <div className="flex gap-3 overflow-x-auto py-2 no-scrollbar">
                {['Tous', ...CATEGORIES].map((cat) => (
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
                <Button 
                  variant="ghost"
                  onClick={() => setActiveTab('search')}
                  className="text-orange-600 text-[10px] font-black uppercase tracking-widest hover:bg-orange-50 px-5 py-2.5 rounded-2xl transition-all border border-orange-100"
                >
                  Voir plus <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 gap-4">
                {isInitialLoading ? (
                  [...Array(4)].map((_, i) => <ProductCardSkeleton key={i} />)
                ) : products.length === 0 ? (
                  <div className="col-span-2 py-20 text-center text-zinc-300">
                    <ShoppingBag className="w-20 h-20 mx-auto mb-4 opacity-5" />
                    <p className="font-bold uppercase tracking-widest text-[10px]">L'inventaire est vide</p>
                  </div>
                ) : (
                  products
                    .filter(p => selectedCategory === 'Tous' || p.category === selectedCategory)
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
                             {['Tous', "Déjà utilisé mais bon", "Très bon état", "Bon état", "Satisfaisant", "C'est gâté (pour pièces)"].map(c => (
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
                onStartChat={(otherId) => {
                  const targetProd = products.find(p => p.sellerId === otherId);
                  if (targetProd) startConversation(targetProd);
                }}
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
              <header className="shrink-0 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter">MESSAGES</h2>
                  <div className="h-1.5 w-12 bg-orange-600 rounded-full mt-1" />
                </div>
              </header>

              <div className="flex-1 overflow-hidden">
                {activeConversationId ? (
                  <ChatWindow 
                    conversationId={activeConversationId} 
                    user={user} 
                    profile={profile}
                    products={products}
                    onBack={() => setActiveConversationId(null)} 
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
                                      <div className="w-14 h-14 bg-orange-50 rounded-[1.2rem] flex items-center justify-center text-orange-600 font-black text-xl border-2 border-white shadow-sm shrink-0">
                                        {(conv.participantNames?.find(n => n !== user?.displayName) || conv.participantIds?.find(id => id !== user?.uid) || 'U')[0]}
                                      </div>
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
                                      onClick={async () => {
                                        if (confirm("Supprimer cette discussion ?")) {
                                          try {
                                            await deleteDoc(doc(db, 'conversations', conv.id));
                                            handleConvPeekEnd();
                                          } catch (err) {
                                            handleFirestoreError(err, OperationType.DELETE, `conversations/${conv.id}`);
                                          }
                                        }
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

                          <div className="w-14 h-14 bg-orange-50 rounded-[1.2rem] flex items-center justify-center text-orange-600 font-black text-xl border-2 border-white shadow-sm shrink-0">
                            {(conv.participantNames?.find(n => n !== user?.displayName) || conv.participantIds?.find(id => id !== user?.uid) || 'U')[0]}
                          </div>
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
                              <div className="font-black text-sm tracking-tighter truncate">
                                {conv.participantNames?.find(n => n !== user?.displayName) || `Utilisateur ${conv.participantIds?.find(id => id !== user?.uid)?.slice(0,4)}`}
                              </div>
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
                  <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-xl shadow-zinc-200/50 overflow-hidden relative">
                    {/* Cover Photo */}
                    <div className="h-40 w-full bg-orange-50 relative overflow-hidden">
                      {profile?.coverURL ? (
                        <img src={profile.coverURL} className="w-full h-full object-cover" alt="Cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-50" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
                    </div>

                    <div className="p-8 -mt-12 relative z-10 space-y-6">
                      <div className="flex items-end justify-between">
                        {user?.photoURL ? (
                          <img src={user.photoURL} className="w-24 h-24 rounded-[2.5rem] border-4 border-white shadow-xl object-cover bg-white" alt="Me" />
                        ) : (
                          <div className="w-24 h-24 rounded-[2.5rem] border-4 border-white bg-orange-100 flex items-center justify-center text-orange-600 text-3xl font-black uppercase shadow-xl">
                             {user?.displayName?.[0] || 'U'}
                          </div>
                        )}
                        <div className="flex gap-2 pb-2">
                          <div className="flex flex-col items-center px-4 py-2 bg-zinc-50 rounded-2xl cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => setProfileView('listings')}>
                            <span className="font-black text-lg">{products.filter(p => p.sellerId === user?.uid).length}</span>
                            <span className="text-[8px] font-black uppercase text-zinc-400">Annonces</span>
                          </div>
                          <div className="flex flex-col items-center px-4 py-2 bg-zinc-50 rounded-2xl cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => setProfileView('favorites')}>
                            <span className="font-black text-lg">{favorites.length}</span>
                            <span className="text-[8px] font-black uppercase text-zinc-400">Favoris</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 px-8 pb-8">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="text-2xl font-black tracking-tighter leading-none truncate">{user?.displayName}</h2>
                          {(profile?.isVerified || profile?.isCertified) && (
                             <div className={cn(
                               "w-5 h-5 rounded-full flex items-center justify-center text-white p-0.5 shadow-sm",
                               profile?.isCertified ? "bg-orange-600" : "bg-blue-500"
                             )}>
                               <Check size={12} strokeWidth={4} />
                             </div>
                          )}
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
                    
                    {profile?.badges && profile.badges.length > 0 && (
                      <div className="space-y-2 px-4">
                        <h4 className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Récompenses & Badges</h4>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                          {profile.badges.map(badge => (
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

                    <Button variant="ghost" className="w-full text-red-500 hover:bg-red-50 flex items-center justify-center gap-2 mt-4 font-black uppercase text-[10px] tracking-widest py-4" onClick={handleLogout}>
                      <LogOut className="w-4 h-4" />
                      <span>Déconnexion</span>
                    </Button>
                  </div>
                </>
              ) : profileView === 'settings' ? (
                 profile && <ProfileSettings 
                    profile={profile} 
                    user={user}
                    onBack={() => setProfileView('main')} 
                    onSave={async (newData) => {
                       if (!user) return;
                       try {
                        const userRef = doc(db, 'users', user.uid);
                        await updateDoc(userRef, newData);
                        setProfile(prev => prev ? { ...prev, ...newData } : null);
                       } catch (e: any) {
                        console.error("Save error:", e);
                        alert("Erreur lors de la sauvegarde.");
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
      {user && (
        <nav className={cn(
          "fixed bottom-6 left-6 right-6 z-[100] h-20 transition-all duration-300",
          (activeConversationId || isNavHidden || activeTab === 'notifications') ? "translate-y-32 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
        )}>
          <div className="h-full bg-white/40 backdrop-blur-[40px] backdrop-saturate-[180%] border border-white/50 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] px-6 flex items-center justify-around">
            <NavButton active={activeTab === 'home'} onClick={() => { setActiveTab('home'); setActiveConversationId(null); setSelectedSellerId(null); }} icon={<HomeIcon size={24} />} />
            <NavButton active={activeTab === 'search'} onClick={() => { setActiveTab('search'); setActiveConversationId(null); setSelectedSellerId(null); }} icon={<Search size={24} />} />
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
                  }
                }}
                className="w-16 h-16 bg-orange-600 text-white rounded-[1.8rem] flex items-center justify-center -translate-y-10 shadow-2xl shadow-orange-600/50 active:scale-95 transition-all border-4 border-white group"
              >
                <Plus size={32} className="group-hover:rotate-90 transition-transform duration-500" />
              </button>
            </div>
            <NavButton 
              active={activeTab === 'mytroc'} 
              onClick={() => { setActiveTab('mytroc'); setActiveConversationId(null); setSelectedSellerId(null); }} 
              icon={<Handshake size={24} />} 
              count={pendingTrocs}
            />
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
                }
              }} 
              icon={<MessageCircle size={24} />} 
              count={unreadMessages}
            />
          </div>
        </nav>
      )}

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
                setAuthMode('login');
                setActiveTab('auth');
              } else {
                setShowExchangePicker(true);
              }
            }}
            onMarkAsSold={handleMarkAsSold}
            favorite={favorites.includes(selectedProduct.id)}
            onFavorite={() => toggleFavorite(selectedProduct.id)}
            onSellerClick={(id) => { 
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
            <div className="max-w-xl mx-auto pb-32">
               <div className="space-y-0">
                  <div className="relative h-64 w-full bg-orange-100 overflow-hidden">
                    {publicProfile.coverURL ? (
                      <img src={publicProfile.coverURL} className="w-full h-full object-cover" alt="Cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-200 to-orange-100" />
                    )}
                    <button 
                      onClick={() => {
                        setSelectedSellerId(null);
                        if (previousProduct) {
                          setSelectedProduct(previousProduct);
                          setPreviousProduct(null);
                        }
                      }} 
                      className="absolute top-6 left-6 p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-white shadow-xl active:scale-95 transition-all z-20"
                    >
                      <ArrowLeft className="w-5 h-5 text-zinc-900" />
                    </button>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>

                  <div className="px-6 -mt-16 relative z-10 space-y-8 flex flex-col items-center text-center">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-orange-100 flex items-center justify-center text-orange-600 text-4xl font-black italic shadow-2xl relative border-4 border-white">
                      {publicProfile.photoURL ? <img src={publicProfile.photoURL} className="w-full h-full object-cover rounded-[2.5rem]" alt={publicProfile.displayName} /> : publicProfile.displayName[0]}
                      {publicProfile.isVerified && (
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white border-4 border-white shadow-lg">
                          <Check size={16} strokeWidth={4} />
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none text-zinc-900">{publicProfile.displayName}</h2>
                        <div className="flex items-center justify-center gap-4 text-zinc-400 font-bold text-[10px] uppercase tracking-widest mt-2">
                           <div className="flex items-center gap-1.5">
                             <MapPin size={14} className="text-orange-600" />
                             Yamoussoukro
                           </div>
                           <div className="w-1 h-1 bg-zinc-300 rounded-full" />
                           <div className="flex items-center gap-1.5 text-zinc-900">
                             <Star size={14} className="text-orange-500 fill-orange-500" />
                             {publicProfile.rating || 0} ({publicProfile.reviewCount || 0} avis)
                           </div>
                        </div>
                      </div>
                      <p className="text-zinc-500 font-medium max-w-md italic text-sm leading-relaxed">"{publicProfile.bio || 'Passionné(e) de TrocShop !'}"</p>
                      
                      <div className="flex gap-2 justify-center pt-2">
                        {publicProfile.badges?.map(badge => (
                          <span key={badge} className="px-4 py-1.5 bg-zinc-900 text-white rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg shadow-zinc-900/20 border border-white/10">
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="px-6 mt-12 space-y-12">
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
            onClose={() => setShowTrocVerifier(null)}
            onVerify={(code) => handleVerifyTrocCode(showTrocVerifier, code)}
          />
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
       <AnimatePresence>
          {ratingTransaction && (
            <TransactionRatingModal 
              transaction={ratingTransaction}
              user={user}
              onClose={() => setRatingTransaction(null)}
            />
          )}
        </AnimatePresence>
    </div>
  );
}





function NavButton({ active, icon, onClick, count }: { active: boolean; icon: React.ReactNode; onClick: () => void; count?: number }) {
  return (
    <button onClick={onClick} className={cn(
      "w-12 h-12 flex items-center justify-center rounded-2xl transition-all relative",
      active ? "text-orange-500 scale-110 bg-orange-50" : "text-zinc-500 hover:text-zinc-300"
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
    try { return localStorage.getItem('sell_draft_condition') || 'Bon état'; } catch { return 'Bon état'; }
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
      const prompt = `Génère une description sous forme de liste à puces (maximum 4 puces) pour cet objet : "${desc}". Pas de phrases longues, juste des caractéristiques clés. Pas d'introduction ni de conclusion. L'assistant génère exclusivement des listes à puces ultra-courtes. Chaque puce doit faire moins de 8 mots. Style direct.`;
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      if (data.text) {
        setDesc(data.text);
      }
    } catch (err: any) {
      console.error("AI improvement failed:", err?.message || err);
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
      console.warn("Draft persistence failed:", e);
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
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const p = snap.data() as UserProfile;
          if (p.neighborhood) setNeighborhood(p.neighborhood);
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
      console.error("Erreur traitement image:", err?.message || err);
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
        const MAX_WIDTH = 720;
        const MAX_HEIGHT = 720;
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
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (imagePreviews.length === 0) {
      alert("Veuillez ajouter au moins une photo.");
      return;
    }
    if (meetingPoint === 'Personnalisé' && !customMeetingPoint.trim()) {
      alert("Veuillez préciser le lieu de RDV personnalisé.");
      return;
    }
    const finalMeetingPoint = meetingPoint === 'Personnalisé' ? customMeetingPoint.trim() : meetingPoint;

    setLoading(true);
    try {
      if (initialProduct) {
        await updateDoc(doc(db, 'products', initialProduct.id), {
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
        }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `products/${initialProduct.id}`));
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
          {initialProduct ? 'ARTICLE' : 'VENDRE'}
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
               <label className="text-[10px] font-black uppercase text-zinc-800 tracking-widest ml-1 flex items-center justify-between">
                 <span>Description Détaillée</span>
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
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadDetails, setShowUploadDetails] = useState(false);
  const [uploadDetails, setUploadDetails] = useState({ title: '', price: 0, image: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert("L'image est trop lourde (max 1Mo).");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setUploadDetails({ image: base64, title: '', price: 0 });
      setShowUploadDetails(true);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const confirmUpload = async () => {
    if (!uploadDetails.title.trim()) {
      alert("Veuillez donner un nom à votre article.");
      return;
    }
    setIsUploading(true);
    try {
      const prodRef = await addDoc(collection(db, 'products'), {
        title: uploadDetails.title,
        description: "Article proposé en échange direct",
        price: uploadDetails.price || 0,
        condition: "Bon état",
        category: "Loisirs",
        images: [uploadDetails.image],
        sellerId: auth.currentUser?.uid,
        sellerName: auth.currentUser?.displayName || "Anonyme",
        listingType: 'troc',
        status: 'available',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isTemporary: true
      });
      setSelectedIds(prev => [...prev, prodRef.id]);
      setShowUploadDetails(false);
      setUploadDetails({ title: '', price: 0, image: '' });
    } catch (err) {
      console.error("Error uploading image for troc:", err);
      alert("Erreur lors de l'envoi de l'image.");
    }
    setIsUploading(false);
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
              <label className="text-[10px] font-black uppercase text-zinc-800 tracking-widest">Ajuster avec une somme (Optionnel)</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={priceAdjustment || ''} 
                  onChange={e => setPriceAdjustment(Number(e.target.value))}
                  placeholder="Montant en F CFA"
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

        <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Choisir dans la galerie</h4>
             </div>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
             <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full p-8 border-4 border-dashed border-zinc-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 hover:border-orange-500/30 hover:bg-orange-50/30 transition-all group"
             >
                <div className="w-16 h-16 bg-zinc-50 rounded-[1.5rem] flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all">
                  {isUploading ? <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" /> : <Camera size={24} className="text-zinc-400 group-hover:text-white" />}
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-orange-600 transition-all">Upload une photo</p>
             </button>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Sélectionner dans ma boutique</h4>
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
        </div>

        <div className="p-8 border-t border-zinc-100 bg-zinc-50/50">
          <Button 
            variant="primary" 
            className="w-full py-6 rounded-[2.5rem] shadow-2xl shadow-orange-600/40 font-black uppercase tracking-[0.2em] text-[10px]"
            onClick={() => onSelect(selectedIds, priceAdjustment)}
            disabled={selectedIds.length === 0 && priceAdjustment <= 0}
          >
            CONFIRMER LA PROPOSITION
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showUploadDetails && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-6"
            onClick={(e) => {
              e.stopPropagation();
              setShowUploadDetails(false);
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[3rem] p-8 w-full max-w-sm space-y-6 shadow-2xl"
            >
              <div className="space-y-4">
                 <div className="w-20 h-20 bg-zinc-100 rounded-2xl overflow-hidden mx-auto border-2 border-white shadow-lg">
                    <img src={uploadDetails.image} className="w-full h-full object-cover" />
                 </div>
                 <h3 className="text-xl font-black uppercase tracking-tighter text-center italic">Détails de l'article</h3>
              </div>

              <div className="space-y-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest pl-2">Nom de l'article</label>
                    <input 
                      type="text"
                      value={uploadDetails.title}
                      onChange={e => setUploadDetails(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm font-black italic outline-none focus:ring-4 focus:ring-orange-600/10 transition-all"
                      placeholder="Ex: Livres"
                    />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest pl-2">Prix estimé (FCFA)</label>
                    <input 
                      type="number"
                      value={uploadDetails.price || ''}
                      onChange={e => setUploadDetails(prev => ({ ...prev, price: Number(e.target.value) }))}
                      className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm font-black italic outline-none focus:ring-4 focus:ring-orange-600/10 transition-all"
                      placeholder="0 FCFA"
                    />
                 </div>
              </div>

              <div className="flex gap-2">
                 <Button 
                   variant="outline" 
                   onClick={() => setShowUploadDetails(false)}
                   className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-zinc-50 border-none"
                 >
                   Annuler
                 </Button>
                 <Button 
                   variant="primary" 
                   onClick={confirmUpload}
                   disabled={isUploading}
                   className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                 >
                   {isUploading ? "..." : "Enregistrer"}
                 </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
        const snap = await getDoc(doc(db, 'users', product.sellerId));
        if (snap.exists()) setSellerProfile(snap.data() as UserProfile);
      } catch (e) {
        if (!(e instanceof Error && e.message.includes('offline'))) {
          handleFirestoreError(e, OperationType.GET, `users/${product.sellerId}`);
        }
      }
    };
    fetchSeller();
  }, [product.sellerId]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6"
      onClick={onClose}
    >
          <AnimatePresence>
        {zoomedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomedImage(null)}
            className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
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
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        className="w-full md:max-w-6xl h-full md:h-[95vh] bg-white md:rounded-[3.5rem] overflow-hidden flex flex-col md:flex-row shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Carousel Section */}
        <div className="w-full md:w-3/5 h-[50vh] md:h-full bg-zinc-50 relative group flex flex-col shrink-0 overflow-hidden border-r border-zinc-200">
          <div className="flex-1 relative overflow-hidden bg-white">
            <div 
               className="flex h-full cursor-grab active:cursor-grabbing"
               style={{ transform: `translateX(-${currentImg * 100}%)` }}
            >
              {product.images.map((img, i) => (
                <div key={i} className="w-full h-full shrink-0 flex items-center justify-center p-3 md:p-12">
                  <div 
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
                  </div>
                </div>
              ))}
            </div>

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

            {/* Back Button for Mobile */}
            <button 
              onClick={onClose}
              className="absolute top-6 left-6 w-12 h-12 glass-ios rounded-2xl flex items-center justify-center text-zinc-900 active:scale-95 transition-all shadow-ios z-30"
            >
              <X size={24} />
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
                      "relative w-20 h-20 rounded-2xl md:rounded-[1.75rem] overflow-hidden shrink-0 group/thumb active:scale-90",
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

          <button onClick={onClose} className="absolute top-6 left-6 p-4 bg-white/90 backdrop-blur-md rounded-full text-zinc-900 shadow-xl z-30 md:hidden border border-zinc-200">
            <ArrowLeft size={20} />
          </button>
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

            <div className="p-8 bg-zinc-100 rounded-3xl border border-zinc-200 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <MapPin size={18} className="text-orange-600" />
                <span className="text-[12px] font-black uppercase text-zinc-900 tracking-[0.2em]">Lieu de rencontre</span>
              </div>
              <p className="font-black uppercase tracking-tight text-lg text-zinc-900 ml-8">{product.meetingPoint || 'À convenir'}</p>
              <div className="flex items-center gap-1.5 ml-8">
                 <div className={cn("w-2 h-2 rounded-full", product.canTravel ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]" : "bg-red-400")} />
                 <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                   {product.canTravel ? "Peut se déplacer" : "À récupérer sur place"}
                 </span>
              </div>
            </div>
            <div className="p-8 bg-zinc-100 rounded-3xl border border-zinc-200 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-orange-600" />
                <span className="text-[12px] font-black uppercase text-zinc-900 tracking-[0.2em]">Disponibilité</span>
              </div>
              <p className="font-black uppercase tracking-tight text-lg text-zinc-900 ml-8">{product.availability || 'À convenir'}</p>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                <div className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-2">Quartier</div>
                <div className="flex items-center gap-2 font-bold text-zinc-700">
                   <MapPin size={16} className="text-orange-600" />
                   <span className="truncate">{sellerProfile?.neighborhood || product.neighborhood || 'YAM'}</span>
                </div>
             </div>
             <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                <div className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-2">Annonce</div>
                <div className="flex items-center gap-2 font-bold text-zinc-700">
                   <Clock size={16} className="text-orange-600" />
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
                     {sellerProfile?.isVerified && (
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white p-0.5">
                          <Check size={10} strokeWidth={4} />
                        </div>
                     )}
                   </div>
                   <div className="flex items-center gap-2 mt-2 ml-2">
                      {sellerProfile?.badges?.map(badge => (
                        <span key={badge} className="px-2.5 py-1 bg-white/10 rounded text-[7px] font-black uppercase text-white/80 border border-white/10 shadow-lg">
                           {badge}
                        </span>
                      ))}
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
                </div>
              </div>
            ) : (
              <>
                <div className="flex gap-2 w-full">
                  {product.listingType !== 'troc' && (
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
                  {product.listingType !== 'sale' && (
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
                  <motion.button 
                    whileTap={{ scale: 0.9, y: 2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    onClick={onFavorite} 
                    className={cn(
                      "flex-1 h-14 rounded-2xl transition-colors flex items-center justify-center gap-3 backdrop-blur-2xl border-2",
                      favorite ? "bg-red-500/10 text-red-500 border-red-500/20 shadow-lg shadow-red-500/10" : "bg-white/80 text-zinc-400 border-zinc-100 shadow-sm"
                    )}
                  >
                    <Heart size={20} className={favorite ? "fill-red-500" : ""} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{favorite ? "Dans mes favoris" : "Ajouter aux favoris"}</span>
                  </motion.button>
    
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
      </motion.div>
    </motion.div>
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
  onImageClick,
  user
}: { 
  message: Message; 
  isMe: boolean; 
  products: Product[]; 
  onReply: (m: Message) => void;
  onReact: (m: Message, emoji: string) => void;
  onImageClick?: (url: string) => void;
  user: User | null;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const longPressTimer = useRef<any>(null);
  
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
        
        <div className={cn("flex items-center gap-2 max-w-[90%]", isMe ? "flex-row-reverse" : "flex-row")}>
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
              <div 
                className="relative group/msg-img cursor-zoom-in" 
                onClick={() => onImageClick?.(message.image!)}
              >
                <img src={message.image} alt="Photo" className="max-w-[250px] w-full rounded-[1.5rem] transition-transform group-hover/msg-img:scale-[1.02]" />
                <div className="absolute inset-0 bg-black/0 group-hover/msg-img:bg-black/10 transition-colors rounded-[1.5rem]" />
              </div>
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
    getDoc(doc(db, 'users', targetId)).then(snap => {
      if (snap.exists()) setTargetProfile({ uid: snap.id, ...snap.data() } as UserProfile);
    });
  }, [targetId]);

  const handleSubmit = async () => {
    if (!user || !rating) return;
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      
      // Add Review
      const reviewRef = doc(collection(db, 'reviews'));
      batch.set(reviewRef, {
        fromUserId: user.uid,
        fromUserName: user.displayName || 'Utilisateur',
        toUserId: targetId,
        toProductId: transaction.productId,
        rating,
        comment,
        createdAt: serverTimestamp()
      });

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

function ChatWindow({ conversationId, user, profile, products, onBack }: { conversationId: string; user: User | null; profile: UserProfile | null; products: Product[]; onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conv, setConv] = useState<Conversation | null>(null);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

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
    try {
      if (window.navigator?.vibrate) window.navigator.vibrate(50);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
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
         stream.getTracks().forEach(track => track.stop());
         return;
      }

      mediaRecorder.start(200);
    } catch (err: any) {
      console.warn("Microphone access:", err.message || err);
      setIsRecording(false);
      isRecordingRef.current = false;
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
      console.error("Voice note error:", e?.message || e);
      alert("Erreur lors de l'envoi de la note vocale. Le fichier est peut-être trop volumineux.");
      handleFirestoreError(e, OperationType.WRITE, `messages`);
    }
  };

  useEffect(() => {
    // ... logic for messages ...
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsubMessages = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }, (e) => handleFirestoreError(e, OperationType.GET, `conversations/${conversationId}/messages`));

    const unsubConv = onSnapshot(doc(db, 'conversations', conversationId), (d) => {
       if (d.exists()) setConv({ id: d.id, ...d.data() } as Conversation);
    }, (e) => handleFirestoreError(e, OperationType.GET, `conversations/${conversationId}`));

    // Transaction listener
    let unsubTrans = () => {};
    if (user) {
      const qTrans = query(
        collection(db, 'transactions'),
        where('productId', '==', conv?.productId || ''),
        where('participantIds', 'array-contains', user.uid)
      );
      // Wait for conv context if not loaded
      if (conv?.productId) {
        unsubTrans = onSnapshot(qTrans, (snap) => {
          if (!snap.empty) {
            const allTrans = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
            const sorted = allTrans.sort((a, b) => {
              const t1 = (a.updatedAt as any)?.seconds || 0;
              const t2 = (b.updatedAt as any)?.seconds || 0;
              return t2 - t1;
            });
            const trans = sorted[0];
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
        });
      }
    }

    return () => { unsubMessages(); unsubConv(); unsubTrans(); };
  }, [conversationId, conv?.productId, user]);

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
      console.error("Plus d'infos sur l'erreur d'envoi:", err?.message || err);
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
    if (!confirm("Voulez-vous supprimer définitivement cette conversation ?")) return;
    try {
      await deleteDoc(doc(db, 'conversations', conversationId));
      onBack();
    } catch (e) {
      alert("Erreur lors de la suppression de la conversation.");
      handleFirestoreError(e, OperationType.DELETE, `conversations/${conversationId}`);
    }
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
      
      const transactionData = {
        productId: conv.productId,
        productTitle: conv.productTitle || 'Article',
        productImage: conv.productImage || '',
        buyerId,
        sellerId: user.uid,
        participantIds: [user.uid, buyerId],
        price: conv.productPrice || 0,
        status: 'code_generated',
        verificationCode: code,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        buyerRated: false,
        sellerRated: false
      };

      batch.set(transRef, transactionData);

      // Set state locally immediately to avoid UI flicker
      setTransaction({ id: transRef.id, ...transactionData, createdAt: new Date() as any, updatedAt: new Date() as any } as any);

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
        type: 'troc_code_verification',
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

      // Notify buyer of newly generated code
      const buyerId = transaction.buyerId;
      const notifRef = doc(collection(db, 'users', buyerId, 'notifications'));
      await setDoc(notifRef, {
        type: 'troc_code_verification',
        title: 'Validation requise',
        body: `Saisissez le code fourni par le vendeur pour finaliser l'échange de "${transaction.productTitle}".`,
        toUserId: buyerId,
        fromUserId: user.uid,
        fromUserName: user.displayName,
        productId: transaction.productId,
        transactionId: transaction.id,
        createdAt: serverTimestamp(),
        read: false
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
          updatedAt: serverTimestamp()
        });

        // System message
        batch.set(doc(collection(db, 'conversations', conversationId, 'messages')), {
          senderId: user.uid,
          text: "Code validé ! Transaction terminée avec succès.",
          isSystem: true,
          createdAt: serverTimestamp()
        });

        await batch.commit();
        setIsVerifyingCode(false);
        alert("Accord validé avec succès ! Félicitations.");
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

  const otherName = conv?.participantNames?.find(n => n !== user?.displayName) || conv?.participantIds?.find(id => id !== user?.uid)?.slice(0, 8) || "Discuter";
  const sellerId = conv?.sellerId || products.find(p => p.id === conv?.productId)?.sellerId;
  const isSeller = sellerId === user?.uid;

  return (
    <motion.div 
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      className="fixed inset-0 z-[200] bg-[#F2F2F7] flex flex-col pt-safe overflow-hidden h-[100dvh]"
    >
      <header className="fixed top-4 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <div className="max-w-xl mx-auto w-full space-y-2">
          {/* Top Bubble - Navigation and User */}
          <div className="bg-white/40 backdrop-blur-[40px] backdrop-saturate-[180%] border border-white/50 rounded-[2rem] px-4 py-3 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.05)] pointer-events-auto">
            <div className="flex items-center gap-4">
              <button 
                onClick={onBack} 
                className="w-12 h-12 bg-white/60 text-zinc-900 border border-white/50 rounded-[1.25rem] flex items-center justify-center shadow-sm active:scale-90 transition-all font-bold"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-[1.25rem] bg-orange-100 flex items-center justify-center text-orange-600 font-black italic shadow-sm overflow-hidden border border-orange-200/50">
                  {conv?.participantNames?.find(n => n !== user?.displayName)?.[0] || conv?.participantIds?.find(id => id !== user?.uid)?.[0] || <UserIcon size={20} />}
                </div>
                <div className="flex flex-col">
                  <h3 className="font-black uppercase tracking-tighter text-sm leading-none truncate max-w-[120px] mix-blend-color-burn">{otherName}</h3>
                  <span className="text-[9px] font-black uppercase tracking-[0.1em] text-green-600 mt-1 flex items-center gap-1.5 mix-blend-color-burn">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Connecté
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bubble - Product Info */}
          {conv?.productTitle && (
            <motion.div 
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white/40 backdrop-blur-[40px] backdrop-saturate-[180%] border border-white/50 rounded-[1.5rem] p-2 pr-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex items-center gap-4 w-fit mx-auto pointer-events-auto"
            >
              <div className="w-10 h-10 rounded-xl bg-white overflow-hidden shrink-0 border border-white shadow-sm">
                {conv.productImage && <img src={conv.productImage} className="w-full h-full object-cover" alt={conv.productTitle} />}
              </div>
              <div className="flex flex-col">
                <h4 className="font-black text-[9px] uppercase tracking-wider text-zinc-400 leading-tight truncate max-w-[150px]">{conv.productTitle}</h4>
                <p className="text-[11px] font-black uppercase text-orange-600 tracking-wider">
                  {formatPrice(conv.productPrice || 0)} FCFA
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative flex flex-col bg-zinc-50/50">
        <AnimatePresence>
          {zoomedImage && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setZoomedImage(null)}
              className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
            >
               <button 
                onClick={(e) => { e.stopPropagation(); setZoomedImage(null); }}
                className="absolute top-8 right-8 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center text-white transition-all z-[1010]"
              >
                <X size={24} />
              </button>
              <motion.img 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                src={zoomedImage}
                className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 pt-[140px] space-y-4 no-scrollbar relative z-10 transition-all duration-300">
          <div className="pb-10 pt-4 flex flex-col gap-4">
            {transaction && transaction.status !== 'completed' && (
              <div className="mx-auto w-full max-w-sm">
                 {transaction.status === 'pending' && (
                   <div className="bg-orange-50 border border-orange-100 rounded-3xl p-5 text-center space-y-3 shadow-sm">
                      <div className="w-10 h-10 bg-orange-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-orange-600/20">
                        <Clock size={20} />
                      </div>
                      <p className="text-[10px] font-black uppercase text-orange-600 tracking-widest">Transaction en cours</p>
                      <p className="text-xs text-zinc-600 font-medium leading-relaxed">L'accord a été conclu. Rendez-vous au lieu d'échange.</p>
                      <button onClick={handleCancelTransaction} className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:bg-red-50 px-4 py-2 rounded-full">Annuler</button>
                   </div>
                 )}
                 {transaction.status === 'code_generated' && (
                   <div className="bg-white border border-orange-100 rounded-[2.5rem] p-8 text-center shadow-2xl space-y-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-orange-600 tracking-[0.2em] italic">Code de Validation</p>
                        <p className="text-[9px] text-zinc-400 font-bold">Sécurité de la transaction</p>
                      </div>

                      {transaction.sellerId === user?.uid ? (
                        <div className="space-y-6">
                          <div className="text-6xl font-black text-orange-600 tracking-[0.2em] ml-[0.2em] italic bg-orange-50/50 py-8 rounded-[2rem] border border-orange-100/50 shadow-inner">{transaction.verificationCode}</div>
                          <div className="bg-zinc-50 p-4 rounded-2xl">
                            <p className="text-[10px] text-zinc-500 font-bold leading-relaxed lowercase italic tracking-wide">Communiquez ce code à l'acheteur après vérification de l'article pour finaliser la transaction.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                           <OTPInput 
                            value={inputCode}
                            onChange={setInputCode}
                            disabled={isVerifyingCode}
                            onComplete={handleVerifyCode}
                           />
                           <div className="space-y-3">
                             <Button 
                              onClick={handleVerifyCode}
                              disabled={isVerifyingCode || inputCode.length < 4}
                              className="w-full h-14 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-orange-600/20"
                             >
                              {isVerifyingCode ? "Vérification..." : "Valider l'échange"}
                             </Button>
                             <p className="text-[9px] text-zinc-400 font-bold italic">Saisissez le code fourni par le vendeur.</p>
                           </div>
                        </div>
                      )}
                      
                      {transaction.status !== 'completed' && (
                        <button 
                          onClick={handleCancelTransaction} 
                          className="w-full py-4 text-[9px] font-black text-red-500 hover:text-red-600 bg-red-50/50 rounded-2xl uppercase tracking-widest transition-colors"
                        >
                          Annuler la transaction
                        </button>
                      )}
                   </div>
                 )}
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
                onImageClick={setZoomedImage}
                user={user}
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
        <div className="flex-none p-4 bg-white border-t border-zinc-100 z-50">
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
                    {isSeller && products.find(p => p.id === conv?.productId)?.status === 'available' && (
                      <button 
                        onClick={handleConcludeDeal}
                        className="flex-1 h-10 bg-orange-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-orange-600/10"
                      >
                        <Handshake size={14} /> Conclure
                      </button>
                    )}
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
                        className="absolute bottom-full left-0 mb-4 bg-white/80 backdrop-blur-[40px] backdrop-saturate-[180%] rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/50 p-5 w-[320px] z-[150] origin-bottom-left"
                      >
                        <div className="flex flex-col gap-3">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Fréquents</h4>
                          <div className="grid grid-cols-7 gap-y-3 gap-x-2">
                             {["❤️", "😂", "👍", "🙏", "🔥", "🥰", "💯"].map(emoji => (
                                <button key={emoji} type="button" onClick={() => setNewMessage(prev => prev + emoji)} className="text-2xl hover:scale-125 transition-transform active:scale-95 flex items-center justify-center">{emoji}</button>
                             ))}
                          </div>
                          
                          <div className="h-px w-full bg-zinc-200/50 my-1" />
                          
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Émotions & Visages</h4>
                          <div className="grid grid-cols-7 gap-y-3 gap-x-2 max-h-32 overflow-y-auto no-scrollbar pb-2">
                             {["😀","😁","😆","😅","🤣","😉","😊","😋","😎","😍","😘","😗","😙","😚","🙂","🤗","🤩","🤔","🤨","😐","😑","😶","🙄","😏","😣","😥","😮","🤐","😯","😪","😫","🥱","😴","😌","😛","😜","😝","🤤","😒","😓","😔","😕","🙃","🤑","😲","☹️","🙁","😖","😞","😟","😤","😢","😭","😦","😧","😨","😩","🤯","😬","😰","😱","🥵","🥶","😳","🤪","😵","😡","😠","🤬","😷","🤒","🤕","🤢","🤮","🤧","😇","🤠","🤡","🤥","🤫","🤭","🧐","🤓"].map(emoji => (
                                <button key={emoji} type="button" onClick={() => setNewMessage(prev => prev + emoji)} className="text-2xl hover:scale-125 transition-transform active:scale-95 flex items-center justify-center">{emoji}</button>
                             ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

      {/* Hidden legacy ping animation */}
                  <AnimatePresence>
                    {isRecording && (
                      <div className="hidden" />
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {isRecording && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="absolute bottom-full right-2 mb-4 bg-red-600 text-white px-6 py-4 rounded-[2rem] shadow-2xl shadow-red-600/30 flex items-center gap-4 z-[150] border-2 border-white/20 backdrop-blur-md"
                      >
                        <div className="w-3 h-3 bg-white rounded-full animate-ping" />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Enregistrement</span>
                          <span className="text-xl font-black italic tracking-tighter tabular-nums leading-none">{formatTime(recordingDuration)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                           {[1,2,3].map(i => (
                             <motion.div 
                               key={i}
                               animate={{ height: [8, 20, 8] }}
                               transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                               className="w-1 bg-white/40 rounded-full"
                             />
                           ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form 
                    onSubmit={onSend} 
                    className={cn(
                      "flex items-center gap-2 bg-zinc-100 rounded-3xl p-2 transition-all relative z-[151]",
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
                          onMouseDown={(e) => { e.preventDefault(); startRecording(); }}
                          onMouseUp={(e) => { e.preventDefault(); stopRecording(); }}
                          onMouseLeave={(e) => { e.preventDefault(); stopRecording(); }}
                          onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                          onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                          onTouchCancel={(e) => { e.preventDefault(); stopRecording(); }}
                          onContextMenu={(e) => e.preventDefault()}
                          style={{ touchAction: 'none' }}
                          className={cn("w-10 h-10 flex items-center justify-center rounded-2xl transition-all", isRecording ? "bg-red-500 text-white scale-110 shadow-lg shadow-red-500/20" : "text-zinc-400 hover:text-orange-600")}
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
