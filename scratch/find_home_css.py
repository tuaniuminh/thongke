content = open(r'C:\Users\PC VIP\Documents\Thong-ke\src\assets\css\style.css', encoding='utf-8').read()
lines = content.split('\n')
found = []
for i, line in enumerate(lines):
    if 'home-widget' in line or 'home-layout' in line or 'home-card' in line or 'home-grid' in line:
        found.append(f'{i+1}: {line[:120]}')
        if len(found) >= 60:
            break

with open(r'C:\Users\PC VIP\Documents\Thong-ke\scratch\home_classes.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(found))
print('Done')
