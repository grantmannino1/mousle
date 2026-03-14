// ============================================================
//  components/ProximityBar.tsx
//  Visual proximity percentage bar, red → yellow → green.
// ============================================================

'use client';

interface Props {
  pct: number; // 0–100
}

function pctToColor(pct: number): string {
  if (pct >= 90) return '#4af0c4'; // synapse green — very close
  if (pct >= 70) return '#a0e060'; // yellow-green
  if (pct >= 50) return '#f0d050'; // yellow
  if (pct >= 30) return '#f09040'; // orange
  return '#f06060';                // red — far away
}

export function ProximityBar({ pct }: Props) {
  const color = pctToColor(pct);

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      {/* Bar track */}
      <div className="flex-1 h-2 bg-lab-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {/* Percentage label */}
      <span
        className="font-mono text-xs w-9 text-right flex-shrink-0"
        style={{ color }}
      >
        {pct}%
      </span>
    </div>
  );
}
