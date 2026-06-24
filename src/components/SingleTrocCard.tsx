import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Check, Clock, ShoppingBag, Tag } from 'lucide-react';
import { User } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, serverTimestamp } from '../lib/firebase';
import { fetchUserProfileCached } from '../lib/helpers';
import { Button } from './ui/Button';
import { ReviewSection } from './Reviews';
import { Product, UserProfile } from '../types';
import { cn, formatPrice } from '../lib/utils';

interface SingleTrocCardProps {
  ex: any;
  user: User | null;
  products: Product[];
  isEditMode: boolean;
  activeTab: 'ongoing' | 'past';
  isSelected: boolean;
  setSelectedTrocs: React.Dispatch<React.SetStateAction<string[]>>;
  onStatusUpdate: (exId: string, status: string) => void;
  onVerifyCode: (ex: any) => void;
  onStartChat?: (userId: string, productId?: string) => void;
}

export const SingleTrocCard = ({
  ex,
  user,
  products,
  isEditMode,
  activeTab,
  isSelected,
  setSelectedTrocs,
  onStatusUpdate,
  onVerifyCode,
  onStartChat,
}: SingleTrocCardProps) => {
  const isSeller = ex.sellerId === user?.uid;
  const exchangeProducts = useMemo(() => {
    return products.filter(p => ex.exchangeProductIds?.includes(p.id)) || (ex.exchangeProductId ? products.filter(p => p.id === ex.exchangeProductId) : []);
  }, [products, ex.exchangeProductIds, ex.exchangeProductId]);

  const [proposerProfile, setProposerProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (ex.buyerId) {
      fetchUserProfileCached(ex.buyerId).then(data => {
        if (data) {
          setProposerProfile(data as UserProfile);
        }
      });
    }
  }, [ex.buyerId]);

  const proposerName = proposerProfile?.displayName || ex.buyerName || (isSeller ? "Acheteur" : (user?.displayName || "Vous"));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => {
        if (isEditMode && activeTab === 'past') {
          if (isSelected) setSelectedTrocs(prev => prev.filter(id => id !== ex.id));
          else setSelectedTrocs(prev => [...prev, ex.id]);
        }
      }}
      className={cn(
        "bg-white p-6 rounded-[2.2rem] border shadow-[0_15px_40px_rgba(0,0,0,0.02)] space-y-5 transition-all duration-300 relative overflow-hidden",
        isEditMode && activeTab === 'past' ? "cursor-pointer pl-14" : "",
        isSelected ? "ring-2 ring-orange-600 bg-orange-50/20 border-orange-200" : "border-zinc-100"
      )}
    >
      {isEditMode && activeTab === 'past' && (
        <div className="absolute left-5 top-1/2 -translate-y-1/2 z-10">
          <div className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
            isSelected ? "bg-orange-600 border-orange-600 text-white" : "border-zinc-300 bg-white"
          )}>
            {isSelected && <Check size={14} strokeWidth={3} />}
          </div>
        </div>
      )}

      {/* Card Header with Proposer Profile and State Tags */}
      <div className="flex items-center gap-2.5 mb-3 select-none">
        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-black shrink-0">
          {proposerName?.[0]?.toUpperCase() || 'P'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-zinc-800 truncate">{proposerName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="bg-orange-50 text-orange-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-orange-100/40">
              {ex.type === 'exchange' ? 'Échange' : 'Achat'}
            </span>
            <span className={cn(
              "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border",
              ex.status === 'pending' ? "bg-zinc-50 text-zinc-500 border-zinc-200/50" : 
              ex.status === 'accepted' ? "bg-green-50 text-green-600 border-green-150/40" :
              ex.status === 'completed' ? "bg-zinc-900 text-white border-zinc-900" : "bg-red-50 text-red-600 border-red-100"
            )}>
              {ex.status === 'pending' ? (isSeller ? 'Demande reçue' : 'En attente') : 
               ex.status === 'accepted' ? 'Accepté' :
               ex.status === 'completed' ? 'Terminé' : 'Annulé'}
            </span>
          </div>
        </div>
        {isSeller ? (
          <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-orange-50 text-orange-600 border border-orange-100/40 shrink-0">Reçu</span>
        ) : (
          <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-zinc-100 text-zinc-600 shrink-0">Vous</span>
        )}
      </div>

      {/* Visual Trade elements showing wanted item and offered swap fully visible */}
      <div className="bg-zinc-50/50 p-4 rounded-[1.5rem] border border-zinc-100/60 space-y-3.5">
        {/* Row 1: Wanted Product (Target Product) */}
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">L'article convoité</p>
          <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-zinc-100 shadow-xs relative">
            <img 
              src={ex.productImage || 'https://images.unsplash.com/photo-1594498259353-c0ad33568dad?w=200&q=80'} 
              className="w-10 h-10 rounded-lg object-cover shadow-xs border border-zinc-150 shrink-0 bg-zinc-100" 
              alt={ex.productTitle || ""}
            />
            <div className="flex-1 min-w-0">
              <h5 className="font-extrabold text-xs uppercase text-zinc-800 truncate tracking-tight">{ex.productTitle}</h5>
              <p className="text-[9px] text-zinc-400 font-bold uppercase mt-0.5">Valeur estimée</p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-black text-orange-600 italic">
                {formatPrice(ex.productPrice || 0)} FCFA
              </span>
            </div>
          </div>
        </div>

        {/* Center Simple separator */}
        <div className="flex items-center justify-center gap-2 py-1">
          <div className="h-px flex-1 bg-zinc-100" />
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 px-2 select-none">
            {ex.type === 'exchange' ? 'contre' : 'pour'}
          </span>
          <div className="h-px flex-1 bg-zinc-100" />
        </div>

        {/* Row 2: Offered / Proposed exchange elements */}
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
            {ex.type === 'exchange' ? "Proposé en échange" : "Moyen de paiement proposé"}
          </p>

          {ex.type === 'exchange' ? (
            <div className="space-y-2">
              {exchangeProducts.length > 0 ? (
                exchangeProducts.map(p => (
                  <div key={p.id} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-zinc-100 shadow-xs">
                    <img 
                      src={p.images?.[0] || 'https://images.unsplash.com/photo-1594498259353-c0ad33568dad?w=200&q=80'} 
                      className="w-10 h-10 rounded-lg object-cover shadow-xs border border-zinc-150 shrink-0 bg-zinc-100" 
                      alt={p.title}
                    />
                    <div className="flex-1 min-w-0">
                      <h5 className="font-extrabold text-xs uppercase text-zinc-800 truncate tracking-tight">{p.title}</h5>
                      <span className="text-[9px] bg-zinc-50 text-zinc-400 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider mt-0.5 inline-block">Offert</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-emerald-600 italic">
                        {formatPrice(p.price)} FCFA
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                ex.exchangeProductTitles?.map((title: string, index: number) => {
                  const fallbackImg = ex.exchangeProductImages?.[index] || 'https://images.unsplash.com/photo-1594498259353-c0ad33568dad?w=200&q=80';
                  return (
                    <div key={index} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-zinc-100 shadow-xs">
                      <img 
                        src={fallbackImg} 
                        className="w-10 h-10 rounded-lg object-cover shadow-xs border border-zinc-150 shrink-0 bg-zinc-100" 
                        alt={title}
                      />
                      <div className="flex-1 min-w-0">
                        <h5 className="font-extrabold text-xs uppercase text-zinc-800 truncate tracking-tight">{title}</h5>
                        <span className="text-[9px] bg-zinc-50 text-zinc-400 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider mt-0.5 inline-block">Offert</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-zinc-100 shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                <Tag size={14} className="stroke-[2.5]" />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="font-extrabold text-xs uppercase text-zinc-800 tracking-tight">Achat direct</h5>
                <p className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5">Valeur monétaire</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg italic select-none">
                  {formatPrice(ex.productPrice || 0)} FCFA
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {ex.priceAdjustment > 0 && (
        <div className="px-5 py-3.5 bg-orange-50/30 rounded-2xl flex items-center justify-between border border-dashed border-orange-200/60">
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-orange-650 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
            Somme de compensation ajoutée
          </div>
          <span className="text-sm font-black text-orange-600 italic">+{formatPrice(ex.priceAdjustment)} FCFA</span>
        </div>
      )}

      {/* Buttons and Actions */}
      {ex.status === 'pending' && isSeller && (
        <div className="flex gap-2.5 pt-1">
          <Button variant="primary" className="flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-orange-600/10 cursor-pointer" onClick={() => onStatusUpdate(ex.id, 'accepted')}>
            Accepter
          </Button>
          <Button variant="outline" className="flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-none bg-red-50 hover:bg-red-100 text-red-650 cursor-pointer" onClick={() => onStatusUpdate(ex.id, 'cancelled')}>
            Refuser
          </Button>
        </div>
      )}

      {ex.status === 'accepted' && (
        <div className="space-y-2.5 pt-1">
          <Button 
            variant="secondary" 
            className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] bg-zinc-900 hover:bg-zinc-950 text-white shadow-xl shadow-zinc-900/15 cursor-pointer" 
            onClick={() => onVerifyCode(ex)}
          >
             {isSeller ? (ex.type === 'purchase' ? "Confirmer la vente" : "Confirmer le troc") : "Saisir le code"}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-orange-650 hover:bg-orange-50/30 border border-orange-100 cursor-pointer" 
            onClick={() => onStartChat?.(isSeller ? ex.buyerId : ex.sellerId, ex.productId)}
          >
             Commencer à discuter
          </Button>
        </div>
      )}
      
      {!isSeller && ex.status === 'pending' && (
        <div className="pt-2 text-center select-none">
          <div className="inline-flex items-center gap-1.5 text-zinc-400 bg-zinc-50 px-3/5 py-1.5 rounded-full">
            <Clock size={10} />
            <p className="text-[10px] font-bold uppercase tracking-wider italic">En attente de réponse du vendeur...</p>
          </div>
        </div>
      )}

      {ex.status === 'completed' && (
        ex.type === 'purchase'
          ? (!isSeller && !ex.buyerRating)
          : ((isSeller && !ex.sellerRating) || (!isSeller && !ex.buyerRating))
      ) && (
        <div className="p-4 bg-orange-50/40 rounded-3xl border border-orange-100/50">
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 text-center mb-3">Expérience terminée ! Laissez un avis.</p>
          <ReviewSection 
            targetId={isSeller ? ex.buyerId : ex.sellerId} 
            targetType="user" 
            user={user} 
            onReviewSubmitted={async (submittedRating) => {
              if (!user) return;
              try {
                const exRef = doc(db, 'exchanges', ex.id);
                await updateDoc(exRef, {
                  [isSeller ? 'sellerRating' : 'buyerRating']: submittedRating,
                  updatedAt: serverTimestamp()
                });
              } catch (err) {
                try {
                  handleFirestoreError(err, OperationType.UPDATE, 'exchanges');
                } catch (rethrown: any) {
                  console.error("Failed to update exchange rating:", rethrown?.message || String(rethrown));
                }
              }
            }}
          />
        </div>
      )}
    </motion.div>
  );
};
export default SingleTrocCard;
