import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export interface DropdownOption {
  value: string;
  label: string;
}

export const CustomDropdown = ({
  value,
  options,
  onChange,
  placeholder = "Sélectionner",
  className,
}: {
  value: string;
  options: (string | DropdownOption)[];
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizedOptions: DropdownOption[] = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt,
  );

  const selectedOption = normalizedOptions.find((o) => o.value === value);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-4.5 py-3.5 rounded-2xl bg-white border border-zinc-200 flex items-center justify-between transition-all outline-none text-left shadow-sm",
          isOpen ? "ring-4 ring-orange-500/10 border-orange-500" : "hover:border-zinc-300",
          className,
        )}
      >
        <span
          className={cn(
            "text-xs font-bold",
            value ? "text-zinc-950" : "text-zinc-400",
          )}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "text-zinc-400 transition-transform duration-250",
            isOpen ? "rotate-180" : "",
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[60] left-0 right-0 mt-1.5 bg-white rounded-2xl border border-zinc-150 shadow-xl overflow-hidden max-h-60 overflow-y-auto no-scrollbar"
          >
            <div className="p-1.5 space-y-0.5">
              {normalizedOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded-xl text-xs font-bold transition-colors",
                    value === opt.value
                      ? "bg-orange-50/70 text-orange-600 font-extrabold"
                      : "hover:bg-zinc-50 text-zinc-700",
                  )}
                >
                  {opt.label}
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
