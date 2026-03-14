// ============================================================
//  hooks/useGame.ts
//  Main game hook — loads regions, sets daily puzzle, exposes actions.
//  Use this in page.tsx to bootstrap the game.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { loadRegions } from '@/lib/regions';
import { getDailyRegion } from '@/lib/daily';
import type { Region } from '@/types';

export function useGame() {
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    difficulty,
    targetRegion,
    guesses,
    gameOver,
    won,
    showGhostBrain,
    showNeighbors,
    activeModal,
    stats,
    setTargetRegion,
    setDifficulty,
    submitGuess,
    openModal,
    closeModal,
    resetGame,
  } = useGameStore();

  // Load all regions on mount
  useEffect(() => {
    loadRegions()
      .then((regions) => {
        setAllRegions(regions);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, []);

  // Set today's target whenever regions or difficulty changes
  useEffect(() => {
    if (allRegions.length === 0) return;
    const daily = getDailyRegion(allRegions, difficulty);
    setTargetRegion(daily);
  }, [allRegions, difficulty]);

  return {
    // State
    allRegions,
    loading,
    error,
    targetRegion,
    guesses,
    gameOver,
    won,
    difficulty,
    showGhostBrain,
    showNeighbors,
    activeModal,
    stats,
    // Actions
    setDifficulty,
    submitGuess,
    openModal,
    closeModal,
    resetGame,
  };
}
