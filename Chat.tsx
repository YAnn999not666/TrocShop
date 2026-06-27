import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CornerUpLeft, Mic, Send, ChevronLeft, Image as ImageIcon, 
  Play, Pause, Reply, X, Smile, MessageCircle, Phone, 
  BadgeCheck, GraduationCap, Star, ArrowLeft, Shield 
} from 'lucide-react';
import { User, collection, doc, query, orderBy, limit, onSnapshot, getDoc, writeBatch, updateDoc, deleteDoc, db, handleFirestoreError, OperationType, serverTimestamp, uploadToSupabaseStorage } from '../lib/firebase';
import { fetchUserProfileCached, globalDataCache, safeConfirm, safeAlert, isPartnerUser } from '../lib/helpers';
import { LocalRecordingWaveform } from './LocalRecordingWaveform';
import { Message, Conversation, Product, UserProfile } from '../types';
import { cn, formatPrice } from '../lib/utils';

const COMMON_EMOJIS = ["❤️", "😂", "😮", "😢", "🔥", "👍", "🙏"];

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  products: Product[];
  onReply: (m: Message) => void;
  onReact: (m: Message, emoji: string) => void;
  user: User | null;
  onPreviewImage?: (url: string) => void;
}

export function MessageBubble({ 
  message, 
  isMe, 
  products, 
  onReply, 
  onReact,
  user,
  onPreviewImage
}: MessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [senderProfile, setSenderProfile] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const longPressTimer = useRef<any>(null);
  
  useEffect(() => {
    if (message.senderId) {
      fetchUserProfileCached(message.senderId).then((data) => {
        if (data) setSenderProfile(data);
      });
    }
  }, [message.senderId]);
  
  const targetProduct = products.find(p => p.id === message.productId);
  const exchangeProduct = products.find(p => p.id === message.exchangeProductId);
  
  const handleStartLongPress = () => {
    longPressTimer.current = setTimeout(() => {
      setIsFocused(true);
      if (window.navigator?.vibrate) window.navigator.vibrate(50);
    }, 300);
  };

  const handleEndLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {isFocused && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsFocused(false)}
            className="fixed md:absolute inset-0 z-[200] flex flex-col items-center justify-center p-6 bg-transparent backdrop-blur-[25px]"
          >
            <div className={cn("max-w-sm w-full flex flex-col gap-4", isMe ? "items-end" : "items-start")}>
              <motion.div 
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.1 }}
                className="flex items-center bg-white/60 backdrop-blur-[40px] px-4 py-2 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.1)] gap-2 border border-white/50"
                onClick={e => e.stopPropagation()}
              >
                {["👍", "❤️", "😂", "😮", "😢", "👎"].map(emoji => (
                  <motion.button 
                    key={emoji}
                    whileTap={{ scale: 0.6, y: -10 }}
                    onClick={() => {
                      onReact(message, emoji);
                      setIsFocused(false);
                    }}
                    className="text-[28px] hover:scale-125 transition-transform origin-bottom cursor-pointer"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </motion.div>

              <motion.div 
                 layoutId={`msg-${message.id}`}
                 transition={{ type: "spring", stiffness: 400, damping: 35 }}
                 onClick={e => e.stopPropagation()}
                 className={cn(
                   "px-5 py-3.5 rounded-3xl shadow-2xl relative max-w-[85%] text-lg font-medium",
                   isMe ? "bg-orange-600 text-white rounded-br-sm border border-orange-500" : "bg-white text-zinc-900 rounded-bl-sm border border-white"
                 )}
              >
                {message.audioUrl ? "🎤 Note vocale (Audio)" : message.text}
                {message.isExchangeProposal && <p className={cn("text-[10px] font-black uppercase mt-2 tracking-widest", isMe ? "text-orange-200" : "text-orange-600")}>Proposition d'échange</p>}
              </motion.div>

              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: -20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.2 }}
                className="bg-white/60 backdrop-blur-[40px] rounded-2xl w-64 overflow-hidden shadow-[0_16px_64px_rgba(0,0,0,0.15)] flex flex-col divide-y divide-zinc-200/50 border border-white/50"
                onClick={e => e.stopPropagation()}
              >
                <button 
                  onClick={() => {
                    onReply(message);
                    setIsFocused(false);
                  }}
                  className="flex items-center justify-between w-full px-5 py-3.5 text-zinc-900 active:bg-black/5 transition-colors text-left cursor-pointer"
                >
                  <span className="font-semibold text-[15px]">Répondre</span>
                  <Reply size={20} className="text-zinc-500" />
                </button>
                <button 
                  onClick={() => setIsFocused(false)}
                  className="flex items-center justify-between w-full px-5 py-3.5 text-red-500 active:bg-red-500/10 transition-colors text-left cursor-pointer"
                >
                  <span className="font-semibold text-[15px]">Annuler</span>
                  <X size={20} />
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        className={cn("flex flex-col group relative", isMe ? "items-end" : "items-start")}
        onPointerDown={handleStartLongPress}
        onPointerUp={handleEndLongPress}
        onPointerLeave={handleEndLongPress}
        onPointerCancel={handleEndLongPress}
        onContextMenu={(e) => {
          e.preventDefault();
          setIsFocused(true);
        }}
      >
        {message.replyTo && (
          <div className={cn(
            "mb-1 px-4 py-2 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center gap-2 max-w-[70%] text-[10px] font-bold text-zinc-400 select-none",
            isMe ? "mr-4" : "ml-4"
          )}>
            <CornerUpLeft size={10} />
            <span className="truncate italic">"{message.replyTo.text}"</span>
          </div>
        )}
        
        <div className={cn("flex items-end gap-2 max-w-[90%]", isMe ? "flex-row-reverse" : "flex-row")}>
          {!isMe && !message.isSystem && (
            senderProfile?.photoURL ? (
              <img src={senderProfile.photoURL} className="w-8 h-8 rounded-full object-cover shrink-0 mb-1 border" alt="" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0 mb-1">
                {(senderProfile?.displayName || 'U')[0].toUpperCase()}
              </div>
            )
          )}
          <motion.div 
            layoutId={`msg-${message.id}`}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "px-6 py-4 rounded-[2.5rem] text-[17px] font-medium shadow-sm transition-all relative overflow-hidden",
              isMe 
                ? "bg-zinc-900 text-white rounded-tr-none shadow-zinc-900/40" 
                : message.isSystem 
                  ? "bg-white text-zinc-900 rounded-2xl border-4 border-orange-600 shadow-2xl" 
                  : "bg-white text-zinc-900 rounded-tl-none border border-zinc-100"
            )}
          >
            {message.image ? (
              <img 
                src={message.image} 
                alt="Photo" 
                className="max-w-[250px] w-full rounded-[1.5rem] cursor-pointer hover:opacity-90 active:scale-95 transition-all" 
                referrerPolicy="no-referrer"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreviewImage?.(message.image!);
                }}
              />
            ) : message.audioUrl ? (
              <div className="flex flex-col gap-3 min-w-[300px] w-full py-1">
                 <div className="flex items-center gap-4">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (audioRef.current) {
                          if (isPlaying) {
                            audioRef.current.pause();
                          } else {
                            audioRef.current.play();
                          }
                          setIsPlaying(!isPlaying);
                        }
                      }}
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-95 shrink-0 cursor-pointer",
                        isMe ? "bg-orange-600 text-white" : "bg-zinc-900 text-white"
                      )}
                    >
                      {isPlaying ? (
                        <Pause size={20} fill="currentColor" />
                      ) : (
                        <Play size={20} fill="currentColor" className="ml-1" />
                      )}
                    </button>
                    
                    <div className="flex-1 space-y-2 pr-2">
                       <div className="flex items-end gap-1 h-8 px-1">
                          {[...Array(32)].map((_, i) => {
                            const progress = (currentTime / (duration || 0.1)) * 100;
                            const isPlayed = (i / 32) * 100 < progress;
                            return (
                              <div 
                                key={i} 
                                className={cn(
                                  "flex-1 rounded-full transition-all duration-100",
                                  isPlayed 
                                    ? "bg-orange-500" 
                                    : (isMe ? "bg-white/20" : "bg-zinc-200")
                                )} 
                                style={{ 
                                  height: `${20 + Math.abs(Math.sin((i + (isPlaying ? currentTime * 4 : 0)) * 0.4)) * 80}%`,
                                  opacity: isPlayed ? 1 : 0.4
                                }} 
                              />
                            );
                          })}
                       </div>
                       <div className="flex justify-between items-center px-1">
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 select-none">
                            {isPlaying ? "En lecture" : "Note vocale"}
                          </span>
                          <span className="text-[9px] font-black opacity-60 font-mono whitespace-nowrap">
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </span>
                       </div>
                    </div>
                 </div>
                 <audio 
                  ref={audioRef} 
                  src={message.audioUrl} 
                  className="hidden" 
                />
              </div>
            ) : (
              <span className="leading-relaxed break-words whitespace-pre-wrap">{message.text}</span>
            )}
            
            {message.isExchangeProposal && (targetProduct || exchangeProduct) && (
              <div className="mt-4 p-4 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 space-y-4 text-white">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-600 rounded-xl text-white">
                       <Star size={16} fill="currentColor" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/80 select-none">PROPOSITION D'ÉCHANGE</span>
                 </div>
                 
                 <div className="flex items-center gap-4 bg-white/95 p-4 rounded-2xl shadow-sm border border-zinc-100 relative mt-2 text-zinc-900">
                    {exchangeProduct && (
                      <div className="flex-1 flex flex-col items-center text-center gap-1 min-w-0">
                        <span className="text-[6px] font-black text-orange-600 uppercase tracking-[0.2em] mb-1">OFFRE</span>
                        <img src={exchangeProduct.images[0]} className="w-14 h-14 rounded-xl object-cover shadow-inner" alt={exchangeProduct.title} />
                        <p className="text-[10px] font-bold text-zinc-900 truncate w-full">{exchangeProduct.title}</p>
                      </div>
                    )}
                    <div className="flex flex-col items-center gap-1 text-orange-600/30">
                      <ArrowLeft size={14} className="rotate-180" />
                      <span className="text-[6px] font-black tracking-widest leading-none">TROC</span>
                      <ArrowLeft size={14} />
                    </div>
                    {targetProduct && (
                      <div className="flex-1 flex flex-col items-center text-center gap-1 min-w-0 opacity-60">
                        <span className="text-[6px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">DEMANDE</span>
                        <img src={targetProduct.images[0]} className="w-14 h-14 rounded-xl object-cover grayscale-[50%]" alt={targetProduct.title} />
                        <p className="text-[10px] font-bold text-zinc-400 truncate w-full">{targetProduct.title}</p>
                      </div>
                    )}
                  </div>
              </div>
            )}
          </motion.div>
        </div>
  
        <div className={cn("flex items-center gap-2 mt-2", isMe ? "flex-row-reverse" : "flex-row")}>
          <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest px-1">
            {message.createdAt?.seconds ? new Date(message.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
          </span>
          {message.reactions && Object.entries(message.reactions).some(([_, uids]) => uids.length > 0) && (
            <div className="flex gap-1">
              {Object.entries(message.reactions).map(([emoji, uids]) => uids.length > 0 && (
                <div 
                  key={emoji} 
                  className={cn(
                    "bg-white border px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 shadow-sm cursor-pointer",
                    uids.includes(user?.uid || '') ? "border-orange-200 bg-orange-50" : "border-zinc-100"
                  )}
                  onClick={() => onReact(message, emoji)}
                >
                  <span>{emoji}</span>
                  {uids.length > 1 && <span className="font-bold">{uids.length}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

interface ChatWindowProps {
  conversationId: string;
  user: User | null;
  profile: UserProfile | null;
  products: Product[];
  onBack: () => void;
  onPreviewImage?: (url: string) => void;
  initialMessageText?: string;
  onClearInitialMessage?: () => void;
}

export function ChatWindow({ 
  conversationId, 
  user, 
  profile, 
  products, 
  onBack, 
  onPreviewImage,
  initialMessageText,
  onClearInitialMessage
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (initialMessageText) {
      setNewMessage(initialMessageText);
      if (onClearInitialMessage) {
        onClearInitialMessage();
      }
    }
  }, [conversationId, initialMessageText, onClearInitialMessage]);
  const [conv, setConv] = useState<Conversation | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const [otherProfile, setOtherProfile] = useState<UserProfile | null>(null);

  const otherParticipantId = useMemo(() => {
    return conv?.participantIds?.find(id => id !== user?.uid) || '';
  }, [conv?.participantIds, user?.uid]);

  useEffect(() => {
    if (!otherParticipantId) return;
    fetchUserProfileCached(otherParticipantId).then((data) => {
      if (data) {
        setOtherProfile(data as UserProfile);
      } else {
        setOtherProfile(null);
      }
    });
  }, [otherParticipantId]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordingDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const isRecordingRef = useRef(false);

  const startRecording = async () => {
    if (isRecordingRef.current) return;
    setIsRecording(true);
    isRecordingRef.current = true;
    setRecordingDuration(0);
    setRecordingStream(null);
    try {
      if (window.navigator?.vibrate) window.navigator.vibrate(50);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setRecordingStream(stream);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setRecordingStream(null);
        if (audioChunksRef.current.length === 0) return;
        
        let typeStr = mediaRecorder.mimeType || 'audio/webm';
        if (!typeStr.includes('audio')) typeStr = 'audio/mp4';

        const audioBlob = new Blob(audioChunksRef.current, { type: typeStr });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          if (base64Audio.length > 15 * 1024 * 1024) {
             alert("Note vocale trop longue ou trop volumineuse (maximum 15 Mo).");
             return;
          }
          await sendVoiceNote(base64Audio, recordingDuration);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      // Check if user lifted finger while starting
      if (!isRecordingRef.current) {
         setRecordingStream(null);
         stream.getTracks().forEach(track => track.stop());
         return;
      }

      mediaRecorder.start(200);
    } catch (err: any) {
      console.warn("Microphone access:", err?.message || String(err));
      setIsRecording(false);
      isRecordingRef.current = false;
      setRecordingStream(null);
      if (err.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
        alert("L'accès au microphone a été refusé. Veuillez l'autoriser pour envoyer des vocaux, ou ouvrir l'application dans un nouvel onglet.");
      } else {
        alert("Impossible d'accéder au microphone: " + (err.message || 'Erreur inconnue'));
      }
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    isRecordingRef.current = false;
    setRecordingStream(null);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      if (window.navigator?.vibrate) window.navigator.vibrate(20);
    }
  };

  const sendVoiceNote = async (audioUrl: string, durationInSeconds: number) => {
    if (!user) return;
    try {
      const convRef = doc(db, 'conversations', conversationId);
      const batch = writeBatch(db);
      const msgRef = doc(collection(convRef, 'messages'));
      
      let finalAudioUrl = audioUrl;
      const isBase64 = audioUrl?.startsWith('data:');
      if (isBase64) {
        try {
          finalAudioUrl = await uploadToSupabaseStorage('chat-media', audioUrl);
        } catch (uploadErr: any) {
          console.error("Failed uploading voice note to cloud storage, fallback to inline:", uploadErr);
        }
      }
      
      batch.set(msgRef, { 
        senderId: user.uid, 
        text: "Note vocale", 
        audioUrl: finalAudioUrl,
        duration: durationInSeconds || 1,
        createdAt: serverTimestamp() 
      });
      
      const receiverId = conv?.participantIds?.find(id => id !== user.uid);
      batch.update(convRef, { 
        lastMessage: "🎤 Note vocale", 
        lastSenderId: user.uid, 
        updatedAt: serverTimestamp(),
        unreadUserId: receiverId || null
      });

      // Notify recipient
      if (receiverId) {
        const notifRef = doc(collection(db, 'users', receiverId, 'notifications'));
        batch.set(notifRef, {
          type: 'message',
          title: `Message de ${user.displayName || 'TrocShop'}`,
          body: "🎤 Note vocale",
          toUserId: receiverId,
          fromUserId: user.uid,
          fromUserName: user.displayName,
          conversationId: conversationId,
          createdAt: serverTimestamp(),
          read: false
        });
      }
      
      await batch.commit();
    } catch (e: any) {
      console.error("Voice note error:", e?.message || String(e));
      alert("Erreur lors de l'envoi de la note vocale. Le fichier est peut-être trop volumineux.");
      handleFirestoreError(e, OperationType.WRITE, `messages`);
    }
  };

  useEffect(() => {
    const cacheKeyMessages = `messages_${conversationId}`;
    const cacheKeyConv = `conv_${conversationId}`;

    if (globalDataCache[cacheKeyMessages] !== undefined) {
      setMessages(globalDataCache[cacheKeyMessages]);
    }
    if (globalDataCache[cacheKeyConv] !== undefined) {
      setConv(globalDataCache[cacheKeyConv]);
    }

    // Retrieve the 50 most recent messages and reverse them in-memory for chronological UI presentation
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    let debounceTimeout: any = null;
    let debounceConvTimeout: any = null;

    const unsubMessages = onSnapshot(q, (snap) => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      
      debounceTimeout = setTimeout(() => {
        const reversedDocs = [...snap.docs].reverse();
        const newMessages = reversedDocs.map(d => ({ id: d.id, ...d.data() } as Message));
        const previousCount = prevMessagesCountRef.current;
        globalDataCache[cacheKeyMessages] = newMessages;
        setMessages(newMessages);
        
        // Auto-scroll on initial load or if a new message is received.
        if (previousCount === 0 || newMessages.length > previousCount) {
          setTimeout(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }, 100);
        }
        
        prevMessagesCountRef.current = newMessages.length;
      }, 500);
    }, (e) => handleFirestoreError(e, OperationType.GET, `conversations/${conversationId}/messages`));

    const unsubConv = onSnapshot(doc(db, 'conversations', conversationId), (d) => {
      if (debounceConvTimeout) {
        clearTimeout(debounceConvTimeout);
      }
      
      debounceConvTimeout = setTimeout(() => {
        if (d.exists()) {
          const convData = { id: d.id, ...d.data() } as Conversation;
          globalDataCache[cacheKeyConv] = convData;
          setConv(convData);
        }
      }, 500);
    }, (e) => handleFirestoreError(e, OperationType.GET, `conversations/${conversationId}`));

    return () => { 
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      if (debounceConvTimeout) {
        clearTimeout(debounceConvTimeout);
      }
      unsubMessages(); 
      unsubConv(); 
    };
  }, [conversationId, user?.uid]);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    const text = newMessage.trim();
    setNewMessage('');
    setShowEmojiPicker(false);
    
    try {
      const convRef = doc(db, 'conversations', conversationId);
      
      // Verification before batch to avoid silent failure if conv missing
      const convSnap = await getDoc(convRef);
      if (!convSnap.exists()) {
          console.warn("Conversation document is missing! Attempting to recreate...");
          throw new Error("Conversation non trouvée. Veuillez relancer la discussion.");
      }

      const batch = writeBatch(db);
      const msgRef = doc(collection(convRef, 'messages'));
      
      const messageData: any = { 
        senderId: user.uid, 
        text, 
        createdAt: serverTimestamp() 
      };

      if (replyingTo) {
        messageData.replyTo = {
          id: replyingTo.id,
          text: replyingTo.text,
          senderId: replyingTo.senderId
        };
        setReplyingTo(null);
      }

      const receiverId = convSnap.data()?.participantIds?.find((id: string) => id !== user.uid);
      batch.set(msgRef, messageData);
      batch.update(convRef, { 
        lastMessage: text, 
        lastSenderId: user.uid, 
        updatedAt: serverTimestamp(),
        unreadUserId: receiverId || null
      });

      // Notify recipient
      if (receiverId) {
        const notifRef = doc(collection(db, 'users', receiverId, 'notifications'));
        batch.set(notifRef, {
          type: 'message',
          title: `Message de ${user.displayName || 'TrocShop'}`,
          body: text,
          toUserId: receiverId,
          fromUserId: user.uid,
          fromUserName: user.displayName,
          conversationId: conversationId,
          createdAt: serverTimestamp(),
          read: false
        });
      }
      
      await batch.commit();
    } catch (err: any) {
      console.error("Plus d'infos sur l'erreur d'envoi:", err?.message || String(err));
      alert("Impossible d'envoyer le message. Vérifiez votre connexion.");
      setNewMessage(text);
    }
  };

  const handleReact = async (msg: Message, emoji: string) => {
    if (!user) return;
    const msgRef = doc(db, 'conversations', conversationId, 'messages', msg.id);
    const currentReactions = msg.reactions || {};
    const uids = currentReactions[emoji] || [];
    
    let newUids;
    if (uids.includes(user.uid)) {
      newUids = uids.filter(id => id !== user.uid);
    } else {
      newUids = [...uids, user.uid];
    }

    await updateDoc(msgRef, {
      [`reactions.${emoji}`]: newUids
    }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `messages/${msg.id}`));
  };

  const handleShareNumber = async () => {
    if (!user || !profile) return;
    try {
      const text = `Mon numéro de téléphone est : +225 ${profile.phoneNumber}`;
      const convRef = doc(db, 'conversations', conversationId);
      const batch = writeBatch(db);
      const msgRef = doc(collection(convRef, 'messages'));
      
      batch.set(msgRef, { 
        senderId: user.uid, 
        text, 
        createdAt: serverTimestamp(),
        isSystem: true
      });
      
      const receiverId = conv?.participantIds?.find(id => id !== user.uid);
      batch.update(convRef, { 
        lastMessage: "Numéro partagé", 
        lastSenderId: user.uid, 
        updatedAt: serverTimestamp(),
        unreadUserId: receiverId || null
      });
      
      // Notify recipient
      if (receiverId) {
        const notifRef = doc(collection(db, 'users', receiverId, 'notifications'));
        batch.set(notifRef, {
          type: 'message',
          title: `Message de ${user.displayName || 'TrocShop'}`,
          body: "📞 Numéro partagé",
          toUserId: receiverId,
          fromUserId: user.uid,
          fromUserName: user.displayName,
          conversationId: conversationId,
          createdAt: serverTimestamp(),
          read: false
        });
      }
      
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `messages`);
    }
  };

  const otherName = conv?.participantNames?.find(n => n !== user?.displayName) || conv?.participantIds?.find(id => id !== user?.uid)?.slice(0, 8) || "Discuter";

  return (
    <motion.div 
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        overflow: 'hidden',
        position: 'fixed',
        inset: 0
      }}
      className="z-[200] bg-zinc-50"
    >
      <header className="absolute top-0 left-0 right-0 z-50 p-4 pt-safe pb-2 bg-transparent pointer-events-none">
        <div className="max-w-xl mx-auto space-y-2">
          {/* Top Bubble - Navigation and User with glassmorphism style */}
          <div className="bg-white/45 backdrop-blur-[35px] backdrop-saturate-[180%] border border-white/60 rounded-[2rem] px-4 h-20 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.04)] pointer-events-auto">
            <div className="flex items-center gap-3.5 w-full">
              <button 
                onClick={onBack} 
                className="w-11 h-11 text-zinc-950 flex items-center justify-center active:scale-90 transition-all font-black bg-white border border-zinc-150 rounded-full shrink-0 shadow-sm cursor-pointer"
              >
                <ChevronLeft size={20} className="stroke-[3] inline-block -ml-0.5" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-100/65 flex items-center justify-center text-orange-600 font-extrabold italic shadow-sm overflow-hidden border border-orange-200/50 shrink-0 select-none">
                  {otherProfile?.photoURL ? (
                    <img src={otherProfile.photoURL} className="w-full h-full object-cover" alt={otherName} referrerPolicy="no-referrer" />
                  ) : (
                    otherName?.[0] || 'T'
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 font-sans">
                    <h3 className="font-extrabold uppercase tracking-tight text-sm leading-none text-zinc-800 truncate max-w-[160px]">
                      {otherName}
                    </h3>
                    {(() => {
                      const isOtherCertified = (otherProfile?.is_certified as any) === true || (otherProfile?.is_certified as any) === 'vrai' || (otherProfile?.isCertified as any) === true || (otherProfile?.isCertified as any) === 'vrai' || (otherProfile?.['is certified'] as any) === true || (otherProfile?.['is certified'] as any) === 'vrai';
                      const isOtherPartner = isPartnerUser(otherProfile);
                      return (
                        <>
                          {isOtherPartner && (
                            <Shield size={14} className="text-emerald-600 fill-emerald-600 shrink-0" />
                          )}
                          {isOtherCertified && (
                            <BadgeCheck size={14} className="text-orange-600 fill-orange-600 text-white shrink-0" />
                          )}
                          {otherProfile?.isStudent && (
                            <span className="shrink-0 p-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full flex items-center justify-center" title={`Étudiant à ${otherProfile.studentSchool || ''}`}>
                              <GraduationCap size={12} className="text-blue-600" />
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div className="mt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {conv?.updatedAt?.seconds 
                        ? new Date(conv.updatedAt.seconds * 1000).toLocaleTimeString([], 
                            { hour: '2-digit', minute: '2-digit' }) 
                        : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bubble - Product Info with same glassmorphism style */}
          {conv?.productTitle && conv?.productId !== 'spotlight' && (
            <motion.div 
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex justify-center"
            >
              <div className="bg-white/45 backdrop-blur-[35px] border border-white/60 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-all cursor-pointer pointer-events-auto hover:bg-white/55">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 overflow-hidden shrink-0 border border-zinc-150 shadow-inner">
                  {conv.productImage ? (
                    <img src={conv.productImage} className="w-full h-full object-cover" alt={conv.productTitle} />
                  ) : (
                    <div className="w-full h-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">TS</div>
                  )}
                </div>
                <div className="flex flex-col">
                  <h4 className="font-bold text-xs text-zinc-500 leading-none">{conv.productTitle}</h4>
                  <p className="text-sm font-black text-orange-600 mt-1 leading-none uppercase">
                    {formatPrice(conv.productPrice || 0)} FCFA
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative flex flex-col bg-transparent">

        <div 
          ref={scrollRef} 
          style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}
          className={cn(
            "px-4 pb-32 space-y-4 no-scrollbar relative z-10 transition-all duration-300",
            (conv?.productTitle && conv?.productId !== 'spotlight') ? "pt-48 md:pt-40" : "pt-28 md:pt-24"
          )}
        >
          <div className="pb-10 pt-4 flex flex-col gap-4">
            {messages.map((m) => (
              <MessageBubble 
                key={m.id} 
                message={m} 
                isMe={m.senderId === user?.uid} 
                products={products} 
                onReply={setReplyingTo}
                onReact={handleReact}
                user={user}
                onPreviewImage={onPreviewImage}
              />
            ))}
            
            {messages.length === 0 && (
              <div className="py-20 text-center opacity-10 select-none">
                <MessageCircle className="w-16 h-16 mx-auto mb-4" strokeWidth={1} />
                <p className="font-black uppercase tracking-[0.2em] text-[10px]">Démarrez la conversation</p>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div 
          style={{ flexShrink: 0 }}
          className="sticky bottom-0 flex-none p-4 bg-white border-t border-zinc-100 z-50"
        >
          <AnimatePresence>
            {isRecording && (
              <motion.div 
                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.9 }}
                className="absolute bottom-full left-4 right-4 mb-4 mx-auto max-w-sm bg-gradient-to-r from-red-500 to-rose-600 text-white px-5 py-3 rounded-[2rem] shadow-2xl shadow-red-500/30 flex items-center justify-between border border-white/10 backdrop-blur-xl z-[70] select-none"
              >
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                  </span>
                  <span className="font-extrabold uppercase tracking-widest text-[9px] leading-none shrink-0">REC</span>
                </div>
                
                {/* Visual Real-time Waveform */}
                <div className="mx-2 flex-1 flex justify-center">
                  <LocalRecordingWaveform stream={recordingStream} />
                </div>

                <div className="text-[10px] font-black italic tabular-nums bg-white/20 px-2.5 py-1 rounded-full border border-white/10 shrink-0">
                  {formatTime(recordingDuration)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="max-w-3xl mx-auto space-y-4">
            {!isInputFocused && (
              <div className="flex gap-2 pb-2">
                <button 
                  onClick={handleShareNumber}
                  className="flex-1 h-10 bg-zinc-100 text-zinc-650 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Phone size={12} /> Numéro
                </button>
              </div>
            )}
            
            {replyingTo && (
              <div className="flex items-center justify-between bg-zinc-100 p-3 rounded-2xl text-[10px] text-zinc-500 font-bold mb-2">
                 <span className="truncate">Réponse à : {replyingTo.text}</span>
                 <button onClick={() => setReplyingTo(null)} className="p-1 cursor-pointer"><X size={12} /></button>
              </div>
            )}

            <div className="relative group">
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-4 bg-white rounded-[2rem] shadow-2xl border border-zinc-100 p-4 grid grid-cols-6 gap-2 w-72 z-50 origin-bottom-left"
                  >
                    {Array.from(new Set(COMMON_EMOJIS.concat(["👍", "👎", "😊", "😂", "🥰", "😎", "🤔", "🙌", "💀", "👀", "🔥", "💯"]))).map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setNewMessage(prev => prev + emoji);
                        }}
                        className="text-2xl hover:scale-125 transition-transform active:scale-95 cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isRecording && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1.5 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="absolute inset-0 bg-red-600/20 rounded-full animate-ping pointer-events-none"
                  />
                )}
              </AnimatePresence>

              <div className="flex items-end gap-2 w-full">
                {/* Boutons distincts pour Emojis et Images */}
                <div className="flex items-center gap-1.5 shrink-0 select-none pb-0.5">
                  <button 
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowEmojiPicker(!showEmojiPicker);
                    }}
                    className={cn(
                      "w-11 h-11 flex items-center justify-center rounded-2xl transition-all cursor-pointer shadow-sm border", 
                      showEmojiPicker 
                        ? "bg-orange-600 border-orange-600 text-white" 
                        : "bg-white border-zinc-200/65 text-zinc-500 hover:text-orange-600 hover:bg-zinc-50"
                    )}
                  >
                    <Smile size={20} />
                  </button>

                  <label className="w-11 h-11 flex items-center justify-center rounded-2xl transition-all text-zinc-500 bg-white border border-zinc-200/65 hover:text-orange-600 hover:bg-zinc-50 cursor-pointer shadow-sm">
                    <input 
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        // Compress image using canvas
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const img = new Image();
                          img.onload = async () => {
                            const canvas = document.createElement('canvas');
                            const MAX_WIDTH = 800;
                            const MAX_HEIGHT = 800;
                            let width = img.width;
                            let height = img.height;
                            
                            if (width > height) {
                              if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                              }
                            } else {
                              if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                              }
                            }
                            
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx?.drawImage(img, 0, 0, width, height);
                            
                            const base64Image = canvas.toDataURL('image/jpeg', 0.6); // Compress to 60% quality jpeg
                            
                            if (base64Image.length > 800 * 1024) {
                              alert("L'image compressée est encore trop volumineuse. Essayez une autre.");
                              return;
                            }
                            
                            try {
                              const convRef = doc(db, 'conversations', conversationId);
                              const batch = writeBatch(db);
                              const msgRef = doc(collection(convRef, 'messages'));
                              
                              const messageData: any = { 
                                senderId: user!.uid, 
                                text: '📷 Photo', 
                                image: base64Image,
                                createdAt: serverTimestamp(),
                                isRead: false
                              };
                              
                              const receiverId = conv?.participantIds?.find(id => id !== user?.uid);
                              batch.set(msgRef, messageData);
                              batch.update(convRef, {
                                lastMessage: '📷 Photo',
                                lastSenderId: user!.uid,
                                updatedAt: serverTimestamp(),
                                unreadUserId: receiverId || null
                              });
                              
                              if (receiverId) {
                                const notifRef = doc(collection(db, 'users', receiverId, 'notifications'));
                                batch.set(notifRef, {
                                  type: 'message',
                                  title: `Message de ${user?.displayName || 'TrocShop'}`,
                                  body: '📷 Photo',
                                  toUserId: receiverId,
                                  fromUserId: user!.uid,
                                  fromUserName: user?.displayName,
                                  conversationId: conversationId,
                                  createdAt: serverTimestamp(),
                                  read: false
                                });
                              }
                              
                              await batch.commit();
                            } catch (err: any) {
                              console.error("Upload error:", err.message);
                              alert("Impossible d'envoyer l'image. " + err.message);
                            }
                          };
                          img.src = reader.result as string;
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <ImageIcon size={20} />
                  </label>
                </div>

                {/* Formulaire contenant la zone de texte */}
                <form 
                  onSubmit={onSend} 
                  className={cn(
                    "flex-1 flex items-end gap-2 bg-zinc-100 rounded-3xl p-1.5 transition-all border border-transparent",
                    isInputFocused && "bg-white ring-4 ring-orange-500/10 border-orange-200"
                  )}
                >
                  <textarea 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onFocus={() => {
                      setIsInputFocused(true);
                      setShowEmojiPicker(false);
                    }}
                    onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        onSend(e as any);
                      }
                    }}
                    placeholder="Message..."
                    rows={1}
                    className="flex-1 bg-transparent border-none outline-none py-2 px-3 text-sm font-medium resize-none min-h-[38px] max-h-24 overflow-y-auto"
                    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.25rem' }}
                  />
                  
                  <div className="flex items-center gap-1 shrink-0 pb-0.5">
                    {!newMessage.trim() ? (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          if (isRecording) {
                            stopRecording();
                          } else {
                            startRecording();
                          }
                        }}
                        className={cn("w-10 h-10 flex items-center justify-center rounded-2xl transition-all cursor-pointer", isRecording ? "bg-red-500 text-white scale-110 shadow-lg shadow-red-500/20 animate-pulse" : "text-zinc-400 hover:text-orange-600")}
                      >
                        <Mic size={20} />
                      </button>
                    ) : (
                      <button 
                        type="submit"
                        className="w-10 h-10 bg-orange-600 text-white flex items-center justify-center rounded-2xl shadow-lg shadow-orange-600/20 active:scale-90 transition-all font-black cursor-pointer"
                      >
                        <Send size={18} />
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
  </motion.div>
  );
}
export default ChatWindow;
