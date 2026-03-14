// ============================================================
//  components/DirectionIndicator.tsx
//  Shows anatomical direction arrows from guess → target.
//  Uses mouse brain convention: A/P, D/V, M/L
// ============================================================

'use client';

import type { AnatomicalDirection } from '@/types';

const DIRECTION_CONFIG: Record<
  AnatomicalDirection,
  { arrow: string; label: string; color: string }
> = {
  anterior:  { arrow: '←', label: 'Anterior',  color: 'text-cyan-400' },
  posterior: { arrow: '→', label: 'Posterior', color: 'text-orange-400' },
  dorsal:    { arrow: '↑', label: 'Dorsal',    color: 'text-violet-400' },
  ventral:   { arrow: '↓', label: 'Ventral',   color: 'text-yellow-400' },
  medial:    { arrow: '→', label: 'Medial',    color: 'text-green-400' },
  lateral:   { arrow: '←', label: 'Lateral',   color: 'text-pink-400' },
};

interface Props {
  directions: AnatomicalDirection[];
}

export function DirectionIndicator({ directions }: Props) {
  if (directions.length === 0) return null;

  return (
    <div className="flex gap-1.5 items-center">
      {directions.map((dir) => {
        const cfg = DIRECTION_CONFIG[dir];
        return (
          <span
            key={dir}
            className={`
              flex items-center gap-1 px-2 py-0.5 rounded
              bg-white/5 border border-white/10
              font-mono text-xs ${cfg.color}
            `}
            title={`Target is ${cfg.label.toLowerCase()} to your guess`}
          >
            <span className="text-base leading-none">{cfg.arrow}</span>
            <span className="tracking-wide">{cfg.label}</span>
          </span>
        );
      })}
    </div>
  );
}
