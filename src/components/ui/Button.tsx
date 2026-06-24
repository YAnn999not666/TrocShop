import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
}

export const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  ...props 
}: ButtonProps) => {
  const variants = {
    primary: 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-600/20',
    secondary: 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg shadow-zinc-900/10',
    ghost: 'bg-transparent hover:bg-zinc-100 text-zinc-600',
    outline: 'border border-zinc-200 hover:bg-zinc-50 text-zinc-700',
  };
  
  return (
    <button 
      className={cn(
        'px-4 py-2.5 rounded-2xl font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100 cursor-pointer',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
export default Button;
