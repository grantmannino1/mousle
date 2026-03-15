'use client';

import { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { getDailyRegion, getTodayString, isFromToday } from '@/lib/daily';
import { filterByDifficulty } from '@/lib/regions';
import { getGuessResult } from '@/lib/distance';
import type { Region, DistanceMap, GuessResult, PlayerStats } from '@/types';

export type GameMode = 'daily' | 'training';

// One storage key per difficulty so they never overwrite each other
function storageKey(difficulty: string) {
  return `mousle-v1-${difficulty}`;
}

interface SavedState {
  targetRegionId: string;
  guesses: GuessResult[];
  gameOver: boolean;
  won: boolean;
  lastPlayedDate: string;
}

// Stats are shared across all difficulties
const STATS_KEY = 'mousle-v1-stats';

function saveGame(difficulty: string, state: SavedState) {
  try {
    localStorage.setItem(storageKey(difficulty), JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save game:', e);
  }
}

function loadGame(difficulty: string): SavedState | null {
  try {
    const raw = localStorage.getItem(storageKey(difficulty));
    if (!raw) return null;
    return JSON.parse(raw) as SavedState;
  } catch (e) {
    return null;
  }
}

function saveStats(stats: PlayerStats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn('Failed to save stats:', e);
  }
}

function loadStats(): PlayerStats | null {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlayerStats;
  } catch (e) {
    return null;
  }
}

export function useGame() {
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [distanceData, setDistanceData] = useState<DistanceMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setModeState] = useState<GameMode>('daily');
  const [trainingRegion, setTrainingRegion] = useState<Region | null>(null);
  const [trainingGuesses, setTrainingGuesses] = useState<GuessResult[]>([]);
  const [trainingGameOver, setTrainingGameOver] = useState(false);
  const [trainingWon, setTrainingWon] = useState(false);

  const store = useGameStore();

  // Load data files once on mount
  useEffect(() => {
    // Load saved stats on mount
    const savedStats = loadStats();
    if (savedStats) {
      useGameStore.setState({ stats: savedStats });
    }

    Promise.all([
      fetch('/data/regions.json').then(r => r.json()),
      fetch('/data/distances.json').then(r => r.json()),
    ]).then(([regionsData, distancesData]) => {
      setAllRegions(regionsData.regions as Region[]);
      setDistanceData(distancesData as DistanceMap);
      setLoading(false);
    }).catch((e) => {
      setError(String(e));
      setLoading(false);
    });
  }, []);

  // Restore or start daily game when regions load or difficulty changes
  useEffect(() => {
    if (allRegions.length === 0) return;
    if (mode !== 'daily') return;

    const todaysRegion = getDailyRegion(allRegions, store.difficulty);
    const saved = loadGame(store.difficulty);

    if (
      saved &&
      isFromToday(saved.lastPlayedDate) &&
      saved.targetRegionId === todaysRegion.id
    ) {
      // Restore saved game for this difficulty
      useGameStore.setState({
        targetRegion: todaysRegion,
        guesses: saved.guesses,
        gameOver: saved.gameOver,
        won: saved.won,
        showNeighbors: saved.guesses.length >= 4,
        lastPlayedDate: saved.lastPlayedDate,
      });
    } else {
      // New day or no saved game — start fresh
      useGameStore.setState({
        targetRegion: todaysRegion,
        guesses: [],
        gameOver: false,
        won: false,
        showGhostBrain: true,
        showNeighbors: false,
        activeModal: null,
        lastPlayedDate: '',
      });
    }
  }, [allRegions, store.difficulty, mode]);

  // Save game state after every guess
  useEffect(() => {
    if (mode !== 'daily') return;
    if (!store.targetRegion) return;
    if (store.guesses.length === 0) return;

    saveGame(store.difficulty, {
      targetRegionId: store.targetRegion.id,
      guesses: store.guesses,
      gameOver: store.gameOver,
      won: store.won,
      lastPlayedDate: getTodayString(),
    });
  }, [store.guesses, store.gameOver, store.won, store.targetRegion, store.difficulty, mode]);

  // Save stats whenever they change
  useEffect(() => {
    if (store.stats.gamesPlayed > 0) {
      saveStats(store.stats);
    }
  }, [store.stats]);

  const pickRandomRegion = useCallback(() => {
    if (allRegions.length === 0) return;
    const pool = filterByDifficulty(allRegions, store.difficulty);
    const random = pool[Math.floor(Math.random() * pool.length)];
    setTrainingRegion(random);
    setTrainingGuesses([]);
    setTrainingGameOver(false);
    setTrainingWon(false);
  }, [allRegions, store.difficulty]);

  const setMode = (newMode: GameMode) => {
    setModeState(newMode);
    if (newMode === 'training' && allRegions.length > 0) {
      pickRandomRegion();
    }
  };

  useEffect(() => {
    if (mode === 'training' && allRegions.length > 0) {
      pickRandomRegion();
    }
  }, [store.difficulty, mode]);

  const submitGuess = (region: Region) => {
    if (mode === 'daily') {
      useGameStore.getState().submitGuessWithData(region, distanceData);
      return;
    }
    if (!trainingRegion || trainingGameOver) return;
    const result = getGuessResult(region, trainingRegion, distanceData);
    const newGuesses = [...trainingGuesses, result];
    const won = result.isCorrect;
    const over = won || newGuesses.length >= 5;
    setTrainingGuesses(newGuesses);
    setTrainingGameOver(over);
    setTrainingWon(won);
  };

  const activeRegion = mode === 'daily' ? store.targetRegion : trainingRegion;
  const activeGuesses = mode === 'daily' ? store.guesses : trainingGuesses;
  const activeGameOver = mode === 'daily' ? store.gameOver : trainingGameOver;
  const activeWon = mode === 'daily' ? store.won : trainingWon;

  return {
    allRegions,
    loading,
    error,
    mode,
    setMode,
    targetRegion: activeRegion,
    guesses: activeGuesses,
    gameOver: activeGameOver,
    won: activeWon,
    difficulty: store.difficulty,
    showGhostBrain: store.showGhostBrain,
    showNeighbors: activeGuesses.length >= 4,
    activeModal: mode === 'daily' ? store.activeModal : null,
    stats: store.stats,
    setDifficulty: store.setDifficulty,
    submitGuess,
    openModal: store.openModal,
    closeModal: store.closeModal,
    resetGame: store.resetDailyGame,
    nextTrainingRegion: pickRandomRegion,
  };
}