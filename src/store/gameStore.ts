import { create } from 'zustand';
import type { GameState, Region, GuessResult, PlayerStats, DistanceMap } from '@/types';
import { getGuessResult } from '@/lib/distance';
import { getTodayString } from '@/lib/daily';

interface Store extends GameState {
  setDifficulty: (d: 'easy' | 'medium' | 'hard') => void;
  setTargetRegion: (r: Region) => void;
  submitGuessWithData: (region: Region, distanceData: DistanceMap) => void;
  openModal: (m: GameState['activeModal']) => void;
  closeModal: () => void;
  resetDailyGame: () => void;
  lastPlayedDate: string;
  lastPlayedDifficulty: string;
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

export const useGameStore = create<Store>()((set, get) => ({
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
  lastPlayedDifficulty: '',
  stats: DEFAULT_STATS,

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
    }),

  setTargetRegion: (targetRegion) => set({ targetRegion }),

  submitGuessWithData: (guessRegion: Region, distanceData: DistanceMap) => {
    const { targetRegion, guesses, stats, difficulty } = get();
    if (!targetRegion) return;

    const result: GuessResult = getGuessResult(guessRegion, targetRegion, distanceData);
    const newGuesses = [...guesses, result];
    const guessCount = newGuesses.length;
    const won = result.isCorrect;
    const gameOver = won || guessCount >= 5;

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
      showGhostBrain: true,
      showNeighbors: guessCount >= 4,
      stats: newStats,
      lastPlayedDate: gameOver ? getTodayString() : get().lastPlayedDate,
      lastPlayedDifficulty: gameOver ? difficulty : get().lastPlayedDifficulty,
      activeModal: gameOver ? 'win' : null,
    });
  },

  openModal: (activeModal) => set({ activeModal }),
  closeModal: () => set({ activeModal: null }),

  resetDailyGame: () =>
    set({
      targetRegion: null,
      guesses: [],
      gameOver: false,
      won: false,
      showGhostBrain: true,
      showNeighbors: false,
      activeModal: null,
      lastPlayedDate: '',
      lastPlayedDifficulty: '',
    }),
}));