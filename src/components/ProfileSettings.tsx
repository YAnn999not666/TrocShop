import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Camera, ChevronDown, Check, GraduationCap } from 'lucide-react';
import { auth } from '../lib/firebase';
import { uploadImageToCloudinary, safeAlert, CAMPUS_SCHOOLS } from '../lib/helpers';
import { Button } from './ui/Button';
import { CustomDropdown } from './ui/CustomDropdown';
import { NEIGHBORHOODS } from '../constants';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';

interface ProfileSettingsProps {
  profile: UserProfile;
  onSave: (data: Partial<UserProfile>) => void;
  onBack: () => void;
}

export const ProfileSettings = ({ profile, onSave, onBack }: ProfileSettingsProps) => {
  const [data, setData] = useState({
    displayName: profile.displayName || '',
    bio: profile.bio || '',
    phoneNumber: profile.phoneNumber || '',
    neighborhood: profile.neighborhood || '',
    city: profile.city || 'Yamoussoukro',
    phoneVisibility: profile.phoneVisibility || 'public',
    photoURL: profile.photoURL || '',
    coverURL: profile.coverURL || '',
    isStudent: profile.isStudent || false,
    studentSchool: profile.studentSchool || CAMPUS_SCHOOLS[0]
  });
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleImageUpload = (type: 'photo' | 'cover', file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const isCover = type === 'cover';
        const MAX_WIDTH = isCover ? 1200 : 400;
        const MAX_HEIGHT = isCover ? 400 : 400;
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
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
        }
        ctx?.drawImage(img, 0, 0, width, height);
        
        const quality = isCover ? 0.70 : 0.75;
        const base64Image = canvas.toDataURL('image/jpeg', quality);
        if (type === 'photo') {
          setData(prev => ({ ...prev, photoURL: base64Image }));
        } else {
          setData(prev => ({ ...prev, coverURL: base64Image }));
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setLoading(true);
    const userId = auth.currentUser?.uid;
    if (!userId) {
      alert("Vous n'êtes pas connecté.");
      setLoading(false);
      return;
    }

    if (data.phoneNumber) {
      const digitsOnly = data.phoneNumber.replace(/[^\d]/g, '');
      if (digitsOnly.length !== 10) {
        alert("Le numéro de téléphone doit comporter obligatoirement 10 chiffres !");
        setLoading(false);
        return;
      }
    }

    try {
      let finalPhotoURL = data.photoURL;
      let finalCoverURL = data.coverURL;

      if (data.photoURL?.startsWith('data:')) {
        try {
          finalPhotoURL = await uploadImageToCloudinary(data.photoURL);
        } catch (photoErr) {
          console.error("Photo upload failed:", photoErr);
          safeAlert("Erreur lors de l'upload des photos. Vérifiez votre connexion.");
          setLoading(false);
          return;
        }
      }

      if (data.coverURL?.startsWith('data:')) {
        try {
          finalCoverURL = await uploadImageToCloudinary(data.coverURL);
        } catch (coverErr) {
          console.error("Cover upload failed:", coverErr);
          safeAlert("Erreur lors de l'upload des photos. Vérifiez votre connexion.");
          setLoading(false);
          return;
        }
      }

      let updatedBadges = [...(profile.badges || [])];
      if (data.isStudent) {
        if (!updatedBadges.includes('🎓 Étudiant')) {
          updatedBadges.push('🎓 Étudiant');
        }
      } else {
        updatedBadges = updatedBadges.filter(b => b !== '🎓 Étudiant');
      }

      const finalData = {
        ...data,
        photoURL: finalPhotoURL,
        coverURL: finalCoverURL,
        badges: updatedBadges
      };
      await onSave(finalData);
      onBack();
    } catch (err) {
      console.error("Global Profile save failed:", err);
      safeAlert("Erreur lors de l'enregistrement du profil. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-white border border-zinc-100 rounded-2xl shadow-sm cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-black uppercase tracking-tighter">PARAMÈTRES</h2>
      </header>

      {/* Cover and Profile Upload Cards */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-zinc-100 shadow-xl space-y-6">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1 block mb-2">PHOTOS DU PROFIL</label>
          
          {/* Cover Photo Upload */}
          <div className="relative h-32 bg-zinc-100 rounded-2xl overflow-hidden group border border-zinc-200 shadow-inner flex items-center justify-center">
            {data.coverURL ? (
              <img src={data.coverURL} className="w-full h-full object-cover" alt="Couverture" />
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-400 gap-1.5 p-4 text-center">
                <Camera size={20} className="text-zinc-400" />
                <span className="text-[8px] font-black uppercase tracking-widest">Photo de couverture</span>
              </div>
            )}
            <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-[9px] uppercase font-black tracking-widest gap-2">
              <Camera size={14} />
              Importer la couverture
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload('cover', file);
                }}
              />
            </label>
          </div>

          {/* Profile Photo Upload */}
          <div className="flex justify-center -mt-12 relative z-10">
            <div className="relative w-24 h-24 rounded-[1.8rem] bg-orange-100 border-4 border-white shadow-xl overflow-hidden group flex items-center justify-center">
              {data.photoURL ? (
                <img src={data.photoURL} className="w-full h-full object-cover" alt="Profil" />
              ) : (
                <span className="text-orange-600 text-3xl font-black italic">{profile?.displayName?.[0] || 'U'}</span>
              )}
              <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-[8px] uppercase font-black tracking-widest gap-1 p-2 text-center leading-none">
                <Camera size={12} />
                <span>Modifier photo</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload('photo', file);
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Nom d'affichage</label>
          <input 
            type="text" 
            value={data.displayName} 
            onChange={e => setData({...data, displayName: e.target.value})}
            className="w-full p-4 rounded-2xl bg-zinc-50 border-none outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Bio</label>
          <textarea 
            value={data.bio} 
            onChange={e => setData({...data, bio: e.target.value})}
            className="w-full p-4 rounded-2xl bg-zinc-50 border-none outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium min-h-[100px]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Téléphone</label>
          <input 
            type="tel" 
            value={data.phoneNumber} 
            onChange={e => setData({...data, phoneNumber: e.target.value})}
            className="w-full p-4 rounded-2xl bg-zinc-50 border-none outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium"
          />
        </div>

        <div className="space-y-1.5 opacity-50">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Ville</label>
          <div className="w-full p-4 rounded-2xl bg-zinc-100 border-none text-sm font-bold text-zinc-700">
            Yamoussoukro
          </div>
        </div>

        <div className="space-y-1.5 relative">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Quartier</label>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full p-4 rounded-2xl bg-zinc-50 border border-transparent outline-none text-sm font-semibold flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-orange-500/20"
          >
            <span className={data.neighborhood ? "text-zinc-900" : "text-zinc-400"}>
              {data.neighborhood || "Sélectionnez un quartier"}
            </span>
            <ChevronDown size={16} className={`text-zinc-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>
          
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-[110] left-0 right-0 mt-2 bg-white rounded-2xl border border-zinc-100 shadow-2xl max-h-60 overflow-y-auto p-2 space-y-1"
              >
                <button
                  type="button"
                  onClick={() => {
                    setData({...data, neighborhood: ''});
                    setIsDropdownOpen(false);
                  }}
                  className="w-full text-left p-3 rounded-xl hover:bg-zinc-50 text-xs font-bold text-zinc-400 transition-colors"
                >
                  Aucun quartier
                </button>
                {NEIGHBORHOODS.map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                       setData({...data, neighborhood: q});
                       setIsDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-xl text-xs font-black transition-colors flex items-center justify-between",
                      data.neighborhood === q ? "bg-orange-50 text-orange-600" : "hover:bg-zinc-50 text-zinc-700"
                    )}
                  >
                    <span>{q}</span>
                    {data.neighborhood === q && <Check size={14} className="text-orange-600" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Toggle statut étudiant */}
        <div className="p-5 bg-zinc-50 rounded-3xl border border-zinc-100/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                data.isStudent ? "bg-orange-100 text-orange-600" : "bg-zinc-100 text-zinc-400"
              )}>
                <GraduationCap size={20} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-zinc-900 leading-tight">Statut Étudiant</p>
                <p className="text-[10px] text-zinc-400 font-bold">Activer le badge et l'espace Campus</p>
              </div>
            </div>
            
            <button 
              type="button"
              onClick={() => {
                setData(prev => ({ ...prev, isStudent: !prev.isStudent }));
              }}
              className={cn(
                "w-12 h-6 rounded-full p-1 transition-all duration-300 cursor-pointer",
                data.isStudent ? "bg-orange-600" : "bg-zinc-200"
              )}
            >
              <motion.div 
                animate={{ x: data.isStudent ? 24 : 0 }}
                className="w-4 h-4 bg-white rounded-full shadow-sm"
              />
            </button>
          </div>

          <AnimatePresence>
            {data.isStudent && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-1.5 pt-1 overflow-visible"
              >
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Sélectionne ton école</label>
                <CustomDropdown
                  value={data.studentSchool}
                  options={CAMPUS_SCHOOLS}
                  onChange={val => setData(prev => ({ ...prev, studentSchool: val }))}
                  placeholder="Sélectionne ton école"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pt-4 space-y-4">
           {loading ? (
             <div className="flex justify-center p-4">
               <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
             </div>
           ) : (
             <Button variant="primary" className="w-full py-4 uppercase font-black tracking-widest rounded-2xl shadow-orange-600/20" onClick={handleSubmit}>
               Sauvegarder
             </Button>
           )}
        </div>
      </div>
    </div>
  );
};
export default ProfileSettings;
