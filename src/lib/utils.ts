import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat('fr-FR').format(price);
}

export function formatReservedCountdown(reservedUntil?: string | number | Date | null): string {
  if (!reservedUntil) return "Réservé";
  const target = new Date(reservedUntil).getTime();
  if (isNaN(target)) return "Réservé";
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) return "Réservation expirée";
  const totalMins = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0) {
    return `Réservé - expire dans ${hours}h${mins < 10 ? '0' : ''}${mins}`;
  }
  return `Réservé - expire dans ${mins} min`;
}
