import React, { useState, useEffect, useRef } from 'react';
import { 
  db, 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  doc, 
  deleteDoc,
  setDoc,
  writeBatch,
  serverTimestamp,
  handleFirestoreError, 
  OperationType,
  getDoc
} from '../lib/firebase';
import { globalDataCache, safeConfirm } from '../lib/helpers';

export function useNotifications(
  user: any, 
  activeConversationId: string | null, 
  profile: any,
  conversations: any[] = [],
  exchanges: any[] = []
) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [rawNotifications, setRawNotifications] = useState<any[]>([]);

  // Refs to avoid tearing/stale closures in real-time listeners
  const activeConversationIdRef = useRef<string | null>(activeConversationId);
  const profileRef = useRef<any>(profile);
  const writtenNotificationIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Écouter les notifications Firestore
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setRawNotifications([]);
      return;
    }

    const qNotif = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    let isFirst = true;
    const unsubNotif = onSnapshot(qNotif, (snap) => {
      const allNotifs = snap.docs.map(d => ({ id: d.id, ...d.data() }) as any);
      
      const cacheKey = `notifications_${user.uid}`;
      globalDataCache[cacheKey] = allNotifs;
      setRawNotifications(allNotifs);

      if (isFirst) {
        isFirst = false;
        return;
      }

      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notif = change.doc.data() as any;
          const isCurrentChat = activeConversationIdRef.current === notif.conversationId;

          if (
            'Notification' in window && 
            Notification.permission === 'granted' &&
            profileRef.current?.notificationsEnabled !== false &&
            (notif.type !== 'message' || !isCurrentChat || document.hidden)
          ) {
            const title = notif.title;
            const options = {
              body: notif.body,
              icon: '/icon.jpg',
              badge: '/icon.jpg',
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

    return () => {
      unsubNotif();
    };
  }, [user?.uid]);

  // Persister les notifications synthétiques en base (messages et trocs)
  useEffect(() => {
    if (!user) return;

    const batch = writeBatch(db);
    let hasNewNotifications = false;

    // 1. Persister les notifications de messages non lus
    conversations.forEach((c) => {
      if (c.unreadUserId === user.uid && c.lastSenderId !== user.uid) {
        const docId = `msg_${c.id}`;
        const existsInDb = rawNotifications.some(n => n.id === docId);
        
        if (!existsInDb && !writtenNotificationIdsRef.current.has(docId)) {
          writtenNotificationIdsRef.current.add(docId);
          hasNewNotifications = true;
          
          const defaultName = c.participantNames?.find((n: string) => n !== user.displayName) 
            || `Utilisateur ${c.participantIds?.find((id: string) => id !== user.uid)?.slice(0, 4) || ''}`;
          
          batch.set(doc(db, 'users', user.uid, 'notifications', docId), {
            type: 'message',
            title: `Message de ${defaultName}`,
            body: c.lastMessage || "Nouveau message reçu",
            toUserId: user.uid,
            fromUserId: c.participantIds?.find((id: string) => id !== user.uid) || '',
            fromUserName: defaultName,
            conversationId: c.id,
            createdAt: c.updatedAt || serverTimestamp(),
            read: false
          });
        }
      }
    });

    // 2. Persister les notifications de troc en attente
    exchanges.forEach((e) => {
      const isActionable = (e.status === 'pending' && e.sellerId === user.uid);
      if (isActionable) {
        const docId = `troc_${e.id}`;
        const existsInDb = rawNotifications.some(n => n.id === docId);
        
        if (!existsInDb && !writtenNotificationIdsRef.current.has(docId)) {
          writtenNotificationIdsRef.current.add(docId);
          hasNewNotifications = true;
          
          batch.set(doc(db, 'users', user.uid, 'notifications', docId), {
            type: 'troc',
            title: "Nouvelle offre de troc 📦",
            body: `Vous avez reçu une offre pour votre article "${e.productTitle}". Cliquez ici pour la gérer.`,
            toUserId: user.uid,
            fromUserId: e.buyerId,
            fromUserName: e.buyerName || "Un membre",
            exchangeId: e.id,
            productId: e.productId,
            createdAt: e.updatedAt || serverTimestamp(),
            read: false
          });
        }
      }
    });

    // Commit des nouvelles notifications en base
    if (hasNewNotifications) {
      batch.commit().catch(err => console.warn("Failed to persist synthesized notifications:", err));
    }
  }, [conversations, exchanges, rawNotifications, user]);

  // Synchronisation et affichage des notifications combinées
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const combinedNotifs = [...rawNotifications];

    // Ajouter les notifications synthétiques manquantes pour l'affichage immédiat
    conversations.forEach((c) => {
      if (c.unreadUserId === user.uid && c.lastSenderId !== user.uid) {
        const docId = `msg_${c.id}`;
        const exists = combinedNotifs.some(n => n.id === docId);
        if (!exists) {
          const defaultName = c.participantNames?.find((n: string) => n !== user.displayName) 
            || `Utilisateur ${c.participantIds?.find((id: string) => id !== user.uid)?.slice(0, 4) || ''}`;
          combinedNotifs.push({
            id: docId,
            type: 'message',
            title: `Message de ${defaultName}`,
            body: c.lastMessage || "Nouveau message reçu",
            toUserId: user.uid,
            fromUserId: c.participantIds?.find((id: string) => id !== user.uid) || '',
            fromUserName: defaultName,
            conversationId: c.id,
            createdAt: c.updatedAt || { seconds: Date.now() / 1000 },
            read: false
          });
        }
      }
    });

    exchanges.forEach((e) => {
      const isActionable = (e.status === 'pending' && e.sellerId === user.uid);
      if (isActionable) {
        const docId = `troc_${e.id}`;
        const exists = combinedNotifs.some(n => n.id === docId);
        if (!exists) {
          combinedNotifs.push({
            id: docId,
            type: 'troc',
            title: "Nouvelle offre de troc 📦",
            body: `Vous avez reçu une offre pour votre article "${e.productTitle}". Cliquez ici pour la gérer.`,
            toUserId: user.uid,
            fromUserId: e.buyerId,
            fromUserName: e.buyerName || "Un membre",
            exchangeId: e.id,
            productId: e.productId,
            createdAt: e.updatedAt || { seconds: Date.now() / 1000 },
            read: false
          });
        }
      }
    });

    // Déduplication et tri
    const dedupedNotifs: any[] = [];
    const seenIds = new Set<string>();
    combinedNotifs.forEach(notif => {
      if (notif.id && !seenIds.has(notif.id)) {
        seenIds.add(notif.id);
        dedupedNotifs.push(notif);
      }
    });

    dedupedNotifs.sort((a, b) => {
      const t1 = a.createdAt?.seconds || (typeof a.createdAt === 'number' ? a.createdAt / 1000 : 0) || 0;
      const t2 = b.createdAt?.seconds || (typeof b.createdAt === 'number' ? b.createdAt / 1000 : 0) || 0;
      return t2 - t1;
    });

    setNotifications(dedupedNotifs);
  }, [rawNotifications, conversations, exchanges, user?.uid, user?.displayName]);

  const handleDeleteNotification = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) return;
    safeConfirm("Voulez-vous vraiment supprimer cette notification ?", async () => {
      // Optimistic delete
      setNotifications(prev => prev.filter(n => n.id !== id));
      const cacheKey = `notifications_${user.uid}`;
      if (globalDataCache[cacheKey]) {
        globalDataCache[cacheKey] = globalDataCache[cacheKey].filter((n: any) => n.id !== id);
      }
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'notifications', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `notifications/${id}`);
      }
    });
  };

  return {
    notifications,
    setNotifications,
    rawNotifications,
    setRawNotifications,
    handleDeleteNotification
  };
}
