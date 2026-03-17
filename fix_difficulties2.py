import json
from collections import Counter

with open('public/data/regions.json') as f:
    data = json.load(f)

# Move these specific/obscure regions from medium to hard
to_hard = {
    # DG layers - too specific
    'DG-sg', 'DG-po',
    # Specific amygdala subdivisions
    'BLAp', 'BMAp', 'COAp',
    # Specific hypothalamic nuclei
    'AVP', 'ARH', 'DMH', 'EW', 'LIN',
    # Specific thalamic nuclei
    'AD', 'AVP', 'IB', 'LIN', 'NI', 'PCN', 'PoT', 'SGN', 'SMT',
    'SubG', 'TRS', 'VTN', 'XI',
    # Specific brainstem nuclei
    'DCN', 'DR', 'EW', 'NI', 'NLL', 'RPO', 'RPA',
    # Specific cerebellar regions
    'CUL', 'DEC', 'FOTU', 'LIN', 'MON', 'PFL', 'SIM', 'VeCB',
    # Specific fiber tract subdivisions
    'dhc', 'fa', 'ccs', 'ccg', 'aco', 'act', 'fr', 'pc',
    # Other obscure nuclei
    'AVP', 'BSTa', 'ILA', 'NI', 'PGRNd', 'PGRNl', 'RPO',
    'SFO', 'SF', 'SCop', 'SCiw', 'PIL', 'PRT',
}

changed = 0
for r in data['regions']:
    if r['id'] in to_hard and r['difficulty'] == 'medium':
        r['difficulty'] = 'hard'
        changed += 1

with open('public/data/regions.json', 'w') as f:
    json.dump(data, f, indent=2)

counts = Counter(r['difficulty'] for r in data['regions'])
print(f'Changed {changed} regions to hard')
print('New counts:', dict(counts))
