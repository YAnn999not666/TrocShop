import React, { useState, useEffect } from 'react';
import { 
  db, 
  auth,
  collection, 
  getDocs, 
  doc, 
  getDoc,
  writeBatch, 
  increment, 
  serverTimestamp, 
  handleFirestoreError, 
  OperationType 
} from '../lib/firebase';
import { globalDataCache } from '../lib/helpers';
import { Product } from '../types';

export function useLikes(
  user: any, 
  updateProductLikesLocally: (productId: string, val: number) => void
) {
  const [favorites, setFavorites] = useState<string[]>([]);

  // Charge les favoris de l'utilisateur
  useEffect(() => {
    if (!user) {
      setFavorites([]);
      return;
    }

    const cacheKey = `favorites_${user.uid}`;
    if (globalDataCache[cacheKey] !== undefined) {
      setFavorites(globalDataCache[cacheKey]);
      return;
    }

    getDocs(collection(db, 'users', user.uid, 'favorites'))
      .then((snap) => {
        const favIds = snap.docs.map(d => d.id);
        globalDataCache[cacheKey] = favIds;
        setFavorites(favIds);
      })
      .catch((e) => {
        if (auth.currentUser?.uid === user.uid) {
          handleFirestoreError(e, OperationType.GET, `users/${user.uid}/favorites`);
        }
      });
  }, [user?.uid]);

  const getLikesCount = (p: Product | null | undefined): number => {
    if (!p) return 0;
    return Math.max(0, p.likesCount || 0);
  };

  const toggleFavorite = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) {
      // Gérer le cas où l'utilisateur n'est pas connecté
      return;
    }

    const favRef = doc(db, 'users', user.uid, 'favorites', id);
    const productRef = doc(db, 'products', id);
    const batch = writeBatch(db);

    const isRemoving = favorites.includes(id);
    const incrementVal = isRemoving ? -1 : 1;

    // Optimistic update locale
    updateProductLikesLocally(id, incrementVal);

    try {
      if (isRemoving) {
        batch.delete(favRef);
        batch.update(productRef, {
          likesCount: increment(-1)
        });
        const updated = favorites.filter(fId => fId !== id);
        setFavorites(updated);
        globalDataCache[`favorites_${user.uid}`] = updated;
      } else {
        batch.set(favRef, {
          productId: id,
          createdAt: serverTimestamp()
        });
        batch.update(productRef, {
          likesCount: increment(1)
        });
        const updated = [...favorites, id];
        setFavorites(updated);
        globalDataCache[`favorites_${user.uid}`] = updated;

        // Notification au vendeur
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
      // Rollback en cas d'erreur
      updateProductLikesLocally(id, -incrementVal);
      if (isRemoving) {
        setFavorites(prev => [...prev, id]);
      } else {
        setFavorites(prev => prev.filter(fId => fId !== id));
      }
      handleFirestoreError(e, OperationType.WRITE, `favorites_and_likes_sync/${id}`);
    }
  };

  return {
    favorites,
    setFavorites,
    getLikesCount,
    toggleFavorite
  };
}
