import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safe console wrapper to prevent circular structure serialization issues in the environment's logger
const wrapConsole = (method: 'log' | 'warn' | 'error' | 'info') => {
  const original = console[method];
  if (typeof original !== 'function') return;
  console[method] = function (...args: any[]) {
    const safeArgs = args.map(arg => {
      if (arg && typeof arg === 'object') {
        const constructorName = arg.constructor?.name || '';
        const isFirebaseOrComplex = arg.code || 
                                    arg.firestore || 
                                    arg.auth || 
                                    arg.databaseId || 
                                    arg._tokenResponse ||
                                    constructorName.includes('Y2') || 
                                    constructorName.includes('Ka') ||
                                    constructorName.includes('DocumentReference') ||
                                    constructorName.includes('Query') ||
                                    constructorName.includes('Firestore') ||
                                    constructorName.includes('Auth');
        if (arg instanceof Error || isFirebaseOrComplex) {
          return arg.message || String(arg);
        }
        // Test if standard serialization succeeds
        try {
          JSON.stringify(arg);
          return arg;
        } catch {
          // Circular structure detected
          return `[Complex/Circular Object: ${constructorName || 'Object'}]`;
        }
      }
      return arg;
    });
    return original.apply(this, safeArgs);
  };
};

wrapConsole('log');
wrapConsole('warn');
wrapConsole('error');
wrapConsole('info');

// Global error intercepter to prevent minified Firebase/circular objects from crashing the platform's logger
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason) {
    const reason = event.reason;
    try {
      if (reason && typeof reason === 'object') {
        const isFirebaseErr = reason.code || 
                              reason.message?.includes('permissions') || 
                              reason.constructor?.name?.includes('Y2') || 
                              reason.constructor?.name?.includes('Ka');
        if (isFirebaseErr) {
          console.warn('[Global Safe Interceptor] Unhandled Firebase Error intercepted safely:', reason.message || String(reason));
          event.preventDefault();
          event.stopPropagation();
        }
      }
    } catch {}
  }
});

window.addEventListener('error', (event) => {
  if (event.error) {
    const err = event.error;
    try {
      if (err && typeof err === 'object') {
        const isFirebaseErr = err.code || 
                              err.message?.includes('permissions') || 
                              err.constructor?.name?.includes('Y2') || 
                              err.constructor?.name?.includes('Ka');
        if (isFirebaseErr) {
          console.warn('[Global Safe Interceptor] Uncaught Firebase Error intercepted safely:', err.message || String(err));
          event.preventDefault();
          event.stopPropagation();
        }
      }
    } catch {}
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
