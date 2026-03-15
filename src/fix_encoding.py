import json

with open('public/data/regions.json', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('â€"', '—')
content = content.replace('â€™', "'")
content = content.replace('â€œ', '"')
content = content.replace('â€\x9d', '"')

with open('public/data/regions.json', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done!')
