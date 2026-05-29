import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, serverTimestamp, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export { firebaseConfig };
// Using initializeFirestore with persistentMultipleTabManager to avoid tab lock issues
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager() 
  }),
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export { serverTimestamp };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  // Extract error details safely to avoid circular structures in minified Firebase objects
  const getSafeErrorDetails = (err: any) => {
    if (!err) return { message: 'Unknown error' };
    
    // If it's a string, return it directly
    if (typeof err === 'string') return { message: err };
    
    // If it's a standard error or has a message, extract common properties
    return {
      message: err.message || String(err),
      code: err.code || 'unknown',
      name: err.name || 'Error'
    };
  };

  const safeError = getSafeErrorDetails(error);
  const errMessage = safeError.message;

  const isQuotaExceeded = 
    safeError.code === 'resource-exhausted' ||
    errMessage.toLowerCase().includes('quota') ||
    errMessage.toLowerCase().includes('exhausted') ||
    errMessage.toLowerCase().includes('resource-exhausted');

  if (isQuotaExceeded) {
    if (typeof window !== 'undefined') {
      (window as any).__firestore_quota_exceeded = true;
      (window as any).__firestore_quota_exceeded_timestamp = Date.now();
      try {
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
      } catch (e) {}
    }
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId || 'unknown',
        email: provider.email || 'unknown',
      })) || []
    }
  };
  
  // Safe logging and throw with ultimate fallback
  const getCircularReplacer = () => {
    const seen = new WeakSet();
    return (key: string, value: any) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      return value;
    };
  };

  let stringified = '';
  try {
    stringified = JSON.stringify(errInfo, getCircularReplacer());
    if (isQuotaExceeded) {
      console.warn('Firestore Error Detail (Quota Exceeded):', stringified);
    } else {
      console.error('Firestore Error Detail:', stringified);
    }
  } catch (stringifyError: any) {
    stringified = `Firestore Error [${operationType}] on [${path}]: ${errMessage}`;
    if (isQuotaExceeded) {
      console.warn(stringified, safeError);
    } else {
      console.error(stringified, safeError);
    }
  }

  // To prevent the React application from crashing on subscription listeners (like onSnapshot) or simple cached queries:
  // 1. We NEVER throw on reads or lists (LIST, GET)
  // 2. We NEVER throw if the Firestore database is out of daily free quota (keeps the app functioning from Firestore offline cache)
  const isReadOperation = operationType === OperationType.LIST || operationType === OperationType.GET;
  if (isReadOperation || isQuotaExceeded) {
    return;
  }

  throw new Error(stringified);
}
