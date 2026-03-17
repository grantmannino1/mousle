#!/usr/bin/env python3
"""
reassign_difficulties.py
Reassigns difficulty tiers based on anatomical familiarity.
Run from project root: python reassign_difficulties.py
"""

import json
from pathlib import Path

REGIONS_PATH = Path("public/data/regions.json")

# Regions that should be EASY — major, well-known structures
EASY_IDS = {
    # Major cortical regions
    "Isocortex", "FRP", "MO", "SS", "GU", "VISC", "AUD", "VIS", "ACA",
    "PL", "ILA", "ORB", "AI", "RSP", "PTLp", "TEa", "PERI", "ECT",
    # Hippocampus + entorhinal
    "HIP", "RHP",
    # Amygdala
    "AMY", "sAMY",
    # Thalamus
    "TH",
    # Hypothalamus
    "HY",
    # Basal ganglia / striatum
    "STR", "STRd", "STRv", "PAL",
    # Midbrain
    "MB", "MBmot", "MBsen", "MBsta",
    # Cerebellum
    "CB", "CBN", "CBX",
    # Pons + medulla
    "P", "MY",
    # Olfactory
    "OLF", "MOB",
    # White matter - major only
    "cc", "fxs",
    # Ventricles / CSF spaces
    "VS",
}

# Regions that should be MEDIUM — subdivisions, cortical areas, major nuclei
MEDIUM_IDS = {
    # Cortical subdivisions
    "MOp", "MOs", "SSp", "SSs", "GU", "VISC", "AUDp", "AUDd", "AUDv",
    "AUDpo", "VISp", "VISl", "VISpl", "VISpm", "VISal", "VISam", "VISrl",
    "VISpor", "VISa", "VISli", "VISlla",
    "ACAd", "ACAv", "PL", "ILA", "ORBl", "ORBm", "ORBvl", "ORBv",
    "AId", "AIv", "AIp", "RSPagl", "RSPd", "RSPv",
    "PTLp", "TEa", "PERI", "ECT",
    # Hippocampal regions
    "CA1", "CA2", "CA3", "DG", "SUB", "PRE", "POST", "ProS", "HATA",
    # Amygdala nuclei
    "BLA", "BLAa", "BLAp", "BLAv", "BMA", "BMAa", "BMAp",
    "LA", "PA", "CEA", "MEA", "IA", "NLOT", "COA", "COAa", "COAp",
    "AAA", "BSTM", "BAC",
    # Thalamus nuclei
    "DORsm", "DORpm", "VENT", "GENd", "GENv", "LAT", "MED", "MTN",
    "ILM", "GRP", "ATN", "EPI", "RT",
    "AD", "AM", "AV", "IAD", "IAM", "LD", "LGd", "LGv", "LH",
    "LP", "MD", "MGd", "MGm", "MGv", "MH", "PCN", "PF", "PIL",
    "PO", "POL", "PT", "PVT", "RE", "RH", "SGN", "SM", "SPF",
    "STR", "SubG", "TRS", "VAL", "VM", "VPL", "VPLpc", "VPM", "VPMpc",
    "Xi", "ZI",
    # Hypothalamus
    "PVH", "PVHd", "PVHp", "LHA", "DMH", "VMH", "AHN", "MBO",
    "MM", "SUM", "TM", "ARH", "PH", "SCH", "MEPO", "OVLT",
    # Basal ganglia
    "CP", "ACB", "FS", "OT", "LSX", "sAMY", "PALd", "PALv", "PALm", "PALc",
    "GPe", "GPi", "EP", "SNr", "SNc", "VTA", "STN",
    # Cerebellum
    "CUL", "DEC", "FOTU", "LIN", "MON", "COPY", "PYR", "UVU", "NOD",
    "FL", "PFL", "ANcr", "SIM", "LING", "CENT",
    "IP", "DN", "FN", "VeCB",
    # Brainstem
    "PAG", "IC", "SC", "RN", "SN", "VTA", "DR", "MR",
    "PBl", "PBm", "KF", "LC", "NTS", "IO", "DCN",
    "PRNc", "PRNr", "MARN", "PGRN",
    # Major fiber tracts
    "cc", "fxs", "int", "ec", "opt", "mcp", "ml", "ll", "st", "sm",
    "fx", "fi", "dhc", "icp",
}


def classify(region):
    rid = region["id"]
    name = region["name"].lower()
    cat = region["category"]
    parent = region.get("parentName", "").lower()

    # Explicit easy list
    if rid in EASY_IDS:
        return "easy"

    # Explicit medium list
    if rid in MEDIUM_IDS:
        return "medium"

    # Fiber tracts: major ones medium, specific ones hard
    if cat == "fiber":
        major_tracts = {"cc", "fxs", "int", "ec",
                        "opt", "mcp", "ml", "ll", "st", "sm"}
        return "medium" if rid in major_tracts else "hard"

    # Olfactory: top-level easy, subdivisions hard
    if cat == "olfactory":
        if any(x in name for x in ["main olfactory bulb", "accessory olfactory bulb", "piriform"]):
            return "easy"
        return "hard"

    # Cortex: layer-specific → hard, named areas → medium
    if cat == "cortex":
        if any(str(x) in rid for x in ["1", "2", "3", "4", "5", "6"]):
            return "hard"
        if "/" in rid:
            return "hard"
        return "medium"

    # Subcortical: major structures easy, nuclei medium, subfields hard
    if cat == "subcortical":
        # Top-level structures
        if any(x in name for x in [
            "thalamus", "hypothalamus", "striatum", "pallidum",
            "hippocampal formation", "amygdala", "basal ganglia"
        ]):
            return "easy"
        # Named nuclei → medium
        return "medium"

    # Cerebellum
    if cat == "cerebellum":
        if any(x in name for x in ["cerebellum", "cerebellar cortex", "cerebellar nuclei"]):
            return "easy"
        return "medium"

    # Brainstem
    if cat == "brainstem":
        if any(x in name for x in ["midbrain", "pons", "medulla"]):
            return "easy"
        return "medium"

    return region["difficulty"]


def main():
    with open(REGIONS_PATH) as f:
        data = json.load(f)
    regions = data["regions"]

    from collections import Counter
    old_counts = Counter(r["difficulty"] for r in regions)

    for r in regions:
        r["difficulty"] = classify(r)

    new_counts = Counter(r["difficulty"] for r in regions)

    print("Difficulty redistribution:")
    print(f"  Easy:   {old_counts['easy']:3d} → {new_counts['easy']:3d}")
    print(f"  Medium: {old_counts['medium']:3d} → {new_counts['medium']:3d}")
    print(f"  Hard:   {old_counts['hard']:3d} → {new_counts['hard']:3d}")

    print("\nEasy regions:")
    for r in sorted([r for r in regions if r["difficulty"] == "easy"], key=lambda x: x["name"]):
        print(f"  {r['id']:20s} {r['name']}")

    print("\nMedium regions (sample):")
    med = sorted([r for r in regions if r["difficulty"]
                 == "medium"], key=lambda x: x["name"])
    for r in med[:20]:
        print(f"  {r['id']:20s} {r['name']}")
    print(f"  ... and {len(med)-20} more")

    with open(REGIONS_PATH, "w") as f:
        json.dump({"regions": regions}, f, indent=2)
    print(f"\nSaved {REGIONS_PATH}")


if __name__ == "__main__":
    main()
