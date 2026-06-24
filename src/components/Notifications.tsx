import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Bell, ArrowLeft, CheckCircle2, MessageCircle, CheckCheck
} from 'lucide-react';
import { User, doc, writeBatch, updateDoc, db } from '../lib/firebase';
import { cn } from '../lib/utils';

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
}

export const Notifications = ({ 
  notifications, 
  user, 
  onBackToHome,
  onNotificationClick,
  setNotifications,
  setRawNotifications
}: NotificationsProps) => {
  const [isNotificationEditMode, setIsNotificationEditMode] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  return (
    <motion.div 
      key="notifications"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-40"
    >
       <div className="flex items-center gap-4 select-none">
          <button 
            onClick={onBackToHome}
            className="p-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-full transition-all active:scale-75 flex items-center justify-center shrink-0 shadow-sm cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase text-zinc-900 border-b-4 border-orange-600 inline-block font-sans">Notifications</h2>
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
                     if (isNotificationEditMode) {
                       setSelectedNotifications(prev => 
                         prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                       );
                     } else {
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
                     }
                   }}
                   whileTap={{ scale: 0.98 }}
                   className={cn(
                     "p-5 rounded-[2rem] border transition-all flex items-center gap-4 relative cursor-pointer overflow-visible",
                     n.read ? "bg-white border-zinc-100 shadow-sm" : "bg-orange-50/50 border-orange-100/80 shadow-sm",
                     isSelected && "ring-2 ring-orange-600 bg-orange-600/10"
                   )}
                 >
                   <div className={cn(
                     "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm self-start",
                     n.read ? "bg-zinc-50 text-zinc-400" : "bg-orange-600 text-white shadow-orange-600/10"
                   )}>
                     {isSelected ? <CheckCircle2 size={24} /> : (n.type === 'message' ? <MessageCircle size={24} /> : <Bell size={24} />)}
                   </div>
                   <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-start gap-2">
                         <h4 className={cn("font-black uppercase tracking-tighter leading-tight truncate flex-1", n.read ? "text-zinc-500" : "text-zinc-900")}>
                           {n.title}
                         </h4>
                         <span className="text-[9px] font-bold text-zinc-400 shrink-0 font-mono">
                           {formatNotifDate(n.createdAt)}
                         </span>
                       </div>
                       <p className={cn("text-xs mt-1", n.read ? "text-zinc-400" : "text-zinc-500 font-medium")}>
                         {n.body}
                       </p>
                     </div>

                   {!n.read && (
                     <div className="shrink-0 flex items-center justify-center pl-2">
                       <span 
                         className="w-3 h-3 bg-orange-600 rounded-full border-2 border-white animate-pulse shadow-[0_0_12px_rgba(234,88,12,0.6)]" 
                         title="Non lu"
                       />
                     </div>
                   )}
                 </motion.div>
                 );
               })}
            </div>
         )}


    </motion.div>
  );
};
export default Notifications;
