import React, { useState, useEffect } from 'react';
import { Video, Upload, Trash2, Film, Loader2, CheckCircle, AlertCircle, MessageSquare, Clock } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { User } from '../lib/firebase';
import { fetchUserProfileCached } from '../lib/helpers';

interface SpotlightPublisherProps {
  user: User;
  mode?: 'publish' | 'manage'; // 'publish' = page publier, 'manage' = mes annonces
  onVideoPublished?: () => void;
}

interface SpotlightVideo {
  id: string;
  video_url: string;
  description: string;
  vendeur_nom: string;
  vendeur_avatar: string;
  vendeur_id: string;
  created_at?: string;
  expires_at?: string;
}

function formatDuration(sec: number): string {
  if (!sec || isNaN(sec)) return '0:00';
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function VideoCardItem({
  video,
  deletingId,
  onDelete,
}: {
  video: SpotlightVideo;
  deletingId: string | null;
  onDelete: (v: SpotlightVideo) => void;
}) {
  const [duration, setDuration] = useState<number | null>(null);

  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-2xl overflow-hidden flex flex-col justify-between group shadow-2xs hover:shadow-xs transition-shadow">
      <div className="relative aspect-[9/12] bg-black">
        <video
          src={video.video_url}
          controls
          preload="metadata"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          className="w-full h-full object-cover"
        />
        {duration !== null && (
          <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-black/75 backdrop-blur-md rounded-lg text-[10px] font-bold text-amber-300 flex items-center gap-1 border border-white/20 shadow-md pointer-events-none">
            <Clock size={11} className="text-orange-400" />
            <span>{formatDuration(duration)}</span>
          </div>
        )}
      </div>
      <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between bg-white">
        <p className="text-xs font-semibold text-zinc-800 line-clamp-2 leading-relaxed">
          {video.description}
        </p>
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
          <span className="text-[10px] text-zinc-400 font-semibold">
            {video.created_at
              ? new Date(video.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : ''}
          </span>
          <button
            type="button"
            disabled={deletingId === video.id}
            onClick={() => onDelete(video)}
            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 border border-rose-200 active:scale-95"
            title="Supprimer la vidéo"
          >
            {deletingId === video.id ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Trash2 size={12} />
            )}
            <span>Supprimer</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export const SpotlightPublisher: React.FC<SpotlightPublisherProps> = ({
  user,
  mode = 'publish',
  onVideoPublished,
}) => {
  const [canPublish, setCanPublish] = useState<boolean>(false);
  const [loadingEligibility, setLoadingEligibility] = useState<boolean>(true);

  const [myVideos, setMyVideos] = useState<SpotlightVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState<boolean>(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedVideoDuration, setUploadedVideoDuration] = useState<number | null>(null);
  const [description, setDescription] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<SpotlightVideo | null>(null);

  // 1. Check eligibility & load videos
  const checkEligibilityAndLoad = async () => {
    if (!user?.uid) {
      setLoadingEligibility(false);
      return;
    }
    setLoadingEligibility(true);

    try {
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('can_publish_video')
        .eq('id', user.uid)
        .maybeSingle();

      if (profileErr) {
        console.warn('Error checking video permission:', profileErr);
      }

      const isAllowed = profileData?.can_publish_video === true;
      setCanPublish(isAllowed);

      // If mode is 'manage', or if allowed in 'publish', fetch seller's videos
      if (mode === 'manage' || isAllowed) {
        fetchSellerVideos();
      }
    } catch (err) {
      console.error('Error verifying video publishing access:', err);
      setCanPublish(false);
    } finally {
      setLoadingEligibility(false);
    }
  };

  const fetchSellerVideos = async () => {
    if (!user?.uid) return;
    setLoadingVideos(true);
    try {
      const { data, error } = await supabase
        .from('spotlight')
        .select('*')
        .eq('vendeur_id', user.uid)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error loading seller videos:', error);
      } else {
        setMyVideos((data as SpotlightVideo[]) || []);
      }
    } catch (err) {
      console.error('Error fetching spotlight videos:', err);
    } finally {
      setLoadingVideos(false);
    }
  };

  useEffect(() => {
    checkEligibilityAndLoad();
  }, [user?.uid, mode]);

  // Handle video selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setErrorMessage('Veuillez sélectionner un fichier vidéo valide (MP4, MOV, WebM...).');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('La vidéo dépasse la taille maximale autorisée (50 Mo).');
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleClearFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadedVideoDuration(null);
  };

  // Submit Video
  const handlePublishVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Veuillez sélectionner une vidéo à publier.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Veuillez ajouter une courte description pour votre vidéo.');
      return;
    }

    setUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const userProfile = await fetchUserProfileCached(user.uid);
      const sellerName =
        userProfile?.displayName ||
        userProfile?.name ||
        user.displayName ||
        'Vendeur TrocShop';
      const sellerAvatar =
        userProfile?.photoURL ||
        userProfile?.photo_url ||
        userProfile?.avatar ||
        user.photoURL ||
        '';

      const fileExt = selectedFile.name.split('.').pop() || 'mp4';
      const fileName = `${user.uid}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from('spotlight-videos')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadErr) {
        console.error('Supabase storage upload error:', uploadErr);
        throw new Error(`Échec du téléversement : ${uploadErr.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from('spotlight-videos')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) {
        throw new Error("Impossible de récupérer l'URL publique de la vidéo.");
      }

      const { error: insertErr } = await supabase.from('spotlight').insert({
        video_url: publicUrl,
        description: description.trim(),
        vendeur_nom: sellerName,
        vendeur_avatar: sellerAvatar,
        vendeur_id: user.uid,
      });

      if (insertErr) {
        console.error('Supabase insert spotlight error:', insertErr);
        throw new Error(`Erreur lors de la sauvegarde : ${insertErr.message}`);
      }

      setSuccessMessage('Votre vidéo Shoplight a été publiée avec succès !');
      handleClearFile();
      setDescription('');

      fetchSellerVideos();

      if (onVideoPublished) {
        onVideoPublished();
      }
    } catch (err: any) {
      console.error('Error publishing spotlight video:', err);
      setErrorMessage(err?.message || 'Une erreur est survenue lors de la publication de la vidéo.');
    } finally {
      setUploading(false);
    }
  };

  // Delete Video
  const handleDeleteVideo = async (videoId: string, videoUrl: string) => {
    setDeletingId(videoId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let deleteQuery = supabase.from('spotlight').delete().eq('id', videoId);
      if (user?.uid) {
        deleteQuery = deleteQuery.eq('vendeur_id', user.uid);
      }
      const { error: deleteErr } = await deleteQuery;

      if (deleteErr) {
        console.error('Supabase spotlight delete error:', deleteErr);
        throw new Error(deleteErr.message || 'Erreur lors de la suppression.');
      }

      try {
        if (videoUrl && videoUrl.includes('spotlight-videos/')) {
          const path = videoUrl.split('spotlight-videos/').pop()?.split('?')[0];
          if (path) {
            await supabase.storage.from('spotlight-videos').remove([path]);
          }
        }
      } catch (stErr) {
        console.warn('Storage file deletion silent warning:', stErr);
      }

      setMyVideos((prev) => prev.filter((v) => v.id !== videoId));
      setSuccessMessage('La vidéo a été supprimée avec succès.');
    } catch (err: any) {
      console.error('Error deleting video:', err);
      setErrorMessage(
        'Impossible de supprimer la vidéo : ' +
          (err?.message || 'Vérifiez les permissions de la base de données Supabase.')
      );
    } finally {
      setDeletingId(null);
      setVideoToDelete(null);
    }
  };

  // ---------------------------------------------------------------------------
  // MODE "MANAGE" (USED IN "MES ANNONCES")
  // ---------------------------------------------------------------------------
  if (mode === 'manage') {
    return (
      <div className="bg-white border border-zinc-200/90 rounded-[2.2rem] p-5 sm:p-7 space-y-6 shadow-xs">
        <div className="flex items-center gap-3.5 border-b border-zinc-100 pb-5">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Film size={22} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-zinc-900 uppercase italic">
              Vos Vidéos Publiées
            </h3>
            <p className="text-xs text-zinc-500 font-medium mt-0.5">
              Gérez les vidéos actuellement visibles par la communauté TrocShop
            </p>
          </div>
        </div>

        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-3">
            <CheckCircle size={18} className="shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {loadingVideos ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 size={28} className="animate-spin text-orange-500" />
            <p className="text-xs font-bold text-zinc-400">Chargement de vos vidéos...</p>
          </div>
        ) : myVideos.length === 0 ? (
          <div className="py-12 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 p-6 space-y-2">
            <Video size={36} className="mx-auto text-zinc-400" />
            <p className="text-sm font-black text-zinc-800">Aucune vidéo publiée</p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Vous n'avez publié aucune vidéo pour le moment. Rendez-vous dans la section "Publier" pour poster votre première vidéo Shoplight.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myVideos.map((video) => (
              <VideoCardItem
                key={video.id}
                video={video}
                deletingId={deletingId}
                onDelete={(v) => setVideoToDelete(v)}
              />
            ))}
          </div>
        )}

        {/* Modal de confirmation de suppression */}
        {videoToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 border border-zinc-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 size={24} />
              </div>

              <div className="text-center space-y-1">
                <h4 className="text-base font-black text-zinc-900">
                  Supprimer cette vidéo ?
                </h4>
                <p className="text-xs text-zinc-500 font-medium">
                  Cette action est définitive et retirera la vidéo du fil d'actualité TrocShop.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setVideoToDelete(null)}
                  disabled={Boolean(deletingId)}
                  className="flex-1 py-3 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={Boolean(deletingId)}
                  onClick={() => handleDeleteVideo(videoToDelete.id, videoToDelete.video_url)}
                  className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md"
                >
                  {deletingId === videoToDelete.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <span>Supprimer</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MODE "PUBLISH" (USED IN "PAGE PUBLIER")
  // ---------------------------------------------------------------------------

  if (loadingEligibility) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-3 bg-white rounded-[2rem] border border-zinc-200 p-6">
        <Loader2 size={28} className="animate-spin text-orange-500" />
        <p className="text-xs font-bold text-zinc-400">Vérification des droits de publication vidéo...</p>
      </div>
    );
  }

  // Unauthorized State (Sad Emoji + WhatsApp contact)
  if (!canPublish) {
    const whatsappMsg = encodeURIComponent(
      "Bonjour TrocShop, je souhaite activer la publication de vidéos Shoplight sur mon compte."
    );
    const whatsappUrl = `https://wa.me/2250160232164?text=${whatsappMsg}`;

    return (
      <div className="bg-white border border-zinc-200/90 rounded-[2.2rem] p-6 sm:p-8 space-y-6 shadow-xs text-center">
        <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto text-4xl shadow-xs">
          😢
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <h3 className="text-xl font-black text-zinc-900 tracking-tight">
            Accès aux vidéos non activé
          </h3>
          <p className="text-xs sm:text-sm font-semibold text-zinc-500 leading-relaxed">
            Vous n'avez pas encore l'autorisation de publier des vidéos sur la plateforme. Pour avoir le droit de publier, veuillez contacter l'équipe.
          </p>
        </div>

        <div className="pt-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            <MessageSquare size={18} />
            <span>Contacter l'équipe</span>
          </a>
        </div>
      </div>
    );
  }

  // Authorized State (Show Upload Form)
  return (
    <div className="bg-white border border-zinc-200/90 rounded-[2.2rem] p-5 sm:p-7 space-y-6 shadow-xs">
      <div className="flex items-center gap-3.5 border-b border-zinc-100 pb-5">
        <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-600/20">
          <Video size={22} />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-black tracking-tight text-zinc-900 uppercase italic">
            Publier une vidéo Shoplight
          </h3>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">
            Postez un format court pour présenter vos articles en vidéo sur Shoplight
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-3">
          <CheckCircle size={18} className="shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handlePublishVideo} className="bg-zinc-50 border border-zinc-200 rounded-[2rem] p-4 sm:p-6 space-y-5">
        <div className="space-y-2">
          <label className="block text-xs font-black uppercase tracking-wider text-zinc-700">
            Fichier vidéo (MP4, WebM, MOV)
          </label>

          {!selectedFile ? (
            <label className="border-2 border-dashed border-zinc-300 hover:border-orange-500 bg-white rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
              <div className="w-12 h-12 bg-zinc-100 group-hover:bg-orange-50 text-zinc-500 group-hover:text-orange-600 rounded-2xl flex items-center justify-center transition-all mb-3">
                <Upload size={22} />
              </div>
              <p className="text-xs font-bold text-zinc-800">Sélectionner un fichier vidéo</p>
              <p className="text-[11px] text-zinc-400 mt-1">Format portrait recommandé (Max 50 Mo)</p>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          ) : (
            <div className="relative bg-black rounded-2xl overflow-hidden border border-zinc-200 p-2 space-y-3">
              {previewUrl && (
                <div className="relative">
                  <video
                    src={previewUrl}
                    controls
                    onLoadedMetadata={(e) => setUploadedVideoDuration(e.currentTarget.duration)}
                    className="w-full max-h-[280px] object-contain rounded-xl bg-black"
                  />
                  {uploadedVideoDuration !== null && (
                    <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-lg text-amber-300 text-xs font-bold flex items-center gap-1.5 border border-white/20 shadow-md">
                      <Clock size={12} className="text-orange-400" />
                      <span>Durée : {formatDuration(uploadedVideoDuration)}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1 bg-zinc-900 text-white rounded-xl">
                <span className="text-xs font-medium truncate max-w-[220px]">
                  {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} Mo)
                </span>
                <button
                  type="button"
                  onClick={handleClearFile}
                  className="text-xs font-bold text-rose-400 hover:text-rose-300 px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg transition-colors cursor-pointer"
                >
                  Changer
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-black uppercase tracking-wider text-zinc-700">
            Description de la vidéo
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Présentation de mes articles disponibles en boutique..."
            rows={3}
            className="w-full p-4 bg-white border border-zinc-200 rounded-2xl text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all resize-none"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className="w-full sm:w-auto px-8 py-3.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-95"
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Publication en cours...</span>
              </>
            ) : (
              <>
                <Video size={16} />
                <span>Publier la vidéo</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SpotlightPublisher;
