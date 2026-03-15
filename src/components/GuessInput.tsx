// ============================================================
//  components/GuessInput.tsx
//  Autocomplete input for submitting region guesses.
// ============================================================

'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Region } from '@/types';
import { searchRegions, filterByDifficulty } from '@/lib/regions';

interface Props {
  allRegions: Region[];
  difficulty: 'easy' | 'medium' | 'hard';
  onSubmit: (region: Region) => void;
  disabled: boolean;
  alreadyGuessed: string[];
}

export function GuessInput({
  allRegions,
  difficulty,
  onSubmit,
  disabled,
  alreadyGuessed,
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Region[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Memoize pool so it doesn't create a new array reference on every render
  const pool = useMemo(
    () => filterByDifficulty(allRegions, difficulty),
    [allRegions, difficulty]
  );

  // Memoize alreadyGuessed as a Set for fast lookup
  const guessedSet = useMemo(
    () => new Set(alreadyGuessed),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alreadyGuessed.join(',')]
  );

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    const found = searchRegions(query, pool).filter((r) => !guessedSet.has(r.id));
    setResults(found.slice(0, 8));
    setIsOpen(found.length > 0);
    setSelectedIndex(-1);
  }, [query, pool, guessedSet]);

  const handleSelect = useCallback(
    (region: Region) => {
      onSubmit(region);
      setQuery('');
      setResults([]);
      setIsOpen(false);
      inputRef.current?.focus();
    },
    [onSubmit]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      } else if (results.length === 1) {
        handleSelect(results[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const categoryColors: Record<string, string> = {
    cortex: 'text-purple-400',
    subcortical: 'text-blue-400',
    cerebellum: 'text-green-400',
    brainstem: 'text-yellow-400',
    olfactory: 'text-pink-400',
    fiber: 'text-gray-400',
  };

  return (
    <div className="relative w-full">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          disabled={disabled}
          placeholder={
            disabled
              ? 'Game over'
              : `Type a brain region... (${pool.length} regions)`
          }
          autoComplete="off"
          spellCheck={false}
          className="
            flex-1 bg-lab-surface border border-lab-border rounded px-4 py-3
            font-mono text-sm text-gray-200 placeholder-gray-600
            focus:outline-none focus:border-synapse focus:ring-1 focus:ring-synapse/30
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors
          "
        />
        <button
          onClick={() => {
            if (selectedIndex >= 0 && results[selectedIndex]) {
              handleSelect(results[selectedIndex]);
            } else if (results.length === 1) {
              handleSelect(results[0]);
            }
          }}
          disabled={disabled || results.length === 0}
          className="
            px-5 py-3 bg-synapse/20 border border-synapse/40 rounded
            font-display text-xs tracking-widest text-synapse
            hover:bg-synapse/30 hover:border-synapse
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-all
          "
        >
          GUESS
        </button>
      </div>

      {isOpen && results.length > 0 && (
        <div className="
          absolute top-full left-0 right-0 mt-1 z-50
          bg-lab-surface border border-lab-border rounded
          shadow-xl shadow-black/50
          max-h-64 overflow-y-auto
        ">
          {results.map((region, i) => (
            <button
              key={region.id}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(region);
              }}
              className={`
                w-full text-left px-4 py-2.5 flex items-center justify-between
                transition-colors
                ${i === selectedIndex
                  ? 'bg-synapse/20 text-synapse'
                  : 'text-gray-300 hover:bg-lab-muted'
                }
                ${i !== 0 ? 'border-t border-lab-border' : ''}
              `}
            >
              <div>
                <span className="font-mono text-sm">{region.name}</span>
                {region.abbreviation !== region.name && (
                  <span className="text-gray-500 font-mono text-xs ml-2">
                    ({region.abbreviation})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <span className={`text-xs font-mono ${categoryColors[region.category] ?? 'text-gray-500'}`}>
                  {region.category}
                </span>
                <span className="text-xs text-gray-600 font-mono">
                  {region.parentName}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
