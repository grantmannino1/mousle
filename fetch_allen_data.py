#!/usr/bin/env python3
"""
fetch_allen_data.py
===================
Fetches real centroid coordinates from the Allen Brain Atlas API
and computes pairwise centroid distances between all regions.

Run this ONCE to update regions.json with accurate centroids,
then generate distances.json for fast game lookups.

Requirements:
    pip install requests numpy

Usage:
    python fetch_allen_data.py
"""

import json
import math
import requests
from pathlib import Path

# ── Allen API ────────────────────────────────────────────────────────────────

ALLEN_API = "https://api.brain-map.org/api/v2/data"

def fetch_structure(acronym: str) -> dict | None:
    """Fetch structure info from Allen API by acronym."""
    url = (
        f"{ALLEN_API}/Structure/query.json"
        f"?criteria=acronym%3D'{acronym}'"
        f"&include=id,name,acronym,centroid"
    )
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        data = r.json()
        if data["success"] and data["num_rows"] > 0:
            return data["msg"][0]
    except Exception as e:
        print(f"  ⚠ Failed to fetch {acronym}: {e}")
    return None

def fetch_all_structures() -> dict:
    """Fetch all CCFv3 structures."""
    url = (
        f"{ALLEN_API}/Structure/query.json"
        f"?criteria=ontology_id%3D1"  # Mouse CCF ontology
        f"&num_rows=2000"
        f"&include=id,name,acronym,centroid"
    )
    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        data = r.json()
        if data["success"]:
            return {s["acronym"]: s for s in data["msg"]}
    except Exception as e:
        print(f"⚠ Failed to fetch all structures: {e}")
    return {}

# ── Geometry ─────────────────────────────────────────────────────────────────

VOXEL_MM = 0.025  # 25µm CCFv3 voxels → mm

def euclidean_mm(a: list, b: list) -> float:
    """Euclidean distance between two CCF centroids, in mm."""
    return math.sqrt(sum(((ai - bi) * VOXEL_MM) ** 2 for ai, bi in zip(a, b)))

def compute_directions(guess_centroid: list, target_centroid: list) -> list[str]:
    """
    Derive anatomical directions from guess → target.
    CCFv3 axes:
      X: left(0) → right(456)   — lateral axis
      Y: dorsal(0) → ventral(320) — DV axis
      Z: anterior(0) → posterior(528) — AP axis
    """
    gx, gy, gz = guess_centroid
    tx, ty, tz = target_centroid

    dz = tz - gz  # positive = target more posterior
    dy = ty - gy  # positive = target more ventral
    dx = tx - gx

    MIDLINE = 228
    guess_lat = abs(gx - MIDLINE)
    target_lat = abs(tx - MIDLINE)
    lat_delta = target_lat - guess_lat  # positive = target more lateral

    candidates = [
        ("anterior" if dz < 0 else "posterior", abs(dz)),
        ("dorsal" if dy < 0 else "ventral",      abs(dy)),
        ("lateral" if lat_delta > 0 else "medial", abs(lat_delta)),
    ]

    significant = [(d, m) for d, m in candidates if m > 4]
    significant.sort(key=lambda x: x[1], reverse=True)
    return [d for d, _ in significant[:2]]

# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    regions_path = Path("public/data/regions.json")
    distances_path = Path("public/data/distances.json")

    # Load existing regions
    with open(regions_path) as f:
        data = json.load(f)
    regions = data["regions"]

    print(f"Loaded {len(regions)} regions. Fetching centroids from Allen API...")

    # Fetch all Allen structures at once (more efficient)
    all_structures = fetch_all_structures()
    print(f"Fetched {len(all_structures)} structures from Allen API.")

    # Update centroids
    updated = 0
    for region in regions:
        abbr = region["abbreviation"]
        structure = all_structures.get(abbr)
        if structure and structure.get("centroid"):
            c = structure["centroid"]
            # Allen API returns centroid as {"x": ..., "y": ..., "z": ...}
            if isinstance(c, dict):
                region["centroid_ccf"] = [
                    round(c.get("x", region["centroid_ccf"][0])),
                    round(c.get("y", region["centroid_ccf"][1])),
                    round(c.get("z", region["centroid_ccf"][2])),
                ]
                updated += 1
                print(f"  ✓ {abbr}: centroid updated to {region['centroid_ccf']}")
            # Also update Allen ID if found
            if structure.get("id"):
                region["allenId"] = structure["id"]
        else:
            print(f"  · {abbr}: using existing centroid {region['centroid_ccf']}")

    print(f"\nUpdated {updated}/{len(regions)} centroids from Allen API.")

    # Save updated regions
    with open(regions_path, "w") as f:
        json.dump({"regions": regions}, f, indent=2)
    print(f"Saved updated regions.json")

    # ── Compute pairwise distances ────────────────────────────────────────────
    print("\nComputing pairwise distances...")

    distances: dict[str, dict[str, dict]] = {}
    region_ids = [r["id"] for r in regions]
    centroids = {r["id"]: r["centroid_ccf"] for r in regions}

    total = len(regions) * (len(regions) - 1)
    count = 0

    for region_a in regions:
        distances[region_a["id"]] = {}
        for region_b in regions:
            if region_a["id"] == region_b["id"]:
                continue
            count += 1

            dist = euclidean_mm(
                centroids[region_a["id"]],
                centroids[region_b["id"]]
            )
            dirs = compute_directions(
                centroids[region_a["id"]],
                centroids[region_b["id"]]
            )

            distances[region_a["id"]][region_b["id"]] = {
                "distance_mm": round(dist, 2),
                "direction": dirs
            }

    with open(distances_path, "w") as f:
        json.dump(distances, f, indent=2)
    print(f"Saved {distances_path} ({total} pairs).")

    # ── Summary stats ─────────────────────────────────────────────────────────
    all_dists = [
        v["distance_mm"]
        for region_data in distances.values()
        for v in region_data.values()
    ]
    if all_dists:
        print(f"\nDistance stats:")
        print(f"  Min: {min(all_dists):.2f} mm")
        print(f"  Max: {max(all_dists):.2f} mm")
        print(f"  Mean: {sum(all_dists)/len(all_dists):.2f} mm")
        print(f"\n✅ Done! Now use distances.json in your game.")
        print("   Load it in src/lib/distance.ts for more accurate proximity scores.")


if __name__ == "__main__":
    main()
