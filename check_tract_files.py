#!/usr/bin/env python3
"""
check_tract_files.py
Checks what format the downloaded tract files are and tries to find
the correct Allen API endpoint for tract meshes.
"""
import requests
from pathlib import Path

MESH_DIR = Path("public/meshes")

# Check what the downloaded files actually are
test_ids = [697, 956, 986, 1108, 1123, 900, 908]

print("=== Checking downloaded files ===")
for aid in test_ids:
    path = MESH_DIR / f"{aid}.glb"
    if path.exists():
        header = path.read_bytes()[:16]
        print(
            f"{aid}.glb: {len(path.read_bytes())//1024}KB, header: {header[:4]} = {header[:4].hex()}")

print("\n=== Testing Allen API endpoints for tract meshes ===")
# Try different known Allen API patterns
test_id = 776  # corpus callosum - known to exist

endpoints = [
    f"https://api.brain-map.org/api/v2/structure_graph_download/1.json",
    f"https://ccf.brain-map.org/api/v2/mesh/{test_id}?resolution=25&file_format=glb",
    f"https://ccf.brain-map.org/api/v2/mesh/{test_id}?resolution=25",
    f"https://neuromorpho.brain-map.org/api/v2/mesh/{test_id}.glb",
]

for url in endpoints:
    try:
        r = requests.get(url, timeout=10)
        header = r.content[:8]
        print(f"\nURL: {url}")
        print(f"  Status: {r.status_code}, Size: {len(r.content)//1024}KB")
        print(f"  Header bytes: {header.hex()} = {header}")
        if header[:4] == b'glTF':
            print("  ✅ VALID GLB!")
        elif header[:2] == b'PK':
            print("  📦 ZIP file")
        elif header[:4] == b'\x1f\x8b\x08\x00':
            print("  📦 GZIP file")
        else:
            print(f"  ❓ Unknown format")
    except Exception as e:
        print(f"\nURL: {url} → ERROR: {e}")
