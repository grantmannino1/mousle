'use client';

import type { GameState } from '@/types';
import { Modal } from './Modal';
import { generateShareText } from '@/lib/share';
import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
}

export function WinModal({ isOpen, onClose, state }: Props) {
  const [copied, setCopied] = useState(false);
  const target = state.targetRegion;

  useEffect(() => {
    if (isOpen && state.won) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#4af0c4', '#f06060', '#5080f0', '#f0d050'],
      });
    }
  }, [isOpen, state.won]);

  if (!target) return null;

  const handleShare = async () => {
    const text = generateShareText(state);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(text);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={state.won ? '🧠 CORRECT!' : 'GAME OVER'}>
      <div className="space-y-5 font-mono text-sm">
        <div className={`rounded border p-4 text-center ${state.won ? 'border-synapse/50 bg-synapse/10' : 'border-red-500/50 bg-red-500/10'}`}>
          {state.won ? (
            <>
              <div className="text-synapse text-lg font-display tracking-wider mb-1">
                Solved in {state.guesses.length}/5 guess{state.guesses.length !== 1 ? 'es' : ''}!
              </div>
              <div className="text-gray-400 text-xs">Well done!</div>
            </>
          ) : (
            <>
              <div className="text-red-400 text-sm font-display tracking-wider mb-1">Better luck tomorrow</div>
              <div className="text-gray-300">The answer was: <span className="text-white font-bold">{target.name}</span></div>
            </>
          )}
        </div>

        <div className="bg-lab-surface border border-lab-border rounded p-4 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-white text-base font-display tracking-wide">{target.name}</div>
              <div className="text-gray-500 text-xs mt-0.5">{target.abbreviation} · {target.category} · {target.parentName}</div>
            </div>
            <div className="text-xs text-gray-600 flex-shrink-0">Allen ID: {target.allenId}</div>
          </div>
          {target.fun_fact && (
            <div className="pt-2 border-t border-lab-border">
              <p className="text-gray-400 text-xs leading-relaxed">
                <span className="text-synapse">Fun fact: </span>{target.fun_fact}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleShare}
          className="w-full py-3 rounded border border-synapse/40 bg-synapse/10 hover:bg-synapse/20 font-display text-xs tracking-widest text-synapse transition-all active:scale-95"
        >
          {copied ? '✓ COPIED TO CLIPBOARD' : '↗ SHARE RESULT'}
        </button>

        <NextPuzzleCountdown />
      </div>
    </Modal>
  );
}

function NextPuzzleCountdown() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const msLeft = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(msLeft / (1000 * 60 * 60));
  const minutes = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
  return (
    <div className="text-center text-xs text-gray-600">
      Next puzzle in <span className="text-gray-400">{hours}h {minutes}m</span>
    </div>
  );
}