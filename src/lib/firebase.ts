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
  })
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
    // We explicitly avoid passing the whole err object to prevent circular structure issues
    return {
      message: err.message ? String(err.message) : String(err),
      code: err.code ? String(err.code) : 'unknown',
      name: err.name ? String(err.name) : 'Error'
    };
  };

  const safeError = getSafeErrorDetails(error);
  const errMessage = safeError.message;

  // Manually construct authInfo to avoid any hidden circularity in the Auth object
  const currentUser = auth.currentUser;
  const authInfo = {
    userId: currentUser?.uid || null,
    email: currentUser?.email || null,
    emailVerified: currentUser?.emailVerified || null,
    isAnonymous: currentUser?.isAnonymous || null,
    tenantId: currentUser?.tenantId || null,
    providerInfo: currentUser?.providerData?.map(provider => ({
      providerId: provider.providerId || 'unknown',
      email: provider.email || 'unknown',
    })) || []
  };

  const errInfo = {
    error: errMessage,
    operationType,
    path,
    authInfo
  };
  
  // Safe logging and throw with ultimate fallback
  try {
    // Basic recursion check/replacer for JSON.stringify to prevent circular structure errors
    // Even though we constructed errInfo safely above, we keep this for defense in depth
    const getCircularReplacer = () => {
      const seen = new WeakSet();
      return (_key: string, value: any) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return "[Circular]";
          }
          seen.add(value);
        }
        return value;
      };
    };

    const stringified = JSON.stringify(errInfo, getCircularReplacer());
    console.error('Firestore Error Detail:', stringified);
    throw new Error(stringified);
  } catch (stringifyError: any) {
    if (stringifyError.message && stringifyError.message.startsWith('{') && stringifyError.message.endsWith('}')) {
      throw stringifyError;
    }

    const fallbackMessage = `Firestore Error [${operationType}] on [${path}]: ${errMessage}`;
    console.error(fallbackMessage);
    throw new Error(fallbackMessage);
  }
}
