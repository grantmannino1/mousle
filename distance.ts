// ============================================================
//  lib/distance.ts
// ============================================================

import type {
    Region,
    GuessResult,
    AnatomicalDirection,
    DistanceMap,
} from '@/types';

const VOXEL_TO_MM = 0.025;

// Effective maximum distance for proximity scaling.
// Mouse brain is ~11mm AP × 8mm DV × 11mm LR.
// Using 8mm so the scale feels meaningful:
//   0mm  → 100% (correct)
//   1mm  →  88% (very close, same subregion)
//   2mm  →  75% (adjacent region)
//   3mm  →  44% (wrong area, feels far — uses square falloff)
//   5mm  →  10% (opposite end of brain)
//   8mm+ →   0%
const MAX_BRAIN_DISTANCE_MM = 8;

function euclideanDistanceMM(
    a: [number, number, number],
    b: [number, number, number]
): number {
    const dx = (b[0] - a[0]) * VOXEL_TO_MM;
    const dy = (b[1] - a[1]) * VOXEL_TO_MM;
    const dz = (b[2] - a[2]) * VOXEL_TO_MM;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function computeDirections(
    guess: Region,
    target: Region
): AnatomicalDirection[] {
    const [gx, gy, gz] = guess.centroid_ccf;
    const [tx, ty, tz] = target.centroid_ccf;

    const dz = tz - gz;
    const dy = ty - gy;

    const MIDLINE = 228;
    const guessLateral = Math.abs(gx - MIDLINE);
    const targetLateral = Math.abs(tx - MIDLINE);
    const lateralDelta = targetLateral - guessLateral;

    const candidates: { dir: AnatomicalDirection; magnitude: number }[] = [
        { dir: dz < 0 ? 'anterior' : 'posterior', magnitude: Math.abs(dz) },
        { dir: dy < 0 ? 'dorsal' : 'ventral', magnitude: Math.abs(dy) },
        { dir: lateralDelta > 0 ? 'lateral' : 'medial', magnitude: Math.abs(lateralDelta) },
    ];

    const significant = candidates
        .filter((c) => c.magnitude > 4)
        .sort((a, b) => b.magnitude - a.magnitude);

    return significant.slice(0, 2).map((c) => c.dir);
}

export function getGuessResult(
    guessRegion: Region,
    targetRegion: Region,
    distanceData?: DistanceMap
): GuessResult {
    const isCorrect = guessRegion.id === targetRegion.id;

    if (isCorrect) {
        return {
            region: guessRegion,
            distance_mm: 0,
            proximity_pct: 100,
            direction: [],
            isCorrect: true,
        };
    }

    const precomputed = distanceData?.[guessRegion.id]?.[targetRegion.id];
    let distance_mm: number;
    let direction: AnatomicalDirection[];

    if (precomputed) {
        distance_mm = precomputed.distance_mm;
        direction = precomputed.direction;
    } else {
        distance_mm = euclideanDistanceMM(
            guessRegion.centroid_ccf,
            targetRegion.centroid_ccf
        );
        direction = computeDirections(guessRegion, targetRegion);
    }

    distance_mm = Math.round(distance_mm * 10) / 10;

    // Square falloff so mid-range distances feel noticeably far:
    // proximity = (1 - d/MAX)² × 100, capped 0–99
    const ratio = Math.min(distance_mm / MAX_BRAIN_DISTANCE_MM, 1);
    const proximity_pct = Math.max(0, Math.min(99, Math.round((1 - ratio * ratio) * 100)));

    return {
        region: guessRegion,
        distance_mm,
        proximity_pct,
        direction,
        isCorrect: false,
    };
}