f = open('admin.html', 'r', encoding='utf-8')
lines = f.readlines()
f.close()

lines[1029] = lines[1029].replace('<san class="badge"', '<span class="badge"')

f = open('admin.html', 'w', encoding='utf-8')
f.writelines(lines)
f.close()

print('OK:', lines[1029].strip()[:300])
