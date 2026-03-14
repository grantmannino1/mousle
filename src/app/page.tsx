// ============================================================
//  app/page.tsx
//  Main game page — assembles all components.
// ============================================================

'use client';

import dynamic from 'next/dynamic';
import { useGame } from '@/hooks/useGame';
import { Header } from '@/components/Header';
import { DifficultySelector } from '@/components/DifficultySelector';
import { GuessInput } from '@/components/GuessInput';
import { GuessHistory } from '@/components/GuessHistory';
import { HelpModal } from '@/components/HelpModal';
import { StatsModal } from '@/components/StatsModal';
import { WinModal } from '@/components/WinModal';
import { getPuzzleNumber } from '@/lib/daily';

// BrainViewer uses Three.js which only runs in the browser,
// so we load it dynamically with SSR disabled.
const BrainViewer = dynamic(
  () => import('@/components/BrainViewer').then((m) => m.BrainViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-lab-bg border border-lab-border rounded-lg">
        <div className="text-center space-y-3">
          <div className="text-synapse font-display text-sm tracking-widest animate-pulse">
            LOADING ATLAS...
          </div>
          <div className="text-gray-600 font-mono text-xs">
            Fetching Allen CCFv3 mesh data
          </div>
        </div>
      </div>
    ),
  }
);

export default function HomePage() {
  const {
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
    setDifficulty,
    submitGuess,
    openModal,
    closeModal,
  } = useGame();

  // IDs of already-guessed regions (to exclude from autocomplete)
  const guessedIds = guesses.map((g) => g.region.id);

  const puzzleNum = getPuzzleNumber();

  return (
    <div className="min-h-screen flex flex-col bg-lab-bg">
      {/* ── Header ─────────────────────────────────────────── */}
      <Header />

      {/* ── Main content ───────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center px-4 py-6 gap-5 max-w-3xl mx-auto w-full">

        {/* Puzzle number + difficulty selector */}
        <div className="w-full flex flex-col items-center gap-3">
          <p className="text-gray-600 font-mono text-xs tracking-widest">
            PUZZLE #{puzzleNum}
          </p>
          <DifficultySelector
            value={difficulty}
            onChange={setDifficulty}
            disabled={false}
          />
        </div>

        {/* ── 3D Brain Viewer ─────────────────────────────── */}
        <div className="w-full" style={{ height: '340px' }}>
          {loading ? (
            <div className="w-full h-full flex items-center justify-center border border-lab-border rounded-lg">
              <span className="text-synapse font-display text-xs tracking-widest animate-pulse">
                LOADING REGIONS...
              </span>
            </div>
          ) : error ? (
            <div className="w-full h-full flex items-center justify-center border border-red-900 rounded-lg bg-red-950/20">
              <div className="text-center space-y-2">
                <p className="text-red-400 font-mono text-sm">Failed to load region data</p>
                <p className="text-gray-600 font-mono text-xs">{error}</p>
              </div>
            </div>
          ) : targetRegion ? (
            <BrainViewer
              targetRegion={targetRegion}
              guesses={guesses}
              showGhostBrain={showGhostBrain}
              showNeighbors={showNeighbors}
            />
          ) : null}
        </div>
        {/* ── Fun fact strip ───────────────────────────────── */}
        {targetRegion?.fun_fact && (
          <div className="w-full bg-lab-surface border border-lab-border rounded px-4 py-2 text-xs font-mono text-gray-500">
            <span className="text-synapse mr-2">🧠</span>
            {targetRegion.fun_fact}
          </div>
        )}
        {/* ── Guess input ──────────────────────────────────── */}
        {!gameOver && (
          <div className="w-full">
            <GuessInput
              allRegions={allRegions}
              difficulty={difficulty}
              onSubmit={submitGuess}
              disabled={gameOver || loading || !targetRegion}
              alreadyGuessed={guessedIds}
            />
            <div className="flex items-center justify-between mt-2 px-1">
              <p className="text-gray-600 font-mono text-xs">
                {5 - guesses.length} guess{5 - guesses.length !== 1 ? 'es' : ''} remaining
              </p>
              {!gameOver && guesses.length >= 2 && targetRegion && (
                <button
                  onClick={() => alert(`Hint: This region belongs to the ${targetRegion.parentName}`)}
                  className="text-xs font-mono text-yellow-500 border border-yellow-500/30 px-2 py-0.5 rounded hover:bg-yellow-500/10 transition-colors"
                >
                  💡 Hint
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Guess history ─────────────────────────────────── */}
        <div className="w-full">
          <GuessHistory guesses={guesses} maxGuesses={6} />
        </div>

        {/* ── Game over banner (if lost) ──────────────────── */}
        {gameOver && !won && (
          <div className="w-full border border-red-800/50 bg-red-950/20 rounded p-4 text-center space-y-1">
            <p className="text-red-400 font-display text-xs tracking-widest">
              BETTER LUCK TOMORROW
            </p>
            <p className="text-gray-300 font-mono text-sm">
              The answer was:{' '}
              <span className="text-white font-bold">{targetRegion?.name}</span>
            </p>
            <button
              onClick={() => openModal('win')}
              className="mt-2 text-gray-500 hover:text-synapse font-mono text-xs underline transition-colors"
            >
              See details
            </button>
          </div>
        )}

        {/* ── Attribution ──────────────────────────────────── */}
        <footer className="text-center text-gray-700 font-mono text-xs mt-auto pt-4">
          Regions sourced from the{' '}
          <a
            href="https://atlas.brain-map.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-synapse transition-colors underline"
          >
            Allen Mouse Brain Atlas CCFv3
          </a>
          {' '}·{' '}
          <button
            onClick={() => openModal('help')}
            className="text-gray-500 hover:text-synapse transition-colors underline"
          >
            How to play
          </button>
        </footer>
      </main>

      {/* ── Modals ─────────────────────────────────────────── */}
      <HelpModal
        isOpen={activeModal === 'help'}
        onClose={closeModal}
      />
      <StatsModal
        isOpen={activeModal === 'stats'}
        onClose={closeModal}
        stats={stats}
      />
      {targetRegion && (
        <WinModal
          isOpen={activeModal === 'win'}
          onClose={closeModal}
          state={{
            difficulty,
            targetRegion,
            guesses,
            gameOver,
            won,
            showGhostBrain,
            showNeighbors,
            maxGuesses: 6,
            activeModal,
          }}
        />
      )}
    </div>
  );
}
