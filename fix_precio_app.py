with open('/etc/easypanel/projects/cordoba-nocturna/api/code/routes/padel.js', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'const { negocio_id, dia_semana, hora_inicio, hora_fin, precio_por_hora, cantidad_canchas, zona, numero_cancha, fecha_especifica } = req.body;' in line:
        lines[i] = '  const { negocio_id, dia_semana, hora_inicio, hora_fin, precio_por_hora, precio_app, cantidad_canchas, zona, numero_cancha, fecha_especifica } = req.body;\n'
        print(f"✅ Línea {i+1}: destructuring actualizado")
    if '(negocio_id, dia_semana, hora_inicio, hora_fin, precio_por_hora, cantidad_canchas, zona, numero_cancha, fecha_especifica)' in line:
        lines[i] = '        (negocio_id, dia_semana, hora_inicio, hora_fin, precio_por_hora, precio_app, cantidad_canchas, zona, numero_cancha, fecha_especifica)\n'
        print(f"✅ Línea {i+1}: columnas actualizadas")
    if 'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)' in line:
        lines[i] = '      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)\n'
        print(f"✅ Línea {i+1}: values actualizado")
    if '[negocio_id, dia_semana, hora_inicio, hora_fin, precio_por_hora, cantidad_canchas || 1, zona, numero_cancha || 1, fecha_especifica || null]' in line:
        lines[i] = '    `, [negocio_id, dia_semana, hora_inicio, hora_fin, precio_por_hora, precio_app || 0, cantidad_canchas || 1, zona, numero_cancha || 1, fecha_especifica || null]);\n'
        print(f"✅ Línea {i+1}: array de valores actualizado")

with open('/etc/easypanel/projects/cordoba-nocturna/api/code/routes/padel.js', 'w') as f:
    f.writelines(lines)
print("✅ Fix completo")
