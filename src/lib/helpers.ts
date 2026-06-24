import { doc, getDoc, db, uploadToSupabaseStorage, handleFirestoreError, OperationType } from './firebase';

// Backward-compat name: uploads any base64 image to Supabase Storage and
// returns the public URL. If the input is already a URL it is returned as-is.
export const uploadImageToCloudinary = async (base64: string): Promise<string> => {
  if (!base64 || !base64.startsWith('data:')) return base64;
  // We can't know the target context here, default to product-images bucket.
  return uploadToSupabaseStorage('product-images', base64);
};

export const uploadImage = (base64: string) => uploadImageToCloudinary(base64);
export const uploadAvatar = (base64: string) => uploadToSupabaseStorage('avatars', base64);
export const uploadChatMedia = (base64: string) => uploadToSupabaseStorage('chat-media', base64);

// Global in-memory cache for general Firestore data to reduce read quotas
export const globalDataCache: Record<string, any> = {};

// Global in-memory cache for user profiles to avoid repeated and concurrent Firestore reads
export const globalUserProfileCache: Record<string, any> = {};
export const globalUserProfilePromises: Record<string, Promise<any>> = {};

export const fetchUserProfileCached = async (uid: string): Promise<any> => {
  if (!uid) return null;
  const cacheKey = `userProfile_${uid}`;
  if (globalDataCache[cacheKey] !== undefined) {
    return globalDataCache[cacheKey];
  }
  if (globalUserProfileCache[uid]) {
    return globalUserProfileCache[uid];
  }
  if (globalUserProfilePromises[uid]) {
    return globalUserProfilePromises[uid];
  }

  const promise = getDoc(doc(db, 'users', uid))
    .then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        globalUserProfileCache[uid] = data;
        globalDataCache[cacheKey] = data;
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

export const isPartnerUser = (profile: any): boolean => {
  if (!profile) return false;
  
  // 1. Explicit field checks matching standard naming variations
  const is_p = 
    profile.is_partener === true || 
    profile.is_partener === 'vrai' || 
    profile.is_partener === 'true' || 
    profile.is_partner === true || 
    profile.is_partner === 'vrai' || 
    profile.is_partner === 'true' || 
    profile.isPartner === true || 
    profile.isPartner === 'vrai' || 
    profile.isPartner === 'true' ||
    profile['is partener'] === true ||
    profile['is partener'] === 'vrai' ||
    profile['is partener'] === 'true' ||
    profile['is partner'] === true ||
    profile['is partner'] === 'vrai' ||
    profile['is partner'] === 'true' ||
    profile['is partenaire'] === true ||
    profile['is partenaire'] === 'vrai' ||
    profile['is partenaire'] === 'true' ||
    profile.is_partenaire === true ||
    profile.is_partenaire === 'vrai' ||
    profile.is_partenaire === 'true' ||
    profile.isPartenaire === true ||
    profile.isPartenaire === 'vrai' ||
    profile.isPartenaire === 'true' ||
    profile.partenaire === true ||
    profile.partenaire === 'vrai' ||
    profile.partenaire === 'true' ||
    profile.partner === true ||
    profile.partner === 'vrai' ||
    profile.partner === 'true' ||
    profile.partener === true ||
    profile.partener === 'vrai' ||
    profile.partener === 'true';

  if (is_p) return true;

  // 2. Dynamic check over all database keys (allows space like 'is partener', 'is partner', 'partenaire' etc)
  try {
    for (const key of Object.keys(profile)) {
      const normKey = key.toLowerCase().replace(/[\s_-]/g, '');
      if (
        normKey.includes('partner') || 
        normKey.includes('parten') || 
        normKey.includes('partenaire')
      ) {
        const val = profile[key];
        if (val === true || val === 'vrai' || val === 'true' || val === 1 || val === '1') {
          return true;
        }
      }
    }
  } catch (e) {}

  // 3. Badges check
  if (Array.isArray(profile.badges)) {
    return profile.badges.some((b: any) => 
      typeof b === 'string' && (
        b.toLowerCase().includes('partner') || 
        b.toLowerCase().includes('partener') || 
        b.toLowerCase().includes('partenaire')
      )
    );
  }

  return false;
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
  "INFJ",
  "IIPA"
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

export const safeCopyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  } catch (err) {
    console.warn("Clipboard copy failed (e.g. document not focused or permission denied):", err);
    return false;
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
