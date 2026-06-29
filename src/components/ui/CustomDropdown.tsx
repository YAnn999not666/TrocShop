import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export const CustomDropdown = ({ 
  value, 
  options, 
  onChange, 
  placeholder = "Sélectionner",
  className
}: { 
  value: string; 
  options: string[]; 
  onChange: (v: string) => void; 
  placeholder?: string; 
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-between transition-all outline-none",
          isOpen ? "ring-2 ring-orange-500/20 border-orange-500/50" : "",
          className
        )}
      >
        <span className={cn("text-sm font-medium", value ? "text-zinc-900" : "text-zinc-400")}>
          {value || placeholder}
        </span>
        <ChevronRight size={18} className={cn("text-zinc-400 transition-transform duration-300", isOpen ? "rotate-90" : "")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-[60] left-0 right-0 mt-2 bg-white rounded-2xl border border-zinc-100 shadow-2xl overflow-hidden max-h-60 overflow-y-auto no-scrollbar"
          >
            <div className="p-2 space-y-1">
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors",
                    value === opt ? "bg-orange-50 text-orange-600" : "hover:bg-zinc-50 text-zinc-600"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default CustomDropdown;
