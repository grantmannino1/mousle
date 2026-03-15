#!/usr/bin/env python3
"""
download_tract_meshes.py
Downloads tract meshes as OBJ from Allen and converts to GLB.
Run from project root: python download_tract_meshes.py

Requires: pip install pygltflib numpy requests
"""

import json
import math
import struct
import requests
import numpy as np
from pathlib import Path
from pygltflib import GLTF2, BufferView, Accessor, Mesh, Primitive, Buffer, Asset, Scene, Node
from pygltflib.validator import validate, summary

MESH_DIR = Path("public/meshes")
REGIONS_PATH = Path("public/data/regions.json")
DISTANCES_PATH = Path("public/data/distances.json")
BASE_URL = "https://download.alleninstitute.org/informatics-archive/current-release/mouse_ccf/annotation/ccf_2017/structure_meshes"

MIDLINE_X = 228

# Tracts to add: (allen_id, acronym, name, difficulty)
TRACTS = [
    (6,    "int",  "Internal capsule",                       "medium"),
    (125,  "opt",  "Optic tract",                            "medium"),
    (78,   "mcp",  "Middle cerebellar peduncle",             "medium"),
    (658,  "ll",   "Lateral lemniscus",                      "medium"),
    (697,  "ml",   "Medial lemniscus",                       "medium"),
    (802,  "sm",   "Stria medullaris",                       "medium"),
    (301,  "st",   "Stria terminalis",                       "medium"),
    (436,  "fx",   "Columns of the fornix",                  "hard"),
    (603,  "fi",   "Fimbria",                                "hard"),
    (443,  "dhc",  "Dorsal hippocampal commissure",          "hard"),
    (784,  "cst",  "Corticospinal tract",                    "hard"),
    (595,  "fr",   "Fasciculus retroflexus",                 "hard"),
    (158,  "pc",   "Posterior commissure",                   "hard"),
    (900,  "aco",  "Anterior commissure, olfactory limb",    "hard"),
    (908,  "act",  "Anterior commissure, temporal limb",     "hard"),
    (690,  "mtt",  "Mammillothalamic tract",                 "hard"),
    # Re-do the ones that downloaded as garbage
    (697,  "ml",   "Medial lemniscus",                       "medium"),
    (956,  "fa",   "Corpus callosum, anterior forceps",      "hard"),
    (986,  "ccs",  "Corpus callosum, splenium",              "hard"),
    (1108, "ccg",  "Genu of corpus callosum",                "hard"),
    (1123, "icp",  "Inferior cerebellar peduncle",           "hard"),
]

# Deduplicate by allen_id
seen = set()
TRACTS_DEDUP = []
for t in TRACTS:
    if t[0] not in seen:
        seen.add(t[0])
        TRACTS_DEDUP.append(t)
TRACTS = TRACTS_DEDUP


def parse_obj(obj_text: str):
    """Parse OBJ file, return vertices and triangle indices."""
    vertices = []
    indices = []
    for line in obj_text.splitlines():
        parts = line.strip().split()
        if not parts:
            continue
        if parts[0] == 'v':
            vertices.append(
                [float(parts[1]), float(parts[2]), float(parts[3])])
        elif parts[0] == 'f':
            # Handle face formats: f v1 v2 v3 or f v1/vt1/vn1 ...
            face_verts = []
            for p in parts[1:]:
                face_verts.append(int(p.split('/')[0]) - 1)  # OBJ is 1-indexed
            # Triangulate if needed (fan triangulation)
            for i in range(1, len(face_verts) - 1):
                indices.extend([face_verts[0], face_verts[i], face_verts[i+1]])
    return np.array(vertices, dtype=np.float32), np.array(indices, dtype=np.uint32)


def obj_to_glb(vertices: np.ndarray, indices: np.ndarray) -> bytes:
    """Convert vertex/index arrays to GLB binary."""
    # Pack binary data
    vertex_bytes = vertices.tobytes()
    index_bytes = indices.tobytes()

    # Align to 4 bytes
    def pad4(b):
        r = len(b) % 4
        return b + b'\x00' * (4 - r if r else 0)

    vertex_bytes_padded = pad4(vertex_bytes)
    index_bytes_padded = pad4(index_bytes)
    bin_data = index_bytes_padded + vertex_bytes_padded

    # Compute bounds for accessor
    v_min = vertices.min(axis=0).tolist()
    v_max = vertices.max(axis=0).tolist()

    gltf_dict = {
        "asset": {"version": "2.0"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0}],
        "meshes": [{
            "primitives": [{
                "attributes": {"POSITION": 1},
                "indices": 0
            }]
        }],
        "accessors": [
            {
                "bufferView": 0,
                "componentType": 5125,  # UNSIGNED_INT
                "count": len(indices),
                "type": "SCALAR"
            },
            {
                "bufferView": 1,
                "componentType": 5126,  # FLOAT
                "count": len(vertices),
                "type": "VEC3",
                "min": v_min,
                "max": v_max
            }
        ],
        "bufferViews": [
            {
                "buffer": 0,
                "byteOffset": 0,
                "byteLength": len(index_bytes_padded),
                "target": 34963  # ELEMENT_ARRAY_BUFFER
            },
            {
                "buffer": 0,
                "byteOffset": len(index_bytes_padded),
                "byteLength": len(vertex_bytes),
                "target": 34962  # ARRAY_BUFFER
            }
        ],
        "buffers": [{"byteLength": len(bin_data)}]
    }

    import json as _json
    json_str = _json.dumps(gltf_dict, separators=(',', ':'))
    json_bytes = json_str.encode('utf-8')
    # Pad JSON to 4-byte boundary
    json_pad = (4 - len(json_bytes) % 4) % 4
    json_bytes += b' ' * json_pad

    # GLB header
    total_length = 12 + 8 + len(json_bytes) + 8 + len(bin_data)
    # magic, version, length
    header = struct.pack('<III', 0x46546C67, 2, total_length)
    json_chunk = struct.pack('<II', len(json_bytes),
                             0x4E4F534A) + json_bytes  # JSON chunk
    bin_chunk = struct.pack('<II', len(bin_data),
                            0x004E4942) + bin_data       # BIN chunk

    return header + json_chunk + bin_chunk


def download_and_convert(allen_id: int) -> bool:
    """Download OBJ from Allen and save as GLB."""
    glb_path = MESH_DIR / f"{allen_id}.glb"

    # Delete bad files (the ~35MB garbage ones)
    if glb_path.exists():
        header = glb_path.read_bytes()[:4]
        if header != b'glTF':
            print(f"  Removing invalid file {allen_id}.glb")
            glb_path.unlink()
        else:
            print(f"  {allen_id}: valid GLB already exists, skipping")
            return True

    url = f"{BASE_URL}/{allen_id}.obj"
    try:
        r = requests.get(url, timeout=60)
        if r.status_code != 200:
            print(f"  {allen_id}: HTTP {r.status_code}")
            return False

        obj_text = r.text
        if not obj_text.strip().startswith('#') and 'v ' not in obj_text:
            print(f"  {allen_id}: not a valid OBJ file")
            return False

        vertices, indices = parse_obj(obj_text)
        if len(vertices) == 0 or len(indices) == 0:
            print(f"  {allen_id}: empty mesh")
            return False

        glb_bytes = obj_to_glb(vertices, indices)
        glb_path.write_bytes(glb_bytes)
        print(
            f"  {allen_id}: ✅ {len(vertices)} verts, {len(indices)//3} tris → {len(glb_bytes)//1024}KB GLB")
        return True

    except Exception as e:
        print(f"  {allen_id}: ❌ {e}")
        return False


def get_centroid_from_glb(glb_path: Path):
    """Extract mean vertex position from a GLB file."""
    try:
        data = glb_path.read_bytes()
        # Parse GLB manually to get vertex data
        json_len = struct.unpack_from('<I', data, 12)[0]
        json_data = json.loads(data[20:20+json_len])

        bin_offset = 20 + json_len + 8  # skip bin chunk header

        # Find POSITION accessor
        for mesh in json_data.get('meshes', []):
            for prim in mesh.get('primitives', []):
                pos_idx = prim.get('attributes', {}).get('POSITION')
                if pos_idx is None:
                    continue
                accessor = json_data['accessors'][pos_idx]
                bv = json_data['bufferViews'][accessor['bufferView']]
                offset = bin_offset + \
                    bv.get('byteOffset', 0) + accessor.get('byteOffset', 0)
                count = accessor['count']
                raw = data[offset:offset + count * 12]
                verts = np.frombuffer(raw, dtype=np.float32).reshape(-1, 3)
                return verts.mean(axis=0).tolist()
    except Exception as e:
        print(f"  Warning: centroid extraction failed: {e}")
    return None


def compute_directions(a_ccf, b_ccf):
    ax, ay, az = a_ccf
    bx, by, bz = b_ccf
    dz = bz - az
    dy = by - ay
    lat_delta = abs(bx - MIDLINE_X) - abs(ax - MIDLINE_X)
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

    # Remove any regions that have bad (garbage) mesh files
    bad_acronyms = set()
    for r in regions:
        glb_path = MESH_DIR / f"{r['allenId']}.glb"
        if glb_path.exists():
            header = glb_path.read_bytes()[:4]
            if header != b'glTF':
                bad_acronyms.add(r["id"])

    if bad_acronyms:
        print(
            f"  Removing {len(bad_acronyms)} regions with bad mesh files: {bad_acronyms}")
        regions = [r for r in regions if r["id"] not in bad_acronyms]
        existing_ids = {r["id"] for r in regions}

    print(f"\nDownloading {len(TRACTS)} tract meshes...")
    added = 0
    failed = 0

    for allen_id, acronym, name, difficulty in TRACTS:
        print(f"\n{name} ({acronym}):")
        ok = download_and_convert(allen_id)
        if not ok:
            failed += 1
            continue

        if acronym in existing_ids:
            print(f"  Already in regions.json")
            continue

        # Get centroid
        glb_path = MESH_DIR / f"{allen_id}.glb"
        centroid = get_centroid_from_glb(glb_path)
        if centroid is not None:
            ccf = [round(centroid[0] / 25), round(centroid[1] / 25),
                   round(centroid[2] / 25)]
            print(f"  Centroid: {ccf}")
        else:
            ccf = [228, 160, 280]
            print(f"  Using default centroid")

        regions.append({
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
        })
        existing_ids.add(acronym)
        added += 1

    print(f"\n{added} tracts added, {failed} failed")

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
                ((bx-ax)*0.025)**2 + ((by-ay)*0.025)**2 + ((bz-az)*0.025)**2
            )
            dirs = compute_directions(
                centroids[r_a["id"]], centroids[r_b["id"]])
            distances[r_a["id"]][r_b["id"]] = {
                "distance_mm": round(dist, 2), "direction": dirs}

    with open(DISTANCES_PATH, "w") as f:
        json.dump(distances, f, separators=(",", ":"))
    print(f"Saved distances.json ({DISTANCES_PATH.stat().st_size/1e6:.1f} MB)")
    print(f"\n✅ Done! {len(regions)} total regions")


if __name__ == "__main__":
    main()
