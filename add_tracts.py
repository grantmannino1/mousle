#!/usr/bin/env python3
"""
add_tracts.py
Downloads GLB meshes for major white matter tracts and adds them to regions.json.
Run from project root: python add_tracts.py
"""

import json
import math
import struct
import requests
import numpy as np
from pathlib import Path
from pygltflib import GLTF2

MESH_DIR = Path("public/meshes")
REGIONS_PATH = Path("public/data/regions.json")
DISTANCES_PATH = Path("public/data/distances.json")

# Major tracts: (allen_id, acronym, name, difficulty)
TRACTS = [
    # Easy-recognizable major tracts → medium
    (776,  "cc",   "Corpus callosum",                        "medium"),
    (1099, "fxs",  "Fornix system",                          "medium"),
    (6,    "int",  "Internal capsule",                       "medium"),
    (579,  "ec",   "External capsule",                       "medium"),
    (125,  "opt",  "Optic tract",                            "medium"),
    (78,   "mcp",  "Middle cerebellar peduncle",             "medium"),
    (658,  "ll",   "Lateral lemniscus",                      "medium"),
    (697,  "ml",   "Medial lemniscus",                       "medium"),
    (802,  "sm",   "Stria medullaris",                       "medium"),
    (301,  "st",   "Stria terminalis",                       "medium"),
    # More specific → hard
    (956,  "fa",   "Corpus callosum, anterior forceps",      "hard"),
    (986,  "ccs",  "Corpus callosum, splenium",              "hard"),
    (1108, "ccg",  "Genu of corpus callosum",                "hard"),
    (436,  "fx",   "Columns of the fornix",                  "hard"),
    (603,  "fi",   "Fimbria",                                "hard"),
    (443,  "dhc",  "Dorsal hippocampal commissure",          "hard"),
    (784,  "cst",  "Corticospinal tract",                    "hard"),
    (924,  "cpd",  "Cerebral peduncle",                      "hard"),
    (326,  "scp",  "Superior cerebellar peduncles",          "hard"),
    (1123, "icp",  "Inferior cerebellar peduncle",           "hard"),
    (595,  "fr",   "Fasciculus retroflexus",                 "hard"),
    (158,  "pc",   "Posterior commissure",                   "hard"),
    (900,  "aco",  "Anterior commissure, olfactory limb",    "hard"),
    (908,  "act",  "Anterior commissure, temporal limb",     "hard"),
    (690,  "mtt",  "Mammillothalamic tract",                 "hard"),
]

MIDLINE_X = 228


def download_mesh(allen_id: int) -> bool:
    """Download GLB mesh from Allen API if not already present."""
    path = MESH_DIR / f"{allen_id}.glb"
    if path.exists():
        print(f"  {allen_id}: already exists, skipping download")
        return True

    url = f"https://ccf.brain-map.org/api/v2/mesh_combined/{allen_id}.obj?resolution=25"
    # Try the 3D viewer mesh endpoint
    urls_to_try = [
        f"https://ccf.brain-map.org/api/v2/mesh_combined/{allen_id}.glb",
        f"https://mouse.brain-map.org/api/v2/well_known_file_download/{allen_id}?filename={allen_id}.glb",
        f"https://api.brain-map.org/api/v2/mesh/{allen_id}.glb",
    ]

    for url in urls_to_try:
        try:
            r = requests.get(url, timeout=30)
            if r.status_code == 200 and len(r.content) > 1000:
                path.write_bytes(r.content)
                print(
                    f"  {allen_id}: downloaded ({len(r.content)//1024}KB) from {url}")
                return True
        except Exception as e:
            continue

    print(f"  {allen_id}: ❌ could not download from any URL")
    return False


def get_centroid_from_glb(glb_path: Path):
    """Extract mean vertex position from a GLB file."""
    try:
        gltf = GLTF2().load(str(glb_path))
        all_positions = []
        for mesh in gltf.meshes:
            for primitive in mesh.primitives:
                pos_idx = primitive.attributes.POSITION
                if pos_idx is None:
                    continue
                accessor = gltf.accessors[pos_idx]
                buffer_view = gltf.bufferViews[accessor.bufferView]
                blob = gltf.binary_blob()
                if blob is None:
                    continue
                offset = buffer_view.byteOffset + (accessor.byteOffset or 0)
                raw = blob[offset: offset + accessor.count * 12]
                verts = np.frombuffer(raw, dtype=np.float32).reshape(-1, 3)
                all_positions.append(verts)
        if not all_positions:
            return None
        all_verts = np.concatenate(all_positions, axis=0)
        return all_verts.mean(axis=0).tolist()
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
    existing_ids = {r["id"] for r in regions}
    print(f"  {len(regions)} existing regions")

    print(f"\nProcessing {len(TRACTS)} tracts...")
    added = 0
    failed = 0

    for allen_id, acronym, name, difficulty in TRACTS:
        print(f"\n{name} ({acronym}, id={allen_id}):")

        if acronym in existing_ids:
            print(f"  Already in regions.json, skipping")
            continue

        # Download mesh
        ok = download_mesh(allen_id)
        if not ok:
            failed += 1
            continue

        # Get centroid from mesh
        glb_path = MESH_DIR / f"{allen_id}.glb"
        centroid = get_centroid_from_glb(glb_path)
        if centroid is not None:
            ccf = [round(centroid[0] / 25), round(centroid[1] / 25),
                   round(centroid[2] / 25)]
        else:
            ccf = [228, 160, 280]
            print(f"  Warning: using default centroid")

        region = {
            "id": acronym,
            "allenId": allen_id,
            "name": name,
            "abbreviation": acronym,
            "difficulty": difficulty,
            "category": "fiber",
            "parentName": "Fiber tracts",
            "centroid_ccf": ccf,
            "fun_fact": "",
            "aliases": [],
        }
        regions.append(region)
        existing_ids.add(acronym)
        added += 1
        print(f"  ✅ Added with centroid {ccf}")

    print(f"\n{added} tracts added, {failed} failed")

    # Save updated regions.json
    with open(REGIONS_PATH, "w") as f:
        json.dump({"regions": regions}, f, indent=2)
    print(f"Saved regions.json ({len(regions)} total regions)")

    # Recompute distances
    print("\nRecomputing distances...")
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
    print(f"Saved distances.json ({size_mb:.1f} MB)")
    print(f"\n✅ Done!")


if __name__ == "__main__":
    main()
