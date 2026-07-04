import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/Button';
import { CustomDropdown } from './ui/CustomDropdown';
import { CAMPUS_SCHOOLS } from '../lib/helpers';

export const LoginForm = ({ 
  onLogin, 
  onToggle 
}: { 
  onLogin: (firstName: string, lastName: string, pass: string) => void; 
  onToggle: () => void; 
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    if (!firstName || !lastName || !password) {
      alert("Veuillez remplir tous les champs !");
      return;
    }
    onLogin(firstName, lastName, password);
  };

  return (
    <div className="w-full space-y-6">
      <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-xl space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Prénom</label>
            <input 
              type="text" 
              value={firstName} 
              onChange={e => setFirstName(e.target.value)} 
              placeholder="Ex: Marc" 
              className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-100 outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Nom</label>
            <input 
              type="text" 
              value={lastName} 
              onChange={e => setLastName(e.target.value)} 
              placeholder="Ex: Yao" 
              className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-100 outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium" 
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Mot de passe</label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Votre mot de passe" 
              className="w-full p-4 rounded-2xl bg-zinc-50 border-none outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium" 
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-orange-600 transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        <Button 
          variant="primary" 
          className="w-full py-5 rounded-3xl bg-orange-600 hover:bg-orange-700 shadow-orange-600/20 font-black uppercase tracking-widest text-[10px]"
          onClick={handleLogin}
        >
          Se connecter
        </Button>
      </div>
      <p className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
        Pas encore de compte ? <button onClick={onToggle} className="text-orange-600 hover:underline">S'inscrire gratuitement</button>
      </p>
    </div>
  );
};

export const SignupForm = ({ 
  onSignup, 
  onToggle 
}: { 
  onSignup: (data: any) => void; 
  onToggle: () => void; 
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    phoneVisibility: 'private',
    city: 'Yamoussoukro',
    password: '',
    confirmPassword: '',
    isStudent: false,
    studentSchool: CAMPUS_SCHOOLS[0]
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = () => {
    if (!formData.firstName || !formData.lastName || !formData.phoneNumber || !formData.password || !formData.confirmPassword) {
      alert("Veuillez remplir tous les champs !");
      return;
    }
    
    // Check for exactly 10 digits
    const digitsOnly = formData.phoneNumber.replace(/[^\d]/g, '');
    if (digitsOnly.length !== 10) {
      alert("Le numéro de téléphone doit comporter obligatoirement 10 chiffres !");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert("Les mots de passe ne correspondent pas !");
      return;
    }
    onSignup(formData);
  };

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-xl space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Prénom</label>
            <input 
              type="text" 
              value={formData.firstName} 
              onChange={e => setFormData({...formData, firstName: e.target.value})} 
              placeholder="Ex: Marc" 
              className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-100 outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Nom</label>
            <input 
              type="text" 
              value={formData.lastName} 
              onChange={e => setFormData({...formData, lastName: e.target.value})} 
              placeholder="Ex: Yao" 
              className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-100 outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium" 
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Téléphone</label>
          <div className="flex gap-2">
            <div className="bg-zinc-50 px-4 py-4 rounded-2xl border border-zinc-100 flex items-center justify-center gap-2 text-xs font-black text-zinc-400">
              <span>+225</span>
            </div>
            <input 
              type="tel" 
              value={formData.phoneNumber} 
              onChange={e => setFormData({...formData, phoneNumber: e.target.value})} 
              placeholder="0700000000" 
              className="flex-1 p-4 rounded-2xl bg-zinc-50 border border-zinc-100 outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium" 
            />
          </div>
        </div>

        {/* Checkbox "Je suis étudiant" placed right after phone */}
        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-3 cursor-pointer p-4 rounded-2xl bg-zinc-50 border border-zinc-100 hover:bg-zinc-100/40 select-none transition-colors">
            <input 
              type="checkbox" 
              checked={formData.isStudent} 
              onChange={e => setFormData({...formData, isStudent: e.target.checked})} 
              className="w-5 h-5 accent-orange-600 rounded cursor-pointer" 
            />
            <span className="text-xs font-black uppercase tracking-wider text-zinc-700">🎓 Je suis étudiant</span>
          </label>

          {/* Conditional message and School CustomDropdown */}
          {formData.isStudent && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 overflow-visible"
            >
              <div className="p-4 bg-orange-50/80 border border-orange-100 rounded-2xl text-xs text-orange-850 leading-relaxed font-black">
                Bienvenue sur l'espace Campus ! Ici, on troque et on vend entre étudiants de Yamoussoukro. Choisis ton école.
              </div>
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Choisis ton école</label>
                <CustomDropdown
                  value={formData.studentSchool}
                  options={CAMPUS_SCHOOLS}
                  onChange={val => setFormData({...formData, studentSchool: val})}
                  placeholder="Sélectionne ton école"
                />
              </div>
            </motion.div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Mot de passe</label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
              placeholder="Choisissez un mot de passe" 
              className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-100 outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium" 
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-800 ml-1">Confirmer</label>
          <input 
            type="password" 
            value={formData.confirmPassword} 
            onChange={e => setFormData({...formData, confirmPassword: e.target.value})} 
            placeholder="Confirmez votre mot de passe" 
            className="w-full p-4 rounded-2xl bg-zinc-50 border-none outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium" 
          />
        </div>

        <Button 
          variant="primary" 
          className="w-full py-5 rounded-3xl bg-orange-600 hover:bg-orange-700 shadow-orange-600/20 font-black uppercase tracking-widest text-[10px]"
          onClick={handleSignup}
        >
          Créer mon compte
        </Button>
      </div>
      <p className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
        Vous avez déjà un compte ? <button onClick={onToggle} className="text-orange-600 hover:underline">Se connecter</button>
      </p>
    </div>
  );
};
