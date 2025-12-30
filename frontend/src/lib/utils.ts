import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatEth(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  return eth.toFixed(4);
}

export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Ended';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

export function generateEncryptedPlaceholder(): string {
  const chars = '0123456789abcdef';
  let result = '0x';
  for (let i = 0; i < 16; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result + '...';
}

export function calculateConvictionScore(guess: number, winningNumber: number, confidence: number): number {
  const distance = Math.abs(guess - winningNumber);
  const rawScore = 1000 - distance;
  return rawScore * confidence;
}

export function calculateCalibrationError(guess: number, winningNumber: number, confidence: number): number {
  const distance = Math.abs(guess - winningNumber);
  const rawScore = 1000 - distance;
  const accuracyPct = (rawScore * 100) / 1000;
  return Math.abs(confidence - accuracyPct);
}
