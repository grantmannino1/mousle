#!/usr/bin/env python3
"""
compute_distances.py
Computes pairwise distances and directions between all regions
using centroids already stored in regions.json (no Allen API needed).

Run from project root:
    python compute_distances.py
"""

import json
import math
from pathlib import Path

REGIONS_PATH = Path("public/data/regions.json")
DISTANCES_PATH = Path("public/data/distances.json")

VOXEL_TO_MM = 0.025
MIDLINE_X = 228  # approximate CCF midline


def euclidean_mm(a, b):
    dx = (b[0] - a[0]) * VOXEL_TO_MM
    dy = (b[1] - a[1]) * VOXEL_TO_MM
    dz = (b[2] - a[2]) * VOXEL_TO_MM
    return math.sqrt(dx*dx + dy*dy + dz*dz)


def compute_directions(a_ccf, b_ccf):
    """Return up to 2 anatomical directions from region A → region B."""
    ax, ay, az = a_ccf
    bx, by, bz = b_ccf

    dz = bz - az   # positive = B is more posterior
    dy = by - ay   # positive = B is more ventral

    a_lat = abs(ax - MIDLINE_X)
    b_lat = abs(bx - MIDLINE_X)
    lat_delta = b_lat - a_lat  # positive = B is more lateral

    candidates = [
        ("anterior" if dz < 0 else "posterior", abs(dz)),
        ("dorsal" if dy < 0 else "ventral",   abs(dy)),
        ("lateral" if lat_delta > 0 else "medial", abs(lat_delta)),
    ]

    # Only axes with displacement > 4 voxels (0.1 mm)
    significant = sorted(
        [(d, m) for d, m in candidates if m > 4],
        key=lambda x: x[1], reverse=True
    )
    return [d for d, _ in significant[:2]]


def main():
    print(f"Loading regions from {REGIONS_PATH}...")
    with open(REGIONS_PATH) as f:
        data = json.load(f)

    regions = data["regions"]
    print(f"  {len(regions)} regions loaded.")

    # Verify centroids look reasonable (not all the same)
    centroids = {r["id"]: r["centroid_ccf"] for r in regions}
    unique = set(tuple(c) for c in centroids.values())
    print(f"  {len(unique)} unique centroids (should equal {len(regions)} or close)")

    if len(unique) < len(regions) * 0.5:
        print("WARNING: More than half the centroids are identical!")
        print("Check that regions.json has real centroid_ccf values.")
        return

    print(
        f"\nComputing {len(regions) * (len(regions)-1)} pairwise distances...")
    distances = {}

    for i, r_a in enumerate(regions):
        if i % 20 == 0:
            print(f"  {i}/{len(regions)}...")
        distances[r_a["id"]] = {}
        for r_b in regions:
            if r_a["id"] == r_b["id"]:
                continue
            dist = euclidean_mm(r_a["centroid_ccf"], r_b["centroid_ccf"])
            dirs = compute_directions(r_a["centroid_ccf"], r_b["centroid_ccf"])
            distances[r_a["id"]][r_b["id"]] = {
                "distance_mm": round(dist, 2),
                "direction": dirs,
            }

    print(f"\nSaving to {DISTANCES_PATH}...")
    with open(DISTANCES_PATH, "w") as f:
        # compact = smaller file
        json.dump(distances, f, separators=(",", ":"))

    size_mb = DISTANCES_PATH.stat().st_size / 1e6
    print(f"Done! {DISTANCES_PATH} is {size_mb:.1f} MB")

    # Sanity check a few values
    print("\nSanity check (should NOT be 0.0 for different regions):")
    ids = list(distances.keys())[:3]
    for a in ids:
        b = [k for k in distances[a] if k != a][0]
        entry = distances[a][b]
        print(f"  {a} → {b}: {entry['distance_mm']} mm {entry['direction']}")


if __name__ == "__main__":
    main()
