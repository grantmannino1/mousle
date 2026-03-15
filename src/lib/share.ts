import type { GameState } from '@/types';
import { getPuzzleNumber } from './daily';

export function generateShareText(state: GameState): string {
  const puzzleNumber = getPuzzleNumber();

  const emoji = state.guesses.map(g => {
    if (g.isCorrect) return '🧠';
    if (g.proximity_pct >= 80) return '🟩';
    if (g.proximity_pct >= 60) return '🟨';
    if (g.proximity_pct >= 40) return '🟧';
    if (g.proximity_pct >= 20) return '🟥';
    return '⬛';
  });

  const result = state.won ? `${state.guesses.length}/5` : 'X/5';
  const diffEmoji = { easy: '🔵', medium: '🟡', hard: '🔴' }[state.difficulty];
  const diffName = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }[state.difficulty];

  return `MOUSLE #${puzzleNumber}\n${diffEmoji} ${diffName}\n${result} ${emoji.join('')}\nmousle.app`;
}