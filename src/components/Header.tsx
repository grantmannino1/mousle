'use client';

import { useGameStore } from '@/store/gameStore';

export function Header() {
  const openModal = useGameStore((s) => s.openModal);

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-lab-border">
      <div className="w-24" />

      <div className="text-center">
        <h1
          style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 900, letterSpacing: '0.15em' }}
          className="text-2xl text-synapse"
        >
          MOUSLE
        </h1>
        <p className="text-xs text-gray-500 tracking-wider mt-0.5">
          DAILY MOUSE BRAIN ATLAS GAME
        </p>
      </div>

      <div className="flex gap-3 w-24 justify-end">
        <button
          onClick={() => openModal('help')}
          className="w-8 h-8 rounded-full border border-lab-border text-gray-400 hover:text-synapse hover:border-synapse transition-colors text-sm font-bold italic"
          aria-label="About"
          title="About & How to Play"
        >
          i
        </button>
        <button
          onClick={() => openModal('stats')}
          className="w-8 h-8 rounded-full border border-lab-border text-gray-400 hover:text-synapse hover:border-synapse transition-colors text-sm"
          aria-label="Statistics"
        >
          📊
        </button>
      </div>
    </header>
  );
}