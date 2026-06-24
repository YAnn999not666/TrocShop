import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Redirect all firebase/* imports to our Supabase-backed shim
      'firebase/app': path.resolve(__dirname, './src/lib/firebase.ts'),
      'firebase/auth': path.resolve(__dirname, './src/lib/firebase.ts'),
      'firebase/firestore': path.resolve(__dirname, './src/lib/firebase.ts'),
      'firebase/storage': path.resolve(__dirname, './src/lib/firebase.ts'),
      // Capacitor stubs (web preview)
      '@capacitor/app': path.resolve(__dirname, './src/lib/capacitor-stub.ts'),
      '@capacitor/share': path.resolve(__dirname, './src/lib/capacitor-stub.ts'),
      '@capacitor/core': path.resolve(__dirname, './src/lib/capacitor-stub.ts'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    hmr: process.env.DISABLE_HMR !== 'true',
  },
}));
