import React from 'react';
import { motion } from 'motion/react';
import { Heart, Clock, ShoppingBag, BadgeCheck, GraduationCap, Shield } from 'lucide-react';
import { Product } from '../types';
import { cn, formatPrice } from '../lib/utils';
import { isPartnerUser } from '../lib/helpers';

export const ProductCardSkeleton = () => (
  <div className="bg-white rounded-[2rem] overflow-hidden border border-zinc-100 animate-pulse transition-all">
    <div className="aspect-[4/5] bg-zinc-100 skeleton" />
    <div className="p-4 space-y-3">
      <div className="flex gap-2">
        <div className="w-16 h-4 bg-zinc-50 rounded-full skeleton" />
        <div className="w-12 h-4 bg-zinc-50 rounded-full skeleton" />
      </div>
      <div className="h-4 w-3/4 bg-zinc-100 rounded skeleton" />
      <div className="h-5 w-1/2 bg-zinc-50 rounded skeleton" />
    </div>
  </div>
);

export const getSellerProfile = (data: any): { isCertified: boolean, isStudent: boolean, studentSchool: string, isPartner: boolean } | undefined => {
  if (!data) return undefined;
  const isCertified = !!(
    data.is_certified === true || 
    data.is_certified === 'vrai' || 
    data.isCertified === true || 
    data.isCertified === 'vrai' || 
    data['is certified'] === true || 
    data['is certified'] === 'vrai' || 
    (Array.isArray(data.badges) && data.badges.some((b: any) => typeof b === 'string' && (b.toLowerCase().includes('certif') || b.toLowerCase().includes('valide') || b.toLowerCase().includes('vérifié') || b.toLowerCase().includes('verifie'))))
  );
  const isStudent = !!(
    data.isStudent === true || 
    data.is_student === true || 
    (data.isStudent as any) === 'true' || 
    (data.isStudent as any) === 'vrai' || 
    (Array.isArray(data.badges) && data.badges.some((b: any) => typeof b === 'string' && (b.toLowerCase().includes('étudiant') || b.toLowerCase().includes('etudiant'))))
  );
  const studentSchool = data.studentSchool || '';
  const isPartner = isPartnerUser(data);
  return { isCertified, isStudent, studentSchool, isPartner };
};

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  favorite?: boolean;
  onFavorite?: (e: React.MouseEvent) => void;
  onBuy?: (e: React.MouseEvent) => void;
  isOwner?: boolean;
  sellerProfile?: {
    isCertified: boolean;
    isStudent: boolean;
    studentSchool: string;
    isPartner?: boolean;
  };
}

export const ProductCard = ({ 
  product, 
  onClick, 
  favorite, 
  onFavorite, 
  isOwner, 
  sellerProfile 
}: ProductCardProps) => {
  const isDisabled = product.status === 'pending' || product.status === 'sold' || product.transactionInProgress || (product as any)['transactionInProgress'] === true;

  return (
    <motion.div 
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileTap={isDisabled ? undefined : { scale: 0.98 }}
      onClick={isDisabled ? undefined : onClick}
      className={cn(
        "group bg-white rounded-[2rem] overflow-hidden border transition-all duration-300 relative",
        isDisabled ? "cursor-default border-zinc-200 opacity-90" : "cursor-pointer border-zinc-100 hover:shadow-[0_15px_30px_rgba(0,0,0,0.05)]"
      )}
    >
      <div className="absolute top-4 left-4 z-10">
        <span className={cn(
          "px-3 py-1.5 rounded-xl backdrop-blur-md shadow-sm text-[8px] font-black uppercase tracking-widest text-white border border-white/10 select-none",
          product.listingType === 'sale' ? "bg-emerald-600/95" :
          product.listingType === 'mixed' ? "bg-orange-600/95" : "bg-blue-600/95"
        )}>
          {product.listingType === 'sale' ? 'Vente' :
           product.listingType === 'mixed' ? 'Troc +' : 'Troc'}
        </span>
      </div>

      {/* MASKED LIKES BUTTON
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            if (isDisabled) return;
            onFavorite?.(e); 
          }}
          disabled={isDisabled}
          className={cn(
            "px-3 py-2 rounded-full backdrop-blur-md flex items-center gap-2 border shadow-sm transition-all",
            isDisabled 
              ? "bg-zinc-100/90 border-zinc-200 text-zinc-400 cursor-not-allowed opacity-80" 
              : "bg-white/90 border-zinc-100 active:scale-75 hover:bg-white cursor-pointer"
          )}
        >
          <Heart className={cn("w-4 h-4 transition-colors", favorite ? "fill-red-500 text-red-500" : "text-zinc-400")} />
          <span className={cn("text-[10px] font-black", isDisabled ? "text-zinc-400" : "text-orange-600")}>{typeof product.likesCount === 'number' ? product.likesCount : 0}</span>
        </button>
      </div>
      */}

      <div className="aspect-[4/5] relative overflow-hidden bg-zinc-100">
        <img 
          src={product.images[0] || 'https://images.unsplash.com/photo-1594498259353-c0ad33568dad?w=800&q=80'} 
          alt={product.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700"
        />
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5 z-10 items-center justify-start pointer-events-none">
          <div className="bg-zinc-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest text-white shadow-lg w-fit">
            {product.condition}
          </div>
          {(product.status === 'sold' || product.is_available === false) ? (
            <div className="bg-red-600 backdrop-blur-md px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest text-white shadow-lg flex items-center gap-1.5 w-fit">
              <ShoppingBag size={10} />
              Vendu
            </div>
          ) : (
            (product.status === 'pending' || product.transactionInProgress || (product as any)['transactionInProgress'] === true) && (
              <div className="bg-orange-500 backdrop-blur-md px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest text-white shadow-lg flex items-center gap-1.5 w-fit animate-pulse">
                <Clock size={10} />
                En cours
              </div>
            )
          )}
        </div>
        {!isOwner ? (
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        ) : (
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
      <div className="p-4 flex items-center justify-between gap-2 bg-white">
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-zinc-900 truncate text-sm mb-1 uppercase tracking-tighter leading-tight font-sans">{product.title}</h3>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              {product.price > 0 ? (
                <span className="text-orange-600 font-extrabold tracking-tight italic text-base flex items-baseline">
                  {formatPrice(product.price)}
                  <span className="text-[11px] ml-1 uppercase not-italic font-black text-orange-600 tracking-normal opacity-100">FCFA</span>
                </span>
              ) : (
                <span className="text-blue-600 font-black tracking-tighter text-[10px] uppercase font-sans">
                  Troc Simple
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1.5 shrink-0 self-center">
          {sellerProfile?.isPartner && (
            <div className="w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-sm shrink-0" title="Partenaire">
              <Shield size={10} className="text-white fill-emerald-600 shrink-0" />
            </div>
          )}
          {sellerProfile?.isCertified && (
            <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-sm shrink-0" title="Certifié">
              <BadgeCheck size={11} className="text-white fill-orange-500 shrink-0" />
            </div>
          )}
          {sellerProfile?.isStudent && (
            <div className="w-5 h-5 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-700 shrink-0" title={`Étudiant à ${sellerProfile.studentSchool || ''}`}>
              <GraduationCap size={11} className="text-blue-600 shrink-0" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
export default ProductCard;
