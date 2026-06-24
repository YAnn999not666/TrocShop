// Browser stubs for Capacitor APIs used by App.tsx.
// In a real native build these are replaced by the real Capacitor plugins.

const noopListener = { remove: async () => {} };

export const App = {
  addListener: async (_event: string, _cb: any) => noopListener,
  minimizeApp: async () => {},
  exitApp: async () => {},
  getInfo: async () => ({ name: 'TrocShop', id: 'app.trocshop', build: '0', version: '0.1.0' }),
  getState: async () => ({ isActive: true }),
};

export const Share = {
  share: async (opts: { title?: string; text?: string; url?: string; dialogTitle?: string }) => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share(opts);
        return;
      } catch {}
    }
    if (opts.url) {
      try {
        await navigator.clipboard.writeText(opts.url);
        alert('Lien copié dans le presse-papier');
      } catch {
        alert(opts.url);
      }
    }
  },
};

// Capacitor core (no-op)
export const Capacitor = {
  isNativePlatform: () => false,
  getPlatform: () => 'web',
};

export default { App, Share, Capacitor };
