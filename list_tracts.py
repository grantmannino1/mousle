#!/usr/bin/env python3
import requests

r = requests.get(
    'https://api.brain-map.org/api/v2/data/Structure/query.json'
    '?criteria=ontology[id$eq1]&num_rows=2000'
)
structs = r.json()['msg']

keywords = ['tract', 'commissure', 'capsule', 'fasciculus', 'lemniscus',
            'fornix', 'corpus callosum', 'stria', 'fimbria', 'peduncle',
            'funiculus', 'decussation', 'brachium']

tracts = [s for s in structs if any(
    x in s.get('name', '').lower() for x in keywords)]

for t in sorted(tracts, key=lambda x: x['name']):
    print(f"{t['id']:8d}  {t['acronym']:20s}  {t['name']}")

print(f'\nTotal: {len(tracts)}')
