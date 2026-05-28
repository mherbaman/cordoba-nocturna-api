with open('/etc/easypanel/projects/cordoba-nocturna/api/code/routes/padel.js', 'r') as f:
    lines = f.readlines()

# Buscar la linea con idx++ suelto y agregar el cierre de llave
for i, line in enumerate(lines):
    if '      idx++;\n' == line:
        lines[i] = '      idx++;\n    }\n'
        break

# Buscar la linea de zonas_extra y agregar foto_url descripcion ranking despues
for i, line in enumerate(lines):
    if '        j.zonas_extra,\n' == line:
        lines[i] = '        j.zonas_extra,\n        j.foto_url, j.descripcion, j.ranking_puntos,\n'
        break

with open('/etc/easypanel/projects/cordoba-nocturna/api/code/routes/padel.js', 'w') as f:
    f.writelines(lines)

print("Fix OK")
