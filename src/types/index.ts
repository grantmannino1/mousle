// ============================================================
//  types/index.ts
//  All TypeScript interfaces for MouseWordle
// ============================================================

/** A single mouse brain region from the Allen CCFv3 atlas */
export interface Region {
  /** Unique string ID, e.g. "hippocampus" or "VISp" */
  id: string;
  /** Allen Brain Atlas numeric structure ID — used to fetch the 3D mesh */
  allenId: number;
  /** Human-readable name, e.g. "Primary Visual Cortex" */
  name: string;
  /** Short abbreviation used in the atlas, e.g. "VISp" */
  abbreviation: string;
  /** Which difficulty tier this region belongs to */
  difficulty: 'easy' | 'medium' | 'hard';
  /** Broad anatomical category */
  category: 'cortex' | 'subcortical' | 'cerebellum' | 'brainstem' | 'olfactory' | 'fiber';
  /** Parent structure name (e.g. "Isocortex") */
  parentName: string;
  /**
   * Centroid in Allen CCFv3 voxel space (25µm resolution).
   * X = left-right (0 = left edge, 456 = right edge)
   * Y = superior-inferior (0 = dorsal, 320 = ventral)
   * Z = anterior-posterior (0 = anterior, 528 = posterior)
   *
   * To convert to mm: multiply by 0.025
   */
  centroid_ccf: [number, number, number];
  /** Optional fun fact shown on win */
  fun_fact?: string;
  /** Common aliases that the autocomplete will match */
  aliases: string[];
}

/** The result of one guess */
export interface GuessResult {
  region: Region;
  /** Nearest-boundary distance in mm (0 = correct) */
  distance_mm: number;
  /** 0–100, where 100 = correct */
  proximity_pct: number;
  /**
   * Up to 2 anatomical directions from guess → target.
   * Uses mouse neuroanatomy convention:
   *   anterior/posterior = rostral/caudal (Z axis in CCF)
   *   dorsal/ventral     = superior/inferior (Y axis in CCF, inverted)
   *   medial/lateral     = X axis in CCF
   */
  direction: AnatomicalDirection[];
  isCorrect: boolean;
}

export type AnatomicalDirection =
  | 'anterior'
  | 'posterior'
  | 'dorsal'
  | 'ventral'
  | 'medial'
  | 'lateral';

/** Persisted player statistics (stored in localStorage) */
export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  /** Index 0 = solved on guess 1, index 5 = solved on guess 6 */
  guessDistribution: [number, number, number, number, number, number];
  lastPlayedDate: string; // ISO date string, e.g. "2024-01-15"
}

/** The full game state managed by Zustand */
export interface GameState {
  difficulty: 'easy' | 'medium' | 'hard';
  targetRegion: Region | null;
  guesses: GuessResult[];
  gameOver: boolean;
  won: boolean;
  /** Show transparent ghost brain after guess 3 */
  showGhostBrain: boolean;
  /** Show neighboring structures after guess 5 */
  showNeighbors: boolean;
  maxGuesses: 5;
  /** Which modal is open */
  activeModal: 'help' | 'stats' | 'win' | null;
}

/** Pre-computed distance entry from distances.json */
export interface DistanceEntry {
  distance_mm: number;
  direction: AnatomicalDirection[];
}

export type DistanceMap = Record<string, Record<string, DistanceEntry>>;
