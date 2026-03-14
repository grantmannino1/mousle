// ============================================================
//  store/gameStore.ts
//  Zustand store — single source of truth for all game state.
//  Persists progress in localStorage so refreshing doesn't lose your game.
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameState, Region, GuessResult, PlayerStats } from '@/types';
import { getGuessResult } from '@/lib/distance';
import { getTodayString } from '@/lib/daily';

interface Store extends GameState {
  // ── Actions ──────────────────────────────────────────────
  setDifficulty: (d: 'easy' | 'medium' | 'hard') => void;
  setTargetRegion: (r: Region) => void;
  submitGuess: (region: Region) => void;
  openModal: (m: GameState['activeModal']) => void;
  closeModal: () => void;
  resetGame: () => void;

  // ── Persistence helpers ───────────────────────────────────
  lastPlayedDate: string;
  stats: PlayerStats;
}

const DEFAULT_STATS: PlayerStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  guessDistribution: [0, 0, 0, 0, 0, 0],
  lastPlayedDate: '',
};

export const useGameStore = create<Store>()(
  persist(
    (set, get) => ({
      // ── Initial State ─────────────────────────────────────
      difficulty: 'easy',
      targetRegion: null,
      guesses: [],
      gameOver: false,
      won: false,
      showGhostBrain: true,
      showNeighbors: false,
      maxGuesses: 5,
      activeModal: null,
      lastPlayedDate: '',
      stats: DEFAULT_STATS,

      // ── Actions ───────────────────────────────────────────
      setDifficulty: (difficulty) =>
        set({
          difficulty,
          targetRegion: null,
          guesses: [],
          gameOver: false,
          won: false,
          showGhostBrain: true,
          showNeighbors: false,
          activeModal: null,
          lastPlayedDate: '',
        }),

      setTargetRegion: (targetRegion) => {
        set({ targetRegion });
      },

      submitGuess: (guessRegion) => {
        const { targetRegion, guesses, stats } = get();
        if (!targetRegion) return;

        const result: GuessResult = getGuessResult(guessRegion, targetRegion);
        const newGuesses = [...guesses, result];
        const guessCount = newGuesses.length;

        const won = result.isCorrect;
        const gameOver = won || guessCount >= 5;

        // Progressive hints
        const showGhostBrain = true;
        const showNeighbors = guessCount >= 5;

        let newStats = { ...stats };
        if (gameOver) {
          newStats.gamesPlayed += 1;
          if (won) {
            newStats.gamesWon += 1;
            newStats.currentStreak += 1;
            newStats.maxStreak = Math.max(newStats.maxStreak, newStats.currentStreak);
            const dist = [...newStats.guessDistribution] as PlayerStats['guessDistribution'];
            dist[guessCount - 1] += 1;
            newStats.guessDistribution = dist;
          } else {
            newStats.currentStreak = 0;
          }
          newStats.lastPlayedDate = getTodayString();
        }

        set({
          guesses: newGuesses,
          won,
          gameOver,
          showGhostBrain,
          showNeighbors,
          stats: newStats,
          activeModal: gameOver ? 'win' : null,
        });
      },

      openModal: (activeModal) => set({ activeModal }),
      closeModal: () => set({ activeModal: null }),

      resetGame: () =>
        set({
          targetRegion: null,
          guesses: [],
          gameOver: false,
          won: false,
          showGhostBrain: false,
          showNeighbors: false,
          activeModal: null,
          lastPlayedDate: '',
        }),
    }),
    {
      name: 'mousewordle-state',
      // Only persist these fields across page reloads
      partialize: (state) => ({
        difficulty: state.difficulty,
        guesses: state.guesses,
        gameOver: state.gameOver,
        won: state.won,
        lastPlayedDate: state.lastPlayedDate,
        stats: state.stats,
      }),
    }
  )
);
