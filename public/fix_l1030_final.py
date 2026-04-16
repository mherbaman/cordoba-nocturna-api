f = open('admin.html', 'r', encoding='utf-8')
lines = f.readlines()
f.close()

lines[1029] = lines[1029].replace('class="bade"', 'class="badge"')
lines[1029] = lines[1029].replace('<span lass=', '<span class=')

f = open('admin.html', 'w', encoding='utf-8')
f.writelines(lines)
f.close()

print('OK:', lines[1029].strip()[:350])
