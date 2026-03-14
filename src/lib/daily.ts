// ============================================================
//  lib/daily.ts
//  Deterministic daily puzzle selection.
//  Given the same date + difficulty, always returns the same region.
// ============================================================

import type { Region } from '@/types';
import { filterByDifficulty } from './regions';

/** Simple but consistent string hash (same as Java's String.hashCode) */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return hash;
}

/** Returns today's date as "YYYY-MM-DD" */
export function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Returns puzzle number (days since launch date Jan 1 2025) */
export function getPuzzleNumber(): number {
  const launch = new Date('2025-01-01').getTime();
  const today = new Date().setHours(0, 0, 0, 0);
  return Math.floor((today - launch) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Get today's target region for a given difficulty.
 * Deterministic: same date + difficulty always picks the same region.
 */
export function getDailyRegion(
  allRegions: Region[],
  difficulty: 'easy' | 'medium' | 'hard'
): Region {
  const pool = filterByDifficulty(allRegions, difficulty);
  const dateStr = getTodayString();
  const seed = hashCode(dateStr + '-' + difficulty);
  const index = Math.abs(seed) % pool.length;
  return pool[index];
}

/** Check if the stored game state is still from today */
export function isFromToday(storedDate: string): boolean {
  return storedDate === getTodayString();
}
