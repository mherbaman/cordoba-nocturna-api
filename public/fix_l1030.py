f = open('admin.html', 'r', encoding='utf-8')
lines = f.readlines()
f.close()

l = lines[1029]
l = l.replace("suspendid'", "suspendido'")
l = l.replace("':<span class=\"badge badge-green\">", ":'<span class=\"badge badge-green\">")
lines[1029] = l

f = open('admin.html', 'w', encoding='utf-8')
f.writelines(lines)
f.close()

print('OK:', lines[1029].strip()[:250])
