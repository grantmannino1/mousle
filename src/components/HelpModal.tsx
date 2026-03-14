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
          Identify today's mystery mouse brain region from the{' '}
          <span className="text-synapse">Allen CCFv3 atlas</span>.
          You have <span className="text-white font-bold">6 guesses</span>.
        </p>

        <ol className="space-y-3 list-none">
          {[
            'A 3D mesh of the target region is shown. Rotate it with your mouse.',
            'Type a brain region name and select from the autocomplete.',
            'After each guess you receive feedback:',
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="text-synapse flex-shrink-0">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className="bg-lab-muted rounded border border-lab-border p-3 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-20 h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-400" />
            <span className="text-xs text-gray-400">Proximity % (higher = closer)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-mono text-xs px-2 py-0.5 bg-white/5 border border-white/10 rounded">← Anterior</span>
            <span className="text-gray-500 text-xs">direction to the target</span>
          </div>
          <div className="text-xs text-gray-500">Distance in mm from your guess to the target</div>
        </div>

        <div className="space-y-2">
          <p className="text-gray-400 text-xs uppercase tracking-widest">Progressive Hints</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex gap-2 items-start">
              <span className="text-synapse flex-shrink-0">After guess 3:</span>
              <span className="text-gray-400">Ghost brain outline appears for spatial context</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-synapse flex-shrink-0">After guess 5:</span>
              <span className="text-gray-400">Neighboring structures are labeled</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-gray-400 text-xs uppercase tracking-widest">Difficulty Tiers</p>
          <div className="space-y-1 text-xs">
            <div className="flex gap-2"><span className="text-blue-400">Easy</span><span className="text-gray-500">— Major regions: cortex lobes, hippocampus, cerebellum…</span></div>
            <div className="flex gap-2"><span className="text-yellow-400">Medium</span><span className="text-gray-500">— Cortical areas, subcortical nuclei, basal ganglia…</span></div>
            <div className="flex gap-2"><span className="text-red-400">Hard</span><span className="text-gray-500">— All regions including subfields (CA1, CA3, LGd…)</span></div>
          </div>
        </div>

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
            <span className="text-white font-bold">Created by</span> Grant Mannino &amp; Xander Atalay
          </p>
          <p className="text-gray-200 text-xs">
            <span className="text-white font-bold">Inspired by</span>{' '}
            <a href="https://neurdle.app" target="_blank" rel="noopener noreferrer" className="text-synapse underline hover:text-white transition-colors">Neurdle</a>
            {' '}by Xander Atalay
          </p>
          <p className="text-gray-200 text-xs">
            <span className="text-white font-bold">Conceptual help from</span> Lucy Anderson &amp; Gracie Grimsrud &amp; MJ Sushi
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