#!/usr/bin/env python3
"""
fetch_allen_data.py
Fetches ALL structures from Allen Brain Atlas and builds regions.json
with real CCF centroids from the annotation volume lookup endpoint.
"""

import json
import math
import requests
from pathlib import Path

ALLEN_API = "https://api.brain-map.org/api/v2/data"
MESH_DIR = Path("public/meshes")


def fetch_all_structures():
    print("Fetching all structures from Allen API...")
    all_structures = []
    start_row = 0
    num_rows = 2000

    while True:
        url = (
            f"{ALLEN_API}/Structure/query.json"
            f"?criteria=ontology[id$eq1]"
            f"&num_rows={num_rows}&start_row={start_row}"
        )
        r = requests.get(url, timeout=30)
        data = r.json()
        batch = data["msg"]
        all_structures.extend(batch)
        print(f"  Fetched {len(all_structures)} so far...")
        if len(all_structures) >= data["total_rows"]:
            break
        start_row += num_rows

    print(f"Total structures fetched: {len(all_structures)}")
    return all_structures


def fetch_centroids():
    """
    Fetch CCF centroids from the Allen StructureLookup table.
    This table has the actual 3D centroid coordinates for each structure
    in the 25um CCF annotation volume.
    """
    print("Fetching CCF centroids from Allen API...")
    centroids = {}
    start_row = 0
    num_rows = 2000

    while True:
        url = (
            f"{ALLEN_API}/StructureLookup/query.json"
            f"?criteria=ontology[id$eq1]"
            f"&include=structure"
            f"&num_rows={num_rows}&start_row={start_row}"
        )
        r = requests.get(url, timeout=60)
        data = r.json()
        batch = data.get("msg", [])

        for entry in batch:
            sid = entry.get("structure_id")
            # Coordinates are in the 25um CCF space
            x = entry.get("x_ccf")
            y = entry.get("y_ccf")
            z = entry.get("z_ccf")
            if sid and x is not None and y is not None and z is not None:
                centroids[sid] = [round(x), round(y), round(z)]

        print(f"  Fetched {len(centroids)} centroids so far...")
        if not batch or len(batch) < num_rows or start_row + len(batch) >= data.get("total_rows", 0):
            break
        start_row += num_rows

    print(f"Total centroids fetched: {len(centroids)}")
    return centroids


def fetch_centroids_from_structures(structure_ids):
    """
    Fallback: fetch centroid data by querying each structure's
    3D coordinate via the structure graph endpoint.
    Uses the 'graph_order' and known CCF lookup.
    """
    print("Fetching centroids via structure graph coordinates...")
    centroids = {}

    # Batch requests in chunks of 500
    chunk_size = 500
    ids_list = list(structure_ids)

    for i in range(0, len(ids_list), chunk_size):
        chunk = ids_list[i:i+chunk_size]
        ids_str = ",".join(str(x) for x in chunk)
        url = (
            f"{ALLEN_API}/Structure/query.json"
            f"?criteria=[id$in{ids_str}]"
            f"&include=structure_center_of_mass"
            f"&num_rows={chunk_size}"
        )
        try:
            r = requests.get(url, timeout=60)
            data = r.json()
            for s in data.get("msg", []):
                sid = s["id"]
                com = s.get("structure_center_of_mass")
                if com:
                    centroids[sid] = [
                        round(com.get("x", 228)),
                        round(com.get("y", 160)),
                        round(com.get("z", 280)),
                    ]
        except Exception as e:
            print(f"  Warning: chunk {i} failed: {e}")

        print(
            f"  Processed {min(i+chunk_size, len(ids_list))}/{len(ids_list)}...")

    return centroids


def get_difficulty(depth, has_children):
    """Assign difficulty based on depth in the hierarchy."""
    if depth <= 2:
        return "easy"
    elif depth <= 4:
        return "medium"
    else:
        return "hard"


def get_category(structure):
    """Guess category from structure name/acronym."""
    name = structure.get("name", "").lower()

    if any(x in name for x in ["cortex", "gyrus", "sulcus", "area", "field"]):
        return "cortex"
    if any(x in name for x in ["cerebellum", "cerebellar"]):
        return "cerebellum"
    if any(x in name for x in ["medulla", "pons", "midbrain", "brainstem", "tegmentum", "colliculus"]):
        return "brainstem"
    if any(x in name for x in ["olfactory", "piriform"]):
        return "olfactory"
    if any(x in name for x in ["tract", "commissure", "capsule", "fasciculus", "lemniscus", "corpus callosum"]):
        return "fiber"
    return "subcortical"


def compute_directions(guess_centroid, target_centroid):
    gx, gy, gz = guess_centroid
    tx, ty, tz = target_centroid
    dz = tz - gz
    dy = ty - gy
    MIDLINE = 228
    guess_lat = abs(gx - MIDLINE)
    target_lat = abs(tx - MIDLINE)
    lat_delta = target_lat - guess_lat
    candidates = [
        ("anterior" if dz < 0 else "posterior", abs(dz)),
        ("dorsal" if dy < 0 else "ventral", abs(dy)),
        ("lateral" if lat_delta > 0 else "medial", abs(lat_delta)),
    ]
    significant = [(d, m) for d, m in candidates if m > 4]
    significant.sort(key=lambda x: x[1], reverse=True)
    return [d for d, _ in significant[:2]]


def main():
    regions_path = Path("public/data/regions.json")
    distances_path = Path("public/data/distances.json")

    # Load existing regions to preserve fun_facts and aliases
    with open(regions_path) as f:
        existing_data = json.load(f)
    existing_map = {r["id"]: r for r in existing_data["regions"]}

    # Fetch all structures
    structures = fetch_all_structures()
    id_to_structure = {s["id"]: s for s in structures}

    # Get the set of structure IDs that have mesh files
    mesh_ids = set()
    for s in structures:
        if (MESH_DIR / f"{s['id']}.glb").exists():
            mesh_ids.add(s["id"])
    print(f"\n{len(mesh_ids)} structures have mesh files")

    # Try fetching centroids from center_of_mass field
    print("\nAttempting to fetch real CCF centroids...")
    centroids_map = fetch_centroids_from_structures(mesh_ids)

    fetched = len([v for v in centroids_map.values()
                   if v != [228, 160, 280]])
    print(f"Got {fetched} non-default centroids out of {len(mesh_ids)}")

    def get_depth(s):
        depth = 0
        current = s
        while current.get("parent_structure_id"):
            parent_id = current["parent_structure_id"]
            if parent_id in id_to_structure:
                current = id_to_structure[parent_id]
                depth += 1
            else:
                break
        return depth

    # Build regions list
    regions = []
    skipped = 0
    default_centroid_count = 0

    for s in structures:
        sid = s["id"]
        acronym = s.get("acronym", str(sid))
        name = s.get("name", acronym)

        glb_path = MESH_DIR / f"{sid}.glb"
        if not glb_path.exists():
            skipped += 1
            continue

        # Use fetched centroid or fall back to default
        if sid in centroids_map:
            cx, cy, cz = centroids_map[sid]
        else:
            cx, cy, cz = 228, 160, 280
            default_centroid_count += 1

        depth = get_depth(s)
        has_children = any(
            other.get("parent_structure_id") == sid
            for other in structures
        )

        existing = existing_map.get(acronym, {})

        parent_id = s.get("parent_structure_id")
        parent_name = ""
        if parent_id and parent_id in id_to_structure:
            parent_name = id_to_structure[parent_id].get("name", "")

        region = {
            "id": acronym,
            "allenId": sid,
            "name": name,
            "abbreviation": acronym,
            "difficulty": existing.get("difficulty", get_difficulty(depth, has_children)),
            "category": existing.get("category", get_category(s)),
            "parentName": parent_name,
            "centroid_ccf": [cx, cy, cz],
            "fun_fact": existing.get("fun_fact", ""),
            "aliases": existing.get("aliases", []),
        }
        regions.append(region)

    print(f"\nBuilt {len(regions)} regions ({skipped} skipped — no mesh file)")
    print(f"  {default_centroid_count} regions using default centroid (no data)")

    # Save regions
    with open(regions_path, "w") as f:
        json.dump({"regions": regions}, f, indent=2)
    print(f"Saved regions.json")

    # Sanity check
    unique = set(tuple(r["centroid_ccf"]) for r in regions)
    print(f"  {len(unique)} unique centroids (should be close to {len(regions)})")

    # Compute pairwise distances
    print("\nComputing pairwise distances...")
    distances = {}
    centroids = {r["id"]: r["centroid_ccf"] for r in regions}

    for i, region_a in enumerate(regions):
        if i % 20 == 0:
            print(f"  {i}/{len(regions)}...")
        distances[region_a["id"]] = {}
        for region_b in regions:
            if region_a["id"] == region_b["id"]:
                continue
            ax, ay, az = centroids[region_a["id"]]
            bx, by, bz = centroids[region_b["id"]]
            dist = math.sqrt(
                ((bx - ax) * 0.025) ** 2 +
                ((by - ay) * 0.025) ** 2 +
                ((bz - az) * 0.025) ** 2
            )
            dirs = compute_directions(
                centroids[region_a["id"]], centroids[region_b["id"]])
            distances[region_a["id"]][region_b["id"]] = {
                "distance_mm": round(dist, 2),
                "direction": dirs,
            }

    with open(distances_path, "w") as f:
        json.dump(distances, f, separators=(",", ":"))
    size_mb = distances_path.stat().st_size / 1e6
    print(f"Saved distances.json ({size_mb:.1f} MB)")
    print(f"\n✅ Done! {len(regions)} regions ready.")


if __name__ == "__main__":
    main()
