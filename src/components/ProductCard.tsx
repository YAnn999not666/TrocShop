import React from 'react';
import { Heart, Clock, ShoppingBag, BadgeCheck, GraduationCap, Shield, Flame, ArrowDownRight } from 'lucide-react';
import { Product } from '../types';
import { cn, formatPrice, formatReservedCountdown } from '../lib/utils';
import { isPartnerUser } from '../lib/helpers';

export const ProductCardSkeleton = () => (
  <div className="bg-white rounded-[2.2rem] overflow-hidden border border-zinc-200/80 shadow-xs">
    <div className="aspect-[4/5] skeleton" />
    <div className="p-4 space-y-3">
      <div className="flex gap-2">
        <div className="w-16 h-4 skeleton rounded-full" />
        <div className="w-12 h-4 skeleton rounded-full" />
      </div>
      <div className="h-4 w-3/4 skeleton rounded-lg" />
      <div className="h-5 w-1/2 skeleton rounded-lg" />
    </div>
  </div>
);

export const getSellerProfile = (data: any): { 
  isCertified: boolean; 
  isStudent: boolean; 
  studentSchool: string; 
  isPartner: boolean;
  phoneNumber?: string;
  phoneVisibility?: 'public' | 'private';
} | undefined => {
  if (!data) return undefined;
  const isCertified = !!(
    data.is_certified === true || 
    data.is_certified === 'vrai' || 
    data.isCertified === true || 
    data.isCertified === 'vrai' || 
    data['is certified'] === true || 
    data['is certified'] === 'vrai' || 
    data.isPro === true ||
    data.is_pro === true ||
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
  const phoneNumber = data.phoneNumber || '';
  const phoneVisibility = data.phoneVisibility || 'private';
  return { isCertified, isStudent, studentSchool, isPartner, phoneNumber, phoneVisibility };
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
    phoneNumber?: string;
    phoneVisibility?: 'public' | 'private';
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
  const isReservedActive = (product.status === 'reserved' || product.status === 'pending') && (
    !product.reserved_until && !(product as any).reservedUntil
      ? true
      : new Date(product.reserved_until || (product as any).reservedUntil).getTime() > Date.now()
  );

  const isDisabled = product.status === 'sold' || product.transactionInProgress || (product as any)['transactionInProgress'] === true || isReservedActive;

  const imageUrl = (product.images && product.images.length > 0) 
    ? product.images[0] 
    : 'https://images.unsplash.com/photo-1594498259353-c0ad33568dad?w=800&q=80';

  return (
    <div 
      onClick={isDisabled ? undefined : onClick}
      className={cn(
        "group bg-white rounded-[2.2rem] overflow-hidden border relative flex flex-col justify-between active:scale-[0.98] transition-transform duration-100",
        isDisabled 
          ? "cursor-default border-zinc-200/80 opacity-90 shadow-2xs" 
          : "cursor-pointer border-zinc-200/80 hover:border-orange-500/40 shadow-2xs"
      )}
    >
      {/* Top Left Badge */}
      <div className="absolute top-3.5 left-3.5 z-10">
        <span className={cn(
          "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider text-white border border-white/30 shadow-md select-none flex items-center gap-1.5",
          product.listingType === 'sale' 
            ? "bg-emerald-600" :
          product.listingType === 'mixed' 
            ? "bg-gradient-to-r from-orange-600 to-amber-500" 
            : "bg-blue-600"
        )}>
          {product.listingType === 'sale' ? 'Vente' :
           product.listingType === 'mixed' ? 'Troc +' : 'Troc'}
        </span>
      </div>

      {/* Top Right Heart Button */}
      <div className="absolute top-3.5 right-3.5 z-10 flex flex-col gap-2">
        <button 
          type="button"
          onClick={(e) => { 
            e.stopPropagation(); 
            if (isDisabled) return;
            onFavorite?.(e); 
          }}
          disabled={isDisabled}
          className={cn(
            "px-3 py-2 rounded-full flex items-center gap-1.5 border shadow-sm transition-colors active:scale-90",
            isDisabled 
              ? "bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed opacity-80" 
              : favorite 
                ? "bg-red-50 border-red-200 text-red-500"
                : "bg-white/90 border-zinc-200/80 hover:bg-white text-zinc-600 hover:text-red-500"
          )}
        >
          <Heart className={cn("w-4 h-4", favorite ? "fill-red-500 text-red-500" : "text-zinc-600")} />
          <span className={cn("text-[10px] font-black", favorite ? "text-red-600" : "text-zinc-700")}>
            {typeof product.likesCount === 'number' ? product.likesCount : 0}
          </span>
        </button>
      </div>

      {/* Image Container */}
      <div className="aspect-[4/5] relative overflow-hidden bg-zinc-100 group">
        <img 
          src={imageUrl} 
          alt={product.title}
          loading="lazy"
          className="w-full h-full object-cover"
        />

        {/* Bottom Condition & Status Badges */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5 z-10 items-center justify-start pointer-events-none">
          <div className="bg-zinc-950/85 border border-white/20 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest text-white shadow-md w-fit">
            {product.condition}
          </div>

          {(product as any).isUrgent && (
            <div className="bg-red-600 border border-red-400/40 px-2.5 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest text-white shadow-md flex items-center gap-1 w-fit">
              <Flame size={10} className="fill-white" />
              Urgent
            </div>
          )}

          {(product as any).isPriceLowered && (
            <div className="bg-emerald-600 border border-emerald-400/40 px-2.5 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest text-white shadow-md flex items-center gap-1 w-fit">
              <ArrowDownRight size={10} />
              Prix Baissé
            </div>
          )}

          {(product.status === 'sold' || (product.is_available === false && product.status !== 'reserved' && product.status !== 'pending')) ? (
            <div className="bg-red-600 border border-white/20 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest text-white shadow-md flex items-center gap-1.5 w-fit">
              <ShoppingBag size={10} />
              Vendu
            </div>
          ) : (
            (isReservedActive || product.transactionInProgress || (product as any)['transactionInProgress'] === true) && (
              <div className="bg-amber-500 text-zinc-950 border border-white/30 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-md flex items-center gap-1.5 w-fit">
                <Clock size={10} />
                <span>{formatReservedCountdown(product.reserved_until || (product as any).reservedUntil)}</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Card Info Footer */}
      <div className="p-4 flex items-center justify-between gap-2 bg-white">
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-zinc-900 truncate text-xs mb-1 uppercase tracking-tight leading-tight font-sans group-hover:text-orange-600 transition-colors">
            {product.title}
          </h3>
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

        {/* Seller Badges */}
        <div className="flex flex-col items-center gap-1.5 shrink-0 self-center">
          {sellerProfile?.isPartner && (
            <div className="w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-xs shrink-0" title="Partenaire">
              <Shield size={10} className="text-white fill-emerald-600 shrink-0" />
            </div>
          )}
          {sellerProfile?.isCertified && (
            <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-xs shrink-0" title="Certifié">
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
    </div>
  );
};

export default ProductCard;

