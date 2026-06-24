import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../integrations/supabase/client';

const VAPID_PUBLIC_KEY = 'BEfQdQFqjd4o3_VNe3lLBt7fgyLTsNHyVjhNR12xI9jX6iOgMQmLXz2Jj-AHmudl3a2dlqK2r1oZ7HLg3BdgseA';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useWebPush(userId: string | null | undefined) {
  useEffect(() => {
    // PWA uniquement — pas sur natif Capacitor
    if (Capacitor.isNativePlatform()) return;
    if (!userId) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const registerWebPush = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const registration = await navigator.serviceWorker.ready;

        // Vérifie si déjà abonné
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }

        const subJson = subscription.toJSON();
        const p256dh = subJson.keys?.p256dh;
        const auth = subJson.keys?.auth;

        // Enregistre dans Supabase
        const { error } = await supabase
          .from('device_tokens')
          .upsert(
            {
              user_id: userId,
              endpoint: subscription.endpoint,
              p256dh: p256dh,
              auth_key: auth,
              token_type: 'webpush',
              platform: 'web',
            },
            { onConflict: 'endpoint' }
          );

        if (error) console.error('Erreur enregistrement web push:', error);
        else console.log('Web Push enregistré avec succès');

      } catch (err) {
        console.warn('Web Push non supporté ou refusé:', err);
      }
    };

    registerWebPush();
  }, [userId]);
}
