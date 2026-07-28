import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Bell, ArrowLeft, CheckCircle2, MessageCircle, CheckCheck, Trash2
} from 'lucide-react';
import { User, doc, writeBatch, updateDoc, deleteDoc, db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { safeConfirm, globalDataCache } from '../lib/helpers';

const formatNotifDate = (createdAt: any): string => {
  if (!createdAt) return "À l'instant";
  let date: Date;
  if (createdAt.seconds !== undefined) {
    date = new Date(createdAt.seconds * 1000);
  } else if (createdAt instanceof Date) {
    date = createdAt;
  } else if (createdAt.toDate && typeof createdAt.toDate === 'function') {
    date = createdAt.toDate();
  } else {
    date = new Date(createdAt);
  }
  
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  if (diffDays === 1) return `Hier à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays < 7) {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return `${days[date.getDay()]} ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

interface NotificationsProps {
  notifications: any[];
  user: User | null;
  onBackToHome: () => void;
  onNotificationClick?: (notif: any) => void;
  setNotifications?: React.Dispatch<React.SetStateAction<any[]>>;
  setRawNotifications?: React.Dispatch<React.SetStateAction<any[]>>;
  onDeleteNotification?: (id: string, e?: React.MouseEvent) => void;
}

export const Notifications = ({ 
  notifications, 
  user, 
  onBackToHome,
  onNotificationClick,
  setNotifications,
  setRawNotifications,
  onDeleteNotification
}: NotificationsProps) => {
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const hasUnread = notifications.some(n => !n.read);

  const handleMarkAllAsRead = async () => {
    if (!user || notifications.length === 0) return;

    const unreadNotifs = notifications.filter(n => !n.read);
    if (unreadNotifs.length === 0) return;

    // Optimistic update
    if (setNotifications) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
    if (setRawNotifications) {
      setRawNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }

    const cacheKey = `notifications_${user.uid}`;
    if (globalDataCache[cacheKey]) {
      globalDataCache[cacheKey] = globalDataCache[cacheKey].map((n: any) => ({ ...n, read: true }));
    }

    const batch = writeBatch(db);
    for (const n of unreadNotifs) {
      const id = n.id;
      if (!id) continue;

      if (id.startsWith('synth_troc_') || id.startsWith('troc_')) {
        localStorage.setItem(`last_viewed_troc_${n.exchangeId || id.replace('troc_', '')}_${user.uid}`, 'true');
      } else if (id.startsWith('synth_msg_') || id.startsWith('msg_')) {
        localStorage.setItem(`last_read_${n.conversationId || id.replace('msg_', '')}_${user.uid}`, Date.now().toString());
      }

      try {
        const notifRef = doc(db, 'users', user.uid, 'notifications', id);
        batch.set(notifRef, { read: true }, { merge: true });
      } catch (e) {
        console.warn("Failed queuing batch item for mark all read:", id, e);
      }
    }

    try {
      await batch.commit();
    } catch (err) {
      console.warn("Failed batch commit for mark all read:", err);
    }
  };

  const handleDeleteAll = () => {
    if (!user || notifications.length === 0) return;

    safeConfirm("Voulez-vous vraiment supprimer toutes vos notifications ?", async () => {
      const idsToDelete = notifications.map(n => n.id).filter(Boolean);

      // Optimistic update
      if (setNotifications) setNotifications([]);
      if (setRawNotifications) setRawNotifications([]);
      const cacheKey = `notifications_${user.uid}`;
      globalDataCache[cacheKey] = [];

      const batch = writeBatch(db);
      for (const id of idsToDelete) {
        try {
          batch.delete(doc(db, 'users', user.uid, 'notifications', id));
        } catch (err) {
          console.warn("Failed delete batch for notification:", id, err);
        }
      }

      try {
        await batch.commit();
      } catch (err) {
        console.warn("Failed batch commit for delete all notifications:", err);
      }
    });
  };

  const handleDeleteOne = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    if (onDeleteNotification) {
      onDeleteNotification(id, e);
      return;
    }

    safeConfirm("Voulez-vous vraiment supprimer cette notification ?", async () => {
      if (setNotifications) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
      if (setRawNotifications) {
        setRawNotifications(prev => prev.filter(n => n.id !== id));
      }
      const cacheKey = `notifications_${user.uid}`;
      if (globalDataCache[cacheKey]) {
        globalDataCache[cacheKey] = globalDataCache[cacheKey].filter((n: any) => n.id !== id);
      }
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'notifications', id));
      } catch (err) {
        console.warn("Error deleting notification:", err);
      }
    });
  };

  return (
    <motion.div 
      key="notifications"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-40"
    >
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBackToHome}
              className="p-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-full transition-all active:scale-75 flex items-center justify-center shrink-0 shadow-sm cursor-pointer"
              title="Retour"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-3xl font-black italic tracking-tighter uppercase text-zinc-900 border-b-4 border-orange-600 inline-block font-sans">Notifications</h2>
          </div>

          {notifications.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {hasUnread && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-3.5 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck size={16} />
                  <span>Tout marquer comme lu</span>
                </button>
              )}
              <button
                onClick={handleDeleteAll}
                className="px-3.5 py-2 bg-zinc-100 hover:bg-red-50 text-zinc-600 hover:text-red-600 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer border border-zinc-200 hover:border-red-200 shadow-sm"
                title="Tout supprimer"
              >
                <Trash2 size={16} />
                <span>Tout supprimer</span>
              </button>
            </div>
          )}
       </div>

       {notifications.length === 0 ? (
          <div className="py-20 text-center space-y-4 opacity-20 select-none">
            <Bell size={48} className="mx-auto" />
            <p className="font-black uppercase tracking-widest text-xs">Aucune notification</p>
          </div>
       ) : (
          <div className="space-y-3">
             {notifications.map((n, i) => {
               const id = n.id || i.toString();
               const isSelected = selectedNotifications.includes(id);
               return (
                 <motion.div 
                   key={id}
                   onClick={async () => {
                     if (onNotificationClick) {
                       onNotificationClick(n);
                     }
                     if (!n.read && user) {
                       if (id.startsWith('synth_troc_') || id.startsWith('troc_')) {
                         localStorage.setItem(`last_viewed_troc_${n.exchangeId || id.replace('troc_', '')}_${user.uid}`, 'true');
                       } else if (id.startsWith('synth_msg_') || id.startsWith('msg_')) {
                         localStorage.setItem(`last_read_${n.conversationId || id.replace('msg_', '')}_${user.uid}`, Date.now().toString());
                       }
                       try {
                         await updateDoc(doc(db, 'users', user.uid, 'notifications', id), { read: true });
                       } catch (e: any) {
                         try {
                           const { setDoc } = await import('../lib/firebase');
                           await setDoc(doc(db, 'users', user.uid, 'notifications', id), { read: true }, { merge: true });
                         } catch (err: any) {
                           console.error("Error marking individual notification read in fallback:", err?.message || String(err));
                         }
                       }
                     }
                   }}
                   whileTap={{ scale: 0.99 }}
                   className={cn(
                     "p-5 rounded-[2rem] border transition-all flex items-start gap-4 relative cursor-pointer overflow-visible",
                     n.read ? "bg-white border-zinc-100 shadow-sm" : "bg-orange-50/50 border-orange-100/80 shadow-sm",
                     isSelected && "ring-2 ring-orange-600 bg-orange-600/10"
                   )}
                 >
                   <div className={cn(
                     "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm self-start mt-0.5",
                     n.read ? "bg-zinc-50 text-zinc-400" : "bg-orange-600 text-white shadow-orange-600/10"
                   )}>
                     {isSelected ? <CheckCircle2 size={22} /> : (n.type === 'message' ? <MessageCircle size={22} /> : <Bell size={22} />)}
                   </div>

                   <div className="flex-1 min-w-0 pr-1">
                       <div className="flex justify-between items-start gap-2">
                         <h4 className={cn("font-black uppercase tracking-tighter leading-snug flex-1 break-words whitespace-normal text-sm", n.read ? "text-zinc-500" : "text-zinc-900")}>
                           {n.title}
                         </h4>
                         <span className="text-[9px] font-bold text-zinc-400 shrink-0 font-mono pt-0.5">
                           {formatNotifDate(n.createdAt)}
                         </span>
                       </div>
                       <p className={cn("text-xs mt-1.5 whitespace-pre-wrap break-words leading-relaxed", n.read ? "text-zinc-400" : "text-zinc-700 font-medium")}>
                         {n.body}
                       </p>
                   </div>

                   <div className="shrink-0 flex items-center gap-2 self-start pt-0.5">
                     {!n.read && (
                       <span 
                         className="w-2.5 h-2.5 bg-orange-600 rounded-full border-2 border-white animate-pulse shadow-[0_0_10px_rgba(234,88,12,0.6)]" 
                         title="Non lu"
                       />
                     )}
                     <button
                       type="button"
                       onClick={(e) => handleDeleteOne(id, e)}
                       className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                       title="Supprimer la notification"
                     >
                       <Trash2 size={16} />
                     </button>
                   </div>
                 </motion.div>
                 );
               })}
            </div>
         )}
    </motion.div>
  );
};
export default Notifications;
