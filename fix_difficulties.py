import json
from collections import Counter

with open('public/data/regions.json') as f:
    data = json.load(f)

changes = {
    'AOBgl': 'hard',
    'MY-sat': 'medium',
    'SMT': 'medium',
    'sAMY': 'medium',
    'CH': 'easy',
    'CP': 'easy',
}

for r in data['regions']:
    if r['id'] in changes:
        print(f"{r['id']}: {r['difficulty']} -> {changes[r['id']]}")
        r['difficulty'] = changes[r['id']]

with open('public/data/regions.json', 'w') as f:
    json.dump(data, f, indent=2)

counts = Counter(r['difficulty'] for r in data['regions'])
print('Done! New counts:', dict(counts))
