with open('/etc/easypanel/projects/cordoba-nocturna/api/code/routes/padel.js', 'r') as f:
    lines = f.readlines()

# Linea 44 — condicion zona (busca en zona, zona_principal Y zonas_extra)
lines[43] = '      conditions.push(`(j.zona ILIKE $${idx} OR j.zona_principal ILIKE $${idx} OR j.zonas_extra::text ILIKE $${idx})`);\n'

# Linea 45 — push del param
lines[44] = '      params.push(`%${zona}%`);\n'

# Linea 46 — idx++
lines[45] = '      idx++;\n'

# Linea 54 — SELECT agregar zona_principal y zonas_extra
lines[53] = '        j.id, j.usuario_id, j.nombre, j.nivel, j.zona,\n'
lines[54] = '        COALESCE(j.zona_principal, j.zona) AS zona_principal,\n'

# Insertar la linea de zonas_extra despues de zona_principal
lines.insert(55, '        j.zonas_extra,\n')

with open('/etc/easypanel/projects/cordoba-nocturna/api/code/routes/padel.js', 'w') as f:
    f.writelines(lines)

print("GET /padel/jugadores OK")
