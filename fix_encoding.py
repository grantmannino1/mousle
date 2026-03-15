with open('public/data/regions.json', 'rb') as f:
    content = f.read()

# Fix the corrupted em dash stored as literal bytes
content = content.replace(b'\xe2\x80\x94', b'-')
content = content.replace(b'\xe2\x80\x99', b"'")
content = content.replace(b'\xe2\x80\x9c', b'"')
content = content.replace(b'\xe2\x80\x9d', b'"')

with open('public/data/regions.json', 'wb') as f:
    f.write(content)

print('Done!')
