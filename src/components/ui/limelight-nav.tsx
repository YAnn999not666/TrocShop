import React, { useState, useRef, useLayoutEffect, cloneElement } from 'react';
import { cn } from '@/lib/utils';

// --- Internal Types and Defaults ---

const DefaultHomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);
const DefaultCompassIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
  </svg>
);
const DefaultBellIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

export type NavItem = {
  id: string | number;
  icon: React.ReactElement;
  label?: string;
  count?: number;
  onClick?: () => void;
};

const defaultNavItems: NavItem[] = [
  { id: 'default-home', icon: <DefaultHomeIcon />, label: 'Home' },
  { id: 'default-explore', icon: <DefaultCompassIcon />, label: 'Explore' },
  { id: 'default-notifications', icon: <DefaultBellIcon />, label: 'Notifications' },
];

export type LimelightNavProps = {
  items?: NavItem[];
  defaultActiveIndex?: number;
  activeIndex?: number;
  onTabChange?: (index: number) => void;
  className?: string;
  limelightClassName?: string;
  iconContainerClassName?: string;
  iconClassName?: string;
};

/**
 * An adaptive-width navigation bar with a "limelight" effect that highlights the active item.
 */
export const LimelightNav = ({
  items = defaultNavItems,
  defaultActiveIndex = 0,
  activeIndex: controlledActiveIndex,
  onTabChange,
  className,
  limelightClassName,
  iconContainerClassName,
  iconClassName,
}: LimelightNavProps) => {
  const [localActiveIndex, setLocalActiveIndex] = useState(defaultActiveIndex);
  const activeIndex = controlledActiveIndex !== undefined ? controlledActiveIndex : localActiveIndex;
  
  const [isReady, setIsReady] = useState(false);
  const navItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const limelightRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (items.length === 0) return;

    const limelight = limelightRef.current;
    const activeItem = navItemRefs.current[activeIndex];
    
    if (limelight && activeItem) {
      // Offset calculated based on parent positioning
      const newLeft = activeItem.offsetLeft + activeItem.offsetWidth / 2 - limelight.offsetWidth / 2;
      limelight.style.left = `${newLeft}px`;

      if (!isReady) {
        const timer = setTimeout(() => setIsReady(true), 50);
        return () => clearTimeout(timer);
      }
    }
  }, [activeIndex, isReady, items]);

  if (items.length === 0) {
    return null; 
  }

  const handleItemClick = (index: number, itemOnClick?: () => void) => {
    if (controlledActiveIndex === undefined) {
      setLocalActiveIndex(index);
    }
    onTabChange?.(index);
    itemOnClick?.();
  };

  return (
    <nav className={cn("relative inline-flex items-center h-16 rounded-lg bg-card text-foreground border px-2", className)}>
      {items.map(({ id, icon, label, count, onClick }, index) => {
        const isActive = activeIndex === index;
        return (
          <a
            key={id}
            ref={el => { navItemRefs.current[index] = el; }}
            className={cn("relative z-20 flex h-full cursor-pointer items-center justify-center p-5 select-none", iconContainerClassName)}
            onClick={() => handleItemClick(index, onClick)}
            aria-label={label}
          >
            {icon && cloneElement(icon, {
              className: cn(
                "w-6 h-6 transition-all duration-300 ease-in-out",
                isActive ? 'opacity-100 text-orange-600 scale-110' : 'opacity-40 text-zinc-500 hover:opacity-75',
                (icon.props as any)?.className,
                iconClassName
              ),
            } as any)}
            
            {/* Handle dynamic notification counts/badges */}
            {count !== undefined && count > 0 && (
              <span className="absolute top-2 right-2 bg-red-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white animate-bounce-short">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </a>
        );
      })}

      {/* Limelight bar & glow */}
      <div 
        ref={limelightRef}
        className={cn(
          "absolute top-0 z-10 w-11 h-[4px] rounded-full bg-orange-600 shadow-[0_50px_15px_var(--primary)]",
          isReady ? 'transition-[left] duration-300 ease-in-out' : '',
          limelightClassName
        )}
        style={{ left: '-999px' }}
      >
        <div className="absolute left-[-40%] top-[4px] w-[180%] h-14 [clip-path:polygon(10%_100%,30%_0,70%_0,90%_100%)] bg-gradient-to-b from-orange-600/20 to-transparent pointer-events-none" />
      </div>
    </nav>
  );
};
