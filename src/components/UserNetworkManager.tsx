import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  Search,
  Users,
  UserCheck,
  UserPlus,
  Shield,
  BadgeCheck,
  Check,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../integrations/supabase/client';
import { fetchUserProfileCached, isPartnerUser } from '../lib/helpers';
import { cn } from '../lib/utils';
import { User } from '../lib/firebase';

interface UserNetworkManagerProps {
  user: User;
  onBack: () => void;
  onViewProfile: (userId: string) => void;
}

interface FollowItem {
  id: string; // The target user ID
  createdAt?: string;
  profile?: any;
}

export const UserNetworkManager: React.FC<UserNetworkManagerProps> = ({
  user,
  onBack,
  onViewProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [followers, setFollowers] = useState<FollowItem[]>([]);
  const [following, setFollowing] = useState<FollowItem[]>([]);
  const [myFollowingSet, setMyFollowingSet] = useState<Set<string>>(new Set());
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Load all followers and following records
  const loadNetworkData = async () => {
    if (!user?.uid) return;
    setLoading(true);

    try {
      // 1. Fetch people who follow current user (followers)
      const { data: followersRows, error: followersErr } = await supabase
        .from('follows')
        .select('follower_id, created_at')
        .eq('followed_id', user.uid);

      if (followersErr) {
        console.warn('Error fetching followers:', followersErr);
      }

      // 2. Fetch people current user follows (following)
      const { data: followingRows, error: followingErr } = await supabase
        .from('follows')
        .select('followed_id, created_at')
        .eq('follower_id', user.uid);

      if (followingErr) {
        console.warn('Error fetching following:', followingErr);
      }

      const followerIds = (followersRows || []).map((f) => f.follower_id);
      const followingIds = (followingRows || []).map((f) => f.followed_id);

      const followingSet = new Set<string>(followingIds);
      setMyFollowingSet(followingSet);

      // Collect unique user IDs to fetch profiles for
      const allUniqueIds = Array.from(new Set([...followerIds, ...followingIds]));

      // Fetch profiles in parallel using cached loader
      const profileMap: Record<string, any> = {};
      await Promise.all(
        allUniqueIds.map(async (id) => {
          const p = await fetchUserProfileCached(id);
          if (p) {
            profileMap[id] = p;
          }
        })
      );

      // Map to FollowItem arrays
      const followersList: FollowItem[] = (followersRows || []).map((row) => ({
        id: row.follower_id,
        createdAt: row.created_at,
        profile: profileMap[row.follower_id] || { displayName: 'Utilisateur TrocShop' },
      }));

      const followingList: FollowItem[] = (followingRows || []).map((row) => ({
        id: row.followed_id,
        createdAt: row.created_at,
        profile: profileMap[row.followed_id] || { displayName: 'Utilisateur TrocShop' },
      }));

      setFollowers(followersList);
      setFollowing(followingList);
    } catch (e) {
      console.error('Error loading network data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNetworkData();
  }, [user?.uid]);

  // Toggle follow/unfollow for a target user
  const handleToggleFollow = async (targetId: string) => {
    if (!user?.uid || actionLoadingId) return;
    setActionLoadingId(targetId);

    const isCurrentlyFollowing = myFollowingSet.has(targetId);

    if (isCurrentlyFollowing) {
      // Unfollow
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.uid)
        .eq('followed_id', targetId);

      if (!error) {
        const nextSet = new Set(myFollowingSet);
        nextSet.delete(targetId);
        setMyFollowingSet(nextSet);
        setFollowing((prev) => prev.filter((item) => item.id !== targetId));
      } else {
        console.error('Error unfollowing:', error);
      }
    } else {
      // Follow
      const { error } = await supabase.from('follows').insert({
        follower_id: user.uid,
        followed_id: targetId,
      });

      if (!error) {
        const nextSet = new Set(myFollowingSet);
        nextSet.add(targetId);
        setMyFollowingSet(nextSet);

        // Fetch profile if needed and add to following list
        const p = await fetchUserProfileCached(targetId);
        setFollowing((prev) => [
          {
            id: targetId,
            createdAt: new Date().toISOString(),
            profile: p || { displayName: 'Utilisateur TrocShop' },
          },
          ...prev,
        ]);
      } else {
        console.error('Error following:', error);
      }
    }

    setActionLoadingId(null);
  };

  // Filter list by search query
  const displayedList = useMemo(() => {
    const rawList = activeTab === 'followers' ? followers : following;
    if (!searchQuery.trim()) return rawList;

    const query = searchQuery.toLowerCase().trim();
    return rawList.filter((item) => {
      const name = item.profile?.displayName || item.profile?.name || '';
      const bio = item.profile?.bio || '';
      const school = item.profile?.studentSchool || '';
      return (
        name.toLowerCase().includes(query) ||
        bio.toLowerCase().includes(query) ||
        school.toLowerCase().includes(query)
      );
    });
  }, [activeTab, followers, following, searchQuery]);

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-8 py-6 space-y-8 animate-in fade-in duration-300">
      {/* Top Header Bar - Clean & Uncluttered */}
      <div className="flex items-center justify-between gap-4 bg-white p-5 sm:p-7 rounded-[2.2rem] border border-zinc-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="w-11 h-11 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
            title="Retour à mon profil"
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight leading-snug">
              Mon Réseau & Abonnements
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-zinc-400 mt-0.5">
              Suivez l'activité de votre communauté et gérez vos vendeurs favoris
            </p>
          </div>
        </div>
      </div>

      {/* Overview Metric Cards - Generous Spacing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div
          onClick={() => setActiveTab('followers')}
          className={cn(
            'p-6 sm:p-7 rounded-[2.2rem] border transition-all cursor-pointer relative overflow-hidden group',
            activeTab === 'followers'
              ? 'bg-zinc-900 text-white border-zinc-800 shadow-xl shadow-zinc-900/10'
              : 'bg-white text-zinc-900 border-zinc-200 hover:border-zinc-300 shadow-xs hover:shadow-md'
          )}
        >
          <div className="flex items-center justify-between">
            <div
              className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
                activeTab === 'followers'
                  ? 'bg-white/10 text-orange-400'
                  : 'bg-orange-50 text-orange-600'
              )}
            >
              <Users size={24} />
            </div>
            <span
              className={cn(
                'text-3xl sm:text-4xl font-black tracking-tight',
                activeTab === 'followers' ? 'text-white' : 'text-zinc-900'
              )}
            >
              {followers.length}
            </span>
          </div>
          <div className="mt-5 space-y-1">
            <h3 className="text-base font-black uppercase tracking-wider">Mes Abonnés</h3>
            <p
              className={cn(
                'text-xs font-medium leading-relaxed',
                activeTab === 'followers' ? 'text-zinc-400' : 'text-zinc-500'
              )}
            >
              Membres qui suivent vos publications
            </p>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('following')}
          className={cn(
            'p-6 sm:p-7 rounded-[2.2rem] border transition-all cursor-pointer relative overflow-hidden group',
            activeTab === 'following'
              ? 'bg-zinc-900 text-white border-zinc-800 shadow-xl shadow-zinc-900/10'
              : 'bg-white text-zinc-900 border-zinc-200 hover:border-zinc-300 shadow-xs hover:shadow-md'
          )}
        >
          <div className="flex items-center justify-between">
            <div
              className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
                activeTab === 'following'
                  ? 'bg-white/10 text-emerald-400'
                  : 'bg-emerald-50 text-emerald-600'
              )}
            >
              <UserCheck size={24} />
            </div>
            <span
              className={cn(
                'text-3xl sm:text-4xl font-black tracking-tight',
                activeTab === 'following' ? 'text-white' : 'text-zinc-900'
              )}
            >
              {following.length}
            </span>
          </div>
          <div className="mt-5 space-y-1">
            <h3 className="text-base font-black uppercase tracking-wider">Mes Abonnements</h3>
            <p
              className={cn(
                'text-xs font-medium leading-relaxed',
                activeTab === 'following' ? 'text-zinc-400' : 'text-zinc-500'
              )}
            >
              Vendeurs que vous suivez actuellement
            </p>
          </div>
        </div>
      </div>

      {/* Main Controls & User Cards (Directly on page without enclosing frame) */}
      <div className="space-y-6">
        {/* Search & Rounded Switch Pills */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Rounded Switch Pills */}
          <div className="flex bg-zinc-100 p-1.5 rounded-full border border-zinc-200/80 self-start md:self-auto shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('followers')}
              className={cn(
                'px-6 py-2.5 rounded-full text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2.5',
                activeTab === 'followers'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              )}
            >
              <span>Abonnés</span>
              <span className="px-2.5 py-0.5 bg-zinc-200/80 text-zinc-800 rounded-full text-xs font-black">
                {followers.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('following')}
              className={cn(
                'px-6 py-2.5 rounded-full text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2.5',
                activeTab === 'following'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              )}
            >
              <span>Abonnements</span>
              <span className="px-2.5 py-0.5 bg-zinc-200/80 text-zinc-800 rounded-full text-xs font-black">
                {following.length}
              </span>
            </button>
          </div>

          {/* Wider Search Bar with Rounded Full Edges */}
          <div className="relative flex-1 max-w-xl">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, bio ou école..."
              className="w-full pl-12 pr-5 py-3.5 bg-white border border-zinc-200/80 rounded-full text-xs sm:text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* User Card List */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs sm:text-sm font-bold text-zinc-400">Chargement de votre réseau...</p>
          </div>
        ) : displayedList.length === 0 ? (
          <div className="py-16 text-center space-y-4 px-4 bg-white rounded-[2.2rem] border border-zinc-200/80 p-8">
            <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto text-zinc-400">
              {activeTab === 'followers' ? <Users size={36} /> : <UserPlus size={36} />}
            </div>
            {searchQuery ? (
              <div className="space-y-1">
                <p className="text-base font-black text-zinc-800">Aucun membre trouvé</p>
                <p className="text-xs sm:text-sm text-zinc-500">
                  Aucun utilisateur ne correspond à votre recherche "{searchQuery}".
                </p>
              </div>
            ) : activeTab === 'followers' ? (
              <div className="space-y-1">
                <p className="text-lg font-black text-zinc-800">Aucun abonné pour le moment</p>
                <p className="text-xs sm:text-sm font-medium text-zinc-500 max-w-md mx-auto leading-relaxed">
                  Postez de superbes annonces sur TrocShop pour vous faire connaître et acquérir vos premiers abonnés !
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-lg font-black text-zinc-800">Aucun abonnement en cours</p>
                <p className="text-xs sm:text-sm font-medium text-zinc-500 max-w-md mx-auto leading-relaxed">
                  Explorez les profils des vendeurs et cliquez sur "Suivre le vendeur" pour recevoir leurs nouveautés.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {displayedList.map((item) => {
              const prof = item.profile || {};
              const name = prof.displayName || prof.name || 'Utilisateur TrocShop';
              const photoURL = prof.photoURL || prof.photo_url || prof.avatar;
              const bio = prof.bio;
              const school = prof.studentSchool;
              const isCertified =
                prof.is_certified === true ||
                prof.is_certified === 'vrai' ||
                prof.isCertified === true ||
                prof.isCertified === 'vrai' ||
                prof.isPro === true ||
                prof.is_pro === true;
              const isVerified = prof.isVerified;
              const isPartner = isPartnerUser(prof);

              const isFollowedByMe = myFollowingSet.has(item.id);
              const isLoadingThis = actionLoadingId === item.id;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-5 sm:p-6 bg-white hover:bg-zinc-50/80 border border-zinc-200/80 hover:border-zinc-300 rounded-[2rem] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-xs hover:shadow-md group"
                >
                  {/* Avatar + Info */}
                  <div className="flex items-center gap-4 min-w-0 flex-1 w-full">
                    <div
                      onClick={() => onViewProfile(item.id)}
                      className="relative shrink-0 cursor-pointer"
                    >
                      {photoURL ? (
                        <img
                          src={photoURL}
                          alt={name}
                          className="w-14 h-14 rounded-2xl object-cover border border-zinc-200/90 group-hover:scale-105 transition-transform shadow-2xs"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-xl flex items-center justify-center border border-white/20 group-hover:scale-105 transition-transform shadow-2xs">
                          {name[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          onClick={() => onViewProfile(item.id)}
                          className="font-black text-base text-zinc-900 hover:text-orange-600 transition-colors cursor-pointer leading-snug"
                        >
                          {name}
                        </span>

                        {/* Badges */}
                        <div className="flex items-center gap-1 shrink-0">
                          {isPartner && (
                            <span
                              title="Partenaire"
                              className="px-1.5 py-0.5 bg-emerald-500 text-white rounded-md text-[10px] font-black flex items-center gap-1"
                            >
                              <Shield size={10} className="fill-white/20" />
                              <span>Partenaire</span>
                            </span>
                          )}
                          {isCertified && (
                            <span
                              title="Certifié"
                              className="px-1.5 py-0.5 bg-amber-500 text-white rounded-md text-[10px] font-black flex items-center gap-1"
                            >
                              <BadgeCheck size={10} className="fill-white/20" />
                              <span>Certifié</span>
                            </span>
                          )}
                          {isVerified && !isCertified && (
                            <span
                              title="Vérifié"
                              className="px-1.5 py-0.5 bg-blue-500 text-white rounded-md text-[10px] font-black flex items-center gap-1"
                            >
                              <Check size={10} strokeWidth={3} />
                              <span>Vérifié</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs font-medium text-zinc-500 leading-relaxed line-clamp-2">
                        {bio || (school ? `Étudiant à ${school}` : 'Membre de la communauté TrocShop')}
                      </p>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-200/60">
                    <button
                      type="button"
                      onClick={() => onViewProfile(item.id)}
                      className="px-3.5 py-2.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 rounded-xl border border-zinc-200 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-2xs active:scale-95"
                      title="Voir le profil"
                    >
                      <ExternalLink size={14} />
                      <span className="hidden sm:inline">Profil</span>
                    </button>

                    {item.id !== user.uid && (
                      <button
                        type="button"
                        disabled={isLoadingThis}
                        onClick={() => handleToggleFollow(item.id)}
                        className={cn(
                          'px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border shadow-2xs active:scale-95 min-w-[110px] justify-center',
                          isFollowedByMe
                            ? 'bg-white hover:bg-rose-50 text-zinc-800 hover:text-rose-600 border-zinc-200 hover:border-rose-200'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-900'
                        )}
                      >
                        {isLoadingThis ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : isFollowedByMe ? (
                          <>
                            <UserCheck size={14} className="text-emerald-500" />
                            <span>Suivi</span>
                          </>
                        ) : (
                          <>
                            <UserPlus size={14} className="text-orange-400" />
                            <span>Suivre</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserNetworkManager;
