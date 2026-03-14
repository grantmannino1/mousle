// ============================================================
//  lib/share.ts
//  Generate emoji share text (like Wordle/Worldle)
// ============================================================

import type { GameState } from '@/types';
import { getPuzzleNumber } from './daily';

const DIFF_EMOJI = { easy: '🔵', medium: '🟡', hard: '🔴' } as const;

/** Convert proximity % to a colored emoji square */
function proximityEmoji(pct: number): string {
  if (pct >= 90) return '🟩';
  if (pct >= 70) return '🟨';
  if (pct >= 50) return '🟧';
  if (pct >= 25) return '🟥';
  return '⬛';
}

export function generateShareText(state: GameState): string {
  const puzzleNum = getPuzzleNumber();
  const diffEmoji = DIFF_EMOJI[state.difficulty];
  const result = state.won ? `${state.guesses.length}/6` : 'X/6';

  const rows = state.guesses.map((g) => {
    if (g.isCorrect) return '🧠✅';
    return proximityEmoji(g.proximity_pct);
  });

  return [
    `MouseWordle #${puzzleNum} ${diffEmoji} ${result}`,
    rows.join(''),
    'https://mousewordle.com',
  ].join('\n');
}
