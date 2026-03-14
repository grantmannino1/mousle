// ============================================================
//  lib/regions.ts
//  Region data loading and fuzzy search utilities
// ============================================================

import type { Region } from '@/types';

let cachedRegions: Region[] | null = null;

/** Load all regions from the public JSON file (cached after first load) */
export async function loadRegions(): Promise<Region[]> {
  if (cachedRegions) return cachedRegions;
  const res = await fetch('/data/regions.json');
  const data = await res.json();
  cachedRegions = data.regions as Region[];
  return cachedRegions;
}

/** Filter regions to a specific difficulty tier */
export function filterByDifficulty(
  regions: Region[],
  difficulty: 'easy' | 'medium' | 'hard'
): Region[] {
  // Easy includes easy only
  // Medium includes easy + medium
  // Hard includes all
  if (difficulty === 'easy') return regions.filter((r) => r.difficulty === 'easy');
  if (difficulty === 'medium') return regions.filter((r) => r.difficulty !== 'hard');
  return regions; // hard = all regions
}

/**
 * Search regions by name, abbreviation, or aliases.
 * Returns regions sorted by match quality.
 */
export function searchRegions(
  query: string,
  regions: Region[]
): Region[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();

  const scored = regions.map((r) => {
    const nameL = r.name.toLowerCase();
    const abbrL = r.abbreviation.toLowerCase();
    const aliasesL = r.aliases.map((a) => a.toLowerCase());

    let score = 0;
    if (nameL === q || abbrL === q) score = 100;              // exact match
    else if (nameL.startsWith(q) || abbrL.startsWith(q)) score = 80; // prefix
    else if (aliasesL.some((a) => a === q)) score = 90;       // alias exact
    else if (nameL.includes(q)) score = 60;                    // substring name
    else if (aliasesL.some((a) => a.includes(q))) score = 40; // substring alias
    else if (abbrL.includes(q)) score = 50;                    // substring abbr

    return { region: r, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.region);
}
