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
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('DEBUG: serviceWorker ou PushManager non supporté par ce navigateur');
      return;
    }

    const registerWebPush = async () => {
      try {
        alert('DEBUG: Démarrage registerWebPush, userId=' + userId);

        const permission = await Notification.requestPermission();
        alert('DEBUG: Permission notification = ' + permission);
        if (permission !== 'granted') return;

        const registration = await navigator.serviceWorker.ready;
        alert('DEBUG: Service worker ready, scope=' + registration.scope);

        // Vérifie si déjà abonné
        let subscription = await registration.pushManager.getSubscription();
        alert('DEBUG: Abonnement existant = ' + (subscription ? 'OUI' : 'NON'));

        if (!subscription) {
          try {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
            alert('DEBUG: subscribe() OK, endpoint=' + subscription.endpoint.slice(0, 60) + '...');
          } catch (subErr: any) {
            alert('DEBUG: ERREUR subscribe() -> ' + (subErr?.name || '') + ': ' + (subErr?.message || String(subErr)));
            throw subErr;
          }
        }

        const subJson = subscription.toJSON();
        const p256dh = subJson.keys?.p256dh;
        const auth = subJson.keys?.auth;
        alert('DEBUG: Clés extraites, p256dh=' + (p256dh ? 'présent' : 'MANQUANT') + ', auth=' + (auth ? 'présent' : 'MANQUANT'));

        // Enregistre dans Supabase
        const { error, data } = await supabase
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
          )
          .select();

        if (error) {
          alert('DEBUG: ERREUR Supabase upsert -> code=' + error.code + ' message=' + error.message + ' details=' + (error.details || '') + ' hint=' + (error.hint || ''));
        } else {
          alert('DEBUG: Upsert Supabase OK ! Lignes retournées: ' + JSON.stringify(data));
        }

      } catch (err: any) {
        alert('DEBUG: ERREUR GLOBALE catch -> ' + (err?.name || '') + ': ' + (err?.message || String(err)));
      }
    };

    registerWebPush();
  }, [userId]);
}
