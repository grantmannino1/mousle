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
import { useEffect } from 'react';
import confetti from 'canvas-confetti';

const BrainViewer = dynamic(
  () => import('@/components/BrainViewer').then((m) => m.BrainViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-lab-bg border border-lab-border rounded-lg">
        <div className="text-synapse font-display text-sm tracking-widest animate-pulse">
          LOADING ATLAS...
        </div>
      </div>
    ),
  }
);

export default function HomePage() {
  const game = useGame();

  useEffect(() => {
    if (game.won) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#4af0c4', '#f06060', '#5080f0', '#f0d050'],
      });
    }
  }, [game.won]);

  const guessedIds = game.guesses.map((g) => g.region.id);
  const puzzleNum = getPuzzleNumber();

  return (
    <div className="min-h-screen flex flex-col bg-lab-bg">
      <Header />
      <main className="flex-1 flex flex-col items-center px-4 py-4 gap-4 max-w-5xl mx-auto w-full">

        {/* Mode + difficulty controls */}
        <div className="w-full flex flex-col items-center gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => game.setMode('daily')}
              className={"px-4 py-1.5 rounded font-display text-xs tracking-widest border transition-all " + (game.mode === 'daily' ? 'border-synapse text-synapse bg-white/5' : 'border-lab-border text-gray-500 hover:border-gray-500')}
            >DAILY</button>
            <button
              onClick={() => game.setMode('training')}
              className={"px-4 py-1.5 rounded font-display text-xs tracking-widest border transition-all " + (game.mode === 'training' ? 'border-yellow-400 text-yellow-400 bg-white/5' : 'border-lab-border text-gray-500 hover:border-gray-500')}
            >TRAINING</button>
          </div>
          {game.mode === 'daily' && <p className="text-gray-600 font-mono text-xs tracking-widest">PUZZLE #{puzzleNum}</p>}
          {game.mode === 'training' && <p className="text-yellow-500/60 font-mono text-xs tracking-widest">TRAINING MODE — unlimited puzzles</p>}
          <DifficultySelector value={game.difficulty} onChange={game.setDifficulty} disabled={false} />
        </div>

        {/* Guess input — sits above the brain viewer */}
        {!game.gameOver && (
          <div className="w-full">
            <GuessInput
              allRegions={game.allRegions}
              difficulty={game.difficulty}
              onSubmit={game.submitGuess}
              disabled={game.gameOver || game.loading || !game.targetRegion}
              alreadyGuessed={guessedIds}
            />
            <div className="flex items-center justify-between mt-1.5 px-1">
              <p className="text-gray-600 font-mono text-xs">
                {5 - game.guesses.length} guess{5 - game.guesses.length !== 1 ? 'es' : ''} remaining
              </p>
              {game.guesses.length >= 2 && game.targetRegion && (
                <button
                  onClick={() => alert('Hint: This region belongs to the ' + game.targetRegion!.parentName)}
                  className="text-xs font-mono text-yellow-500 border border-yellow-500/30 px-2 py-0.5 rounded hover:bg-yellow-500/10 transition-colors"
                >Hint</button>
              )}
            </div>
          </div>
        )}

        {/* Brain viewer */}
        <div className="w-full" style={{ height: '70vh' }}>
          {game.loading ? (
            <div className="w-full h-full flex items-center justify-center border border-lab-border rounded-lg">
              <span className="text-synapse font-display text-xs tracking-widest animate-pulse">LOADING REGIONS...</span>
            </div>
          ) : game.error ? (
            <div className="w-full h-full flex items-center justify-center border border-red-900 rounded-lg bg-red-950/20">
              <p className="text-red-400 font-mono text-sm">{game.error}</p>
            </div>
          ) : game.targetRegion ? (
            <BrainViewer
              targetRegion={game.targetRegion}
              guesses={game.guesses}
              showGhostBrain={game.showGhostBrain}
              showNeighbors={game.showNeighbors}
            />
          ) : null}
        </div>

        {/* Guess history */}
        <div className="w-full">
          <GuessHistory guesses={game.guesses} maxGuesses={5} />
        </div>

        {/* Game over banner */}
        {game.gameOver && (
          <div className={"w-full rounded p-4 text-center space-y-3 border " + (game.won ? 'border-synapse/50 bg-synapse/10' : 'border-red-800/50 bg-red-950/20')}>
            {game.won ? (
              <p className="text-synapse font-display text-xs tracking-widest">CORRECT! Solved in {game.guesses.length}/5</p>
            ) : (
              <div className="space-y-1">
                <p className="text-red-400 font-display text-xs tracking-widest">{game.mode === 'daily' ? 'BETTER LUCK TOMORROW' : 'GAME OVER'}</p>
                <p className="text-gray-300 font-mono text-sm">The answer was: <span className="text-white font-bold">{game.targetRegion?.name ?? ''}</span></p>
              </div>
            )}
            {game.mode === 'training' && (
              <button onClick={game.nextTrainingRegion} className="px-6 py-2 rounded border border-yellow-400/50 bg-yellow-400/10 hover:bg-yellow-400/20 font-display text-xs tracking-widest text-yellow-400 transition-all">
                NEXT REGION
              </button>
            )}
            {game.mode === 'daily' && (
              <button onClick={() => game.openModal('win')} className="text-gray-500 hover:text-synapse font-mono text-xs underline transition-colors">
                See details
              </button>
            )}
          </div>
        )}

        <footer className="text-center text-gray-700 font-mono text-xs mt-auto pt-2">
          Regions from Allen Mouse Brain Atlas CCFv3
        </footer>
      </main>

      <HelpModal isOpen={game.activeModal === 'help'} onClose={game.closeModal} />
      <StatsModal isOpen={game.activeModal === 'stats'} onClose={game.closeModal} stats={game.stats} />
      {game.targetRegion && game.mode === 'daily' && (
        <WinModal
          isOpen={game.activeModal === 'win'}
          onClose={game.closeModal}
          state={{
            difficulty: game.difficulty,
            targetRegion: game.targetRegion,
            guesses: game.guesses,
            gameOver: game.gameOver,
            won: game.won,
            showGhostBrain: game.showGhostBrain,
            showNeighbors: game.showNeighbors,
            maxGuesses: 5,
            activeModal: game.activeModal,
          }}
        />
      )}
    </div>
  );
}
