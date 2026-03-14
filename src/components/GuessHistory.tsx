// ============================================================
//  components/GuessHistory.tsx
//  Renders the table of past guesses with distance, proximity,
//  and direction feedback.
// ============================================================

'use client';

import type { GuessResult } from '@/types';
import { ProximityBar } from './ProximityBar';
import { DirectionIndicator } from './DirectionIndicator';

interface Props {
  guesses: GuessResult[];
  maxGuesses: number;
}

export function GuessHistory({ guesses, maxGuesses }: Props) {
  const emptySlots = maxGuesses - guesses.length;

  return (
    <div className="w-full space-y-2">
      {/* Column headers */}
      {guesses.length > 0 && (
        <div className="grid grid-cols-[1fr_auto_180px_auto] gap-3 px-3 pb-1">
          <span className="font-mono text-xs text-gray-600 uppercase tracking-widest">Region</span>
          <span className="font-mono text-xs text-gray-600 uppercase tracking-widest text-right">Distance</span>
          <span className="font-mono text-xs text-gray-600 uppercase tracking-widest pl-2">Proximity</span>
          <span className="font-mono text-xs text-gray-600 uppercase tracking-widest">Direction</span>
        </div>
      )}

      {/* Guess rows */}
      {guesses.map((guess, i) => (
        <GuessRow key={`${guess.region.id}-${i}`} guess={guess} index={i} />
      ))}

      {/* Empty slots */}
      {Array.from({ length: emptySlots }).map((_, i) => (
        <div
          key={`empty-${i}`}
          className="h-12 border border-dashed border-lab-border rounded opacity-30"
        />
      ))}
    </div>
  );
}

function GuessRow({ guess, index }: { guess: GuessResult; index: number }) {
  const isCorrect = guess.isCorrect;

  return (
    <div
      className={`
        grid grid-cols-[1fr_auto_180px_auto] gap-3 items-center
        px-3 py-2.5 rounded border
        animate-slide-up
        ${isCorrect
          ? 'border-synapse/60 bg-synapse/10'
          : 'border-lab-border bg-lab-surface'
        }
      `}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Region name */}
      <div>
        <span className="font-mono text-sm text-gray-200">
          {guess.region.name}
        </span>
        {guess.region.abbreviation !== guess.region.name && (
          <span className="text-gray-500 font-mono text-xs ml-1.5">
            ({guess.region.abbreviation})
          </span>
        )}
        {isCorrect && (
          <span className="ml-2 text-synapse text-xs font-display tracking-wider">
            ✓ CORRECT
          </span>
        )}
      </div>

      {/* Distance */}
      <div className="text-right">
        {isCorrect ? (
          <span className="font-mono text-xs text-synapse">0 mm</span>
        ) : (
          <span className="font-mono text-xs text-gray-400">
            {guess.distance_mm.toFixed(1)} mm
          </span>
        )}
      </div>

      {/* Proximity bar */}
      <ProximityBar pct={guess.proximity_pct} />

      {/* Direction arrows */}
      <div className="min-w-[140px]">
        {isCorrect ? (
          <span className="text-synapse text-lg">🧠</span>
        ) : (
          <DirectionIndicator directions={guess.direction} />
        )}
      </div>
    </div>
  );
}
