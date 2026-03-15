'use client';

import { Modal } from './Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ABOUT MOUSLE">
      <div className="space-y-5 font-mono text-sm text-gray-300">

        <p>
          Identify the mystery mouse brain region from the{' '}
          <span className="text-synapse">Allen CCFv3 atlas</span>.
          You have <span className="text-white font-bold">5 guesses</span>.
        </p>

        {/* Game Modes */}
        <div className="space-y-2">
          <p className="text-gray-400 text-xs uppercase tracking-widest">Game Modes</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-lab-muted rounded border border-synapse/30 p-3 space-y-1">
              <div className="text-synapse font-display tracking-wider text-sm">DAILY</div>
              <div className="text-gray-400 leading-relaxed">One new puzzle per day, same region for everyone. Come back tomorrow for a new one.</div>
            </div>
            <div className="bg-lab-muted rounded border border-yellow-400/30 p-3 space-y-1">
              <div className="text-yellow-400 font-display tracking-wider text-sm">TRAINING</div>
              <div className="text-gray-400 leading-relaxed">Unlimited puzzles with random regions. Practice as much as you want.</div>
            </div>
          </div>
        </div>

        {/* How to Play */}
        <div className="space-y-2">
          <p className="text-gray-400 text-xs uppercase tracking-widest">How to Play</p>
          <ol className="space-y-3 list-none">
            {[
              'A 3D mesh of the target region is shown in the viewer. Rotate it with your mouse.',
              'Type a brain region name and select from the autocomplete.',
              'After each guess you receive feedback:',
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-synapse flex-shrink-0">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* 3D Viewer legend */}
        <div className="space-y-2">
          <p className="text-gray-400 text-xs uppercase tracking-widest">3D Viewer Colors</p>
          <div className="bg-lab-muted rounded border border-lab-border p-3 space-y-3 text-xs">

            <p className="text-gray-400">The region you are trying to identify is always:</p>
            <div className="space-y-2 pl-1">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-sm flex-shrink-0" style={{ backgroundColor: '#f06060', boxShadow: '0 0 8px #f03030' }} />
                <span><span className="text-white font-bold">Pink</span> — a brain region to identify</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-sm flex-shrink-0" style={{ backgroundColor: '#ffffff', boxShadow: '0 0 8px #aaaaff' }} />
                <span><span className="text-white font-bold">White</span> — a white matter tract to identify</span>
              </div>
            </div>

            <div className="border-t border-lab-border pt-2">
              <p className="text-gray-400 mb-2">Past guesses are shown in the viewer colored by proximity:</p>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-gray-500 text-xs w-6 text-right">Far</span>
                <div className="flex gap-0.5">
                  {['#f06060', '#f09040', '#f0d050', '#a0e060', '#4af0c4'].map(color => (
                    <div key={color} className="w-6 h-4 rounded-sm" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <span className="text-gray-500 text-xs">Close</span>
              </div>
              <p className="text-gray-500">Guessed white matter tracts always appear white.</p>
            </div>
          </div>
        </div>

        {/* Feedback */}
        <div className="bg-lab-muted rounded border border-lab-border p-3 space-y-2">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Guess Feedback</p>
          <div className="flex items-center gap-3">
            <div className="w-20 h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-400" />
            <span className="text-xs text-gray-400">Proximity </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-mono text-xs px-2 py-0.5 bg-white/5 border border-white/10 rounded">← Anterior</span>
            <span className="text-gray-500 text-xs">direction to the target</span>
          </div>
          <div className="text-xs text-gray-500">Distance in mm from your guess to the target</div>
        </div>

        {/* Difficulty */}
        <div className="space-y-2">
          <p className="text-gray-400 text-xs uppercase tracking-widest">Difficulty Tiers</p>
          <div className="space-y-1 text-xs">
            <div className="flex gap-2"><span className="text-blue-400">Easy</span><span className="text-gray-500">— Major regions: cortical lobes, hippocampus, cerebellum…</span></div>
            <div className="flex gap-2"><span className="text-yellow-400">Medium</span><span className="text-gray-500">— Cortical areas, subcortical nuclei, major white matter tracts…</span></div>
            <div className="flex gap-2"><span className="text-red-400">Hard</span><span className="text-gray-500">— All regions including subfields and fine white matter tracts…</span></div>
          </div>
        </div>

        {/* Axes */}
        <div className="space-y-2">
          <p className="text-gray-400 text-xs uppercase tracking-widest">Mouse Brain Axes</p>
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            {[
              { ax: 'A ↔ P', desc: 'Anterior / Posterior' },
              { ax: 'D ↔ V', desc: 'Dorsal / Ventral' },
              { ax: 'M ↔ L', desc: 'Medial / Lateral' },
            ].map(({ ax, desc }) => (
              <div key={ax} className="bg-lab-muted rounded border border-lab-border p-2">
                <div className="text-synapse font-display mb-1">{ax}</div>
                <div className="text-gray-500">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Credits */}
        <div className="pt-4 border-t border-lab-border space-y-2">
          <p className="text-synapse text-xs uppercase tracking-widest mb-3">Credits</p>
          <p className="text-gray-200 text-xs">
            <span className="text-white font-bold">Created by</span> Grant Mannino
          </p>
          <p className="text-gray-200 text-xs">
            <span className="text-white font-bold"> Inspired by</span>{' '}
            <a href="https://neurdle.app" target="_blank" rel="noopener noreferrer" className="text-synapse underline hover:text-white transition-colors">Neurdle</a>
            {' '}by Xander Atalay
          </p>
          <p className="text-gray-200 text-xs">
            <span className="text-white font-bold">Made by Neuroscience PhD Students in Palo Alto, CA.</span>{' '}
            Special thanks to Lucy Anderson, Gracie Grimsrud, and MJ Sushi
          </p>
          <p className="text-gray-500 text-xs pt-1">
            Atlas data from the{' '}
            <span className="text-gray-400">Allen Mouse Brain Atlas CCFv3</span>
          </p>
        </div>

      </div>
    </Modal>
  );
}
