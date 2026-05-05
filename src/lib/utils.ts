import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('bn-BD', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(timestamp);
}

export function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('bn-BD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(timestamp);
}
