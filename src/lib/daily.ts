// ============================================================
//  lib/daily.ts
// ============================================================

import type { Region } from '@/types';
import { filterByDifficulty } from './regions';

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

/** Returns today's date as "YYYY-MM-DD" with zero-padded month and day */
export function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns true if the stored date string matches today */
export function isFromToday(storedDate: string): boolean {
  return storedDate === getTodayString();
}

/** Returns puzzle number (days since launch on 2026-03-13) */
export function getPuzzleNumber(): number {
  const launch = new Date('2026-03-13').getTime();
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
  const seed = hashCode(getTodayString() + '-' + difficulty);
  return pool[Math.abs(seed) % pool.length];
}