import React, { useState, useEffect } from 'react';
import { BadgeCheck, GraduationCap, Star, Shield } from 'lucide-react';
import { User, collection, doc, query, where, orderBy, limit, getDocs, getDoc, writeBatch, onSnapshot, db, handleFirestoreError, OperationType, serverTimestamp } from '../lib/firebase';
import { fetchUserProfileCached, globalDataCache, isPartnerUser } from '../lib/helpers';
import { Button } from './ui/Button';
import { Review } from '../types';
import { cn } from '../lib/utils';

export const ReviewAuthorName = ({ uid, defaultName }: { uid: string; defaultName: string }) => {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!uid) return;
    fetchUserProfileCached(uid).then((data) => {
      if (data) setProfile(data);
    });
  }, [uid]);

  const isCertified = (profile?.is_certified as any) === true || (profile?.is_certified as any) === 'vrai' || (profile?.isCertified as any) === true || (profile?.isCertified as any) === 'vrai' || (profile?.['is certified'] as any) === true || (profile?.['is certified'] as any) === 'vrai' || (profile?.badges as string[])?.some(b => b?.toLowerCase().includes('certif'));
  const isPartner = isPartnerUser(profile);

  return (
    <div className="flex items-center gap-2">
      {profile?.photoURL ? (
        <img src={profile.photoURL} className="w-8 h-8 rounded-xl object-cover border border-zinc-100 shrink-0" alt="Avatar" />
      ) : (
        <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0">
          {(profile?.displayName || defaultName || '?')[0].toUpperCase()}
        </div>
      )}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-black text-[10px] uppercase tracking-widest text-zinc-400">
            {profile?.displayName || defaultName}
          </span>
          {isPartner && (
            <Shield size={14} className="text-emerald-600 fill-emerald-600 shrink-0" />
          )}
          {isCertified && (
            <BadgeCheck size={14} className="text-orange-600 fill-orange-600 text-white shrink-0" />
          )}
          {profile?.isStudent && (
            <span className="shrink-0 px-2 py-0.5 bg-blue-50 text-blue-750 border border-blue-100 rounded-full text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5" title={`Étudiant à ${profile.studentSchool || ''}`}>
              <GraduationCap size={10} className="text-blue-600" />
              <span>Etudiant</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const ReviewSection = ({ 
  targetId, 
  targetType, 
  user, 
  onFocusChange,
  onReviewSubmitted
}: { 
  targetId: string, 
  targetType: 'user' | 'product', 
  user: User | null, 
  onFocusChange?: (focused: boolean) => void,
  onReviewSubmitted?: (rating: number) => void
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const field = targetType === 'user' ? 'toUserId' : 'toProductId';
    const cacheKey = `reviews_${targetId}`;

    const q = query(
      collection(db, 'reviews'),
      where(field, '==', targetId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const revs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Review));
      globalDataCache[cacheKey] = revs;
      setReviews(revs);
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, 'reviews');
    });

    return () => unsubscribe();
  }, [targetId, targetType]);

  const handleSubmit = async () => {
    if (!user || user.uid === targetId || !rating || !comment.trim()) return;
    
    // Enforce 1 review limit per user
    const hasReviewed = reviews.some(r => r.fromUserId === user.uid);
    if (hasReviewed) {
      alert(targetType === 'user' ? "Vous avez déjà donné votre avis sur ce vendeur !" : "Vous avez déjà donné votre avis sur cet article !");
      return;
    }

    setLoading(true);
    const field = targetType === 'user' ? 'toUserId' : 'toProductId';
    try {
      const batch = writeBatch(db);
      const reviewRef = doc(collection(db, 'reviews'));
      
      batch.set(reviewRef, {
        fromUserId: user.uid,
        fromUserName: user.displayName || 'Utilisateur',
        toUserId: targetType === 'user' ? targetId : null,
        toProductId: targetType === 'product' ? targetId : null,
        rating,
        comment,
        createdAt: serverTimestamp()
      });

      // Update user stats if it's a user profile rating submission
      if (targetType === 'user') {
        const rCount = reviews.length + 1;
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0) + rating;
        const avg = sum / rCount;
        batch.update(doc(db, 'users', targetId), {
          rating: Number(avg.toFixed(1)),
          reviewCount: rCount
        });
      }

      // Notify the recipient
      let receiverId = targetId;
      let reviewBody = `Nouvel avis (${rating} étoiles) : "${comment.slice(0, 50)}${comment.length > 50 ? '...' : ''}"`;
      
      if (targetType === 'product') {
        const pSnap = await getDoc(doc(db, 'products', targetId));
        if (pSnap.exists()) {
          receiverId = pSnap.data().sellerId;
        }
      }

      if (receiverId !== user.uid) {
        const notifRef = doc(collection(db, 'users', receiverId, 'notifications'));
        batch.set(notifRef, {
          type: 'comment',
          title: 'Nouveau commentaire',
          body: reviewBody,
          toUserId: receiverId,
          fromUserId: user.uid,
          fromUserName: user.displayName || 'Utilisateur',
          productId: targetType === 'product' ? targetId : '',
          createdAt: serverTimestamp(),
          read: false
        });
      }

      await batch.commit();

      const newReview: Review = {
        id: reviewRef.id,
        fromUserId: user.uid,
        fromUserName: user.displayName || 'Utilisateur',
        toUserId: targetType === 'user' ? targetId : null,
        toProductId: targetType === 'product' ? targetId : null,
        rating,
        comment,
        createdAt: new Date().toISOString() as any,
      };
      const updatedRevs = [newReview, ...reviews];
      setReviews(updatedRevs);
      const cacheKey = `reviews_${targetId}`;
      globalDataCache[cacheKey] = updatedRevs;
      
      alert("Votre avis a bien été envoyé ! Merci pour votre retour.");
      
      // Trigger callback if provided
      if (onReviewSubmitted) {
        onReviewSubmitted(rating);
      }

      setRating(0);
      setComment('');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'reviews');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-xl tracking-tight uppercase">
          {targetType === 'product' ? 'Avis sur ce produit' : 'Avis sur le vendeur'}
        </h3>
        <div className="flex items-center gap-1 text-orange-600 font-black">
          <Star size={16} className="fill-current" />
          <span>{reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : 'N/A'}</span>
          <span className="text-zinc-300 font-bold ml-1">({reviews.length})</span>
        </div>
      </div>

      {user && user.uid !== targetId && (
        <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100 space-y-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onClick={() => setRating(s)} className={cn("transition-all", rating >= s ? "text-orange-500 scale-110" : "text-zinc-200")}>
                <Star size={24} fill={rating >= s ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <textarea 
            value={comment}
            onChange={e => setComment(e.target.value)}
            onFocus={() => onFocusChange?.(true)}
            onBlur={() => onFocusChange?.(false)}
            placeholder={targetType === 'product' ? "Ce que vous pensez de l'article..." : "Votre expérience avec ce vendeur..."}
            className="w-full p-4 rounded-2xl bg-white border border-zinc-100 min-h-[100px] outline-none focus:ring-4 focus:ring-orange-500/5 text-sm font-medium"
          />
          <Button variant="primary" disabled={loading || !rating || !comment.trim()} onClick={handleSubmit} className="w-full rounded-2xl uppercase tracking-widest font-black text-xs py-4">
            {loading ? "Envoi..." : "Publier l'avis"}
          </Button>
        </div>
      )}

      {user && user.uid === targetId && (
        <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl text-center">
           <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">Vous ne pouvez pas vous noter vous-même</p>
        </div>
      )}

      <div className="space-y-4">
        {reviews.map(r => (
          <div key={r.id} className="p-5 bg-white rounded-2xl border border-zinc-100 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <ReviewAuthorName uid={r.fromUserId} defaultName={r.fromUserName} />
              <div className="flex gap-0.5 text-orange-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={10} fill={i < r.rating ? "currentColor" : "none"} />
                ))}
              </div>
            </div>
            <p className="text-sm font-medium text-zinc-600 italic">"{r.comment}"</p>
          </div>
        ))}
        {reviews.length === 0 && (
          <p className="text-center text-xs font-bold text-zinc-300 py-4 uppercase tracking-widest">Aucun avis pour le moment</p>
        )}
      </div>
    </div>
  );
};
