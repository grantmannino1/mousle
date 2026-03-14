// ============================================================
//  components/StatsModal.tsx
// ============================================================

'use client';

import type { PlayerStats } from '@/types';
import { Modal } from './Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
}

export function StatsModal({ isOpen, onClose, stats }: Props) {
  const winPct =
    stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0;

  const maxDist = Math.max(...stats.guessDistribution, 1);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="STATISTICS">
      <div className="space-y-6 font-mono text-sm">
        {/* Summary numbers */}
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            { label: 'Played', value: stats.gamesPlayed },
            { label: 'Win %', value: winPct },
            { label: 'Streak', value: stats.currentStreak },
            { label: 'Best', value: stats.maxStreak },
          ].map(({ label, value }) => (
            <div key={label} className="bg-lab-surface border border-lab-border rounded p-3">
              <div className="text-2xl font-display text-synapse">{value}</div>
              <div className="text-gray-500 text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Guess distribution */}
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">
            Guess Distribution
          </p>
          <div className="space-y-2">
            {stats.guessDistribution.map((count, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-gray-500 text-xs w-4">{i + 1}</span>
                <div className="flex-1 h-6 bg-lab-muted rounded overflow-hidden">
                  <div
                    className="h-full bg-synapse/60 rounded flex items-center justify-end pr-2 transition-all duration-700"
                    style={{
                      width: `${Math.max(8, (count / maxDist) * 100)}%`,
                    }}
                  >
                    <span className="text-xs text-lab-bg font-display">
                      {count}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {stats.gamesPlayed === 0 && (
          <p className="text-gray-600 text-xs text-center">
            Play your first game to see statistics!
          </p>
        )}
      </div>
    </Modal>
  );
}
