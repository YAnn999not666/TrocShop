import React, { useState, useRef, useEffect } from 'react';
import { Camera, PlusCircle, Check, MapPin, Clock, AlertTriangle, HelpCircle, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { CustomDropdown } from './ui/CustomDropdown';
import { NEIGHBORHOODS } from '../constants';
import { 
  db, 
  collection, 
  addDoc, 
  doc,
  updateDoc,
  serverTimestamp, 
  uploadToSupabaseStorage,
  User
} from '../lib/firebase';

interface SellServiceFormProps {
  user: User | null;
  onComplete: () => void;
  initialService?: any;
}

export function SellServiceForm({ user, onComplete, initialService }: SellServiceFormProps) {
  const [serviceType, setServiceType] = useState<'car' | 'house'>(initialService ? initialService.serviceType : 'house');
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  
  // House rental specific states
  const [title, setTitle] = useState(initialService ? initialService.title : '');
  const [price, setPrice] = useState(initialService ? initialService.price.toString() : '');
  const [pricePeriod, setPricePeriod] = useState<'day' | 'month'>(initialService ? initialService.pricePeriod : 'month');
  
  const [neighborhood, setNeighborhood] = useState(() => {
    if (initialService) {
      if (initialService.customLocation) {
        return "Saisir un autre lieu (Personnalisé)";
      }
      return initialService.neighborhood;
    }
    return NEIGHBORHOODS[0];
  });
  const [isCustomLocation, setIsCustomLocation] = useState(!!(initialService && initialService.customLocation));
  const [customLocation, setCustomLocation] = useState(initialService?.customLocation || '');
  const [description, setDescription] = useState(initialService ? initialService.description : '');
  
  // Image states
  const [imagePreviews, setImagePreviews] = useState<string[]>(initialService ? initialService.images : []);
  const [compressing, setCompressing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [publishStatus, setPublishStatus] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // When neighborhood changes, if they select a custom one or we want to toggle custom option
  const dropdownOptions = [...NEIGHBORHOODS, "Saisir un autre lieu (Personnalisé)"];

  const handleNeighborhoodChange = (value: string) => {
    setNeighborhood(value);
    if (value === "Saisir un autre lieu (Personnalisé)") {
      setIsCustomLocation(true);
    } else {
      setIsCustomLocation(false);
    }
  };

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
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
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
        }
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.70));
      };
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    if (imagePreviews.length + files.length > 10) {
      alert("La publication d'une location de maison requiert au maximum 10 photos. Pas plus de 10 photos.");
      return;
    }

    setCompressing(true);
    try {
      const newPreviews: string[] = [];
      for (const file of files) {
        const reader = new FileReader();
        const p = new Promise<string>((resolve, reject) => {
          reader.onloadend = async () => {
            try {
              const compressed = await compressImage(reader.result as string);
              resolve(compressed);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error("Lecture fichier échouée"));
          reader.readAsDataURL(file);
        });
        const result = await p;
        newPreviews.push(result);
      }
      setImagePreviews(prev => [...prev, ...newPreviews]);
    } catch (err: any) {
      console.error("Erreur traitement image:", err?.message || String(err));
      alert("Désolé, impossible de traiter cette image. Elle est peut-être trop lourde.");
    } finally {
      setCompressing(false);
      if (e.target) e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (serviceType === 'car') {
      alert("La publication d'annonces de location de voiture sera disponible très bientôt.");
      return;
    }

    if (!title.trim()) {
      alert("Le titre est obligatoire.");
      return;
    }

    const parsedPrice = parseFloat(price);
    if (!price || isNaN(parsedPrice) || parsedPrice <= 0) {
      alert("Le prix de la location est obligatoire et doit être supérieur à 0.");
      return;
    }

    if (isCustomLocation && !customLocation.trim()) {
      alert("Veuillez saisir manuellement l'emplacement de la maison.");
      return;
    }

    if (!description.trim()) {
      alert("La description de la maison est obligatoire.");
      return;
    }

    if (imagePreviews.length === 0) {
      alert("Veuillez ajouter au moins une photo de la maison (maximum 10 photos).");
      return;
    }

    setLoading(true);
    setPublishStatus("Envoi des photos au serveur...");

    try {
      // Upload images
      const uploadPromises = imagePreviews.map(async (img) => {
        if (img.startsWith('http')) return img;
        return await uploadToSupabaseStorage('product-images', img);
      });

      const imageUrls = await Promise.all(uploadPromises);

      setPublishStatus("Enregistrement de l'annonce de service...");

      const finalLocation = isCustomLocation ? customLocation.trim() : neighborhood;

      if (initialService) {
        const serviceRef = doc(db, 'services', initialService.id);
        const serviceDoc = {
          title: title.trim(),
          price: parsedPrice,
          pricePeriod,
          neighborhood: finalLocation,
          customLocation: isCustomLocation ? customLocation.trim() : null,
          description: description.trim(),
          images: imageUrls,
          updatedAt: serverTimestamp(),
        };

        await updateDoc(serviceRef, serviceDoc);
        alert("Votre annonce de service a été modifiée avec succès !");
      } else {
        const serviceDoc = {
          serviceType: 'house',
          title: title.trim(),
          price: parsedPrice,
          pricePeriod,
          neighborhood: finalLocation,
          customLocation: isCustomLocation ? customLocation.trim() : undefined,
          description: description.trim(),
          images: imageUrls,
          sellerId: user!.uid,
          sellerName: user!.displayName || 'Anonyme',
          status: 'available',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await addDoc(collection(db, 'services'), serviceDoc);
        alert("Votre annonce de location de maison a été publiée avec succès ! Elle est désormais visible exclusivement dans l'Espace Services.");
      }
      onComplete();
    } catch (error: any) {
      console.error("Erreur lors de la publication du service:", error);
      alert(`Erreur lors de la publication : ${error?.message || error}`);
    } finally {
      setLoading(false);
      setPublishStatus('');
    }
  };

  if (!user) {
    return (
      <div className="py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
          <HelpCircle className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black italic tracking-tighter uppercase text-indigo-600">HÉ HO !</h3>
          <p className="text-xs text-zinc-500 font-black uppercase tracking-widest leading-relaxed">
            Connectez-vous pour commencer <br/> à publier un service.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-sm mx-auto">


      <AnimatePresence mode="wait">
        {serviceType === 'car' ? (
          <motion.div
            key="car-placeholder"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-8 bg-zinc-50 border border-zinc-200 rounded-[2rem] text-center space-y-4"
          >
            <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
              <Info size={24} />
            </div>
            <div>
              <h3 className="font-bold text-zinc-800 text-sm">Location de voiture</h3>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                La publication d'annonces de location de voiture sera disponible très bientôt. Pour l'instant, vous pouvez publier vos annonces de location de maisons.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="house-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Photos */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-zinc-800 tracking-[0.2em] ml-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera size={14} className="text-indigo-600" />
                  Photos ({imagePreviews.length}/10)
                </div>
                <span className="text-[8px] font-black text-indigo-600">Jusqu'à 10 photos</span>
              </label>
              
              <div className="space-y-4">
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-14 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center justify-center gap-2 text-indigo-500 hover:border-indigo-400 hover:text-indigo-600 transition-all active:scale-95 group shadow-sm"
                >
                  <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Ajouter des photos</span>
                </button>

                {imagePreviews.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 px-1">
                    {imagePreviews.map((p, i) => (
                      <div key={i} className="aspect-square h-20 w-20 shrink-0 relative rounded-xl overflow-hidden border-2 border-white group shadow-sm transition-all hover:scale-105">
                        <img src={p} className="w-full h-full object-cover" alt="Preview" />
                        <button 
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/60 backdrop-blur-md text-white rounded-full flex items-center justify-center text-[10px] shadow-lg opacity-100 transition-opacity z-10"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {compressing && (
                <div className="flex items-center gap-2 px-2 py-1">
                  <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[8px] font-black uppercase text-indigo-600 tracking-widest">Traitement...</span>
                </div>
              )}

              <input 
                ref={fileInputRef}
                type="file" 
                onChange={handleImageChange} 
                className="hidden" 
                accept="image/*"
                multiple
              />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-800 tracking-widest ml-1">Titre de l'annonce</label>
              <input 
                type="text"
                value={title} 
                onChange={e => setTitle(e.target.value)}
                className="w-full p-5 rounded-3xl bg-white border border-zinc-150 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold placeholder:text-zinc-300 placeholder:font-normal text-sm shadow-sm transition-all" 
                placeholder="Ex: Studio moderne haut standing" required 
              />
            </div>

            {/* Price & Price period */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-800 tracking-widest ml-1">Prix</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={price} 
                    onChange={e => setPrice(e.target.value)}
                    className="w-full p-5 pr-14 rounded-3xl bg-white border border-zinc-150 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-black text-lg shadow-sm transition-all" 
                    placeholder="0" required
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-300 font-bold text-xs pointer-events-none">FCFA</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-800 tracking-widest ml-1">Facturation</label>
                <div className="bg-zinc-100 p-1 rounded-3xl flex gap-1 h-14 items-center">
                  <button
                    type="button"
                    onClick={() => setPricePeriod('day')}
                    className={cn(
                      "flex-1 h-full rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                      pricePeriod === 'day' ? "bg-white text-indigo-600 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                    )}
                  >
                    Par jour
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricePeriod('month')}
                    className={cn(
                      "flex-1 h-full rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                      pricePeriod === 'month' ? "bg-white text-indigo-600 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                    )}
                  >
                    Par mois
                  </button>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-zinc-800 tracking-widest ml-1 flex items-center gap-1.5">
                <MapPin size={12} className="text-indigo-600" /> Emplacement (Quartier)
              </label>
              <CustomDropdown 
                value={neighborhood} 
                options={dropdownOptions} 
                onChange={handleNeighborhoodChange} 
              />

              {isCustomLocation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 pt-2"
                >
                  <label className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">Saisir le lieu personnalisé</label>
                  <input
                    type="text"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-white border border-zinc-150 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-medium text-sm shadow-sm transition-all"
                    placeholder="Ex: Près de la Basilique, Yamoussoukro"
                    required
                  />
                </motion.div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-800 tracking-widest ml-1">Description</label>
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)}
                className="w-full p-5 rounded-[2rem] bg-white border border-zinc-150 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none min-h-[140px] font-medium text-sm leading-relaxed shadow-sm transition-all" 
                placeholder="Détails de la maison : nombre de pièces, commodités, caution, etc." required 
              />
            </div>

            {/* Submit & Status */}
            <div className="space-y-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 rounded-[2.5rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-[0.2em] text-[11px] transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {loading ? "PUBLICATION EN COURS..." : "PUBLIER MAINTENANT"}
              </button>

              {loading && publishStatus && (
                <div className="p-4 bg-indigo-50/80 rounded-2xl border border-indigo-100 flex items-center gap-3 animate-pulse">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-800 leading-none">{publishStatus}</p>
                </div>
              )}
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
