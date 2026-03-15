#!/usr/bin/env python3
"""
compute_centroids_from_meshes.py
Reads each GLB mesh file, extracts vertex positions, computes the centroid,
then updates regions.json and recomputes distances.json.

Run from project root:
    python compute_centroids_from_meshes.py
"""

import json
import math
import struct
import numpy as np
from pathlib import Path
from pygltflib import GLTF2

MESH_DIR = Path("public/meshes")
REGIONS_PATH = Path("public/data/regions.json")
DISTANCES_PATH = Path("public/data/distances.json")

MIDLINE_X = 228


def get_centroid_from_glb(glb_path: Path):
    """Extract mean vertex position from a GLB file (in CCF voxel space)."""
    try:
        gltf = GLTF2().load(str(glb_path))

        all_positions = []

        for mesh in gltf.meshes:
            for primitive in mesh.primitives:
                pos_accessor_idx = primitive.attributes.POSITION
                if pos_accessor_idx is None:
                    continue

                accessor = gltf.accessors[pos_accessor_idx]
                buffer_view = gltf.bufferViews[accessor.bufferView]
                buffer = gltf.buffers[buffer_view.buffer]

                # Get binary data
                blob = gltf.binary_blob()
                if blob is None:
                    continue

                offset = buffer_view.byteOffset + (accessor.byteOffset or 0)
                count = accessor.count
                # VEC3 float = 12 bytes each
                raw = blob[offset: offset + count * 12]
                verts = np.frombuffer(raw, dtype=np.float32).reshape(-1, 3)
                all_positions.append(verts)

        if not all_positions:
            return None

        all_verts = np.concatenate(all_positions, axis=0)
        centroid = all_verts.mean(axis=0)
        return centroid.tolist()

    except Exception as e:
        print(f"  Warning: could not read {glb_path.name}: {e}")
        return None


def compute_directions(a_ccf, b_ccf):
    ax, ay, az = a_ccf
    bx, by, bz = b_ccf
    dz = bz - az
    dy = by - ay
    a_lat = abs(ax - MIDLINE_X)
    b_lat = abs(bx - MIDLINE_X)
    lat_delta = b_lat - a_lat
    candidates = [
        ("anterior" if dz < 0 else "posterior", abs(dz)),
        ("dorsal" if dy < 0 else "ventral",   abs(dy)),
        ("lateral" if lat_delta > 0 else "medial", abs(lat_delta)),
    ]
    significant = sorted([(d, m) for d, m in candidates if m > 4],
                         key=lambda x: x[1], reverse=True)
    return [d for d, _ in significant[:2]]


def main():
    print("Loading regions.json...")
    with open(REGIONS_PATH) as f:
        data = json.load(f)
    regions = data["regions"]
    print(f"  {len(regions)} regions loaded")

    # Build allenId → region mapping
    allen_to_region = {r["allenId"]: r for r in regions}

    print("\nExtracting centroids from GLB meshes...")
    found = 0
    failed = 0

    for glb_path in sorted(MESH_DIR.glob("*.glb")):
        allen_id = int(glb_path.stem)
        if allen_id not in allen_to_region:
            continue

        centroid = get_centroid_from_glb(glb_path)
        if centroid is not None:
            # GLB meshes from Allen are in µm space.
            # CCF is 25µm resolution, so divide by 25 to get voxel coordinates.
            allen_to_region[allen_id]["centroid_ccf"] = [
                round(centroid[0] / 25),
                round(centroid[1] / 25),
                round(centroid[2] / 25),
            ]
            found += 1
        else:
            failed += 1
            print(f"  Failed: {glb_path.name}")

    print(f"\n  {found} centroids extracted, {failed} failed")

    # Sanity check
    unique = set(tuple(r["centroid_ccf"]) for r in regions)
    print(f"  {len(unique)} unique centroids (should be close to {len(regions)})")

    # Print a few samples
    print("\nSample centroids:")
    for r in regions[:5]:
        print(f"  {r['id']:12s} {r['centroid_ccf']}")

    # Save updated regions.json
    with open(REGIONS_PATH, "w") as f:
        json.dump({"regions": regions}, f, indent=2)
    print(f"\nSaved {REGIONS_PATH}")

    # Recompute distances
    print("\nComputing pairwise distances...")
    centroids = {r["id"]: r["centroid_ccf"] for r in regions}
    distances = {}

    for i, r_a in enumerate(regions):
        if i % 20 == 0:
            print(f"  {i}/{len(regions)}...")
        distances[r_a["id"]] = {}
        for r_b in regions:
            if r_a["id"] == r_b["id"]:
                continue
            ax, ay, az = centroids[r_a["id"]]
            bx, by, bz = centroids[r_b["id"]]
            dist = math.sqrt(
                ((bx - ax) * 0.025) ** 2 +
                ((by - ay) * 0.025) ** 2 +
                ((bz - az) * 0.025) ** 2
            )
            dirs = compute_directions(
                centroids[r_a["id"]], centroids[r_b["id"]])
            distances[r_a["id"]][r_b["id"]] = {
                "distance_mm": round(dist, 2),
                "direction": dirs,
            }

    with open(DISTANCES_PATH, "w") as f:
        json.dump(distances, f, separators=(",", ":"))
    size_mb = DISTANCES_PATH.stat().st_size / 1e6
    print(f"Saved {DISTANCES_PATH} ({size_mb:.1f} MB)")
    print(f"\n✅ Done!")


if __name__ == "__main__":
    main()
