// ============================================================
//  lib/distance.ts
//  Computes distance and anatomical direction between two regions.
//
//  Allen CCFv3 coordinate convention (25µm voxels):
//    X axis: left (0) → right (456)   → lateral/medial
//    Y axis: dorsal (0) → ventral (320) → dorsal/ventral
//    Z axis: anterior (0) → posterior (528) → anterior/posterior
//
//  We use centroid-to-centroid distance as a fallback when
//  no pre-computed boundary distance is available.
//  All distances reported in mm (multiply voxels by 0.025).
// ============================================================

import type {
  Region,
  GuessResult,
  AnatomicalDirection,
  DistanceMap,
} from '@/types';

// 1 voxel = 25 µm = 0.025 mm (Allen CCFv3 at 25µm resolution)
const VOXEL_TO_MM = 0.025;

// True maximum centroid-to-centroid distance in the CCF volume.
// CCF dimensions: 456 × 320 × 528 voxels → 11.4 × 8.0 × 13.2 mm
// Diagonal ≈ sqrt(11.4² + 8² + 13.2²) ≈ 19mm, but real region
// centroids span ~14mm at most. Using 14 gives a well-spread 0–100% scale.
const MAX_BRAIN_DISTANCE_MM = 14;

/**
 * Compute Euclidean distance between two CCF centroids, in mm.
 */
function euclideanDistanceMM(
  a: [number, number, number],
  b: [number, number, number]
): number {
  const dx = (b[0] - a[0]) * VOXEL_TO_MM;
  const dy = (b[1] - a[1]) * VOXEL_TO_MM;
  const dz = (b[2] - a[2]) * VOXEL_TO_MM;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Derive the top 2 anatomical directions from guess → target.
 *
 * CCF axes:
 *   Z: target.z < guess.z → target is MORE anterior (lower Z = anterior)
 *   Z: target.z > guess.z → target is MORE posterior
 *   Y: target.y < guess.y → target is MORE dorsal (lower Y = dorsal)
 *   Y: target.y > guess.y → target is MORE ventral
 *   X: compare absolute distance from midline (X=228 is approx midline)
 */
function computeDirections(
  guess: Region,
  target: Region
): AnatomicalDirection[] {
  const [gx, gy, gz] = guess.centroid_ccf;
  const [tx, ty, tz] = target.centroid_ccf;

  const dz = tz - gz; // positive = target is more posterior
  const dy = ty - gy; // positive = target is more ventral

  // Lateral/medial: compare distance from midline
  const MIDLINE = 228;
  const guessLateral = Math.abs(gx - MIDLINE);
  const targetLateral = Math.abs(tx - MIDLINE);
  const lateralDelta = targetLateral - guessLateral; // positive = target more lateral

  // Build list of (direction, magnitude) pairs
  const candidates: { dir: AnatomicalDirection; magnitude: number }[] = [
    { dir: dz < 0 ? 'anterior' : 'posterior', magnitude: Math.abs(dz) },
    { dir: dy < 0 ? 'dorsal' : 'ventral', magnitude: Math.abs(dy) },
    {
      dir: lateralDelta > 0 ? 'lateral' : 'medial',
      magnitude: Math.abs(lateralDelta),
    },
  ];

  // Only include axes with meaningful displacement (>4 voxels = 0.1mm)
  const significant = candidates
    .filter((c) => c.magnitude > 4)
    .sort((a, b) => b.magnitude - a.magnitude);

  return significant.slice(0, 2).map((c) => c.dir);
}

/**
 * Main function: given a guessed region and the target,
 * return the full GuessResult with distance, proximity %, and directions.
 *
 * @param guessRegion   The region the player guessed
 * @param targetRegion  Today's answer
 * @param distanceData  Optional pre-computed distances (from distances.json)
 */
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

  // Try to use pre-computed boundary distance first
  const precomputed = distanceData?.[guessRegion.id]?.[targetRegion.id];
  let distance_mm: number;
  let direction: AnatomicalDirection[];

  if (precomputed) {
    distance_mm = precomputed.distance_mm;
    direction = precomputed.direction;
  } else {
    // Fallback: centroid Euclidean distance
    distance_mm = euclideanDistanceMM(
      guessRegion.centroid_ccf,
      targetRegion.centroid_ccf
    );
    direction = computeDirections(guessRegion, targetRegion);
  }

  // Clamp and round
  distance_mm = Math.round(distance_mm * 10) / 10;

  // proximity_pct: 0 = as far as possible, 100 = correct
  // Uses a non-linear scale so nearby guesses feel meaningfully different.
  // A region 1mm away → ~93%, 5mm → ~64%, 10mm → ~29%, 14mm → 0%
  const proximity_pct = Math.max(
    0,
    Math.min(99, Math.round((1 - distance_mm / MAX_BRAIN_DISTANCE_MM) * 100))
  );

  return {
    region: guessRegion,
    distance_mm,
    proximity_pct,
    direction,
    isCorrect: false,
  };
}