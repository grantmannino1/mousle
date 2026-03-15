import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameState, Region, GuessResult, PlayerStats, DistanceMap } from '@/types';
import { getGuessResult } from '@/lib/distance';
import { getTodayString } from '@/lib/daily';

interface Store extends GameState {
    setDifficulty: (d: 'easy' | 'medium' | 'hard') => void;
    setTargetRegion: (r: Region) => void;
    submitGuess: (region: Region) => void;
    submitGuessWithData: (region: Region, distanceData: DistanceMap) => void;
    openModal: (m: GameState['activeModal']) => void;
    closeModal: () => void;
    resetGame: () => void;
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

            setDifficulty: (difficulty) => {
                const { lastPlayedDate } = get();
                const isToday = lastPlayedDate === getTodayString();
                // Only reset game state if switching difficulty mid-game or no saved game for today
                set({
                    difficulty,
                    targetRegion: null,
                    guesses: [],
                    gameOver: false,
                    won: false,
                    showGhostBrain: true,
                    showNeighbors: false,
                    activeModal: null,
                    lastPlayedDate: isToday ? lastPlayedDate : '',
                });
            },

            setTargetRegion: (targetRegion) => {
                set({ targetRegion });
            },

            submitGuess: (guessRegion: Region) => {
                const { targetRegion, guesses, stats } = get();
                if (!targetRegion) return;

                const result: GuessResult = getGuessResult(guessRegion, targetRegion);
                const newGuesses = [...guesses, result];
                const guessCount = newGuesses.length;
                const won = result.isCorrect;
                const gameOver = won || guessCount >= 5;
                const showGhostBrain = true;
                const showNeighbors = guessCount >= 4;

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
                    lastPlayedDate: gameOver ? getTodayString() : get().lastPlayedDate,
                    activeModal: gameOver ? 'win' : null,
                });
            },

            submitGuessWithData: (guessRegion: Region, distanceData: DistanceMap) => {
                const { targetRegion, guesses, stats } = get();
                if (!targetRegion) return;

                const result: GuessResult = getGuessResult(guessRegion, targetRegion, distanceData);
                const newGuesses = [...guesses, result];
                const guessCount = newGuesses.length;
                const won = result.isCorrect;
                const gameOver = won || guessCount >= 5;
                const showGhostBrain = true;
                const showNeighbors = guessCount >= 4;

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
                    lastPlayedDate: gameOver ? getTodayString() : get().lastPlayedDate,
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
                    showGhostBrain: true,
                    showNeighbors: false,
                    activeModal: null,
                    lastPlayedDate: '',
                }),
        }),
        {
            name: 'mousewordle-state',
            partialize: (state) => ({
                difficulty: state.difficulty,
                targetRegion: state.targetRegion,   // ← now persisted
                guesses: state.guesses,
                gameOver: state.gameOver,
                won: state.won,
                showGhostBrain: state.showGhostBrain,
                showNeighbors: state.showNeighbors,
                lastPlayedDate: state.lastPlayedDate,
                stats: state.stats,
            }),
        }
    )
);
