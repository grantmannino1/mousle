// ============================================================
//  components/DifficultySelector.tsx
// ============================================================

'use client';

const TIERS = [
  { id: 'easy' as const, label: 'Easy', color: 'text-blue-400', hint: '~10 major regions' },
  { id: 'medium' as const, label: 'Medium', color: 'text-yellow-400', hint: '~25 regions' },
  { id: 'hard' as const, label: 'Hard', color: 'text-red-400', hint: '~40 regions' },
];

interface Props {
  value: 'easy' | 'medium' | 'hard';
  onChange: (d: 'easy' | 'medium' | 'hard') => void;
  disabled?: boolean;
}

export function DifficultySelector({ value, onChange, disabled }: Props) {
  return (
    <div className="flex gap-2 justify-center">
      {TIERS.map((tier) => (
        <button
          key={tier.id}
          onClick={() => !disabled && onChange(tier.id)}
          disabled={disabled}
          title={tier.hint}
          className={`
            px-4 py-1.5 rounded font-display text-xs tracking-widest
            border transition-all duration-200
            ${value === tier.id
              ? `border-current ${tier.color} bg-white/5`
              : 'border-lab-border text-gray-500 hover:border-gray-500'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {tier.label.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
